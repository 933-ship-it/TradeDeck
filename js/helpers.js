// --- Firebase Modular SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.firebasestorage.app",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Utility: Format Price ---
export function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

// --- Toast Notification ---
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 px-4 py-2 rounded-lg text-white font-semibold z-50 transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    'bg-gray-800'
  }`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- EmailJS Notification ---
export async function sendEmailNotification({ product_title, price, buyer_email, seller_email }) {
  try {
    const templateParams = {
      product_title,
      product_price: formatPrice(price),
      buyer_email,
      seller_email
    };

    const response = await emailjs.send("service_myo2nbi", "template_xz1f9rb", templateParams, "fmwYD8DAojsvufds2");
    console.log("✅ Email sent:", response.status);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
}

// --- Cloudinary Upload Widget ---
export function openCloudinaryWidget(callback) {
  cloudinary.openUploadWidget({
    cloudName: 'demo', // Replace with your real cloud name
    uploadPreset: 'tradedeck_preset', // Replace with your real preset
    sources: ['local', 'url', 'camera'],
    multiple: false,
    cropping: false,
    defaultSource: 'local',
    resourceType: 'image',
    maxFileSize: 10485760,
    clientAllowedFormats: ['jpg', 'jpeg', 'png'],
    styles: {
      palette: {
        window: "#f5f5f5",
        sourceBg: "#ffffff",
        windowBorder: "#90a0b3",
        tabIcon: "#0078ff",
        inactiveTabIcon: "#69778a",
        menuIcons: "#555a5f",
        link: "#0078ff",
        action: "#339933",
        inProgress: "#0078ff",
        complete: "#339933",
        error: "#cc0000",
        textDark: "#000000",
        textLight: "#ffffff"
      }
    }
  }, (err, result) => {
    if (!err && result && result.event === "success") {
      callback(result.info.secure_url);
    }
  });
}

// --- Firebase SDK Exports ---
export {
  auth, db,
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
  onAuthStateChanged, signOut, deleteUser
};
