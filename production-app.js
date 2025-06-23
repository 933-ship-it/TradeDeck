// production-app.js

// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import the deleteProduct function
import { deleteProduct } from "./delete-product.js";

// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck-landing-page/";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "755235931546",
  appId: "1:755235931546:web:7e35364b0157cd7fc2a623",
  measurementId: "G-4RXR7V9NCW"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- DOM Elements ---
const profileToggleArea = document.getElementById('profileToggleArea');
const profilePic = document.getElementById('userProfilePic');
const dropdownMenu = document.getElementById('dropdownMenu');
const userEmail = document.getElementById('userEmail');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const authOverlay = document.getElementById('authOverlay');
let userGlobal = null;

// Navigation
const tabs = document.querySelectorAll('aside nav a[data-tab]');
const sections = document.querySelectorAll('main section');
const startSellingBtn = document.getElementById('startSellingBtn');
const sellLandingContent = document.getElementById('sellLandingContent');
const productForm = document.getElementById('productForm');
const formErrorSummary = document.getElementById('formErrorSummary');

// Sell form fields
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const paypalEmailContainer = document.getElementById('paypalEmailContainer');
const paypalEmailInput = document.getElementById('paypalEmail');
const paypalEmailValidationMsg = document.getElementById('paypalEmailValidationMsg');
const productFileUrlInput = document.getElementById('productFileUrlInput');
const openPreviewImageWidgetBtn = document.getElementById('openPreviewImageWidget');
const previewImageUrlInput = document.getElementById('previewImageUrl');
const previewImageStatus = document.getElementById('previewImageStatus');
const previewImageContainer = document.getElementById('previewImageContainer');
const currentPreviewImage = document.getElementById('currentPreviewImage');
const productUploadForm = document.getElementById('productUploadForm');
const submitProductBtn = document.getElementById('submitProductBtn');
const categorySelect = document.getElementById('category');

// Home/Product listing
const searchBar = document.getElementById('searchBar');
const categoryTabs = document.querySelectorAll('.category-tab');
const productListContainer = document.getElementById('productList');
const noProductsMessage = document.getElementById('noProductsMessage');

// Dashboard
const myProductsContainer = document.getElementById('myProducts');
const noMyProductsMessage = document.getElementById('noMyProductsMessage');
const sellerBalance = document.getElementById('sellerBalance');

// Product details
const productDetailsSection = document.getElementById('productDetails');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const detailProductImage = document.getElementById('detailProductImage');
const detailProductTitle = document.getElementById('detailProductTitle');
const detailProductDescription = document.getElementById('detailProductDescription');
const detailProductPrice = document.getElementById('detailProductPrice');
const detailActionButton = document.getElementById('detailActionButton');
const productDetailsError = document.getElementById('productDetailsError');
const paypalButtonContainer = document.getElementById('paypal-button-container');

// Custom alert/confirm modals
const customAlertModal = document.getElementById('customAlertModal');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');
const customConfirmModal = document.getElementById('customConfirmModal');
const customConfirmMessage = document.getElementById('customConfirmMessage');
const customConfirmOkBtn = document.getElementById('customConfirmOkBtn');
const customConfirmCancelBtn = document.getElementById('customConfirmCancelBtn');

// Global variable for all fetched products
window.allProducts = [];
let currentCategoryFilter = 'All';

// --- CUSTOM ALERT/CONFIRM FUNCTIONS (MOVED TO TOP) ---
function showAlert(message) {
  customAlertMessage.innerHTML = message;
  customAlertModal.classList.remove('hidden');
  customAlertModal.classList.add('modal-enter-active');
  return new Promise(resolve => {
    customAlertOkBtn.onclick = () => {
      customAlertModal.classList.add('hidden'); // Ensures modal hides immediately
      customAlertModal.classList.remove('modal-enter-active');
      customAlertModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customAlertModal.classList.remove('modal-exit-active');
        resolve(true);
      }, 200);
    };
  });
}

