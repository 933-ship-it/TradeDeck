// --- Core Product Display and Details Functions ---

/**
 * Fetches and displays all listed products on the Home tab.
 */
async function loadProducts() {
  const productsRef = collection(db, "products");
  const q = query(productsRef, orderBy("timestamp", "desc"));

  try {
    const querySnapshot = await getDocs(q);
    productsContainer.innerHTML = ""; // Clear existing products

    querySnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const productEl = document.createElement("div");
      productEl.className = "bg-white rounded-xl shadow-md p-4 mb-4";
      productEl.innerHTML = `
        <img src="${product.previewImageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" class="w-full h-48 object-cover rounded-md mb-2" />
        <h2 class="text-lg font-semibold">${product.title}</h2>
        <p class="text-gray-700 text-sm mb-2">${product.description}</p>
        <p class="font-bold">${parseFloat(product.price) === 0 ? 'Free' : '$' + parseFloat(product.price).toFixed(2)}</p>
        <button class="mt-2 w-full bg-blue-600 text-white py-2 rounded" onclick="showProductDetails('${docSnap.id}')">View Product</button>
      `;
      productsContainer.appendChild(productEl);
    });
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

/**
 * Shows full details of a product (price, description, PayPal button).
 * @param {string} productId - The ID of the product to display.
 */
async function showProductDetails(productId) {
  showTab('productDetails');
  productDetailsError.classList.add('hidden'); // Hide any previous error

  try {
    const productDoc = await getDoc(doc(db, "products", productId));
    if (!productDoc.exists()) {
      productDetailsError.textContent = 'Product not found.';
      productDetailsError.classList.remove('hidden');
      return;
    }

    const product = { id: productDoc.id, ...productDoc.data() };
    detailProductImage.src = product.previewImageUrl || 'https://via.placeholder.com/600x400?text=Product+Preview';
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    const displayPrice = parseFloat(product.price) === 0 ? 'Free' : `$${parseFloat(product.price).toFixed(2)}`;
    detailProductPrice.textContent = displayPrice;

    // Reset action button styles and enable it
    detailActionButton.className = 'w-full py-3 rounded-xl font-semibold transition';
    detailActionButton.disabled = false;

    if (parseFloat(product.price) > 0) {
      detailActionButton.style.display = 'none'; // Hide general action button for paid products
      paypalButtonContainer.innerHTML = ''; // Clear previous PayPal buttons

      // Render PayPal buttons if PayPal SDK is loaded
      if (typeof window.paypal !== "undefined" && window.paypal.Buttons) {
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{ amount: { value: product.price.toString() }, description: product.title }]
            });
          },
          onApprove: async (data, actions) => {
            try {
              const orderID = data.orderID;
              const res = await fetch('https://paypal-verification-api.vercel.app/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: orderID,
                  expectedAmount: product.price,
                  productTitle: product.title
                })
              });

              const json = await res.json();
              if (!json.success) {
                alert("❌ Payment verification failed. Please contact support.");
                return;
              }

              // On successful verification, show download link
              paypalButtonContainer.innerHTML = `<a href="${product.fileUrl}" target="_blank" class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition">Download Product</a>`;
              await handleProductPurchase(product); // Handle backend purchase logic
              sendSaleEmail({
                buyerName: json.buyerName || 'Unknown',
                buyerEmail: json.buyerEmail || 'Unknown',
                sellerPaypalEmail: product.paypalEmail || 'Not Provided',
                productTitle: product.title || 'Unknown',
                amount: product.price || 'Unknown'
              });
            } catch (err) {
              alert("⚠️ An error occurred during secure payment verification.");
              console.error("Verification error:", err);
            }
          },
          onError(err) {
            alert('Payment could not be completed. Please try again.');
            console.error(err);
          }
        }).render('#paypal-button-container');
      } else {
        paypalButtonContainer.innerHTML = '<p class="text-red-600">PayPal buttons could not be loaded. Please refresh.</p>';
      }
    } else {
      // For free products, show a direct download button
      detailActionButton.style.display = ''; // Show general action button
      paypalButtonContainer.innerHTML = ''; // Ensure PayPal container is empty
      detailActionButton.textContent = 'Download';
      detailActionButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
      detailActionButton.onclick = () => window.open(product.fileUrl, '_blank');
      detailActionButton.setAttribute('aria-label', `Download ${product.title}`);
    }
  } catch (error) {
    console.error("Error loading product details:", error);
    productDetailsError.textContent = 'Error loading product details. Please try again.';
    productDetailsError.classList.remove('hidden');
  }
}

// --- Utility Functions ---

/**
 * Handles tab visibility (Home, Sell, Dashboard, etc.).
 * @param {string} tabId - The ID of the tab (section) to show.
 */
function showTab(tabId) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(section => {
    section.classList.add('hidden'); // Hide all sections
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove('hidden'); // Show the target section
    target.scrollIntoView({ behavior: 'smooth' }); // Smooth scroll to the tab
  } else {
    console.warn(`Tab with id "${tabId}" not found.`);
  }
}

/**
 * Placeholder function for handling product purchase logic (e.g., updating seller balance).
 * You should implement specific logic here based on your application's needs.
 * @param {object} product - The product object that was purchased.
 */
async function handleProductPurchase(product) {
  // Example: Update seller balance, mark purchase in DB, etc.
  console.log("Handling purchase for:", product.title);
  // Add your specific purchase handling logic here, e.g.:
  // await updateDoc(doc(db, "users", sellerId), { balance: increment(product.price) });
  // await addDoc(collection(db, "purchases"), { userId: currentUserId, productId: product.id, timestamp: serverTimestamp() });
}

/**
 * Sends a sale notification email using EmailJS.
 * Ensure EmailJS SDK is loaded and initialized, and "service_id" and "template_id" are correctly set.
 * @param {object} details - An object containing buyer, seller, product, and amount details for the email.
 */
function sendSaleEmail(details) {
  if (typeof emailjs === 'undefined') {
    console.error("EmailJS SDK is not loaded. Cannot send email.");
    return;
  }
  // Replace "service_id" and "template_id" with your actual EmailJS IDs
  emailjs.send("service_id", "template_id", {
    buyer_name: details.buyerName,
    buyer_email: details.buyerEmail,
    seller_email: details.sellerPaypalEmail,
    product_title: details.productTitle,
    amount: details.amount
  }).then(() => {
    console.log("Sale email sent successfully!");
  }).catch((error) => {
    console.error("Failed to send sale email:", error);
  });
}
