// --- Firebase Modular CDN Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Firebase App Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- EmailJS Initialization (global) ---
emailjs.init("fmwYD8DAojsvufds2");

// --- Send Sale Confirmation Email ---
export function sendSaleEmail({ buyerName, buyerEmail, sellerPaypalEmail, productTitle, amount }) {
  return emailjs.send("service_px8mdvo", "template_4gvs2zf", {
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    seller_paypal_email: sellerPaypalEmail,
    product_title: productTitle,
    amount: amount,
  });
}

// --- Update Seller's Balance in Firestore ---
export async function incrementSellerBalance(sellerId, amount) {
  const ref = doc(db, "balances", sellerId);
  await runTransaction(db, async (tx) => {
    const docSnap = await tx.get(ref);
    const current = docSnap.exists() ? docSnap.data().balance || 0 : 0;
    tx.set(ref, {
      balance: current + amount,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  });
}
