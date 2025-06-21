// js/helpers.js

/** Sends an email notification via EmailJS */
export async function sendEmailNotification(toEmail, productTitle, amount) {
  try {
    const templateParams = {
      seller_email: toEmail,
      product_title: productTitle,
      amount: amount.toString(),
    };
    const res = await emailjs.send("service_px8mdvo", "template_4gvs2zf", templateParams);
    console.log("Sale email sent:", res.status, res.text);
  } catch (err) {
    console.error("Failed sending sale email:", err);
  }
}

/** Show toast-like notifications in-app */
export function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.textContent = message;
  el.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white ${
    type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-gray-700"
  }`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/** Simple validation: ensure required fields present */
export function validateFields(obj, requiredFields = []) {
  const errors = [];
  requiredFields.forEach((f) => {
    if (!obj[f] || obj[f].toString().trim() === "") {
      errors.push(`${f} is required.`);
    }
  });
  return errors;
}
