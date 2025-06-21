// --- Imports ---
// Firebase SDK imports (version 9.22.2)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
    getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Local module import for secure PayPal flow (assumes this file exists)
import { handlePayPalApproval } from './verify-functions.js';

// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck.com/";
const VERIFY_URL = 'https://verify-payment-js.vercel.app/api/secure-gateway'; // PayPal verification endpoint

// --- Firebase Initialization ---
// IMPORTANT: Replace placeholder values with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.firebasestorage.app",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- DOM References ---
// General UI elements
const authOverlay = document.getElementById('authOverlay');
const userProfilePic = document.getElementById('userProfilePic');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const profileDropdown = document.getElementById('profileDropdown');
const signOutButton = document.getElementById('signOutButton');
const deleteAccountButton = document.getElementById('deleteAccountButton');

// Sell form elements
const productUploadForm = document.getElementById('productUploadForm');
const openPreviewImageWidgetButton = document.getElementById('openPreviewImageWidget');
const productPreviewImage = document.getElementById('productPreviewImage');
const productNameInput = document.getElementById('productName');
const productDescriptionTextarea = document.getElementById('productDescription');
const productPriceInput = document.getElementById('productPrice');
const productFileUrlInput = document.getElementById('productFileUrl');
const sellFormSubmitButton = document.getElementById('sellFormSubmit');

// Product listing and details elements
const productsGrid = document.getElementById('productsGrid'); // Element where product cards are rendered
const productDetailsOverlay = document.getElementById('productDetailsOverlay');
const productDetailImage = document.getElementById('productDetailImage');
const productDetailName = document.getElementById('productDetailName');
const productDetailDescription = document.getElementById('productDetailDescription');
const productDetailPrice = document.getElementById('productDetailPrice');
const productDetailSeller = document.getElementById('productDetailSeller');
const paypalButtonContainer = document.getElementById('paypal-button-container');
const closeProductDetailsButton = document.getElementById('closeProductDetails');

// Dashboard elements
const myProductsList = document.getElementById('myProductsList');
const sellerBalanceDisplay = document.getElementById('sellerBalance');

// Sidebar / Tabs
const tabs = document.querySelectorAll('aside nav a[data-tab]');
const tabContents = document.querySelectorAll('.tab-content'); // Assuming you have elements with this class

// --- Global Variables (for Cloudinary widget and preview state) ---
let isPreviewUploading = false; // Flag to indicate if a preview image is currently uploading
let currentProductFileUrl = ''; // Stores the URL of the product file after upload

// --- Authentication Flow ---
// Initially hide the body to prevent flickering until auth state is known
document.body.style.visibility = "hidden";

/**
 * Listens for Firebase authentication state changes.
 * Shows/hides the auth overlay based on user login status.
 * Populates profile UI if user is logged in.
 */
onAuthStateChanged(auth, user => {
    document.body.style.visibility = ""; // Show body once auth state is determined
    if (!user) {
        // User is signed out, show authentication overlay
        authOverlay.style.display = "flex";
        // Clear profile UI elements if user logs out
        userProfilePic.src = 'https://placehold.co/40x40/cccccc/000000?text=User';
        userEmailDisplay.textContent = 'Guest';
        profileDropdown.style.display = 'none'; // Hide dropdown for guests
    } else {
        // User is signed in, hide authentication overlay and show profile UI
        authOverlay.style.display = "none";
        showProfileUI(user);
        // Start watching seller balance and load user products for logged-in user
        watchSellerBalance(user.uid);
        loadMyProducts(user.uid);
    }
});

/**
 * Updates the user interface with profile information (avatar, email).
 * Sets up event listeners for sign-out and account deletion.
 * @param {object} user - The Firebase User object.
 */
