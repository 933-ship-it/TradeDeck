// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Your Verify Helpers ---
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

// --- DOM Elements ---
const paypalContainer = document.getElementById('paypal-button-container');
const detailImage = document.getElementById('detailProductImage');
const detailTitle = document.getElementById('detailProductTitle');
const detailDesc = document.getElementById('detailProductDescription');
const detailPrice = document.getElementById('detailProductPrice');
const actionBtn = document.getElementById('detailActionButton');
const overlay = document.getElementById('productDetails');

// --- Helper Functions ---
async function incrementSellerBalance(sellerId, amount) {
  const ref = doc(db, "balances", sellerId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? snap.data().balance || 0 : 0;
    tx.set(ref, { balance: current + amount, lastUpdated: serverTimestamp() }, { merge: true });
  });
}

function watchSellerBalance(uid) {
  const el = document.getElementById('sellerBalance');
  if (!el) return;
  const balRef = doc(db, "balances", uid);
  onSnapshot(balRef, snap => {
    const balance = snap.exists() ? snap.data().balance || 0 : 0;
    el.textContent = `$${balance.toFixed(2)}`;
  });
}

async function sendSaleEmail(data) {
  try {
    await emailjs.send('service_px8mdvo', 'template_4gvs2zf', data);
    console.log("✅ Sale email sent");
  } catch (err) {
    console.error("❌ Email error:", err);
  }
}

// --- Show Product Details ---
async function showProductDetails(productId) {
  if (!overlay || !paypalContainer) return;

  try {
    overlay.classList.remove('hidden');
    paypalContainer.innerHTML = "Loading…";

    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) throw new Error("Product not found");

    const product = { id: snap.id, ...snap.data() };

    if (detailImage) detailImage.src = product.previewImageUrl;
    if (detailTitle) detailTitle.textContent = product.title;
    if (detailDesc) detailDesc.textContent = product.description;
    if (detailPrice) detailPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;

    if (product.price > 0) {
      window.paypal.Buttons({
        createOrder: (_, actions) => actions.order.create({
          purchase_units: [{
            amount: { value: product.price.toFixed(2) },
            description: product.title
          }]
        }),
        onApprove: data => handlePayPalApproval({
          data,
          product,
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
          console.error("PayPal error", err);
          alert("Payment failed. Please try again.");
          paypalContainer.innerHTML = '';
        }
      }).render('#paypal-button-container');
    } else {
      if (actionBtn) {
        actionBtn.textContent = "Download Free";
        actionBtn.onclick = () => window.open(product.fileUrl, "_blank");
        actionBtn.classList.add('bg-green-500', 'text-white');
      }
      paypalContainer.innerHTML = '';
    }
  } catch (error) {
    console.error("Error displaying product:", error);
    alert("Something went wrong. Please try again.");
    overlay.classList.add('hidden');
  }
}

// --- Initialize User ---
onAuthStateChanged(auth, user => {
  if (user) {
    watchSellerBalance(user.uid);
  }
});

export { showProductDetails };