function showConfirm(message) {
  customConfirmMessage.textContent = message;
  customConfirmModal.classList.remove('hidden');
  customConfirmModal.classList.add('modal-enter-active');
  return new Promise(resolve => {
    const handleConfirm = () => {
      customConfirmModal.classList.add('hidden'); // Ensures modal hides immediately
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.remove('modal-exit-active');
        resolve(true);
      }, 200);
    };

    const handleCancel = () => {
      customConfirmModal.classList.add('hidden'); // Ensures modal hides immediately
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.remove('modal-exit-active');
        resolve(false);
      }, 200);
    };

    customConfirmOkBtn.onclick = handleConfirm;
    customConfirmCancelBtn.onclick = handleCancel;
  });
}

// --- UTILITIES (MOVED TO TOP) ---
function setFileInputStatus(statusElement, message, type = 'default') {
  statusElement.textContent = message;
  statusElement.classList.remove('success', 'error', 'loading');
  if (type === 'success') statusElement.classList.add('success');
  else if (type === 'error') statusElement.classList.add('error');
  else if (type === 'loading') statusElement.classList.add('loading');
}

function convertToGoogleDriveDirectDownload(url) {
  if (!url) return url;
  let convertedUrl = url;
  const driveViewPattern = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/(view|edit|preview)/;
  const match = url.match(driveViewPattern);
  if (match && match[1]) {
    const fileId = match[1];
    convertedUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  } else if (url.includes('drive.google.com/open?id=')) {
    const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      const fileId = idMatch[1];
      convertedUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  return convertedUrl;
}

// --- PRODUCT CARD HTML GENERATION (MOVED TO TOP) ---
function createProductCardHtml(product, isDashboard = false) {
  const priceDisplay = product.price > 0 ? `$${product.price.toFixed(2)}` : 'Free';
  const actionButton = isDashboard ?
    `<button class="delete-product-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200" data-product-id="${product.id}">Delete</button>` :
    `<button class="view-product-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200" data-product-id="${product.id}">View Details</button>`;

  return `
    <div class="product-card bg-white rounded-xl shadow-md overflow-hidden interactive-card p-4 flex flex-col" data-product-id="${product.id}">
      <img src="${product.previewImageUrl}" alt="${product.title}" class="w-full h-48 object-cover rounded-lg mb-4">
      <div class="flex-grow">
        <h3 class="font-bold text-lg mb-1 truncate">${product.title}</h3>
        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description}</p>
        <div class="flex justify-between items-center mb-4">
          <span class="text-blue-700 font-extrabold text-xl">${priceDisplay}</span>
          <span class="text-gray-500 text-xs">${product.category}</span>
        </div>
      </div>
      <div class="mt-auto">
        ${actionButton}
      </div>
    </div>
  `;
}

// --- PRODUCT LISTING (HOME) FUNCTIONS (MOVED TO TOP) ---
async function filterAndRenderProducts(searchTerm = '', categoryFilter = 'All') {
  productListContainer.innerHTML = '';
  noProductsMessage.textContent = 'Loading products...';
  noProductsMessage.classList.remove('hidden');

  let filteredProducts = window.allProducts;

  if (categoryFilter !== 'All') {
    filteredProducts = filteredProducts.filter(product => product.category === categoryFilter);
  }

  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product =>
      product.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      product.description.toLowerCase().includes(lowerCaseSearchTerm) ||
      product.category.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  if (filteredProducts.length === 0) {
    noProductsMessage.textContent = 'No products found matching your criteria.';
    noProductsMessage.classList.remove('hidden');
    return;
  }
  noProductsMessage.classList.add('hidden');

  filteredProducts.forEach(product => {
    productListContainer.insertAdjacentHTML('beforeend', createProductCardHtml(product));
  });

  // Re-attach view product button listeners for dynamically loaded products
  productListContainer.querySelectorAll('.view-product-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = e.target.dataset.productId;
      showProductDetails(productId);
    });
  });
}