function showProfileUI(user) {
    userProfilePic.src = user.photoURL || 'https://placehold.co/40x40/cccccc/000000?text=User'; // Use photoURL or a placeholder
    userProfilePic.style.display = 'block';
    userEmailDisplay.textContent = user.email || 'No Email';
    profileDropdown.style.display = 'block'; // Show dropdown for logged-in users

    // Toggle profile dropdown visibility
    userProfilePic.onclick = () => {
        profileDropdown.classList.toggle('hidden');
    };

    // Sign out button click handler
    signOutButton.onclick = async () => {
        try {
            await signOut(auth);
            console.log("User signed out successfully.");
            profileDropdown.classList.add('hidden'); // Hide dropdown after sign out
            // The onAuthStateChanged listener will handle redirecting to auth overlay
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to sign out. Please try again.");
        }
    };

    // Delete account button click handler
    deleteAccountButton.onclick = async () => {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            try {
                await deleteUser(user);
                console.log("User account deleted successfully.");
                profileDropdown.classList.add('hidden'); // Hide dropdown after deletion
                // The onAuthStateChanged listener will handle redirecting to auth overlay
            } catch (error) {
                console.error("Error deleting account:", error);
                alert("Failed to delete account. Please re-authenticate and try again.");
            }
        }
    };
}

// --- Sidebar / Tabs Navigation ---
/**
 * Handles tab switching, showing the selected tab content and hiding others.
 * @param {string} tabId - The ID of the tab to show.
 */
