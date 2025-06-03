(function ensurePayPalCSP() {
  const cspContent = [
    "script-src 'self' https://www.paypal.com https://www.paypalobjects.com https://*.paypal.com https://*.paypalobjects.com https://cdn.jsdelivr.net https://www.gstatic.com https://widget.cloudinary.com 'unsafe-inline' 'unsafe-eval';",
    "style-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com https://fonts.googleapis.com https://cdn.jsdelivr.net;",
    "img-src * data: blob:;",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com;",
    "connect-src *;",
    "font-src 'self' https://fonts.gstatic.com;"
  ].join(' ');

  const existing = Array.from(document.getElementsByTagName('meta')).find(meta =>
    meta.httpEquiv && meta.httpEquiv.toLowerCase() === 'content-security-policy'
  );

  if (!existing) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspContent;
    document.head.prepend(meta);
  }
})();
