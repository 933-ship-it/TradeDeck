// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck-landing-page/";

// --- Firebase Config (ensure this matches your project config) ---
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
const profileToggleArea = document.getElementById('profileToggleArea'); // Changed from profilePic for larger click area
const profilePic = document.getElementById('userProfilePic');
const dropdownMenu = document.getElementById('dropdownMenu');
const userEmail = document.getElementById('userEmail');
const userEmailDisplay = document.getElementById('userEmailDisplay');
// For email display next to profile pic
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

// Home/Product listing
const searchBar = document.getElementById('searchBar');
const categoryTabs = document.querySelectorAll('.category-tab');
// New: Category tabs
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
// Global variable for all fetched products to enable client-side filtering by category/search
window.allProducts = [];
let currentCategoryFilter = 'All';
// New: Track current category filter

// --- Custom Alert/Confirm Functions ---
function showAlert(message) {
  customAlertMessage.textContent = message;
  customAlertModal.classList.remove('hidden');
  customAlertModal.classList.add('modal-enter-active');
  customAlertModal.querySelector('div').classList.add('modal-enter-active');
  return new Promise(resolve => {
    customAlertOkBtn.onclick = () => {
      customAlertModal.classList.remove('modal-enter-active');
      customAlertModal.querySelector('div').classList.remove('modal-enter-active');
      customAlertModal.classList.add('modal-exit-active');
      customAlertModal.querySelector('div').classList.add('modal-exit-active');

      setTimeout(() => {
        customAlertModal.classList.add('hidden');
        customAlertModal.classList.remove('modal-exit-active');
        customAlertModal.querySelector('div').classList.remove('modal-exit-active');
        resolve(true);
      }, 200); // Duration of modal-exit-active transition
    };
  });
}

function showConfirm(message) {
  customConfirmMessage.textContent = message;
  customConfirmModal.classList.remove('hidden');
  customConfirmModal.classList.add('modal-enter-active');
  customConfirmModal.querySelector('div').classList.add('modal-enter-active');
  return new Promise(resolve => {
    const handleConfirm = () => {
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.querySelector('div').classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      customConfirmModal.querySelector('div').classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.add('hidden');
        customConfirmModal.classList.remove('modal-exit-active');
        customConfirmModal.querySelector('div').classList.remove('modal-exit-active');
        resolve(true);
      }, 200);
    };

    const handleCancel = () => {
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.querySelector('div').classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      customConfirmModal.querySelector('div').classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.add('hidden');
        customConfirmModal.classList.remove('modal-exit-active');
        customConfirmModal.querySelector('div').classList.remove('modal-exit-active');
        resolve(false);
      }, 200);
    };

    customConfirmOkBtn.onclick = handleConfirm;
    customConfirmCancelBtn.onclick = handleCancel;
  });
}


// --- Auth and Profile ---
document.body.style.visibility = "hidden";
onAuthStateChanged(auth, user => {
  document.body.style.visibility = "";
  if (!user) {
    authOverlay.style.display = "flex";
    userGlobal = null;
  } else {
    authOverlay.style.display = "none";
    userGlobal = user;
    showProfileUI(user);
    // Initial load for home products and dashboard if already signed in
    loadProducts();
    if (document.querySelector('aside nav a[data-tab="dashboard"]').classList.contains('bg-blue-100')) {
      showDashboard(); // If dashboard was the active tab on refresh
    }
  }
});
// --- EmailJS sale notification ---
function sendSaleEmail({ buyerName, buyerEmail, sellerPaypalEmail, productTitle, amount }) {
  emailjs.send('service_px8mdvo', 'template_4gvs2zf', {
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    seller_paypal_email: sellerPaypalEmail,
    product_title: productTitle,
    amount: amount
  }).then(function(response) {
    console.log('Sale email sent!', response.status, response.text);
  }, function(error) {
    console.error('FAILED to send sale email.', error);
  });
}

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
        }, 200); // Match modal exit animation duration
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

