// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- External Secure PayPal Approval ---
import { handlePayPalApproval } from './verify-functions.js';

// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck.com/";
const VERIFY_URL = 'https://verify-payment-js.vercel.app/api/secure-gateway';

// --- Firebase Init ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
console.log("✅ Firebase initialized");

const paypalContainer = document.getElementById('paypal-button-container');
const detailImage = document.getElementById('detailProductImage');
const detailTitle = document.getElementById('detailProductTitle');
const detailDesc = document.getElementById('detailProductDescription');
const detailPrice = document.getElementById('detailProductPrice');
const actionBtn = document.getElementById('detailActionButton');
const overlay = document.getElementById('productDetails');
const sellerBalanceElm = document.getElementById('sellerBalance');

// --- Debug DOM Elements ---
if (!paypalContainer) console.warn("⚠️ Missing DOM element: #paypal-button-container");
if (!detailImage) console.warn("⚠️ Missing DOM element: #detailProductImage");
if (!detailTitle) console.warn("⚠️ Missing DOM element: #detailProductTitle");
if (!detailDesc) console.warn("⚠️ Missing DOM element: #detailProductDescription");
if (!detailPrice) console.warn("⚠️ Missing DOM element: #detailProductPrice");
if (!actionBtn) console.warn("⚠️ Missing DOM element: #detailActionButton");
if (!overlay) console.warn("⚠️ Missing DOM element: #productDetails");
if (!sellerBalanceElm) console.warn("⚠️ Missing DOM element: #sellerBalance");

if (!paypalContainer || !overlay || !actionBtn || !sellerBalanceElm) {
  console.error("❌ One or more critical DOM elements are missing.");
  throw new Error("Critical DOM elements missing. Cannot continue.");
}

// --- Balance Logic ---
async function incrementSellerBalance(sellerId, amount) {
  const ref = doc(db, "balances", sellerId);
  await runTransaction(db, async tx => {
    const s = await tx.get(ref);
    const curr = s.exists() ? s.data().balance || 0 : 0;
    tx.set(ref, { balance: curr + amount, lastUpdated: serverTimestamp() }, { merge: true });
  });
}

function watchSellerBalance(uid) {
  const balRef = doc(db, "balances", uid);
  onSnapshot(balRef, snap => {
    const b = snap.exists() ? snap.data().balance || 0 : 0;
    sellerBalanceElm.textContent = `$${b.toFixed(2)}`;
  });
}

async function sendSaleEmail(data) {
  emailjs.send('service_px8mdvo', 'template_4gvs2zf', data)
    .then(r => console.log("📧 Sale email sent:", r.status), err => console.error("📧 Email error:", err));
}

// --- Product Detail View + PayPal ---
window.showProductDetails = async function (productId) {
  console.log("🔍 Showing product:", productId);
  overlay.classList.remove('hidden');
  paypalContainer.innerHTML = "Loading…";

  const snap = await getDoc(doc(db, "products", productId));
  if (!snap.exists()) {
    alert("Product not found.");
    overlay.classList.add('hidden');
    return;
  }

  const prod = { id: snap.id, ...snap.data() };
  detailImage.src = prod.previewImageUrl;
  detailTitle.textContent = prod.title;
  detailDesc.textContent = prod.description;
  detailPrice.textContent = `$${parseFloat(prod.price).toFixed(2)}`;

  if (prod.price > 0) {
    console.log("💳 Paid product detected — initializing PayPal...");
    window.paypal.Buttons({
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: prod.price.toFixed(2) }, description: prod.title }]
      }),
      onApprove: data => handlePayPalApproval({
        data,
        product: prod,
        verifyBackend: VERIFY_URL,
        db,
        incrementSellerBalance,
        sendSaleEmail,
        updateUI: (p) => {
          paypalContainer.innerHTML = `
            <a href="${p.fileUrl}" target="_blank"
              class="w-full bg-green-500 text-white py-3 rounded-xl flex justify-center">
              Download
            </a>`;
        }
      }),
      onError: err => {
        console.error("❌ PayPal error", err);
        alert("Payment error—please try again.");
        paypalContainer.innerHTML = '';
      }
    }).render('#paypal-button-container');
  } else {
    console.log("🎁 Free product");
    actionBtn.textContent = "Download Free";
    actionBtn.onclick = () => window.open(prod.fileUrl, "_blank");
    actionBtn.classList.add('bg-green-500', 'text-white');
    paypalContainer.innerHTML = '';
  }
};

// --- Auth State ---
onAuthStateChanged(auth, user => {
  if (user) {
    console.log("👤 User logged in:", user.email);
    watchSellerBalance(user.uid);
  } else {
    console.warn("⛔ No user authenticated");
  }
});

console.log("✅ production-app.js loaded successfully");