// Function to load all products (MOVED TO TOP)
async function loadProducts() {
  productListContainer.innerHTML = '';
  noProductsMessage.textContent = 'Loading products...';
  noProductsMessage.classList.remove('hidden');
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      noProductsMessage.textContent = 'No products available yet.';
      noProductsMessage.classList.remove('hidden');
      window.allProducts = []; // Ensure allProducts is empty if no products
      return;
    }

    window.allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);

  } catch (error) {
    console.error("Error loading all products:", error);
    noProductsMessage.textContent = 'Failed to load products. Please try again later.';
    noProductsMessage.classList.remove('hidden');
  }
}

// --- DASHBOARD FUNCTIONS (MOVED TO TOP) ---
async function loadMyProducts(userId) {
  myProductsContainer.innerHTML = ''; // Clear previous products
  noMyProductsMessage.textContent = 'Loading your products...';
  noMyProductsMessage.classList.remove('hidden');

  try {
    const q = query(collection(db, "products"), where("sellerId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      noMyProductsMessage.textContent = 'You have not listed any products yet.';
      noMyProductsMessage.classList.remove('hidden');
      return;
    }

    noMyProductsMessage.classList.add('hidden');
    querySnapshot.forEach(doc => {
      const product = { id: doc.id, ...doc.data() };
      const productCardHtml = createProductCardHtml(product, true); // true for dashboard view
      myProductsContainer.insertAdjacentHTML('beforeend', productCardHtml);
    });

    // Attach event listeners for view and delete buttons
    myProductsContainer.querySelectorAll('.view-product-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = e.target.dataset.productId;
        showProductDetails(productId);
      });
    });

    myProductsContainer.querySelectorAll('.delete-product-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const productId = e.target.dataset.productId;
        // loadProducts is now defined globally before this call
        await deleteProduct(productId, db, auth, showAlert, showConfirm, loadMyProducts, loadProducts);
      });
    });

  } catch (error) {
    console.error("Error loading user's products:", error);
    noMyProductsMessage.textContent = 'Failed to load your products. Please try again later.';
    noMyProductsMessage.classList.remove('hidden');
  }
}

async function loadSellerBalance(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists() && userDocSnap.data().balance !== undefined) {
      sellerBalance.textContent = userDocSnap.data().balance.toFixed(2);
    } else {
      sellerBalance.textContent = '0.00';
    }
  } catch (error) {
    console.error("Error loading seller balance:", error);
    sellerBalance.textContent = 'Error';
  }
}

async function showDashboard() {
  if (!auth.currentUser) {
    noMyProductsMessage.textContent = 'Please sign in to view your dashboard.';
    noMyProductsMessage.classList.remove('hidden');
    myProductsContainer.innerHTML = ''; // Clear products if not signed in
    sellerBalance.textContent = '0.00';
    return;
  }

  await loadMyProducts(auth.currentUser.uid);
  loadSellerBalance(auth.currentUser.uid);
}


