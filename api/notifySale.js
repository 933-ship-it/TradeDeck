import nodemailer from "nodemailer";

const {
  GMAIL_USER,
  GMAIL_PASS,
  NOTIFY_EMAIL,
  SECRET_KEY
} = process.env;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Security: Validate secret key from environment
  if (!req.body?.secret || req.body.secret !== SECRET_KEY) {
    return res.status(403).json({ error: "Forbidden: Invalid secret key" });
  }

  // Validate payload
  const {
    productTitle,
    sellerPaypalEmail,
    price,
    buyer,
    message,
    timestamp
  } = req.body;

  if (
    !productTitle ||
    !sellerPaypalEmail ||
    typeof price !== "number" ||
    !buyer ||
    !buyer.email ||
    !buyer.uid ||
    !message ||
    !timestamp
  ) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // Compose email content
  const emailBody = `
A new sale was made on TradeDeck!

Product: ${productTitle}
Sold For: $${price}
Seller PayPal Email: ${sellerPaypalEmail}

Buyer Info:
- Name: ${buyer.name || "N/A"}
- Email: ${buyer.email}
- UID: ${buyer.uid}

Message: ${message}

Sale Time: ${timestamp}

Check your admin dashboard for more details.
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"TradeDeck Sales" <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `New Sale: ${productTitle}`,
      text: emailBody
    });

    res.status(200).json({ message: "Sale notification sent!" });
  } catch (error) {
    // Log the error to the server
    console.error("Error sending sale notification email:", error);
    res.status(500).json({ error: "Email failed to send" });
  }
}