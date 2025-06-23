// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
// *** CRITICAL FIX HERE ***: Correctly target the outer div with id="productForm"
const productFormContainer = document.getElementById('productForm'); // This is the div that needs to be toggled
const productUploadForm = document.getElementById('productUploadForm'); // This is the actual <form> element inside the container
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

// --- Custom Alert/Confirm Functions ---
function showAlert(message) {
  customAlertMessage.innerHTML = message;
  customAlertModal.classList.remove('hidden');
  customAlertModal.classList.add('modal-enter-active');
  customAlertModal.setAttribute('aria-hidden', 'false'); // Accessibility
  document.body.classList.add('overflow-hidden'); // Prevent scrolling body

  return new Promise(resolve => {
    const handleOk = () => {
      customAlertModal.classList.remove('modal-enter-active');
      customAlertModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customAlertModal.classList.add('hidden');
        customAlertModal.classList.remove('modal-exit-active');
        customAlertModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('overflow-hidden');
        resolve(true);
      }, 200);
    };
    customAlertOkBtn.onclick = handleOk;
    // Allow closing with Escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        handleOk();
        document.removeEventListener('keydown', escHandler);
      }
    });
  });
}

function showConfirm(message) {
  customConfirmMessage.textContent = message;
  customConfirmModal.classList.remove('hidden');
  customConfirmModal.classList.add('modal-enter-active');
  customConfirmModal.setAttribute('aria-hidden', 'false'); // Accessibility
  document.body.classList.add('overflow-hidden'); // Prevent scrolling body

  return new Promise(resolve => {
    const handleConfirm = () => {
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.add('hidden');
        customConfirmModal.classList.remove('modal-exit-active');
        customConfirmModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('overflow-hidden');
        resolve(true);
      }, 200);
    };

    const handleCancel = () => {
      customConfirmModal.classList.remove('modal-enter-active');
      customConfirmModal.classList.add('modal-exit-active');
      setTimeout(() => {
        customConfirmModal.classList.add('hidden');
        customConfirmModal.classList.remove('modal-exit-active');
        customConfirmModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('overflow-hidden');
        resolve(false);
      }, 200);
    };

    customConfirmOkBtn.onclick = handleConfirm;
    customConfirmCancelBtn.onclick = handleCancel;
    // Allow closing with Escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        handleCancel(); // Escape should typically cancel a confirm
        document.removeEventListener('keydown', escHandler);
      }
    });
  });
}