// --- PRODUCT DETAILS FUNCTIONS (MOVED TO TOP) ---
// --- PayPal Integration ---
function renderPayPalButton(product) {
  paypalButtonContainer.innerHTML = ''; // Clear existing buttons
  paypalButtonContainer.classList.remove('hidden');

  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: product.price.toFixed(2)
          }
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        // Show success message and provide download link
        showAlert(`Payment successful for "${product.title}"! You can download your product now.`);
        window.open(product.fileUrl, '_blank'); // Open download link
        // Optionally, record the purchase in Firestore
        if (auth.currentUser) {
          addDoc(collection(db, "purchases"), {
            productId: product.id,
            productTitle: product.title,
            buyerId: auth.currentUser.uid,
            sellerId: product.sellerId,
            amount: product.price,
            purchaseTime: serverTimestamp()
          }).catch(e => console.error("Error recording purchase:", e));

          // Increment seller balance
          const sellerRef = doc(db, "users", product.sellerId);
          runTransaction(db, async (transaction) => {
            const sellerDoc = await transaction.get(sellerRef);
            if (!sellerDoc.exists()) {
              transaction.set(sellerRef, { balance: product.price, productsSold: 1 });
            } else {
              const newBalance = (sellerDoc.data().balance || 0) + product.price;
              const newProductsSold = (sellerDoc.data().productsSold || 0) + 1;
              transaction.update(sellerRef, { balance: newBalance, productsSold: newProductsSold });
            }
          }).catch(e => console.error("Error updating seller balance:", e));
        }
      });
    },
    onError: function(err) {
      console.error('PayPal Checkout Error', err);
      showAlert('Payment failed. Please try again.');
    },
    onCancel: function (data) {
      showAlert('Payment cancelled.');
    }
  }).render('#paypal-button-container');
}

async function showProductDetails(productId) {
  productDetailsSection.classList.add('hidden'); // Hide details while loading
  productDetailsError.classList.add('hidden');
  paypalButtonContainer.innerHTML = ''; // Clear previous PayPal button

  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const product = { id: docSnap.id, ...docSnap.data() };
      detailProductImage.src = product.previewImageUrl;
      detailProductImage.alt = product.title;
      detailProductTitle.textContent = product.title;
      detailProductDescription.textContent = product.description;
      detailProductPrice.textContent = product.price > 0 ? `$${product.price.toFixed(2)}` : 'Free';

      // Dynamically set action button (Buy/Download)
      detailActionButton.innerHTML = ''; // Clear previous button

      if (product.price > 0) {
        // Render PayPal button
        renderPayPalButton(product);
        detailActionButton.classList.add('hidden'); // Hide generic action button for paid products
      } else {
        // Show generic "Download" button for free products
        detailActionButton.classList.remove('hidden');
        detailActionButton.onclick = () => {
          window.open(product.fileUrl, '_blank');
          showAlert(`Downloading "${product.title}"...`);
        };
        detailActionButton.textContent = 'Download Product';
        detailActionButton.className = 'px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-colors duration-200 shadow-lg';
      }

      showTab('productDetails'); // Switch to product details section
      productDetailsSection.classList.remove('hidden'); // Show details after content is loaded
    } else {
      productDetailsError.textContent = 'Product not found.';
      productDetailsError.classList.remove('hidden');
      showTab('home'); // Go back to home if product not found
    }
  } catch (error) {
    console.error("Error fetching product details:", error);
    productDetailsError.textContent = 'Failed to load product details. Please try again later.';
    productDetailsError.classList.remove('hidden');
    showTab('home'); // Go back to home on error
  }
}


// --- AUTH AND PROFILE ---
document.body.style.visibility = "hidden";
onAuthStateChanged(auth, user => {
  document.body.style.visibility = "";
  if (!user) {
    authOverlay.style.display = "flex";
    userGlobal = null;
    loadProducts(); // Call loadProducts here for unauthenticated users
  } else {
    authOverlay.style.display = "none";
    userGlobal = user;
    showProfileUI(user);
    loadProducts(); // Call loadProducts here for authenticated users
    if (document.querySelector('aside nav a[data-tab="dashboard"]').classList.contains('bg-blue-100')) {
      showDashboard();
    }
  }
});

