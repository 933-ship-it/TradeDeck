// js/production-app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  sendEmailNotification,
  showToast
} from "./helpers.js";

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

// Elements
const userPic = document.getElementById("userProfilePic");
const userEmailEl = document.getElementById("userEmail");
const productListEl = document.getElementById("productList");
const balanceEl = document.getElementById("sellerBalance");
const homeSection = document.getElementById("home");
const pdSection = document.getElementById("productDetails");
const backBtn = document.getElementById("backToHomeBtn");

// Auth state handling
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("authOverlay").style.display = "flex";
    return;
  }
  userPic.src = user.photoURL || "";
  userPic.classList.remove("hidden");
  userEmailEl.textContent = user.email;
  await loadProducts();
  await loadMyProducts();
  await updateBalance(user.uid);
});

// Navigation: clicking sidebar links
document.querySelectorAll("aside nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.getAttribute("href").slice(1);
    document.querySelectorAll("main section").forEach((s) => s.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
    document.querySelectorAll("aside nav a").forEach((l) => l.classList.remove("bg-blue-100"));
    link.classList.add("bg-blue-100");
  });
});

backBtn.addEventListener("click", () => {
  pdSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
});

document.getElementById("signOutBtn").onclick = () => signOut(auth);
document.getElementById("deleteAccountBtn").onclick = async () => {
  if (confirm("Really delete account?")) {
    await deleteUser(auth.currentUser);
    window.location.reload();
  }
};

// Load products in home view
async function loadProducts() {
  productListEl.innerHTML = "";
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach((d) => {
    const data = d.data();
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow cursor-pointer p-4";
    card.innerHTML = `
      <img src="${data.previewImage}" class="rounded-md mb-4 w-full h-40 object-cover"/>
      <h3 class="font-semibold text-gray-800">${data.title}</h3>
      <p class="text-blue-600 font-bold">$${data.price}</p>
    `;
    card.onclick = () => showProductDetail(d.id, data);
    productListEl.appendChild(card);
  });
}

// Detailed product view and PayPal logic
function showProductDetail(id, data) {
  homeSection.classList.add("hidden");
  pdSection.classList.remove("hidden");
  document.getElementById("detailProductImage").src = data.previewImage;
  document.getElementById("detailProductTitle").textContent = data.title;
  document.getElementById("detailProductDescription").textContent = data.description;
  document.getElementById("detailProductPrice").textContent = `$${data.price}`;
  const btn = document.getElementById("detailActionButton");
  btn.textContent = data.price > 0 ? "Buy Now" : "Download Free";

  btn.onclick = async () => {
    if (data.price > 0) {
      loadPayPal(data, id);
    } else {
      window.open(data.fileUrl, "_blank");
    }
  };
}

function loadPayPal(data, id) {
  document.getElementById("paypal-button-container").innerHTML = "";
  paypal.Buttons({
    createOrder: () =>
      fetch("https://verify-payment-js.vercel.app/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: data.price }),
      })
        .then((res) => res.json())
        .then((r) => r.orderID),
    onApprove: (payData) =>
      fetch("https://verify-payment-js.vercel.app/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: payData.orderID }),
      })
        .then((res) => res.json())
        .then(async (rr) => {
          if (rr.verified) {
            await updateDoc(doc(db, "balances", data.sellerId), {
              balance: rr.newBalance,
            });
            await sendEmailNotification(data.sellerEmail, data.title, data.price);
            showToast("Payment success!", "success");
            window.open(data.fileUrl, "_blank");
          } else {
            showToast("Payment verification failed", "error");
          }
        }),
  }).render("#paypal-button-container");
}

async function loadMyProducts() {
  const uid = auth.currentUser.uid;
  const q = query(collection(db, "products"), where("sellerId", "==", uid));
  const snap = await getDocs(q);
  const myList = document.getElementById("myProducts");
  myList.innerHTML = "";
  snap.forEach((d) => {
    const data = d.data();
    if (!data) return;
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow p-4";
    card.innerHTML = `
      <h4 class="font-semibold">${data.title}</h4>
      <p class="text-blue-600">$${data.price}</p>
      <a href="${data.fileUrl}" class="text-sm text-blue-500 underline">Download</a>
    `;
    myList.appendChild(card);
  });
}

async function updateBalance(uid) {
  const snap = await getDoc(doc(db, "balances", uid));
  let balance = 0;
  if (snap.exists()) {
    const data = snap.data();
    balance = typeof data.balance === "number" ? data.balance : 0;
  }
  balanceEl.textContent = `$${balance.toFixed(2)}`;
}
