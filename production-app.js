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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- DOM Elements ---
const detailActionButton = document.getElementById('detailActionButton');
const paypalButtonContainer = document.getElementById('paypal-button-container');
const productDetailsError = document.getElementById('productDetailsError');
const detailProductImage = document.getElementById('detailProductImage');
const detailProductTitle = document.getElementById('detailProductTitle');
const detailProductDescription = document.getElementById('detailProductDescription');
const detailProductPrice = document.getElementById('detailProductPrice');
const productsContainer = document.getElementById('productList');

// --- Load Products ---
async function loadProducts() {
  const productsRef = collection(db, "products");
  const q = query(productsRef, orderBy("timestamp", "desc"));

  try {
    const querySnapshot = await getDocs(q);
    if (!productsContainer) {
      console.error("productsContainer element not found.");
      return;
    }
    productsContainer.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const productEl = document.createElement("div");
      productEl.className = "bg-white rounded-xl shadow-md p-4 mb-4";

      productEl.innerHTML = `
        <img src="${product.previewImageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" class="w-full h-48 object-cover rounded-md mb-2" />
        <h2 class="text-lg font-semibold">${product.title}</h2>
        <p class="text-gray-700 text-sm mb-2">${product.description}</p>
        <p class="font-bold">${parseFloat(product.price) === 0 ? 'Free' : '$' + parseFloat(product.price).toFixed(2)}</p>
        <button class="mt-2 w-full bg-blue-600 text-white py-2 rounded" onclick="showProductDetails('${docSnap.id}')">View Product</button>
      `;

      productsContainer.appendChild(productEl);
    });
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

// --- Show Tab ---
function showTab(tabId) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(section => section.classList.add('hidden'));
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove('hidden');
    target.scrollIntoView({ behavior: 'smooth' });
  } else {
    console.warn(`Tab with id "${tabId}" not found.`);
  }
}

// --- Enable Submit Button Placeholder ---
function enableSubmitButton() {
  const form = document.getElementById('productUploadForm');
  const button = document.getElementById('submitProductBtn');
  if (form && button) {
    button.disabled = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert("Product submission logic not yet implemented.");
    });
  } else {
    console.warn("Submit button or form not found.");
  }
}

// --- Product Details & Purchase ---
async function showProductDetails(productId) {
  showTab('productDetails');
  productDetailsError.classList.add('hidden');
  try {
    const productDoc = await getDoc(doc(db, "products", productId));
    if (!productDoc.exists()) {
      productDetailsError.textContent = 'Product not found.';
      productDetailsError.classList.remove('hidden');
      return;
    }
    const product = { id: productDoc.id, ...productDoc.data() };
    detailProductImage.src = product.previewImageUrl || 'https://via.placeholder.com/600x400?text=Product+Preview';
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    const displayPrice = parseFloat(product.price) === 0 ? 'Free' : `$${parseFloat(product.price).toFixed(2)}`;
    detailProductPrice.textContent = displayPrice;
    detailActionButton.className = 'w-full py-3 rounded-xl font-semibold transition';
    detailActionButton.disabled = false;

    if (parseFloat(product.price) > 0) {
      detailActionButton.style.display = 'none';
      paypalButtonContainer.innerHTML = '';

      if (typeof window.paypal !== "undefined" && window.paypal.Buttons) {
        window.paypal.Buttons({
          createOrder(data, actions) {
            return actions.order.create({
              purchase_units: [{ amount: { value: product.price.toString() }, description: product.title }]
            });
          },
          onApprove: async function(data, actions) {
            try {
              const orderID = data.orderID;
              const res = await fetch('https://paypal-verification-api.vercel.app/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: orderID,
                  expectedAmount: product.price,
                  productTitle: product.title
                })
              });
              const json = await res.json();

              if (!json.success) {
                alert("❌ Payment verification failed. Please contact support.");
                console.error("Verification failed:", json);
                return;
              }

              paypalButtonContainer.innerHTML = `<a href="${product.fileUrl}" target="_blank" class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition">Download Product</a>`;
              await handleProductPurchase(product);
              sendSaleEmail({
                buyerName: json.buyerName || 'Unknown',
                buyerEmail: json.buyerEmail || 'Unknown',
                sellerPaypalEmail: product.paypalEmail || 'Not Provided',
                productTitle: product.title || 'Unknown',
                amount: product.price || 'Unknown'
              });
            } catch (err) {
              alert("⚠️ An error occurred during secure payment verification.");
              console.error("Verification error:", err);
            }
          },
          onError(err) {
            alert('Payment could not be completed. Please try again.');
            console.error(err);
          }
        }).render('#paypal-button-container');
      } else {
        paypalButtonContainer.innerHTML = '<p class="text-red-600">PayPal buttons could not be loaded. Please refresh.</p>';
      }
    } else {
      detailActionButton.style.display = '';
      paypalButtonContainer.innerHTML = '';
      detailActionButton.textContent = 'Download';
      detailActionButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
      detailActionButton.onclick = () => window.open(product.fileUrl, '_blank');
      detailActionButton.setAttribute('aria-label', `Download ${product.title}`);
    }
  } catch (error) {
    console.error("Error loading product details:", error);
    productDetailsError.textContent = 'Error loading product details. Please try again.';
    productDetailsError.classList.remove('hidden');
  }
}

// --- Initial Load ---
loadProducts();
showTab('home');
enableSubmitButton();