// --- Auth and Profile ---
document.body.style.visibility = "hidden"; // Hide body until auth state is known
onAuthStateChanged(auth, user => {
  document.body.style.visibility = ""; // Show body once auth state is known
  if (!user) {
    authOverlay.style.display = "flex";
    userGlobal = null;
    // If not authenticated and not on landing, redirect to landing
    if (window.location.href !== LANDING_URL) {
      // Small delay to prevent flickering if component mounts quickly
      // setTimeout(() => { window.location.href = LANDING_URL; }, 100);
    }
  } else {
    authOverlay.style.display = "none";
    userGlobal = user;
    showProfileUI(user);
    loadProducts(); // Load products once user is known (even if guest, this still runs)
    // If user is authenticated and on dashboard, reload dashboard specifically
    if (document.querySelector('aside nav a[data-tab="dashboard"]').classList.contains('bg-blue-100')) {
      showDashboard();
    }
    // Set initial active tab
    showTab('home'); // Ensure 'home' is always the default view on load
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
    // Toggle modal classes for transition
    if (dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('hidden', 'modal-exit-active');
      dropdownMenu.classList.add('modal-enter-active');
    } else {
      dropdownMenu.classList.remove('modal-enter-active');
      dropdownMenu.classList.add('modal-exit-active');
      setTimeout(() => {
        dropdownMenu.classList.add('hidden');
        dropdownMenu.classList.remove('modal-exit-active');
      }, 200); // Match CSS transition duration
    }
  };

  document.addEventListener('click', (e) => {
    // Hide dropdown if click outside
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

// --- Tab Navigation ---
function showTab(targetTabId) {
  // Deactivate all tabs
  tabs.forEach(t => {
    t.classList.remove('bg-blue-100');
    t.removeAttribute('aria-current');
  });
  // Activate the target tab
  const currentTab = document.querySelector(`a[data-tab="${targetTabId}"]`);
  if (currentTab) {
    currentTab.classList.add('bg-blue-100');
    currentTab.setAttribute('aria-current', 'page');
  }

  // Show/hide sections with transition
  sections.forEach(sec => {
    if (sec.id === targetTabId) {
      sec.classList.remove('hidden', 'modal-exit-active');
      sec.classList.add('modal-enter-active');
    } else {
      sec.classList.remove('modal-enter-active');
      sec.classList.add('modal-exit-active');
      // Adding a small delay for hidden to allow exit transition
      setTimeout(() => {
        sec.classList.add('hidden');
      }, 200); // Match CSS transition duration
    }
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', async (e) => {
    e.preventDefault();
    const target = tab.getAttribute('data-tab');
    showTab(target);

    // Specific logic for each tab
    if (target === 'sell') {
      // *** FIX: Correctly toggle the productFormContainer div ***
      // This ensures the main container for the form is made visible
      toggleProductForm(true); 
    } else if (target === 'home') {
      await filterAndRenderProducts(searchBar.value.trim(), currentCategoryFilter);
      searchBar.value = ''; // Clear search bar on tab switch
    } else if (target === 'dashboard') {
      if (auth.currentUser) {
        await showDashboard();
      } else {
        await showAlert("Please sign in to view your dashboard.");
        showTab('home'); // Redirect back to home if not signed in
      }
    }
    // Always hide product details if navigating to other main tabs
    productDetailsSection.classList.add('hidden');
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
    // Hide landing content with transition
    sellLandingContent.classList.remove('modal-enter-active');
    sellLandingContent.classList.add('modal-exit-active');
    setTimeout(() => {
      sellLandingContent.classList.add('hidden');
      sellLandingContent.classList.remove('modal-exit-active');
      // Show product form container with transition after landing content is hidden
      productFormContainer.classList.remove('hidden', 'modal-exit-active'); // Use productFormContainer
      productFormContainer.classList.add('modal-enter-active');
    }, 200); // Match CSS transition duration
    
    // Ensure the sell tab is active
    showTab('sell');
    // Always reset and restore form when toggling to show, in case of prior incomplete entries
    productUploadForm.reset();
    restoreSellForm();
    enableSubmitButton();
    formErrorSummary.classList.add('hidden'); // Clear any previous errors
  } else {
    // Hide product form container with transition
    productFormContainer.classList.remove('modal-enter-active'); // Use productFormContainer
    productFormContainer.classList.add('modal-exit-active');
    setTimeout(() => {
      productFormContainer.classList.add('hidden'); // Use productFormContainer
      productFormContainer.classList.remove('modal-exit-active');
      // Show landing content with transition after form is hidden
      sellLandingContent.classList.remove('hidden', 'modal-exit-active');
      sellLandingContent.classList.add('modal-enter-active');
    }, 200); // Match CSS transition duration
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

  // Trigger price input change to correctly show/hide paypalEmailContainer
  // This is important for initial load if price was saved.
  const event = new Event('input', { bubbles: true });
  priceInput.dispatchEvent(event);
  enableSubmitButton(); // Re-evaluate validation on restore
}

[
  titleInput, descriptionInput, priceInput, paypalEmailInput,
  previewImageUrlInput, productFileUrlInput, categorySelect
].forEach(input => {
  input.addEventListener('input', saveSellForm);
});

// Removed DOMContentLoaded listener for restoreSellForm
// It's now called within onAuthStateChanged or toggleProductForm for more controlled behavior.

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
      openPreviewImageWidgetBtn.classList.remove('input-invalid'); // Remove invalid styling on success
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
      // If widget closed without selecting or uploading, ensure validation reflects it
      if (previewImageUrlInput.value === '') {
        setFileInputStatus(previewImageStatus, 'Preview image selection cancelled or not provided.', 'error');
        openPreviewImageWidgetBtn.classList.add('input-invalid');
      }
      isPreviewImageUploading = false;
      enableSubmitButton();
    } else if (result && result.event === "asset_selected") {
      setFileInputStatus(previewImageStatus, `Uploading ${result.info.original_filename || 'image'}...`, 'loading');
      isPreviewImageUploading = true;
      disableSubmitButton(); // Disable submit while upload is in progress
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
  
  const priceVal = parseFloat(priceInput.value);
  if (isNaN(priceVal)) {
      errors.push("Price must be a valid number.");
  } else if (priceVal < 0) {
      errors.push("Price cannot be negative.");
  }

  // Regex for basic URL validation, ensures it starts with http(s)
  if (!productFileUrlInput.value.trim() || !/^https?:\/\/.+\..+/.test(productFileUrlInput.value.trim())) {
    errors.push("Valid download link is required (must start with http:// or https://).");
  }
  if (!previewImageUrlInput.value) errors.push("Product preview image is required.");
  if (!categorySelect.value) errors.push("Product category is required.");
  
  // Only validate PayPal email if price is greater than 0
  if (priceVal > 0) {
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
  showFormErrors(errors); // Always show errors on input
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

// Attach validation to all relevant input events
[
  titleInput, descriptionInput, priceInput, paypalEmailInput,
  previewImageUrlInput, productFileUrlInput, categorySelect
].forEach(input => {
  input.addEventListener('input', enableSubmitButton);
});

// Special handling for price input to show/hide PayPal email field
priceInput.addEventListener('input', () => {
  const price = parseFloat(priceInput.value);
  if (isNaN(price) || price <= 0) { // Price 0 or less also hides it
    paypalEmailContainer.classList.add('hidden');
    paypalEmailInput.removeAttribute('required');
    paypalEmailInput.value = ''; // Clear PayPal email if product becomes free
  } else {
    paypalEmailContainer.classList.remove('hidden');
    paypalEmailInput.setAttribute('required', 'required');
  }
  enableSubmitButton(); // Re-evaluate validation
  saveSellForm();
});

// Initial validation check on page load to set button state
document.addEventListener("DOMContentLoaded", () => {
  // Initial state check for Sell form
  // Using productFormContainer here, as it's the element whose visibility is managed
  if (!productFormContainer.classList.contains('hidden')) {
    restoreSellForm(); // Only restore if the form is somehow visible on load
    enableSubmitButton();
  }
});


// --- SELL FORM SUBMIT ---
productUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableSubmitButton(); // Disable immediately to prevent double submission
  submitProductBtn.textContent = 'Listing...';
  
  const errors = validateSellForm();
  if (errors.length) {
    showFormErrors(errors);
    submitProductBtn.textContent = 'List Product';
    enableSubmitButton(); // Re-enable if validation fails before submission
    return;
  }

  try {
    if (!auth.currentUser) {
      await showAlert("You must be signed in to list a product.");
      submitProductBtn.textContent = 'List Product'; // Reset text
      enableSubmitButton(); // Re-enable button
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
    localStorage.removeItem(SELL_FORM_KEY); // Clear saved form data
    productUploadForm.reset(); // Clear form inputs
    previewImageContainer.classList.add('hidden'); // Hide image preview
    currentPreviewImage.src = ''; // Clear image src
    setFileInputStatus(previewImageStatus, '', 'default'); // Clear status message
    openPreviewImageWidgetBtn.classList.remove('input-invalid'); // Remove any invalid styling

    toggleProductForm(false); // Go back to sell landing content
    await loadProducts(); // Reload all products in home
    if (auth.currentUser) {
      await loadMyProducts(auth.currentUser.uid); // Reload user's dashboard products
    }
  } catch (error) {
    console.error("Error adding document:", error);
    await showAlert('Failed to list product: ' + error.message);
  } finally {
    submitProductBtn.textContent = 'List Product';
    enableSubmitButton(); // Ensure button is re-enabled in finally block
  }
});

// --- PRODUCT LISTING & SEARCH ---
async function loadProducts() {
  productListContainer.innerHTML = '';
  noProductsMessage.textContent = 'Loading products...';
  noProductsMessage.classList.remove('hidden');

  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    window.allProducts = [];
    if (querySnapshot.empty) {
      noProductsMessage.textContent = 'No products listed yet.';
      return;
    }

    noProductsMessage.classList.add('hidden');
    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      window.allProducts.push(product);
    });

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

  // Add event listeners using delegation for better performance and future proofing
  // (though direct attachment here is fine for small numbers)
  productListContainer.querySelectorAll('.view-product-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = e.target.dataset.productId;
      showProductDetails(productId);
    });
  });

  productListContainer.querySelectorAll('.product-card.interactive-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Ensure click on button doesn't trigger card click
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
  showTab('productDetails'); // Make productDetails tab active in UI
  productDetailsError.textContent = '';
  detailActionButton.innerHTML = 'Loading...';
  detailActionButton.disabled = true;
  paypalButtonContainer.innerHTML = ''; // Clear previous PayPal button

  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const product = { id: productSnap.id, ...productSnap.data() };
    detailProductImage.src = product.previewImageUrl;
    detailProductTitle.textContent = product.title;
    detailProductDescription.textContent = product.description;
    detailProductPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;

    // Handle purchase/download button
    if (product.price > 0) {
      if (auth.currentUser && auth.currentUser.uid === product.sellerId) {
        detailActionButton.innerHTML = '<span class="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-bold">Your Product</span>';
        detailActionButton.disabled = true;
      } else {
        detailActionButton.innerHTML = ''; // Clear any existing action text
        detailActionButton.disabled = false; // Ensure button is enabled for PayPal
        
        // Render PayPal buttons
        // Ensure the PayPal SDK is loaded before this runs.
        // It's in the index.html with async load.
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

              sendSaleEmail({
                buyerName: details.payer.name.given_name + ' ' + details.payer.name.surname,
                buyerEmail: details.payer.email_address,
                sellerPaypalEmail: product.paypalEmail,
                productTitle: product.title,
                amount: product.price.toFixed(2)
              });

              await handleProductPurchase(product);
              await showAlert(`Purchase successful! Your download link is: <a href="${product.fileUrl}" target="_blank" class="text-blue-500 underline">Download Now</a>`);
            });
          },
          onError: function(err) {
            console.error('PayPal button error:', err);
            showAlert('An error occurred during payment. Please try again.');
          }
        }).render('#paypal-button-container');
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
    productDetailsError.textContent = 'Failed to load product details. ' + error.message;
    detailProductTitle.textContent = 'Product Not Available';
    detailProductDescription.textContent = 'The product you are looking for might have been removed or does not exist.';
    detailProductPrice.textContent = '';
    detailProductImage.src = 'https://via.placeholder.com/400x300?text=Product+Not+Found'; // Placeholder for missing image
    detailActionButton.innerHTML = '';
    paypalButtonContainer.innerHTML = '';
  } finally {
    // This finally block ensures the action button state is reset after fetch attempts
    // If PayPal button is rendered, its own rendering handles enablement.
    // If it's a free product, the button is set.
    // If it's "Your Product", it's disabled.
    // Only re-enable if it's not handled by the PayPal render or free product button setting.
    if (detailActionButton.innerHTML === 'Loading...') {
      detailActionButton.innerHTML = ''; // Clear loading text if no action determined
    }
  }
}