// --- Tab Navigation ---
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
      sec.classList.add('modal-enter-active'); // Apply enter animation
    } else {
      sec.classList.remove('modal-enter-active');
      sec.classList.add('hidden'); // Hide immediately if not target
    }
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', async (e) => {
    e.preventDefault();
    const target = tab.getAttribute('data-tab');
    showTab(target);
    if (target !== 'sell' && !productForm.classList.contains('hidden')) {
      toggleProductForm(false);
    }
    productDetailsSection.classList.add('hidden'); // Ensure product details is hidden
    if (target === 'home') {
      // Re-apply current category filter and search after switching to home
      await filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
      searchBar.value = ''; // Clear search bar on tab
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
    // Animate form in
    showTab('sell');
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
    // Match exit animation duration
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
    productFileUrl: productFileUrlInput.value
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
  if (state.previewImageUrl) {
    currentPreviewImage.src = state.previewImageUrl;
    previewImageContainer.classList.remove('hidden');
  } else {
    previewImageContainer.classList.add('hidden');
    currentPreviewImage.src = "";
  }
  // Show/hide PayPal field based on price
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
  previewImageUrlInput, productFileUrlInput
].forEach(input => {
  input.addEventListener('input', saveSellForm);
});
document.addEventListener("DOMContentLoaded", restoreSellForm);
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
// --- UTILITIES ---
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
// --- SELL FORM VALIDATION ---
function validateSellForm() {
  let errors = [];
  if (!titleInput.value.trim()) errors.push("Product title is required.");
  if (!descriptionInput.value.trim()) errors.push("Product description is required.");
  if (isNaN(parseFloat(priceInput.value)) || parseFloat(priceInput.value) < 0) errors.push("Price must be zero or a positive number.");
  if (!productFileUrlInput.value.trim() || !/^https?:\/\/.+\..+/.test(productFileUrlInput.value.trim())) errors.push("Valid download link is required.");
  if (!previewImageUrlInput.value) errors.push("Product preview image is required.");
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
  previewImageUrlInput, productFileUrlInput
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
  showFormErrors(errors);
  if (errors.length) {
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
      category: 'Other' // Default category, can be expanded with a dropdown if needed
    };
    await addDoc(collection(db, "products"), newProduct);
    await showAlert('Product listed successfully!');
    localStorage.removeItem(SELL_FORM_KEY);
    toggleProductForm(false);
    await loadProducts();
    // Reload all products after successful listing
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid);
  } catch (error) {
    showFormErrors(["Failed to list product. Please try again."]);
    console.error("Error adding document to Firestore:", error);
    await showAlert('Failed to list product. Please check console for details. (Check Firestore rules!)');
  } finally {
    enableSubmitButton();
    submitProductBtn.textContent = 'List Product';
  }
});
// --- PRODUCT LISTING & SEARCH ---
async function loadProducts() {
  productListContainer.innerHTML = '';
  noProductsMessage.textContent = 'Loading products...';
  noProductsMessage.classList.remove('hidden');
  try {
    // Note: orderBy("createdAt", "desc") requires a Firestore index.
    // The console will provide a link to create it if it doesn't exist.
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    window.allProducts = [];
    // Clear previous products
    if (querySnapshot.empty) {
      noProductsMessage.textContent = 'No products listed yet.';
      return;
    }
    noProductsMessage.classList.add('hidden'); // Hide if products are found

    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      window.allProducts.push(product); // Add to global list
    });
    // Now filter and render based on current search and category
    filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
  } catch (error) {
    console.error("Error loading products:", error);
    noProductsMessage.textContent = 'Failed to load products. Please try again later.';
    noProductsMessage.classList.remove('hidden');
  }
}

async function filterAndRenderProducts(searchTerm = '', category = 'All') {
  productListContainer.innerHTML = '';
  let filteredProducts = window.allProducts;

  if (category !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      p.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  if (filteredProducts.length === 0) {
    noProductsMessage.textContent = 'No products found matching your criteria.';
    noProductsMessage.classList.remove('hidden');
    return;
  }
  noProductsMessage.classList.add('hidden');

  filteredProducts.forEach(product => {
    const productCard = `
      <div class="bg-white rounded-2xl shadow-lg p-6 flex flex-col product-card interactive-card" data-product-id="${product.id}">
        <img src="${product.previewImageUrl}" alt="${product.title}" class="w-full h-48 object-cover rounded-xl mb-4">
        <h4 class="text-xl font-bold text-gray-900 mb-2 truncate">${product.title}</h4>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description}</p>
        <div class="flex items-center justify-between mt-auto">
          <span class="text-2xl font-extrabold text-blue-600">$${parseFloat(product.price).toFixed(2)}</span>

          <button class="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors duration-200 view-product-btn" data-product-id="${product.id}">Details</button>
        </div>
      </div>
    `;
    productListContainer.innerHTML += productCard;
  });
  // Add event listeners for view buttons after rendering for home section
  productListContainer.querySelectorAll('.view-product-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = e.target.dataset.productId;
      showProductDetails(productId);
    });
  });
  // Also add listener for the whole card to show details
  productListContainer.querySelectorAll('.product-card.interactive-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Only trigger if click is not on the button itself (delegated to button already)
      if (!e.target.closest('.view-product-btn')) {
        const productId = card.dataset.productId;
        showProductDetails(productId);
      }
    });
  });
}

