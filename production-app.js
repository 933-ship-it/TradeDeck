// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- App Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyB4WYZojOArqdAceRQZD6a6re7MP0Ikl0c",
  authDomain: "fluxr-913c8.firebaseapp.com",
  projectId: "fluxr-913c8",
  storageBucket: "fluxr-913c8.appspot.com",
  messagingSenderId: "779319537916",
  appId: "1:779319537916:web:5afa18aade22959ca3a779",
  measurementId: "G-QX76Q1Z1QB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM References ---
const productList = document.getElementById("productList");
const productDetailsSection = document.getElementById("productDetails");
const detailProductImage = document.getElementById("detailProductImage");
const detailProductTitle = document.getElementById("detailProductTitle");
const detailProductDescription = document.getElementById("detailProductDescription");
const detailProductPrice = document.getElementById("detailProductPrice");
const detailActionButton = document.getElementById("detailActionButton");
const paypalButtonContainer = document.getElementById("paypal-button-container");
const productDetailsError = document.getElementById("productDetailsError");

// --- Global State ---
let currentUser = null;
let currentProduct = null;

// --- Load Products ---
async function loadProducts() {
  const productsRef = collection(db, "products");
  const snapshot = await getDocs(productsRef);
  productList.innerHTML = "";

  if (snapshot.empty) {
    document.getElementById("noProductsMessage").textContent = "No products found.";
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "bg-white rounded-lg shadow-md p-4 cursor-pointer product-card";
    card.innerHTML = `
      <img src="${data.previewImageUrl}" class="w-full h-40 object-cover rounded-md mb-2" />
      <h3 class="text-lg font-semibold text-gray-900">${data.title}</h3>
      <p class="text-sm text-gray-600">${data.description.substring(0, 60)}...</p>
      <p class="text-blue-600 font-bold mt-2">$${parseFloat(data.price).toFixed(2)}</p>
    `;
    card.addEventListener("click", () => showProductDetails(docSnap.id, data));
    productList.appendChild(card);
  });
}

// --- Show Product Details ---
function showProductDetails(id, data) {
  currentProduct = { ...data, id };

  detailProductImage.src = data.previewImageUrl;
  detailProductTitle.textContent = data.title;
  detailProductDescription.textContent = data.description;
  detailProductPrice.textContent = `$${parseFloat(data.price).toFixed(2)}`;
  detailActionButton.textContent = data.price == 0 ? "Download" : "Buy Now";

  paypalButtonContainer.innerHTML = "";
  productDetailsSection.classList.remove("hidden");
  document.getElementById("home").classList.add("hidden");

  if (data.price > 0) {
    renderPayPalButton(data);
  } else {
    detailActionButton.onclick = () => {
      window.open(data.productFileUrl, "_blank");
    };
  }
}

// --- Render PayPal Button ---
function renderPayPalButton(product) {
  paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: product.price.toFixed(2)
          }
        }]
      });
    },

    onApprove: async function (data, actions) {
      const orderID = data.orderID;
      try {
        const verifyRes = await fetch("https://verify-payment-js.vercel.app/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID })
        });

        const verifyData = await verifyRes.json();

        if (verifyData.success && verifyData.order.status === "COMPLETED") {
          detailActionButton.textContent = "Download Now";
          detailActionButton.disabled = false;
          detailActionButton.onclick = () => {
            window.open(product.productFileUrl, "_blank");
          };

          const sellerQuery = query(collection(db, "users"), where("paypalEmail", "==", product.paypalEmail));
          const sellerSnap = await getDocs(sellerQuery);
          if (!sellerSnap.empty) {
            const sellerDoc = sellerSnap.docs[0];
            const prevBalance = sellerDoc.data().balance || 0;
            const newBalance = parseFloat(prevBalance) + parseFloat(product.price * 0.7);
            await updateDoc(sellerDoc.ref, { balance: newBalance });
          }
        } else {
          productDetailsError.textContent = "Payment not verified. Please try again.";
          productDetailsError.classList.remove("hidden");
        }
      } catch (error) {
        console.error("Verification error:", error);
        productDetailsError.textContent = "Payment verification failed. Please contact support.";
        productDetailsError.classList.remove("hidden");
      }
    },

    onError: function (err) {
      console.error("PayPal Error", err);
      productDetailsError.textContent = "An error occurred during payment.";
      productDetailsError.classList.remove("hidden");
    }
  }).render("#paypal-button-container");
}

// --- Auth State ---
onAuthStateChanged(auth, user => {
  currentUser = user;
  document.getElementById("authOverlay").style.display = user ? "none" : "flex";

  if (user) {
    loadProducts();
    const userPic = document.getElementById("userProfilePic");
    const dropdown = document.getElementById("dropdownMenu");

    userPic.src = user.photoURL || "";
    userPic.classList.remove("hidden");
    document.getElementById("userEmail").textContent = user.email;

    userPic.onclick = () => dropdown.classList.toggle("hidden");
    document.getElementById("signOutBtn").onclick = () => signOut(auth);
    document.getElementById("deleteAccountBtn").onclick = async () => {
      try {
        await deleteUser(user);
        alert("Account deleted");
        location.reload();
      } catch (err) {
        alert("Failed to delete account.");
      }
    };
  }
});
