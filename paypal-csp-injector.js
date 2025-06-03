(function ensurePayPalCSP() {
  // The recommended PayPal CSP policy - edit as needed for your use-case
  const cspContent = [
    "script-src 'self' https://www.paypal.com https://www.paypalobjects.com https://*.paypal.com https://*.paypalobjects.com 'unsafe-inline' 'unsafe-eval';",
    "style-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com;",
    "img-src * data: blob:;",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com;",
    "connect-src *;"
  ].join(' ');

  // Check if a CSP <meta> for PayPal exists already
  const existing = Array.from(document.getElementsByTagName('meta')).find(meta =>
    meta.httpEquiv && meta.httpEquiv.toLowerCase() === 'content-security-policy' &&
    meta.content && (
      meta.content.includes('paypal.com') || meta.content.includes('paypalobjects.com')
    )
  );

  if (!existing) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspContent;
    document.head.prepend(meta);
    // Optional: diagnostics
    // console.log('PayPal CSP meta tag injected');
  }
})();
