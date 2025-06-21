// verify-functions.js
export async function handlePayPalApproval({
  data, actions, product,
  updateUI, sendEmail,
  verifyBackendURL, updateSellerBalanceFn
}) {
  const details = await actions.order.capture();  // Optional: you could omit client-side capture to defer to backend.

  const res = await fetch(verifyBackendURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'paypal-verify', orderID: data.orderID })
  });
  const json = await res.json();

  if (!json.verified) {
    alert(`Payment verification failed: ${json.error || 'Unknown error'}`);
    return;
  }

  updateUI(product);
  await updateSellerBalanceFn(product.sellerId, product.price);

  sendEmail({
    buyerName: details.payer.name.given_name,
    buyerEmail: details.payer.email_address,
    sellerPaypalEmail: product.paypalEmail,
    productTitle: product.title,
    amount: product.price
  });
}