function showTab(tabId) {
    // Remove 'active' class from all tabs and hide all content
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.add('hidden'));

    // Add 'active' class to the clicked tab and show its content
    const selectedTab = document.querySelector(`aside nav a[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(tabId);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.remove('hidden');

    // Special case for 'sell' tab to ensure form state is restored
    if (tabId === 'sell') {
        restoreSellForm();
    }
}

// Add click listeners to all tab buttons
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = e.currentTarget.dataset.tab;
        showTab(tabId);
    });
});


// --- Sell Form Logic ---

/**
 * Saves the current state of the sell form to localStorage.
 * This includes product name, description, price, preview image URL, and file URL.
 */
function saveSellForm() {
    const formState = {
        name: productNameInput.value,
        description: productDescriptionTextarea.value,
        price: productPriceInput.value,
        previewImage: productPreviewImage.src.includes('placehold.co') ? '' : productPreviewImage.src, // Only save if not placeholder
        fileUrl: productFileUrlInput.value
    };
    localStorage.setItem(SELL_FORM_KEY, JSON.stringify(formState));
}

/**
 * Restores the sell form state from localStorage on page load.
 * Populates form fields and the preview image if data exists.
 */
function restoreSellForm() {
    const savedState = localStorage.getItem(SELL_FORM_KEY);
    if (savedState) {
        const formState = JSON.parse(savedState);
        productNameInput.value = formState.name || '';
        productDescriptionTextarea.value = formState.description || '';
        productPriceInput.value = formState.price || '';
        productFileUrlInput.value = formState.fileUrl || '';

        if (formState.previewImage) {
            productPreviewImage.src = formState.previewImage;
            productPreviewImage.classList.remove('hidden');
        } else {
            productPreviewImage.src = 'https://placehold.co/150x150/e0e0e0/000000?text=No+Image'; // Placeholder
            productPreviewImage.classList.add('hidden');
        }
        currentProductFileUrl = formState.fileUrl || ''; // Restore file URL
    }
}

// Attach autosave to form input changes (e.g., on keyup, change events)
productUploadForm.addEventListener('input', saveSellForm);

// --- Cloudinary File Upload Widget ---
// IMPORTANT: window.cloudinary must be loaded via a script tag in your HTML for this to work.
// Example: <script src="https://upload-widget.cloudinary.com/global/all.js" type="text/javascript"></script>
const widget = window.cloudinary.createUploadWidget({
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: 'TradeDeck_Product_Images', // Optional: specify a folder in Cloudinary
    sources: ['local', 'url', 'camera'], // Allow various upload sources
    cropping: true, // Enable image cropping
    multiple: false, // Allow only one image upload at a time for product preview
    resourceType: 'image' // Ensure it's treated as an image
}, (error, result) => {
    if (!error && result && result.event === "success") {
        console.log('Done uploading image!', result.info);
        // Update the preview image with the Cloudinary URL
        productPreviewImage.src = result.info.secure_url;
        productPreviewImage.classList.remove('hidden'); // Show the image
        isPreviewUploading = false;
        saveSellForm(); // Save form state after successful upload
    } else if (result && result.event === "upload-added") {
        isPreviewUploading = true;
        // Optionally show a loading indicator
    } else if (error) {
        console.error("Cloudinary upload error:", error);
        alert("Image upload failed. Please try again.");
        isPreviewUploading = false;
    }
});

// Event listener to open the Cloudinary widget
openPreviewImageWidgetButton.onclick = () => {
    widget.open();
};

/**
 * Handles the upload of the actual product file (e.g., PDF, ZIP).
 * This uses a simple file input and stores the URL in a hidden input.
 * In a real application, you might use Cloudinary for files or a dedicated file storage service.
 */
document.getElementById('productFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // For simplicity, we'll create a local URL. In a real app, you'd upload this.
        // For this example, we're assuming the file URL will come from Cloudinary or similar.
        // If the user uploads a local file, we'll just store its name for now and prompt for a URL.
        console.warn("Local file upload is for demonstration. In production, upload to cloud storage.");
        // A robust solution would upload this to Cloudinary or Firebase Storage and get a public URL.
        // For now, let's just use a placeholder or prompt the user for a URL.
        // To integrate properly with Cloudinary for files, you'd configure a separate widget
        // or a direct upload API call.
        alert("Please provide a direct public URL for the product file for now. File upload functionality needs cloud storage integration.");
        productFileUrlInput.value = ''; // Clear existing
        productFileUrlInput.focus(); // Focus user to input the URL
    }
});

// --- Form Validation Helpers & Submit ---
/**
 * Validates the sell product form fields.
 * @returns {string[]} An array of error messages. Empty if validation passes.
 */
function validateSellForm() {
    const errors = [];
    if (!productNameInput.value.trim()) {
        errors.push("Product Name is required.");
    }
    if (!productDescriptionTextarea.value.trim()) {
        errors.push("Product Description is required.");
    }
    const price = parseFloat(productPriceInput.value);
    if (isNaN(price) || price < 0) {
        errors.push("Price must be a valid non-negative number.");
    }
    if (!productPreviewImage.src || productPreviewImage.src.includes('placehold.co')) {
        errors.push("Product Preview Image is required.");
    }
    if (!productFileUrlInput.value.trim()) {
        errors.push("Product File URL is required (e.g., a link to your digital product).");
    }
    if (isPreviewUploading) {
        errors.push("Please wait for the image upload to complete.");
    }

    if (errors.length > 0) {
        alert("Please correct the following errors:\n" + errors.join('\n'));
    }
    return errors;
}

/**
 * Enables the submit button after initial page load or validation checks.
 * (Placeholder function as its logic was not provided in snippets)
 */
function enableSubmitButton() {
    if (sellFormSubmitButton) {
        sellFormSubmitButton.disabled = false;
        // You might add visual styles here for enabled state
    }
}

/**
 * Disables the submit button during form submission to prevent multiple submissions.
 */
function disableSubmitButton() {
    if (sellFormSubmitButton) {
        sellFormSubmitButton.disabled = true;
        // You might add visual styles here for disabled state
    }
}


/**
 * Handles the submission of the product upload form.
 * Validates inputs, uploads product data to Firestore, and clears the form.
 * @param {Event} e - The submit event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    disableSubmitButton(); // Disable button to prevent double submission

    const errors = validateSellForm();
    if (errors.length) {
        enableSubmitButton(); // Re-enable if validation fails
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to sell a product.");
        enableSubmitButton();
        return;
    }

    const priceValue = parseFloat(productPriceInput.value);

    const productData = {
        name: productNameInput.value.trim(),
        description: productDescriptionTextarea.value.trim(),
        price: priceValue,
        previewImage: productPreviewImage.src,
        fileUrl: productFileUrlInput.value.trim(),
        sellerId: user.uid,
        sellerEmail: user.email,
        timestamp: serverTimestamp(), // Firestore timestamp for creation
        isSold: false // Initial status
    };

    try {
        await addDoc(collection(db, "products"), productData);
        alert("Product uploaded successfully!");
        console.log("Product uploaded:", productData);

        // Clear the form and saved state after successful upload
        productUploadForm.reset();
        productPreviewImage.src = 'https://placehold.co/150x150/e0e0e0/000000?text=No+Image';
        productPreviewImage.classList.add('hidden');
        localStorage.removeItem(SELL_FORM_KEY);
        currentProductFileUrl = ''; // Reset file URL

        // Reload products to show the new one
        await loadProducts();
        showTab('home'); // Optionally switch back to home view

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to upload product. Please try again.");
    } finally {
        enableSubmitButton(); // Always re-enable button
    }
}

// Add submit event listener to the product upload form
productUploadForm.addEventListener('submit', handleFormSubmit);


// --- Products Listing, Details & Purchase Flow ---

/**
 * Loads products from Firestore and renders them as cards in the products grid.
 * @param {string} [filter=''] - Optional filter string for product names.
 */
async function loadProducts(filter = '') {
    productsGrid.innerHTML = '<p class="text-center col-span-full">Loading products...</p>'; // Loading indicator

    try {
        let productsQuery = collection(db, "products");
        // Only show products that are not marked as sold
        productsQuery = query(productsQuery, where("isSold", "==", false), orderBy("timestamp", "desc"));

        // If a filter is provided, add a basic client-side filter
        // Firestore doesn't support 'contains' for text, so we'll filter after fetching.
        const querySnapshot = await getDocs(productsQuery);
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(filter.toLowerCase())
        );

        productsGrid.innerHTML = ''; // Clear loading indicator

        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = '<p class="text-center col-span-full text-gray-500">No products found.</p>';
            return;
        }

        filteredProducts.forEach(product => {
            const productCard = `
                <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                     data-product-id="${product.id}">
                    <img src="${product.previewImage || 'https://placehold.co/300x200/e0e0e0/000000?text=No+Image'}"
                         alt="${product.name}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h3 class="text-lg font-semibold text-gray-800 truncate">${product.name}</h3>
                        <p class="text-gray-600 text-sm mt-1 mb-2 line-clamp-2">${product.description}</p>
                        <div class="flex justify-between items-center mt-3">
                            <span class="text-blue-600 font-bold text-xl">$${product.price.toFixed(2)}</span>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
            productsGrid.insertAdjacentHTML('beforeend', productCard);
        });

        // Add event listeners to newly rendered product cards
        productsGrid.querySelectorAll('.product-card, [data-product-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ensure we click on the card, not inner buttons that might have their own handlers
                if (!e.target.closest('button')) {
                    const productId = card.dataset.productId;
                    if (productId) {
                        showProductDetails(productId);
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error loading products:", error);
        productsGrid.innerHTML = '<p class="text-center col-span-full text-red-500">Failed to load products. Please try again.</p>';
    }
}


/**
 * Displays the detailed view of a product, including purchase options.
 * @param {string} productId - The ID of the product to show details for.
 */
async function showProductDetails(productId) {
    paypalButtonContainer.innerHTML = 'Loading PayPal button...'; // Show loading message

    try {
        const docSnap = await getDoc(doc(db, "products", productId));

        if (!docSnap.exists()) {
            alert("Product not found.");
            productDetailsOverlay.classList.add('hidden');
            return;
        }

        const product = { id: docSnap.id, ...docSnap.data() };

        // Populate product details UI
        productDetailImage.src = product.previewImage || 'https://placehold.co/400x300/e0e0e0/000000?text=No+Image';
        productDetailName.textContent = product.name;
        productDetailDescription.textContent = product.description;
        productDetailPrice.textContent = `$${product.price.toFixed(2)}`;
        productDetailSeller.textContent = `Sold by: ${product.sellerEmail || 'Unknown'}`;

        // Show the product details overlay
        productDetailsOverlay.classList.remove('hidden');

        // Close button for product details
        closeProductDetailsButton.onclick = () => {
            productDetailsOverlay.classList.add('hidden');
            paypalButtonContainer.innerHTML = ''; // Clear button after closing
        };

        // Determine if it's a free product or requires PayPal
        if (parseFloat(product.price) > 0) {
            // Check if PayPal SDK is loaded
            if (typeof window.paypal === 'undefined') {
                paypalButtonContainer.innerHTML = '<p class="text-red-500">PayPal SDK not loaded. Please refresh the page.</p>';
                console.error("PayPal SDK (window.paypal) is not loaded.");
                return;
            }

            // Render PayPal Buttons
            window.paypal.Buttons({
                // createOrder is called when the buyer clicks the PayPal button
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: product.price.toFixed(2) // Ensure price is a string with 2 decimal places
                            },
                            description: `Purchase of ${product.name}`
                        }]
                    });
                },
                // onApprove is called when the buyer approves the transaction
                onApprove: (data, actions) => handlePayPalApproval({
                    data,
                    actions,
                    product, // Pass the product object
                    verifyBackendURL: VERIFY_URL, // Your serverless verification endpoint
                    // Callback to update UI on successful purchase (e.g., show download link)
                    updateUI: (prod) => {
                        paypalButtonContainer.innerHTML = `
                            <a href="${prod.fileUrl}" target="_blank"
                               class="w-full bg-gradient-to-r from-green-500 to-green-600
                                     text-white py-3 rounded-xl font-bold shadow hover:shadow-lg transition
                                     flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                    <path fill-rule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                                </svg>
                                Download Product
                            </a>`;
                        productDetailsOverlay.classList.remove('hidden'); // Keep overlay open to show download
                    },
                    // Callback to update seller's balance in Firestore
                    updateSellerBalanceFn: incrementSellerBalance,
                    // Callback to send a sale confirmation email (if implemented)
                    sendEmail: sendSaleEmail // Assuming this function is defined elsewhere or will be.
                }),
                // onError is called when a payment error occurs
                onError: err => {
                    console.error("PayPal payment error:", err);
                    alert('Payment failed or cancelled. Please try again.');
                    paypalButtonContainer.innerHTML = ''; // Clear buttons on error
                }
            }).render('#paypal-button-container'); // Render the buttons into the specified container
        } else {
            // Free download logic
            paypalButtonContainer.innerHTML = `
                <a href="${product.fileUrl}" target="_blank"
                   class="w-full bg-gradient-to-r from-blue-500 to-blue-600
                         text-white py-3 rounded-xl font-bold shadow hover:shadow-lg transition
                         flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                        <path fill-rule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                    </svg>
                    Download for FREE!
                </a>`;
        }
    } catch (error) {
        console.error("Error showing product details or setting up PayPal:", error);
        alert("Failed to load product details. Please try again.");
        paypalButtonContainer.innerHTML = ''; // Clear buttons on error
        productDetailsOverlay.classList.add('hidden');
    }
}

