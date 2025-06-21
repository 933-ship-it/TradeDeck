// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Constants ---
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

// --- DOM References ---
const productsContainer = document.getElementById('productList');
const detailActionButton = document.getElementById('detailActionButton');
const paypalButtonContainer = document.getElementById('paypal-button-container');
const productDetailsError = document.getElementById('productDetailsError');
const detailProductImage = document.getElementById('detailProductImage');
const detailProductTitle = document.getElementById('detailProductTitle');
const detailProductDescription = document.getElementById('detailProductDescription');
const detailProductPrice = document.getElementById('detailProductPrice');

// --- Load All Products ---
async function loadProducts() {
  const productsRef = collection(db, "products");
  const q = query(productsRef, orderBy("timestamp", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    productsContainer.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const el = document.createElement("div");
      el.className = "bg-white rounded-xl shadow-md p-4 mb-4";
      el.innerHTML = `
        <img src="${product.previewImageUrl || 'https://via.placeholder.com/300x200'}" class="w-full h-48 object-cover rounded mb-2" />
        <h2 class="text-lg font-semibold">${product.title}</h2>
        <p class="text-gray-600 text-sm">${product.description}</p>
        <p class="font-bold">${parseFloat(product.price) === 0 ? 'Free' : '$' + parseFloat(product.price).toFixed(2)}</p>
        <button class="mt-2 w-full bg-blue-600 text-white py-2 rounded" data-id="${docSnap.id}">View Product</button>
      `;
      el.querySelector("button").addEventListener("click", () => showProductDetails(docSnap.id));
      productsContainer.appendChild(el);
    });
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

// --- Show Tab by ID ---
function showTab(tabId) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(section => section.classList.add('hidden'));
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove('hidden');
    target.scrollIntoView({ behavior: 'smooth' });
  } else {
    console.warn(`Tab "${tabId}" not found.`);
  }
}

// --- Display Product Detail ---
async function showProductDetails(productId) {
  showTab('productDetails');
  productDetailsError.classList.add('hidden');
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      productDetailsError.textContent = "Product not found.";
      productDetailsError.classList.remove('hidden');
      return;
    }

    const product = docSnap.data();
    detailProductImage.src = product.previewImageUrl || 'https://via.placeholder.com/600x400';
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    detailProductPrice.textContent = parseFloat(product.price) === 0 ? 'Free' : `$${parseFloat(product.price).toFixed(2)}`;
    detailActionButton.disabled = false;

    if (parseFloat(product.price) > 0) {
      detailActionButton.style.display = 'none';
      paypalButtonContainer.innerHTML = "";

      if (window.paypal && window.paypal.Buttons) {
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{ amount: { value: product.price.toString() }, description: product.title }]
            });
          },
          onApprove: async (data) => {
            try {
              const res = await fetch("https://paypal-verification-api.vercel.app/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderID: data.orderID,
                  expectedAmount: product.price,
                  productTitle: product.title
                })
              });
              const result = await res.json();
              if (!result.success) {
                alert("❌ Payment verification failed.");
                return;
              }

              paypalButtonContainer.innerHTML = `<a href="${product.fileUrl}" target="_blank" class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition">Download Product</a>`;
              sendSaleEmail({
                buyerName: result.buyerName || 'Unknown',
                buyerEmail: result.buyerEmail || 'Unknown',
                sellerPaypalEmail: product.paypalEmail || 'Not Provided',
                productTitle: product.title,
                amount: product.price
              });

            } catch (err) {
              alert("Payment verification failed.");
              console.error(err);
            }
          },
          onError(err) {
            alert("Error with PayPal payment.");
            console.error(err);
          }
        }).render('#paypal-button-container');
      } else {
        paypalButtonContainer.innerHTML = '<p class="text-red-500">PayPal failed to load.</p>';
      }
    } else {
      detailActionButton.style.display = 'block';
      paypalButtonContainer.innerHTML = '';
      detailActionButton.textContent = "Download";
      detailActionButton.className = 'w-full bg-green-600 text-white py-3 rounded';
      detailActionButton.onclick = () => {
        if (!product.fileUrl) {
          alert("No file available for download.");
          return;
        }
        window.open(product.fileUrl, '_blank');
      };
    }

  } catch (err) {
    console.error("Error showing product details:", err);
    productDetailsError.textContent = "Error loading product.";
    productDetailsError.classList.remove('hidden');
  }
}

// --- Send Email Notification ---
function sendSaleEmail({ buyerName, buyerEmail, sellerPaypalEmail, productTitle, amount }) {
  if (typeof emailjs === 'undefined') {
    console.error("EmailJS SDK not found.");
    return;
  }

  emailjs.send("service_px8mdvo", "template_4gvs2zf", {
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    seller_email: sellerPaypalEmail,
    product_title: productTitle,
    amount: amount
  }).then(() => {
    console.log("Sale email sent successfully.");
  }).catch((error) => {
    console.error("Failed to send sale email:", error);
  });
}

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  showTab("home");
});
