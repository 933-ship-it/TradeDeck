// --- Imports ---
import { auth, db, incrementSellerBalance, sendSaleEmail } from './helpers.js';
import { collection, doc, addDoc, deleteDoc, updateDoc, query, where, orderBy, getDocs, getDoc, serverTimestamp, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// --- DOM elements & app logic ---
document.body.style.visibility = "hidden";
onAuthStateChanged(auth, user => {
  document.body.style.visibility = "";
  if (user) setupUser(user);
  else {
    document.getElementById('authOverlay').style.display = "flex";
  }
});

function setupUser(user) {
  document.getElementById('authOverlay').style.display = "none";
  initProfile(user);
  initNav();
  loadProducts();
}

// --- Profile UI setup ---
function initProfile(user) {
  const pic = document.getElementById('userProfilePic');
  const dropdown = document.getElementById('dropdownMenu');
  const emailElm = document.getElementById('userEmail');

  pic.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`;
  pic.classList.remove('hidden');
  emailElm.textContent = user.email || "(no email)"

  pic.onclick = e => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  };

  document.getElementById('signOutBtn').onclick = () => signOut(auth);
  document.getElementById('deleteAccountBtn').onclick = async () => {
    if (!confirm("Delete your account permanently?")) return;
    try {
      await deleteUser(user);
      window.location.reload();
    } catch(e) {
      alert("Action denied, please re-authenticate first.");
    }
  };
}

// --- Navigation and Listing Init ---
function initNav() {
  // Set up your tab logic, search input, and button listeners here
}

// --- Load all products for homepage ---
async function loadProducts() {
  // Pull Firestore products and render them into #productList container
}

// --- Show product details & PayPal integration ---
window.showProductDetails = async function (productId) {
  // Show modal, load product doc, render details, initialize PayPal.Buttons,
  // handle download, balance update and email via handle details
};

// --- Dashboard logic: list my products and balance watcher ---
async function loadDashboard() {
  // Query Firestore for currentUser's products
  onSnapshot(doc(db, "balances", auth.currentUser.uid), snap => {
    document.getElementById('sellerBalance').textContent = `$${(snap.data()?.balance||0).toFixed(2)}`;
  });
}

// --- Upload/sell product logic ---
document.getElementById('productUploadForm').addEventListener('submit', async e => {
  e.preventDefault();
  // Validate inputs, add Doc to products collection, reset UI & reload home/dashboard
});

// --- Cloudinary widget logic ---
window.cloudinary.createUploadWidget({
  cloudName: "...", uploadPreset: "..."
}, (error, result) => {
  // Store preview URL in hidden field, show thumbnail, etc.
});

// --- Utility display/rendering functions go here ---

// --- Initial load defaults ---
loadProducts();
