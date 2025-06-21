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
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- External Helper Functions ---
import { sendEmailNotification, validateFields, showToast } from "./helpers.js";

// --- Firebase App Init ---
const firebaseConfig = {
  apiKey: "AIzaSyB4WYZojOArqdAceRQZD6a6re7MP0Ikl0c",
  authDomain: "fluxr-913c8.firebaseapp.com",
  projectId: "fluxr-913c8",
  storageBucket: "fluxr-913c8.appspot.com",
  messagingSenderId: "779319537916",
  appId: "1:779319537916:web:5afa18aade22959ca3a779"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elements ---
const userPic = document.getElementById("userProfilePic");
const dropdown = document.getElementById("dropdownMenu");
const userEmailEl = document.getElementById("userEmail");
const productListEl = document.getElementById("productList");
const balanceEl = document.getElementById("sellerBalance");
const navLinks = document.querySelectorAll("nav a");
const sections = document.querySelectorAll("main section");

// --- State ---
let currentUser = null;

// --- Auth State ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("authOverlay").style.display = "flex";
    return;
  }

  currentUser = user;
  userPic.src = user.photoURL;
  userEmailEl.textContent = user.email;
  userPic.classList.remove("hidden");

  await loadProducts();
  await loadMyProducts();
  updateBalance();
});

// --- Navigation Tabs ---
navLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const tab = link.getAttribute("href").substring(1);
    sections.forEach(s => s.classList.add("hidden"));
    document.getElementById(tab).classList.remove("hidden");

    navLinks.forEach(l => l.classList.remove("bg-blue-100"));
    link.classList.add("bg-blue-100");
  });
});

// --- Sign Out + Delete ---
document.getElementById("signOutBtn").onclick = () => signOut(auth);
document.getElementById("deleteAccountBtn").onclick = async () => {
  if (confirm("Are you sure you want to delete your account?")) {
    await deleteUser(currentUser);
    window.location.reload();
  }
};

// --- Load Products ---
async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  productListEl.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow product-card p-4";
    card.innerHTML = `
      <img src="${data.previewImage}" alt="Preview" class="rounded-md mb-4 w-full h-40 object-cover" />
      <h3 class="text-lg font-semibold text-gray-900">${data.title}</h3>
      <p class="text-sm text-gray-600 truncate">${data.description}</p>
      <p class="text-blue-600 font-bold mt-2">$${data.price}</p>
    `;
    card.onclick = () => showProductDetail(docSnap.id, data);
    productListEl.appendChild(card);
  });
}

// --- Show Product Detail ---
function showProductDetail(id, data) {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("productDetails").classList.remove("hidden");

  document.getElementById("detailProductTitle").textContent = data.title;
  document.getElementById("detailProductDescription").textContent = data.description;
  document.getElementById("detailProductPrice").textContent = `$${data.price}`;
  document.getElementById("detailProductImage").src = data.previewImage;

  const actionBtn = document.getElementById("detailActionButton");
  actionBtn.textContent = data.price > 0 ? "Buy Now" : "Download Free";
  actionBtn.onclick = () => {
    if (data.price > 0) {
      loadPayPal(data, id);
    } else {
      window.open(data.fileUrl, "_blank");
    }
  };
}

// --- PayPal Integration ---
function loadPayPal(product, id) {
  document.getElementById("paypal-button-container").innerHTML = "";
  paypal.Buttons({
    style: { layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal' },
    createOrder: function () {
      return fetch("https://verify-payment-js.vercel.app/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: product.price })
      })
        .then(res => res.json())
        .then(data => data.orderID);
    },
    onApprove: function (data) {
      return fetch("https://verify-payment-js.vercel.app/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: data.orderID })
      })
        .then(res => res.json())
        .then(async res => {
          if (res.verified) {
            await updateDoc(doc(db, "users", product.seller), {
              balance: res.sellerNewBalance
            });
            await sendEmailNotification(product.sellerEmail, product.title, product.price);
            showToast("Purchase successful", "success");
            window.open(product.fileUrl, "_blank");
          } else {
            showToast("Payment could not be verified", "error");
          }
        });
    }
  }).render("#paypal-button-container");
}

// --- Back Button ---
document.getElementById("backToHomeBtn").onclick = () => {
  document.getElementById("productDetails").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
};

// --- Dashboard Products ---
async function loadMyProducts() {
  const q = query(collection(db, "products"), where("uid", "==", currentUser.uid));
  const snapshot = await getDocs(q);
  const container = document.getElementById("myProducts");
  container.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "bg-white p-4 rounded-xl shadow interactive-card border border-gray-200";
    card.innerHTML = `
      <h4 class="font-semibold">${data.title}</h4>
      <p class="text-sm text-gray-600">$${data.price}</p>
      <a class="text-blue-600 text-sm underline mt-1 block" href="${data.fileUrl}" target="_blank">Download</a>
    `;
    container.appendChild(card);
  });
}

// --- Balance Calculation ---
async function updateBalance() {
  const q = query(collection(db, "transactions"), where("to", "==", currentUser.uid));
  const snapshot = await getDocs(q);
  const total = snapshot.docs.reduce((acc, doc) => acc + parseFloat(doc.data().amount || 0), 0);
  balanceEl.textContent = `$${total.toFixed(2)}`;
}