// --- Dashboard & Utilities ---

/**
 * Increments the seller's balance using a Firestore transaction to ensure atomicity.
 * @param {string} sellerId - The UID of the seller.
 * @param {number} amount - The amount to increment the balance by.
 */
async function incrementSellerBalance(sellerId, amount) {
    const balRef = doc(db, "balances", sellerId); // Reference to the seller's balance document

    try {
        await runTransaction(db, async tx => {
            const snap = await tx.get(balRef); // Get the current balance document
            const prevBalance = snap.exists() ? snap.data().balance || 0 : 0; // Get existing balance or 0

            // Update the balance document
            tx.set(balRef, { balance: prevBalance + amount, lastUpdated: serverTimestamp() }, { merge: true });
        });
        console.log(`Seller ${sellerId} balance incremented by ${amount}`);
    } catch (error) {
        console.error("Transaction failed: ", error);
        alert("Failed to update seller balance.");
    }
}

/**
 * Watches the seller's balance in real-time using onSnapshot.
 * Updates the UI whenever the balance changes.
 * @param {string} userId - The UID of the current user.
 */
function watchSellerBalance(userId) {
    const balanceRef = doc(db, "balances", userId);

    // Set up real-time listener for the user's balance
    onSnapshot(balanceRef, (docSnap) => {
        if (docSnap.exists()) {
            const balanceData = docSnap.data();
            sellerBalanceDisplay.textContent = `$${(balanceData.balance || 0).toFixed(2)}`;
        } else {
            sellerBalanceDisplay.textContent = '$0.00'; // No balance document yet
        }
    }, (error) => {
        console.error("Error watching seller balance:", error);
        sellerBalanceDisplay.textContent = '$Error';
    });
}

