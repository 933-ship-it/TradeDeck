// --- Firebase Modular SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyB4WYZojOArqdAceRQZD6a6re7MP0Ikl0c",
  authDomain: "fluxr-913c8.firebaseapp.com",
  projectId: "fluxr-913c8",
  storageBucket: "fluxr-913c8.appspot.com",
  messagingSenderId: "779319537916",
  appId: "1:779319537916:web:5afa18aade22959ca3a779",
  measurementId: "G-QX76Q1Z1QB"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Cloudinary Upload Widget ---
export function openCloudinaryWidget(callback) {
  cloudinary.openUploadWidget({
    cloudName: 'demo', // replace with your Cloudinary cloud name
    uploadPreset: 'preset', // replace with your upload preset
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
  },
  (err, result) => {
    if (!err && result && result.event === "success") {
      callback(result.info.secure_url);
    }
  });
}

// --- EmailJS Notification ---
export async function sendEmailNotification(productData) {
  try {
    const emailParams = {
      to_name: productData.sellerName || "Seller",
      message: `Your product "${productData.title}" was purchased for $${productData.price}`,
      product_title: productData.title,
      product_price: productData.price,
      reply_to: "noreply@tradedeck.com"
    };

    const response = await emailjs.send("service_myo2nbi", "template_xz1f9rb", emailParams, {
      publicKey: "fmwYD8DAojsvufds2"
    });

    console.log("✅ Email sent", response.status);
  } catch (err) {
    console.error("❌ Email failed", err);
  }
}

// --- Utility: Format Price ---
export function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

// --- Firebase Exports ---
export {
  auth, db,
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
  onAuthStateChanged, signOut, deleteUser
};
