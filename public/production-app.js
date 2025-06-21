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
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.firebasestorage.app",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const userNameEl = document.getElementById("userName");
const userBalanceEl = document.getElementById("userBalance");
const openPreviewImageWidgetBtn = document.getElementById("uploadPreviewImageBtn");
const productForm = document.getElementById("productForm");
const productList = document.getElementById("productList");
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// --- Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        console.error("User data not found");
        return;
      }

      const userData = userDoc.data();
      userNameEl.textContent = userData.name || user.email;
      userBalanceEl.textContent = `${userData.balance || 0} USD`;

    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  } else {
    // Delay redirect to avoid false positive during auth hydration
    setTimeout(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        window.location.href = "https://trade-deck-landing-page.vercel.app/";
      }
    }, 1500); // wait 1.5s before checking again
  }
});

// --- Tabs ---
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    tabContents.forEach((content) => {
      content.style.display = content.id === target ? "block" : "none";
    });
  });
});

// --- Upload Widget ---
async function initCloudinaryWidget() {
  try {
    const res = await fetch("https://tradedeck-backend.vercel.app/api/upload-image.js", {
      method: "POST"
    });
    const data = await res.json();
    if (!res.ok) throw new Error("Failed to get Cloudinary signature.");

    const widget = window.cloudinary.createUploadWidget({
      cloudName: data.cloudName,
      uploadPreset: "TradeDeck user products",
      apiKey: data.apiKey,
      folder: data.folder,
      timestamp: data.timestamp,
      signature: data.signature,
      sources: ["local"],
      multiple: false,
      maxFileSize: 10 * 1024 * 1024,
      resourceType: "image",
      clientAllowedFormats: ["jpg", "jpeg", "png", "gif", "svg"]
    }, cloudinaryUploadCallback);

    openPreviewImageWidgetBtn.onclick = () => widget.open();
  } catch (err) {
    console.error("[Cloudinary Init] Error:", err);
  }
}

function cloudinaryUploadCallback(error, result) {
  if (!error && result && result.event === "success") {
    document.getElementById("previewImageUrl").value = result.info.secure_url;
  }
}

initCloudinaryWidget();

// --- Handle Product Form ---
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("Please sign in again.");

  const title = productForm.title.value.trim();
  const description = productForm.description.value.trim();
  const price = parseFloat(productForm.price.value.trim());
  const previewImage = productForm.previewImageUrl.value.trim();
  const fileUrl = productForm.productFile.value.trim();

  if (!title || !description || !price || !previewImage || !fileUrl) {
    return alert("All fields are required.");
  }

  await addDoc(collection(db, "products"), {
    title,
    description,
    price,
    previewImage,
    fileUrl,
    userId: user.uid,
    createdAt: serverTimestamp()
  });

  alert("Product listed!");
  productForm.reset();
  loadUserProducts();
});

// --- Load User Products ---
async function loadUserProducts() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "products"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  productList.innerHTML = "";
  snap.forEach((docSnap) => {
    const product = docSnap.data();
    productList.innerHTML += `
      <div class="bg-white p-4 rounded-lg shadow-md mb-4">
        <img src="${product.previewImage}" class="w-full h-48 object-cover rounded mb-2" />
        <h3 class="text-xl font-semibold">${product.title}</h3>
        <p class="text-gray-700">${product.description}</p>
        <p class="text-green-600 font-bold my-2">$${product.price}</p>
        <div id="paypal-button-container-${docSnap.id}"></div>
      </div>
    `;

    renderPayPalButton(product, docSnap.id);
  });
}

loadUserProducts();

// --- PayPal ---
function renderPayPalButton(product, docId) {
  const container = document.getElementById(`paypal-button-container-${docId}`);
  container.innerHTML = "";

  paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [{ amount: { value: product.price.toString() } }]
      });
    },
    onApprove: async function (data, actions) {
      const orderID = data.orderID;

      const verificationRes = await fetch("https://tradedeck-backend.vercel.app/api/verify-payment.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID })
      });
      const verified = await verificationRes.json();

      if (!verificationRes.ok || !verified.success) {
        alert("Payment could not be verified. Please try again.");
        console.error("[Payment Verify] Failed:", verified.error);
        return;
      }

      alert(`Payment verified for ${verified.buyer.name}`);
      container.innerHTML = `<a href="${product.fileUrl}" target="_blank" class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition">Download Product</a>`;
      await handleProductPurchase(product);

      sendSaleEmail({
        buyerName: verified.buyer.name,
        buyerEmail: verified.buyer.email,
        sellerPaypalEmail: product.paypalEmail || "Not Provided",
        productTitle: product.title,
        amount: product.price
      });
    }
  }).render(`#paypal-button-container-${docId}`);
}

async function handleProductPurchase(product) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const newBalance = (userData.balance || 0) + product.price * 0.7;
  await updateDoc(userRef, { balance: newBalance });
}

async function sendSaleEmail({ buyerName, buyerEmail, sellerPaypalEmail, productTitle, amount }) {
  try {
    const res = await fetch("https://tradedeck-backend.vercel.app/api/send-sale-email.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        seller_paypal_email: sellerPaypalEmail,
        product_title: productTitle,
        amount
      })
    });
    if (!res.ok) throw new Error("Failed to send email");
    console.log("[sendSaleEmail] Email sent");
  } catch (err) {
    console.error("[sendSaleEmail] Error:", err);
  }
}