// Watch seller balance in real-time
// Using onSnapshot for real-time updates to the dashboard balance
function watchSellerBalance(sellerId) {
  const balRef = doc(db, "balances", sellerId);
  // Unsubscribe from previous snapshot listener if it exists to prevent memory leaks
  if (window.balanceUnsubscribe) {
    window.balanceUnsubscribe();
  }

  window.balanceUnsubscribe = onSnapshot(balRef, (docSnap) => {
    if (docSnap.exists() && typeof docSnap.data().balance === 'number') {
      sellerBalance.textContent = `$${docSnap.data().balance.toFixed(2)}`;
    } else {
      sellerBalance.textContent = `$0.00`;
    }
  }, (error) => {
    console.error("Error watching balance:", error);
    sellerBalance.textContent = `$Error`; // Indicate error
  });
}

// Function to update seller balance (one-off fetch - replaced by watchSellerBalance)
// Keeping it for consistency but watchSellerBalance is better for real-time dashboard.
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
    await showAlert("Please sign in to view your dashboard.");
    showTab('home'); // Redirect back to home
    return;
  }
  showTab('dashboard');
  // Ensure we start watching the balance when the dashboard is shown
  watchSellerBalance(auth.currentUser.uid);
  await loadMyProducts(auth.currentUser.uid);
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
    await showAlert("Failed to update seller balance: " + e.message); // Inform user of balance update failure
  }
}