function showProfileUI(user) {
  if (!user) return;
  profilePic.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.email || "U") + "&background=random";
  profilePic.classList.remove("hidden");
  userEmail.textContent = user.email || "(no email)";
  userEmailDisplay.textContent = user.email || "(no email)";

  profileToggleArea.onclick = function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
    if (!dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('modal-exit-active');
      dropdownMenu.classList.add('modal-enter-active');
    } else {
      dropdownMenu.classList.remove('modal-enter-active');
      dropdownMenu.classList.add('modal-exit-active');
    }
  };

  document.addEventListener('click', (e) => {
    if (!profileToggleArea.contains(e.target) && !dropdownMenu.contains(e.target)) {
      if (!dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.remove('modal-enter-active');
        dropdownMenu.classList.add('modal-exit-active');
        setTimeout(() => {
          dropdownMenu.classList.add('hidden');
          dropdownMenu.classList.remove('modal-exit-active');
        }, 200);
      }
    }
  });

  document.getElementById('deleteAccountBtn').onclick = async () => {
    const confirmed = await showConfirm("Delete your account? This action cannot be undone and all your products will be delisted.");
    if (confirmed) {
      try {
        await deleteUser(user);
        await showAlert("Account deleted successfully!");
        window.location.href = LANDING_URL;
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          await showAlert("Please sign out and sign in again, then try deleting your account.");
        } else {
          await showAlert("Failed to delete account: " + err.message);
        }
      }
    }
  };

  document.getElementById('signOutBtn').onclick = () => {
    signOut(auth);
  };
}

// --- TAB NAVIGATION ---
function showTab(targetTabId) {
  tabs.forEach(t => {
    t.classList.remove('bg-blue-100');
    t.removeAttribute('aria-current');
  });
  const currentTab = document.querySelector(`a[data-tab="${targetTabId}"]`);
  if (currentTab) {
    currentTab.classList.add('bg-blue-100');
    currentTab.setAttribute('aria-current', 'page');
  }

  sections.forEach(sec => {
    if (sec.id === targetTabId) {
      sec.classList.remove('hidden');
      sec.classList.add('modal-enter-active');
    } else {
      sec.classList.remove('modal-enter-active');
      sec.classList.add('hidden');
    }
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', async (e) => {
    e.preventDefault();
    const target = tab.getAttribute('data-tab');
    showTab(target);
    // Correct logic for handling sell form visibility when switching tabs
    if (target === 'sell') {
      toggleProductForm(true); // Show sell form when 'Sell' tab is clicked
    } else {
      // Hide sell form if open and switching to another tab
      if (!productForm.classList.contains('hidden')) {
        toggleProductForm(false);
      }
    }
    productDetailsSection.classList.add('hidden');
    if (target === 'home') {
      await filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
      searchBar.value = '';
    } else if (target === 'dashboard') {
      await showDashboard();
    }
  });
});

backToHomeBtn.addEventListener('click', () => {
  showTab('home');
  filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
});

startSellingBtn.addEventListener('click', () => {
  toggleProductForm(true);
});

function toggleProductForm(showForm) {
  if (showForm) {
    sellLandingContent.classList.add('hidden');
    productForm.classList.remove('hidden');
    productForm.classList.add('modal-enter-active');
    showTab('sell'); // Ensure the 'sell' tab is visually active
    productUploadForm.reset();
    restoreSellForm();
    enableSubmitButton();
  } else {
    productForm.classList.remove('modal-enter-active');
    productForm.classList.add('modal-exit-active');
    setTimeout(() => {
      sellLandingContent.classList.remove('hidden');
      productForm.classList.add('hidden');
      productForm.classList.remove('modal-exit-active');
    }, 200);
  }
}

// --- SELL FORM AUTOSAVE/RESTORE ---
function saveSellForm() {
  const state = {
    title: titleInput.value,
    description: descriptionInput.value,
    price: priceInput.value,
    paypalEmail: paypalEmailInput.value,
    previewImageUrl: previewImageUrlInput.value,
    productFileUrl: productFileUrlInput.value,
    category: categorySelect.value
  };
  localStorage.setItem(SELL_FORM_KEY, JSON.stringify(state));
}

