// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const bannedWords = ["fuck", "shit", "bitch", "ass", "dick", "cunt", "nigger", "fag"];
function containsOffensiveLanguage(str) {
  return bannedWords.some(word => str.toLowerCase().includes(word));
}

async function promptUsername(user) {
  let username = prompt("Choose a username (no offensive words):");
  if (!username || containsOffensiveLanguage(username)) {
    alert("Invalid or offensive username. Please try again.");
    return promptUsername(user);
  }
  await updateProfile(user, { displayName: username });
  await setDoc(doc(db, "users", user.uid), {
    username,
    email: user.email,
    photoURL: user.photoURL || "",
    joined: serverTimestamp()
  }, { merge: true });
}

onAuthStateChanged(auth, async user => {
  if (user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!user.displayName || !userDoc.exists()) {
      await promptUsername(user);
    }
    document.getElementById("userEmail").innerText = user.email;
    document.getElementById("userProfilePic").src = user.photoURL || "https://via.placeholder.com/150";
    document.getElementById("userProfilePic").classList.remove("hidden");
    loadProducts();
    showTab("home");
    enableSubmitButton();
    loadDashboard(user.uid);
  } else {
    document.getElementById("authOverlay").style.display = "flex";
  }
});

document.getElementById("userProfilePic")?.addEventListener("click", async () => {
  const newPic = prompt("Enter URL for new profile picture:");
  if (newPic) {
    try {
      await updateProfile(auth.currentUser, { photoURL: newPic });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: newPic });
      document.getElementById("userProfilePic").src = newPic;
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Failed to update profile picture:", err);
      alert("Failed to update profile picture.");
    }
  }
});

function showTab(tabId) {
  document.querySelectorAll("main section").forEach(el => el.classList.add("hidden"));
  const el = document.getElementById(tabId);
  if (el) el.classList.remove("hidden");
}

function enableSubmitButton() {
  const btn = document.querySelector("button[type='submit']");
  if (btn) btn.disabled = false;
}

async function loadProducts(category = "All") {
  const productList = document.getElementById("productList");
  const noProductsMsg = document.getElementById("noProductsMessage");
  productList.innerHTML = "";
  noProductsMsg.classList.remove("hidden");

  let q = query(collection(db, "products"), orderBy("rating", "desc"));
  if (category !== "All") {
    q = query(collection(db, "products"), where("category", "==", category));
  }

  const snap = await getDocs(q);
  if (snap.empty) {
    noProductsMsg.innerText = "No products found.";
    return;
  }

  noProductsMsg.classList.add("hidden");
  snap.forEach(docSnap => {
    const product = docSnap.data();
    const div = document.createElement("div");
    div.className = "product-card p-4 bg-white rounded-xl shadow hover:shadow-lg";
    div.innerHTML = `
      <img src="${product.previewImageUrl}" class="w-full h-40 object-cover rounded mb-4" />
      <h4 class="text-lg font-bold mb-1">${product.title}</h4>
      <p class="text-sm text-gray-600 mb-2">${product.description}</p>
      <p class="text-blue-600 font-semibold">$${parseFloat(product.price).toFixed(2)}</p>
      <p class="text-xs text-gray-400 mt-1">Category: ${product.category || "N/A"} | Rating: ${product.rating || 0}/10</p>
      <button onclick="rateProduct('${docSnap.id}')" class="text-sm text-indigo-500 mt-2">Rate</button>
    `;
    productList.appendChild(div);
  });
}

async function rateProduct(productId) {
  const rating = prompt("Rate this product (1-10):");
  const score = parseInt(rating);
  if (isNaN(score) || score < 1 || score > 10) return alert("Invalid rating.");

  const ref = doc(db, "products", productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data();
  const newRating = Math.min(10, ((current.rating || 0) + score) / 2);
  await updateDoc(ref, { rating: newRating });
  alert("Thanks for rating!");
  loadProducts();
}

async function loadDashboard(uid) {
  const myProducts = document.getElementById("myProducts");
  const snap = await getDocs(query(collection(db, "products"), where("owner", "==", uid)));
  myProducts.innerHTML = "";
  snap.forEach(docSnap => {
    const product = docSnap.data();
    const div = document.createElement("div");
    div.className = "product-card p-4 bg-white rounded-xl shadow";
    div.innerHTML = `
      <h4 class="text-lg font-bold mb-1">${product.title}</h4>
      <p class="text-sm text-gray-600 mb-1">Price: $${product.price}</p>
      <p class="text-sm text-gray-600 mb-2">Category: ${product.category || "None"}</p>
      <button onclick="editProduct('${docSnap.id}')" class="text-blue-500 text-sm">Edit</button>
    `;
    myProducts.appendChild(div);
  });
}

async function editProduct(id) {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const newTitle = prompt("Edit title:", data.title);
  const newPrice = prompt("Edit price:", data.price);
  const newDesc = prompt("Edit description:", data.description);
  const newPreview = prompt("Edit preview image URL:", data.previewImageUrl);
  const newCat = prompt("Edit category:", data.category);

  await updateDoc(ref, {
    title: newTitle,
    price: parseFloat(newPrice),
    description: newDesc,
    previewImageUrl: newPreview,
    category: newCat
  });

  alert("Product updated.");
  loadDashboard(auth.currentUser.uid);
}
