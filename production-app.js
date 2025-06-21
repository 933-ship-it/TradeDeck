// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck.com/";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

// --- Initialize Firebase ---
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("✅ Firebase initialized successfully");
} catch (err) {
  console.error("❌ Firebase initialization failed:", err);
}

// --- DOM Elements ---
const productDetailsError = document.getElementById('product-details-error');
const detailProductImage = document.getElementById('detail-product-image');
const detailProductTitle = document.getElementById('detail-product-title');
const detailProductDescription = document.getElementById('detail-product-description');
const detailProductPrice = document.getElementById('detail-product-price');
const detailActionButton = document.getElementById('detail-action-button');
const paypalButtonContainer = document.getElementById('paypal-button-container');

// --- Utility Functions ---
function showTab(tabId) {
  try {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if (target) {
      target.classList.remove('hidden');
      console.log(`✅ Switched to tab: ${tabId}`);
    } else {
      console.warn(`⚠️ Tab not found: ${tabId}`);
    }
  } catch (err) {
    console.error("❌ Error switching tabs:", err);
  }
}

function enableSubmitButton() {
  try {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      console.log("✅ Submit button enabled");
    } else {
      console.warn("⚠️ Submit button not found");
    }
  } catch (err) {
    console.error("❌ Error enabling submit button:", err);
  }
}

// --- Main Product Detail Display and Payment Logic ---
async function showProductDetails(productId) {
  console.log("🔍 Fetching product details for:", productId);
  showTab('productDetails');
  productDetailsError.classList.add('hidden');

  try {
    const docRef = doc(db, "products", productId);
    const productDoc = await getDoc(docRef);
    console.log("📄 Firestore document fetched:", productDoc);

    if (!productDoc.exists()) {
      productDetailsError.textContent = 'Product not found.';
      productDetailsError.classList.remove('hidden');
      console.warn("⚠️ Product does not exist:", productId);
      return;
    }

    const product = { id: productDoc.id, ...productDoc.data() };
    console.log("✅ Product data:", product);

    detailProductImage.src = product.previewImageUrl || 'https://via.placeholder.com/600x400?text=Product+Preview';
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    const displayPrice = parseFloat(product.price) === 0 ? 'Free' : `$${parseFloat(product.price).toFixed(2)}`;
    detailProductPrice.textContent = displayPrice;

    detailActionButton.className = 'w-full py-3 rounded-xl font-semibold transition';
    detailActionButton.disabled = false;

    if (parseFloat(product.price) > 0) {
      console.log("💵 Paid product - rendering PayPal buttons");
      detailActionButton.style.display = 'none';
      paypalButtonContainer.innerHTML = '';

      if (window?.paypal?.Buttons) {
        window.paypal.Buttons({
          createOrder(data, actions) {
            console.log("🛒 Creating PayPal order...");
            return actions.order.create({
              purchase_units: [{
                amount: { value: product.price.toString() },
                description: product.title
              }]
            });
          },
          async onApprove(data, actions) {
            try {
              const orderID = data.orderID;
              console.log("✅ Payment approved, verifying with backend", orderID);

              const res = await fetch('https://paypal-verification-api.vercel.app/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID,
                  expectedAmount: product.price,
                  productTitle: product.title
                })
              });

              const json = await res.json();
              console.log("🔐 Verification response:", json);

              if (!json.success) {
                alert("❌ Payment verification failed. Please contact support.");
                console.error("❌ Verification failed:", json);
                return;
              }

              paypalButtonContainer.innerHTML = `
                <a href="${product.fileUrl}" target="_blank"
                  class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition">
                  Download Product
                </a>
              `;
              console.log("✅ Payment verified and download link rendered");

              await handleProductPurchase(product);
              console.log("📦 Product purchase handled");

              sendSaleEmail({
                buyerName: json.buyerName || 'Unknown',
                buyerEmail: json.buyerEmail || 'Unknown',
                sellerPaypalEmail: product.paypalEmail || 'Not Provided',
                productTitle: product.title || 'Unknown',
                amount: product.price || 'Unknown'
              });
              console.log("📧 Sale notification sent");

            } catch (err) {
              alert("⚠️ An error occurred during secure payment verification.");
              console.error("❌ Verification error:", err);
            }
          },
          onError(err) {
            alert('Payment could not be completed. Please try again.');
            console.error("❌ PayPal error:", err);
          }
        }).render('#paypal-button-container');
      } else {
        paypalButtonContainer.innerHTML = '<p class="text-red-600">PayPal buttons could not be loaded. Please refresh.</p>';
        console.error("❌ PayPal Buttons API not available");
      }
    } else {
      console.log("🎁 Free product - showing download button");
      detailActionButton.style.display = '';
      paypalButtonContainer.innerHTML = '';
      detailActionButton.textContent = 'Download';
      detailActionButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
      detailActionButton.onclick = () => window.open(product.fileUrl, '_blank');
      detailActionButton.setAttribute('aria-label', `Download ${product.title}`);
    }
  } catch (error) {
    console.error("❌ Error loading product details:", error);
    productDetailsError.textContent = 'Error loading product details. Please try again.';
    productDetailsError.classList.remove('hidden');
  }
}

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("📦 DOM fully loaded");
  try {
    if (typeof loadProducts === "function") {
      loadProducts();
      console.log("✅ Products loaded");
    } else {
      console.warn("⚠️ loadProducts is not defined");
    }
    showTab('home');
    enableSubmitButton();
  } catch (err) {
    console.error("❌ Error during initial load:", err);
  }
});
