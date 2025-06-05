/**
 * TradeDeck Marketplace Backend
 * 
 * Node.js/Express server to handle PayPal payments for TradeDeck digital products.
 * - Sellers list products and set the price.
 * - Buyers pay through PayPal; you (the platform) receive funds, then payout to sellers later.
 * 
 * Endpoints:
 *   POST /api/create-order   { amount, description } => { orderID }
 *   POST /api/capture-order  { orderID }            => PayPal order details
 * 
 * Environment variables required:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_SECRET
 *   NODE_ENV
 * 
 * See README.md for setup instructions.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4242;

// PayPal REST API credentials (keep your secret safe!)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AbAmxidRUaYCqMND4GbNaw_9KBb6xEFlH1cLXoIwObQNjJtlgvJ0lSg7rvgVKGrwIQAWgmne6oAy0wFl';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'ENGPSkQBthNEfFNOztGCC2QU3qjlmesQu-URF2aZa-q793vvRW3KQOFjjG8yfceUhjn5kkPoX0YX0BP8';
const PAYPAL_API = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Optional: serve frontend

// Helper: Get OAuth access token from PayPal
async function getPayPalAccessToken() {
  const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const resp = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  return resp.data.access_token;
}

// API: Create PayPal Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Missing amount" });
    }
    const accessToken = await getPayPalAccessToken();
    const order = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
      intent: "CAPTURE",
      purchase_units: [{
        amount: { value: amount, currency_code: "USD" },
        description: description || "TradeDeck Product"
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ orderID: order.data.id });
  } catch (err) {
    console.error("PayPal create-order error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// API: Capture PayPal Order
app.post('/api/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) {
      return res.status(400).json({ error: "Missing orderID" });
    }
    const accessToken = await getPayPalAccessToken();
    const capture = await axios.post(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(capture.data);
  } catch (err) {
    console.error("PayPal capture-order error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to capture order" });
  }
});

// (Optional) Webhook endpoint for PayPal notifications
app.post('/api/paypal/webhook', (req, res) => {
  // You can verify signature and handle events such as PAYMENT.CAPTURE.COMPLETED
  console.log("PayPal webhook event:", req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`TradeDeck PayPal payment server running on port ${PORT}`);
});