async function handleProductPurchase(product) {
  if (!product || !product.sellerId || !product.price) {
    console.error("Invalid product data for purchase handling.");
    return;
  }
  await incrementSellerBalance(product.sellerId, parseFloat(product.price));
}

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

/**
 * Deletes a product from Firestore after user confirmation.
 * Reloads the user's products in the dashboard and all products in the home section upon successful deletion.
 *
 * @param {string} productId The ID of the product to delete.
 * @param {object} db The Firestore database instance.
 * @param {object} auth The Firebase Auth instance.
 * @param {function} showAlert Function to display custom alert messages.
 * @param {function} showConfirm Function to display custom confirmation messages.
 * @param {function} loadMyProducts Function to reload products in the user's dashboard.
 * @param {function} loadProducts Function to reload all products in the home section.
 */
async function deleteProduct(productId, db, auth, showAlert, showConfirm, loadMyProducts, loadProducts) {
  // Use a loading state for the dashboard during deletion
  myProductsContainer.innerHTML = '<div class="col-span-full text-center text-gray-500"><div class="loading-spinner mx-auto mb-2"></div> Deleting product...</div>';
  noMyProductsMessage.classList.add('hidden'); // Hide "No products" message temporarily

  const confirmed = await showConfirm("Are you sure you want to delete this product? This action cannot be undone.");
  
  // Re-render my products if confirmation was cancelled, to clear loading state
  if (!confirmed) {
    console.log("Product deletion cancelled by user.");
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid); // Reload to clear "Deleting..." message
    return;
  }

  try {
    // Delete the document from the 'products' collection in Firestore
    console.log(`Attempting to delete product with ID: ${productId}`);
    await deleteDoc(doc(db, "products", productId));
    console.log(`Product ${productId} deleted successfully from Firestore.`);

    // Show success message to the user
    await showAlert("Product deleted successfully!");

    // If a user is authenticated, reload their products in the dashboard
    if (auth.currentUser) {
      await loadMyProducts(auth.currentUser.uid);
    }
    // Reload all products in the home section to reflect the deletion
    await loadProducts();
  } catch (error) {
    // Log and display error if deletion fails
    console.error("Error deleting product:", error);
    if (error.code) { // Firebase errors usually have a 'code' property
      console.error(`Firebase error code: ${error.code}`);
      console.error(`Firebase error message: ${error.message}`);
      if (error.code === 'permission-denied') {
          await showAlert(`Failed to delete product: Permission denied. This typically means your Firebase Security Rules prevent this action. Please check your Firestore rules. Error: ${error.message}`);
      } else if (error.code === 'not-found') {
          await showAlert(`Failed to delete product: Product not found. It may have already been deleted. Error: ${error.message}`);
      }
      else {
          await showAlert("Failed to delete product: " + error.message);
      }
    } else {
      await showAlert("Failed to delete product: " + error.message);
    }
  } finally {
    // Always ensure the UI is reloaded to clear any loading states, regardless of success or failure.
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid);
  }
}

