// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Helper Imports ---
import { sendEmailNotification, formatCurrency } from "./helpers.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "fluxr-913c8.firebaseapp.com",
  projectId: "fluxr-913c8",
  storageBucket: "fluxr-913c8.appspot.com",
  messagingSenderId: "779319537916",
  appId: "1:779319537916:web:5afa18aade22959ca3a779",
  measurementId: "G-QX76Q1Z1QB"
};

// --- Init Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Ready Check ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready");
  const requiredElements = [
    "userProfilePic", "userEmail", "signOutBtn", "deleteAccountBtn",
    "searchBar", "productList", "noProductsMessage",
    "productDetails", "detailProductTitle", "detailProductPrice",
    "detailActionButton", "paypal-button-container",
    "dashboard", "sellerBalance", "myProducts"
  ];

  const dom = {};
  let missing = false;
  requiredElements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`❌ Missing element: ${id}`);
      missing = true;
    }
    dom[id] = el;
  });

  if (missing) return;

  // --- Auth State ---
  onAuthStateChanged(auth, async user => {
    if (user) {
      console.log("🔐 Authenticated:", user.email);
      setupUserSession(user);
    } else {
      window.location.href = "https://933-ship-it.github.io/TradeDeck-landing-page/";
    }
  });

  // --- Session Setup ---
  async function setupUserSession(user) {
    dom.userProfilePic.src = user.photoURL || "";
    dom.userProfilePic.classList.remove("hidden");
    dom.userEmail.textContent = user.email;

    // Show email dropdown
    dom.userProfilePic.addEventListener("click", () => {
      document.getElementById("dropdownMenu").classList.toggle("hidden");
    });

    // Sign Out
    dom.signOutBtn.addEventListener("click", async () => {
      await signOut(auth);
      location.reload();
    });

    // Delete Account
    dom.deleteAccountBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete your account?")) {
        await deleteUser(user);
        alert("Account deleted.");
        location.reload();
      }
    });

    // Load Products
    await loadAllProducts();
    await loadMyProducts(user.email);
    await updateBalance(user.email);
  }

  // --- Product Listing ---
  async function loadAllProducts() {
    const productList = dom.productList;
    productList.innerHTML = "";
    const q = query(collection(db, "products"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      dom.noProductsMessage.classList.remove("hidden");
      return;
    }

    dom.noProductsMessage.classList.add("hidden");
    snapshot.forEach(doc => {
      const product = doc.data();
      const card = document.createElement("div");
      card.className = "bg-white rounded-lg p-4 product-card cursor-pointer shadow";
      card.innerHTML = `
        <img src="${product.previewImageUrl}" alt="" class="h-32 object-cover w-full mb-3 rounded">
        <h3 class="text-lg font-bold">${product.title}</h3>
        <p class="text-sm text-gray-600">${formatCurrency(product.price)}</p>
      `;
      card.onclick = () => showProductDetails(doc.id, product);
      productList.appendChild(card);
    });
  }

  // --- Product Details View ---
  async function showProductDetails(id, product) {
    document.getElementById("home").classList.add("hidden");
    dom.productDetails.classList.remove("hidden");

    dom.detailProductTitle.textContent = product.title;
    dom.detailProductPrice.textContent = formatCurrency(product.price);
    dom.detailProductDescription.textContent = product.description;
    document.getElementById("detailProductImage").src = product.previewImageUrl;

    const actionBtn = dom.detailActionButton;
    actionBtn.textContent = product.price === 0 ? "Download for Free" : "Buy Now";
    actionBtn.className = product.price === 0 ? "bg-green-600 text-white" : "bg-blue-600 text-white";

    if (product.price === 0) {
      actionBtn.onclick = () => window.open(product.productFileUrl, "_blank");
      document.getElementById("paypal-button-container").innerHTML = "";
    } else {
      actionBtn.onclick = () => alert("Scroll below to PayPal section to continue.");
      renderPayPalButton(product, id);
    }
  }

  // --- Render PayPal Button ---
  function renderPayPalButton(product, id) {
    paypal.Buttons({
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: { value: product.price.toFixed(2) },
            description: product.title
          }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(async function (details) {
          const res = await fetch("https://verify-payment-js.vercel.app/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderID,
              productId: id,
              buyerEmail: auth.currentUser.email
            })
          });

          const verified = await res.json();
          if (verified.success) {
            await updateDoc(doc(db, "products", id), {
              buyer: auth.currentUser.email,
              lastSoldAt: serverTimestamp()
            });
            sendEmailNotification({
              to: auth.currentUser.email,
              subject: "Purchase Confirmation",
              message: `Your purchase of ${product.title} was successful.`
            });
            alert("✅ Purchase complete!");
            window.open(product.productFileUrl, "_blank");
            updateBalance(product.sellerEmail);
          } else {
            alert("❌ Payment could not be verified.");
          }
        });
      }
    }).render("#paypal-button-container");
  }

  // --- Load User Products ---
  async function loadMyProducts(email) {
    const container = dom.myProducts;
    container.innerHTML = "";
    const q = query(collection(db, "products"), where("sellerEmail", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      document.getElementById("noMyProductsMessage").classList.remove("hidden");
      return;
    }

    snapshot.forEach(doc => {
      const p = doc.data();
      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded-lg shadow";
      card.innerHTML = `
        <h4 class="font-bold mb-1">${p.title}</h4>
        <p class="text-sm text-gray-500">${formatCurrency(p.price)}</p>
      `;
      container.appendChild(card);
    });
  }

  // --- Update Balance ---
  async function updateBalance(email) {
    const q = query(collection(db, "products"), where("sellerEmail", "==", email));
    const snapshot = await getDocs(q);
    let total = 0;
    snapshot.forEach(doc => {
      const p = doc.data();
      if (p.buyer) total += Number(p.price || 0);
    });
    dom.sellerBalance.textContent = formatCurrency(total * 0.8); // 80% earnings
  }

  // --- Back Button ---
  document.getElementById("backToHomeBtn").onclick = () => {
    dom.productDetails.classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
  };

});