function restoreSellForm() {
  const state = JSON.parse(localStorage.getItem(SELL_FORM_KEY) || "{}");
  titleInput.value = state.title || "";
  descriptionInput.value = state.description || "";
  priceInput.value = state.price || "";
  paypalEmailInput.value = state.paypalEmail || "";
  previewImageUrlInput.value = state.previewImageUrl || "";
  productFileUrlInput.value = state.productFileUrl || "";
  categorySelect.value = state.category || "Other";

  if (state.previewImageUrl) {
    currentPreviewImage.src = state.previewImageUrl;
    previewImageContainer.classList.remove('hidden');
  } else {
    previewImageContainer.classList.add('hidden');
    currentPreviewImage.src = "";
  }

  const priceVal = parseFloat(state.price);
  if (!isNaN(priceVal) && priceVal > 0) {
    paypalEmailContainer.classList.remove('hidden');
    paypalEmailInput.setAttribute('required', 'required');
  } else {
    paypalEmailContainer.classList.add('hidden');
    paypalEmailInput.removeAttribute('required');
  }
}

[
  titleInput, descriptionInput, priceInput, paypalEmailInput,
  previewImageUrlInput, productFileUrlInput, categorySelect
].forEach(input => {
  input.addEventListener('input', saveSellForm);
});


// --- Cloudinary Widget ---
let isPreviewImageUploading = false;
const previewImageWidget = window.cloudinary.createUploadWidget(
  {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    sources: ['local'],
    resourceType: 'image',
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
    maxFileSize: 10 * 1024 * 1024,
    multiple: false,
    folder: 'tradedeck_product_previews',
  },
  (error, result) => {
    if (!error && result && result.event === "success") {
      previewImageUrlInput.value = result.info.secure_url;
      setFileInputStatus(previewImageStatus, `Image uploaded: ${result.info.original_filename}.${result.info.format}`, 'success');
      openPreviewImageWidgetBtn.classList.remove('input-invalid');
      currentPreviewImage.src = result.info.secure_url;
      previewImageContainer.classList.remove('hidden');
      isPreviewImageUploading = false;
      enableSubmitButton();
      saveSellForm();
    } else if (error) {
      setFileInputStatus(previewImageStatus, 'Image upload failed. Please try again.', 'error');
      previewImageUrlInput.value = '';
      openPreviewImageWidgetBtn.classList.add('input-invalid');
      previewImageContainer.classList.add('hidden');
      currentPreviewImage.src = '';
      isPreviewImageUploading = false;
      enableSubmitButton();
    } else if (result && (result.event === "close" || result.event === "abort")) {
      if (previewImageUrlInput.value === '') {
        setFileInputStatus(previewImageStatus, 'Preview image selection cancelled or not provided.', 'error');
        openPreviewImageWidgetBtn.classList.add('input-invalid');
      }
      isPreviewImageUploading = false;
      enableSubmitButton();
    } else if (result && result.event === "asset_selected") {
      setFileInputStatus(previewImageStatus, `Uploading ${result.info.original_filename || 'image'}...`, 'loading');
      isPreviewImageUploading = true;
      disableSubmitButton();
    }
  }
);

openPreviewImageWidgetBtn.addEventListener('click', () => {
  previewImageWidget.open();
});


// --- SELL FORM VALIDATION ---
function validateSellForm() {
  let errors = [];
  if (!titleInput.value.trim()) errors.push("Product title is required.");
  if (!descriptionInput.value.trim()) errors.push("Product description is required.");
  if (isNaN(parseFloat(priceInput.value))) errors.push("Price must be a valid number.");
  if (parseFloat(priceInput.value) < 0) errors.push("Price cannot be negative.");
  if (!productFileUrlInput.value.trim() || !/^https?:\/\/.+\..+/.test(productFileUrlInput.value.trim())) {
    errors.push("Valid download link is required.");
  }
  if (!previewImageUrlInput.value) errors.push("Product preview image is required.");
  if (!categorySelect.value) errors.push("Product category is required.");
  if (!paypalEmailContainer.classList.contains('hidden')) {
    const v = paypalEmailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push("Valid PayPal email is required for paid products.");
  }
  if (isPreviewImageUploading) errors.push("Please wait for the image upload to finish.");
  return errors;
}