searchBar.addEventListener('input', () => {
  filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
});

categoryTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    categoryTabs.forEach(t => t.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentCategoryFilter = e.currentTarget.dataset.category || 'All';
    filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
  });
});
async function showProductDetails(productId) {
  productDetailsSection.classList.remove('hidden');
  showTab('productDetails'); // Make sure the product details section is visible
  productDetailsError.textContent = '';
  // Clear previous errors
  detailActionButton.innerHTML = 'Loading...';
  detailActionButton.disabled = true;
  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      productDetailsError.textContent = 'Product not found.';
      detailProductTitle.textContent = '';
      detailProductDescription.textContent = '';
      detailProductPrice.textContent = '';
      detailProductImage.src = '';
      paypalButtonContainer.innerHTML = '';
      return;
    }

    const product = { id: productSnap.id, ...productSnap.data() };

    detailProductImage.src = product.previewImageUrl;
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    detailProductPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;

    // Clear previous PayPal button and set up for new product
    paypalButtonContainer.innerHTML = '';
    detailActionButton.style.display = 'block'; // Ensure button container is visible

    if (product.price > 0) {
      if (auth.currentUser && auth.currentUser.uid === product.sellerId) {
        detailActionButton.innerHTML = '<span class="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-bold">Your Product</span>';
        detailActionButton.disabled = true;
        detailActionButton.style.cursor = 'default';
      } else {
        detailActionButton.innerHTML = '';
        // Clear the "Loading..."
        detailActionButton.disabled = false;
        // Enable for purchase
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
            return actions.order.capture().then(async function(details) {
              await showAlert('Transaction completed by ' + details.payer.name.given_name + '!');


              // Record sale in Firestore
              await addDoc(collection(db, "sales"), {
                productId: product.id,
                productTitle: product.title,
                price: product.price,
                buyerId: auth.currentUser ? auth.currentUser.uid : 'guest',

                buyerEmail: auth.currentUser ? auth.currentUser.email : details.payer.email_address,
                sellerId: product.sellerId,
                sellerPaypalEmail: product.paypalEmail,
                saleDate: serverTimestamp(),
                paypalOrderId: data.orderID

              });

              // Send sale notification email
              sendSaleEmail({
                buyerName: details.payer.name.given_name + ' ' + details.payer.name.surname,
                buyerEmail: details.payer.email_address,
                sellerPaypalEmail: product.paypalEmail,
                productTitle: product.title,

                amount: product.price.toFixed(2)
              });
              // Increment seller's balance
              await handleProductPurchase(product);
              // Provide download link
              await showAlert(`Purchase successful! Your download link is: <a href="${product.fileUrl}" target="_blank" class="text-blue-500 underline">Download Now</a>`);
            });
          },
          onError: function(err) {
            console.error('PayPal button error:', err);
            showAlert('An error occurred during payment. Please try again.');
          }
        }).render('#paypal-button-container');
        // Render the PayPal button
      }
    } else { // Free product
      detailActionButton.innerHTML = `
        <button class="bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 font-bold text-lg transition-colors duration-200"
                onclick="window.open('${product.fileUrl}', '_blank')">Download Free</button>
      `;
      detailActionButton.disabled = false;
    }

  } catch (error) {
    console.error("Error fetching product details:", error);
    productDetailsError.textContent = 'Failed to load product details.';
    detailProductTitle.textContent = '';
    detailProductDescription.textContent = '';
    detailProductPrice.textContent = '';
    detailProductImage.src = '';
    detailActionButton.innerHTML = '';
    paypalButtonContainer.innerHTML = '';
  } finally {
    detailActionButton.disabled = false;
    // Re-enable if it was disabled by 'loading'
  }
}

// Watch seller balance in real-time
function watchSellerBalance(sellerId) {
  const balRef = doc(db, "balances", sellerId);
  onSnapshot(balRef, (docSnap) => {
    if (docSnap.exists() && typeof docSnap.data().balance === 'number') {
      sellerBalance.textContent = `$${docSnap.data().balance.toFixed(2)}`;
    } else {
      sellerBalance.textContent = `$0.00`;
    }
  }, (error) => {
    console.error("Error watching balance:", error);
  });
}