/**
 * Loads and renders the products uploaded by the current user for the dashboard view.
 * @param {string} userId - The UID of the current user.
 */
async function loadMyProducts(userId) {
    myProductsList.innerHTML = '<p class="text-center">Loading your products...</p>';

    try {
        const q = query(collection(db, "products"),
                        where("sellerId", "==", userId),
                        orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        myProductsList.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            myProductsList.innerHTML = '<p class="text-center text-gray-500">You haven\'t uploaded any products yet.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            const productItem = `
                <div class="bg-gray-50 p-4 rounded-lg shadow-md flex items-center space-x-4">
                    <img src="${product.previewImage || 'https://placehold.co/80x80/e0e0e0/000000?text=Prod'}"
                         alt="${product.name}" class="w-20 h-20 object-cover rounded-md">
                    <div class="flex-grow">
                        <h4 class="font-semibold text-gray-800">${product.name}</h4>
                        <p class="text-gray-600 text-sm">$${product.price.toFixed(2)}</p>
                        <p class="text-xs text-gray-500">Status: ${product.isSold ? '<span class="text-red-500">Sold</span>' : '<span class="text-green-500">Available</span>'}</p>
                    </div>
                    <button class="delete-product-btn bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 transition"
                            data-product-id="${product.id}">
                        Delete
                    </button>
                </div>
            `;
            myProductsList.insertAdjacentHTML('beforeend', productItem);
        });

        // Add event listeners to delete buttons
        myProductsList.querySelectorAll('.delete-product-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.productId;
                if (confirm("Are you sure you want to delete this product?")) {
                    deleteProduct(productId);
                }
            });
        });

    } catch (error) {
        console.error("Error loading user products:", error);
        myProductsList.innerHTML = '<p class="text-center text-red-500">Failed to load your products.</p>';
    }
}

/**
 * Deletes a product document from Firestore.
 * @param {string} productId - The ID of the product to delete.
 */
async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, "products", productId));
        alert("Product deleted successfully.");
        console.log("Product deleted:", productId);
        // Reload user's products after deletion
        if (auth.currentUser) {
            loadMyProducts(auth.currentUser.uid);
        }
        // Also reload main products view to remove the deleted item
        loadProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
    }
}

/**
 * Placeholder function for sending a sale confirmation email.
 * This would typically involve a server-side function or an email service API.
 * @param {object} saleDetails - Details about the sale (buyer, product, etc.).
 */
async function sendSaleEmail(saleDetails) {
    console.log("Attempting to send sale email (functionality to be implemented server-side).", saleDetails);
    // In a real application, you would make a fetch call to a serverless function
    // that handles sending emails securely (e.g., using SendGrid, Mailgun, etc.).
    /*
    try {
        const response = await fetch('/api/send-sale-email', { // Your serverless email endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleDetails)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Sale email request sent.");
    } catch (error) {
        console.error("Failed to send sale email:", error);
    }
    */
}


// --- Initial Load & Event Binding ---
/**
 * Initializes the application: loads initial products, sets default tab,
 * and enables the submit button.
 */
(async function init() {
    // Initial product load for the home screen
    await loadProducts();
    // Set the default active tab to 'home'
    showTab('home');
    // Ensure the sell form submit button is enabled on load
    enableSubmitButton();
    // Restore sell form state if any was saved from previous session
    restoreSellForm();
})();