// --- Load My Products for Dashboard ---
async function loadMyProducts(userId) {
  myProductsContainer.innerHTML = '';
  noMyProductsMessage.textContent = 'Loading your products...';
  noMyProductsMessage.classList.remove('hidden');

  try {
    const q = query(collection(db, "products"),
      where("sellerId", "==", userId),
      orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      noMyProductsMessage.textContent = 'You have not listed any products yet.';
      return;
    }

    noMyProductsMessage.classList.add('hidden');
    myProductsContainer.innerHTML = querySnapshot.docs.map(doc => {
      const product = { id: doc.id, ...doc.data() };
      return `
        <div class="bg-white rounded-2xl shadow-lg p-6 flex flex-col product-card" data-product-id="${product.id}">
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
    }).join('');

    // Add event listeners for new buttons
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
        // Pass necessary functions for deleteProduct to work correctly
        await deleteProduct(productId, db, auth, showAlert, showConfirm, loadMyProducts, loadProducts);
      });
    });

  } catch (error) {
    console.error("Error loading user's products:", error);
    noMyProductsMessage.textContent = 'Failed to load your products. Please try again later.';
    noMyProductsMessage.classList.remove('hidden');
  }
}

// --- Initial Load Logic ---
document.addEventListener("DOMContentLoaded", () => {
  // Initial setup for sell form visibility on page load.
  // By default, the sell landing content should be visible, and the form container hidden.
  sellLandingContent.classList.remove('hidden');
  productFormContainer.classList.add('hidden'); // Use productFormContainer
  productFormContainer.classList.remove('modal-enter-active'); // Ensure no lingering modal class
});

// Event listener for general product list (delegation)
productListContainer.addEventListener('click', (event) => {
  const productCard = event.target.closest('.product-card.interactive-card');
  const viewButton = event.target.closest('.view-product-btn');

  if (viewButton) {
    event.stopPropagation();
    const productId = viewButton.dataset.productId;
    showProductDetails(productId);
  } else if (productCard) {
    const productId = productCard.dataset.productId;
    showProductDetails(productId);
  }
});
