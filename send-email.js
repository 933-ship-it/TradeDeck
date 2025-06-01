import sgMail from "@sendgrid/mail";

const sender = process.env.SENDGRID_FROM_EMAIL; // Set this in Vercel environment variables

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Basic request validation
  const { to, subject, text, html } = req.body;
  if (
    !to ||
    typeof to !== "string" ||
    !subject ||
    typeof subject !== "string" ||
    (!text && !html)
  ) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  // Prevent email abuse by validating recipient
  // (For example, only allow emails to your domain or specific addresses in production)
  // Example: if (!to.endsWith('@mydomain.com')) return res.status(403).json({ error: "Unauthorized recipient" });

  const msg = {
    to,
    from: sender,
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    // Log errors for debugging
    console.error("SendGrid error:", error?.response?.body || error.message);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
