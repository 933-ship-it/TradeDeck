// --- Firebase imports via CDN ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- EmailJS import ---
import { init as emailjsInit, send as emailSend } from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

// --- Firebase config & init ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Initialize EmailJS ---
emailjsInit({ publicKey: "fmwYD8DAojsvufds2" });

// --- Utility: increment user balance ---
export async function incrementSellerBalance(sellerId, amount) {
  const ref = doc(db, "balances", sellerId);
  await runTransaction(db, async tx => {
    const s = await tx.get(ref);
    let curr = s.exists() ? (s.data().balance || 0) : 0;
    tx.set(ref, { balance: curr + amount, lastUpdated: serverTimestamp() }, { merge: true });
  });
}

// --- Utility: send sale email via EmailJS ---
export function sendSaleEmail({ buyerName, buyerEmail, sellerPaypalEmail, productTitle, amount }) {
  emailSend('service_px8mdvo', 'template_4gvs2zf', {
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    seller_paypal_email: sellerPaypalEmail,
    product_title: productTitle,
    amount: amount
  })
    .then(r => console.log("📧 Sale email sent:", r.status))
    .catch(err => console.error("📧 Email error:", err));
}
