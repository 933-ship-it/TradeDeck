import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { sendEmailNotification } from "./helpers.js"; // if using separate helper

const firebaseConfig = {
  // your Firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready");

  const signOutBtn      = document.getElementById("signOutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const userProfilePic  = document.getElementById("userProfilePic");
  const dropdownMenu    = document.getElementById("dropdownMenu");
  const userEmailEl     = document.getElementById("userEmail");
  const authOverlay     = document.getElementById("authOverlay");
  const tabs            = document.querySelectorAll("aside nav a[data-tab]");
  const sections        = document.querySelectorAll("main section");
  const backToHomeBtn   = document.getElementById("backToHomeBtn");

  // Dashboard & product-detail buttons
  const sellerBalanceEl        = document.getElementById("sellerBalance");
  const paypalBtnContainer     = document.getElementById("paypal-button-container");
  const detailProductImage     = document.getElementById("detailProductImage");
  const detailProductTitle     = document.getElementById("detailProductTitle");
  const detailProductDesc      = document.getElementById("detailProductDescription");
  const detailProductPrice     = document.getElementById("detailProductPrice");
  const detailActionBtn        = document.getElementById("detailActionButton");
  const productDetailsSection  = document.getElementById("productDetails");

  // Validate critical elements:
  if (!authOverlay || !tabs.length || !sections.length || !sellerBalanceEl || !paypalBtnContainer) {
    console.error("❌ One or more critical DOM elements are missing");
    return;
  }

  // --- Auth State Handling ---
  onAuthStateChanged(auth, user => {
    if (user) {
      authOverlay.style.display = "none";
      userProfilePic.style.visibility = "";
      userProfilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "")}`;
      userEmailEl.textContent = user.email;
    } else {
      authOverlay.style.display = "flex";
    }
  });

  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => signOut(auth));
  }
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async () => {
      try {
        await deleteUser(auth.currentUser);
        alert("Account deleted.");
      } catch (e) {
        alert("Delete failed.");
        console.error(e);
      }
    });
  }

  // --- Tab Navigation Handler ---
  tabs.forEach(tab => {
    tab.addEventListener("click", async e => {
      e.preventDefault();
      const target = tab.getAttribute("data-tab");
      sections.forEach(s => s.id === target ? s.classList.remove("hidden") : s.classList.add("hidden"));
      if (target === "dashboard") {
        // load dashboard-related logic here...
      }
      if (target === "home") {
        // load home page...
      }
    });
  });

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", () => {
      sections.forEach(s => s.id === "home" ? s.classList.remove("hidden") : s.classList.add("hidden"));
    });
  }

  // --- Product Details View ---
  window.showProductDetails = async productId => {
    if (!productId) return;
    productDetailsSection.classList.remove("hidden");
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return alert("Product not found.");
    const prod = { id: snap.id, ...snap.data() };
    detailProductImage.src = prod.previewImageUrl;
    detailProductTitle.textContent = prod.title;
    detailProductDesc.textContent = prod.description;
    detailProductPrice.textContent = `$${prod.price?.toFixed(2)}`;

    if (prod.price > 0) {
      detailActionBtn.style.display = "none";
      paypalBtnContainer.innerHTML = "";
      window.paypal.Buttons({
        createOrder: (data, actions) =>
          actions.order.create({
            purchase_units: [{ amount: { value: prod.price.toFixed(2) }, description: prod.title }]
          }),
        onApprove: async (data, actions) => {
          const res = await actions.order.capture();
          paypalBtnContainer.innerHTML = `<a href="${prod.fileUrl}" target="_blank" class="w-full bg-green-500 text-white py-3 rounded-xl flex justify-center">Download</a>`;
          await incrementSellerBalance(prod.sellerId, parseFloat(prod.price));
          sendEmailNotification(prod, res);
        },
        onError: err => console.error(err)
      }).render("#paypal-button-container");
    } else {
      detailActionBtn.style.display = "";
      detailActionBtn.textContent = "Download";
      detailActionBtn.onclick = () => window.open(prod.fileUrl, "_blank");
    }
  };

  // --- Increment Balance Logic ---
  async function incrementSellerBalance(uid, delta) {
    const ref = doc(db, "balances", uid);
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const curr = (snap.data()?.balance || 0);
      tx.set(ref, { balance: curr + delta }, { merge: true });
    });
  }

  console.log("✅ production-app.js loaded");
});