function showFormErrors(errors) {
  if (!errors.length) {
    formErrorSummary.classList.add('hidden');
    formErrorSummary.innerHTML = "";
    return;
  }
  formErrorSummary.classList.remove('hidden');
  formErrorSummary.innerHTML = `<ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul>`;
}

function enableSubmitButton() {
  const errors = validateSellForm();
  showFormErrors(errors);
  if (errors.length) {
    submitProductBtn.disabled = true;
    submitProductBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    submitProductBtn.disabled = false;
    submitProductBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function disableSubmitButton() {
  submitProductBtn.disabled = true;
  submitProductBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

[
  titleInput, descriptionInput, priceInput, paypalEmailInput,
  previewImageUrlInput, productFileUrlInput, categorySelect
].forEach(input => {
  input.addEventListener('input', enableSubmitButton);
});

priceInput.addEventListener('input', () => {
  const price = parseFloat(priceInput.value);
  if (isNaN(price) || price === 0) {
    paypalEmailContainer.classList.add('hidden');
    paypalEmailInput.removeAttribute('required');
    paypalEmailInput.value = '';
  } else {
    paypalEmailContainer.classList.remove('hidden');
    paypalEmailInput.setAttribute('required', 'required');
  }
  enableSubmitButton();
  saveSellForm();
});

// --- SELL FORM SUBMIT ---
productUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableSubmitButton();
  submitProductBtn.textContent = 'Listing...';
  const errors = validateSellForm();
  if (errors.length) {
    showFormErrors(errors);
    submitProductBtn.textContent = 'List Product';
    enableSubmitButton();
    return;
  }
  try {
    if (!auth.currentUser) {
      await showAlert("You must be signed in to list a product.");
      window.location.reload();
      return;
    }
    const finalProductFileUrl = convertToGoogleDriveDirectDownload(productFileUrlInput.value.trim());
    const newProduct = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      price: parseFloat(priceInput.value),
      fileUrl: finalProductFileUrl,
      previewImageUrl: previewImageUrlInput.value,
      createdAt: serverTimestamp(),
      sellerId: auth.currentUser.uid,
      paypalEmail: paypalEmailInput.value.trim(),
      category: categorySelect.value || 'Other'
    };
    await addDoc(collection(db, "products"), newProduct);
    await showAlert('Product listed successfully!');
    localStorage.removeItem(SELL_FORM_KEY);
    toggleProductForm(false);
    await loadProducts();
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid);
  } catch (error) {
    console.error("Error adding document:", error);
    await showAlert('Failed to list product: ' + error.message);
  } finally {
    submitProductBtn.textContent = 'List Product';
    enableSubmitButton();
  }
});


// --- INITIAL LOAD AND EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  restoreSellForm();
  // loadProducts() is now called within onAuthStateChanged for both authenticated/unauthenticated users.
  // This line might be redundant or could be kept if you want products to load immediately,
  // before the auth state is even determined.
  // Keeping it here for now as a fallback, but onAuthStateChanged will likely trigger it too.
  if (!auth.currentUser) {
    loadProducts(); // Ensures products load for visitors even before auth resolves if user is not logged in
  }
});

// Event listener for general product list (for view button, as delete is specific to dashboard)
productListContainer.addEventListener('click', (event) => {
  const productCard = event.target.closest('.product-card.interactive-card');
  const viewButton = event.target.closest('.view-product-btn');

  if (viewButton) {
    event.stopPropagation();
    const productId = viewButton.dataset.productId;
    showProductDetails(productId);
  } else if (productCard) {
    // If a non-button part of the card is clicked, also show details
    const productId = productCard.dataset.productId;
    showProductDetails(productId);
  }
});
