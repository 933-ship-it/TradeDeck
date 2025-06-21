// File: js/helpers.js
// Fully production-ready utility functions

// Firebase Modular SDK (required for Firestore access here)
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { send } from "https://cdn.jsdelivr.net/npm/emailjs-com@3.2.0/dist/email.min.js";

/**
 * Sends a transaction email to a buyer or seller
 * @param {string} template - emailjs template ID
 * @param {Object} variables - data to populate the email template
 * @returns {Promise<void>}
 */
export async function sendEmailNotification(template, variables) {
  try {
    await send("service_w8u2lvj", template, variables, "fmwYD8DAojsvufds2");
    console.log("✅ Email sent");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
}

/**
 * Formats a number to USD
 * @param {number} amount
 * @returns {string}
 */
export function formatUSD(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Increments user balance in Firestore
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<void>}
 */
export async function incrementUserBalance(userId, amount) {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, { balance: increment(amount) });
    console.log(`💰 Balance updated for ${userId}`);
  } catch (err) {
    console.error("❌ Error updating balance:", err);
  }
}