// Function to update seller balance (one-off fetch)
async function updateSellerBalance(sellerId) {
  const balRef = doc(db, "balances", sellerId);
  try {
    const docSnap = await getDoc(balRef);
    if (docSnap.exists() && typeof docSnap.data().balance === 'number') {
      sellerBalance.textContent = `$${docSnap.data().balance.toFixed(2)}`;
    } else {
      sellerBalance.textContent = `$0.00`;
    }
  } catch (e) {
    console.error("Error fetching balance:", e);
    sellerBalance.textContent = `$0.00`;
  }
}


async function showDashboard() {
  if (!auth.currentUser) {
    showAlert("Please sign in to view your dashboard.");
    return;
  }
  showTab('dashboard');
  await updateSellerBalance(auth.currentUser.uid);
  watchSellerBalance(auth.currentUser.uid); // Start real-time updates for balance
  await loadMyProducts(auth.currentUser.uid);
  // Load user's products
}
async function incrementSellerBalance(sellerId, amount) {
  const balRef = doc(db, "balances", sellerId);
  try {
    await runTransaction(db, async (tx) => {
      const docSnap = await tx.get(balRef);
      let newBalance = amount;
      if (docSnap.exists() && typeof docSnap.data().balance === 'number') {
        newBalance += docSnap.data().balance;
      }
      tx.set(balRef, { balance: newBalance }, { merge: true });
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
  }
}
async function handleProductPurchase(product) {
  if (!product || !product.sellerId || !product.price) {
    console.error("Invalid product data for purchase handling.");
    return;
  }
  await incrementSellerBalance(product.sellerId, parseFloat(product.price));
}


// --- New: Load My Products for Dashboard ---
async function loadMyProducts(userId) {
  myProductsContainer.innerHTML = ''; // Clear previous products
  noMyProductsMessage.textContent = 'Loading your products...';
  noMyProductsMessage.classList.remove('hidden');

  try {
    // Query products where sellerId matches the current user's ID
    const q = query(collection(db, "products"), where("sellerId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      noMyProductsMessage.textContent = 'You have not listed any products yet.';
      return;
    }
    noMyProductsMessage.classList.add('hidden'); // Hide if products are found

    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      const productCard = `
        <div class="bg-white rounded-2xl shadow-lg p-6 flex flex-col product-card interactive-card" data-product-id="${product.id}">
          <img src="${product.previewImageUrl}" alt="${product.title}" class="w-full h-48 object-cover rounded-xl mb-4">
          <h4 class="text-xl font-bold text-gray-900 mb-2 truncate">${product.title}</h4>
          <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description}</p>
          <div class="flex items-center justify-between mt-auto">
            <span class="text-2xl font-extrabold text-blue-600">$${parseFloat(product.price).toFixed(2)}</span>
            <div class="flex space-x-2">
              <button class="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors duration-200 view-product-btn" data-product-id="${product.id}">Details</button>
              <button class="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors duration-200 delete-product-btn" data-product-id="${product.id}">Delete</button>
            </div>
          </div>
        </div>
      `;
      myProductsContainer.innerHTML += productCard;
    });

    // Add event listeners for buttons in "My Products" section
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
        await deleteProduct(productId);
      });
    });

  } catch (error) {
    console.error("Error loading user's products:", error);
    noMyProductsMessage.textContent = 'Failed to load your products. Please try again later.';
    noMyProductsMessage.classList.remove('hidden');
  }
}

// --- New: Delete Product Functionality ---
async function deleteProduct(productId) {
  const confirmed = await showConfirm("Are you sure you want to delete this product? This action cannot be undone.");
  if (confirmed) {
    try {
      await deleteDoc(doc(db, "products", productId));
      showAlert("Product deleted successfully!");
      if (auth.currentUser) await loadMyProducts(auth.currentUser.uid); // Reload products in dashboard
      await loadProducts(); // Reload all products in home section after deletion
    } catch (error) {
      console.error("Error deleting product:", error);
      showAlert("Failed to delete product: " + error.message);
    }
  }
}


// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
    // Only load products if not already authenticated, onAuthStateChanged will handle it
    if (!auth.currentUser) {
        loadProducts(); // Load for unauthenticated users
    }
    restoreSellForm();
});
// Event listener for general product list (home page)
productListContainer.addEventListener('click', (event) => {
    const productCard = event.target.closest('.product-card.interactive-card');
    const viewButton = event.target.closest('.view-product-btn'); // For specific 'Details' button on home page

    if (viewButton) {
        // If the 'Details' button was clicked directly
        event.stopPropagation(); // Prevent card click from firing too
        const productId = viewButton.dataset.productId;
        showProductDetails(productId);
    } else if (productCard) {

        // If any other part of the card was clicked
        const productId = productCard.dataset.productId;
        showProductDetails(productId);
    }
});
