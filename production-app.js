// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Constants ---
const CLOUDINARY_CLOUD_NAME = 'desejdvif';
const CLOUDINARY_UPLOAD_PRESET = 'TradeDeck user products';
const SELL_FORM_KEY = "TradeDeckSellForm";
const LANDING_URL = "https://933-ship-it.github.io/TradeDeck-landing-page/";
const THEME_STORAGE_KEY = 'TradeDeckTheme'; // Key for storing theme preference

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
const profilePic = document.getElementById('userProfilePic');
const dropdownMenu = document.getElementById('dropdownMenu');
const userEmail = document.getElementById('userEmail');
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

// Edit modal
const editProductModal = document.getElementById('editProductModal');
const editProductForm = document.getElementById('editProductForm');
const editProductIdInput = document.getElementById('editProductId');
const editTitleInput = document.getElementById('editTitle');
const editDescriptionInput = document.getElementById('editDescription');
const editPriceInput = document.getElementById('editPrice');
const editFileUrlInput = document.getElementById('editFileUrl');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// PIN Modals
const initialPinModal = document.getElementById('initialPinModal');
const closeInitialPinModalBtn = document.getElementById('closeInitialPinModalBtn');
const initialPinDisplay = document.getElementById('initialPinDisplay');
const initialPinConfirmBtn = document.getElementById('initialPinConfirmBtn');
const pinEntryModal = document.getElementById('pinEntryModal');
const closePinEntryModalBtn = document.getElementById('closePinEntryModalBtn');
const pinInput = document.getElementById('pinInput');
const pinErrorMessage = document.getElementById('pinErrorMessage');
const pinEntryForm = document.getElementById('pinEntryForm');
let userPIN = null; // To store the user's PIN after generation/retrieval

// Settings & Dark Mode
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const darkModeToggle = document.getElementById('darkModeToggle');

// --- THEME MANAGEMENT ---
function setTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    darkModeToggle.checked = true;
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    darkModeToggle.checked = false;
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Default to system preference if no theme is saved
    setTheme('dark');
  } else {
    setTheme('light');
  }
}

darkModeToggle.addEventListener('change', () => {
  if (darkModeToggle.checked) {
    setTheme('dark');
  } else {
    setTheme('light');
  }
});

// Toggle settings panel visibility
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

// Close settings panel when clicking outside
document.addEventListener('click', (e) => {
  if (!settingsBtn.contains(e.target) && !settingsPanel.contains(e.target)) {
    settingsPanel.classList.add('hidden');
  }
});

// --- Auth and Profile ---
document.body.style.visibility = "hidden";
onAuthStateChanged(auth, async user => {
  document.body.style.visibility = "";
  if (!user) {
    authOverlay.style.display = "flex";
    userGlobal = null;
    userPIN = null; // Clear PIN on sign out
  } else {
    authOverlay.style.display = "none";
    userGlobal = user;
    showProfileUI(user);
    await retrieveUserPIN(user.uid); // Retrieve PIN on sign-in
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
  profilePic.onclick = function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
  };
  document.addEventListener('click', (e) => {
    if (!profilePic.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });
  document.getElementById('deleteAccountBtn').onclick = async () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await deleteUser(user);
        // Also delete user's data from Firestore (products, balance, PIN)
        const userProductsQuery = query(collection(db, "products"), where("sellerId", "==", user.uid));
        const userProductsSnapshot = await getDocs(userProductsQuery);
        const deleteProductPromises = userProductsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteProductPromises);
        await deleteDoc(doc(db, "balances", user.uid)).catch(e => console.log("No balance to delete or error:", e));
        await deleteDoc(doc(db, "userPINs", user.uid)).catch(e => console.log("No PIN to delete or error:", e));

        alert("Account and all associated data deleted successfully.");
        window.location.href = LANDING_URL;
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          alert("For security, please sign out and sign in again, then try deleting your account immediately.");
        } else {
          alert("Failed to delete account: " + err.message);
        }
        console.error("Error deleting account:", err);
      }
    }
  };
  document.getElementById('signOutBtn').onclick = async () => {
    try {
      await signOut(auth);
      alert("You have been signed out.");
      window.location.href = LANDING_URL; // Redirect to landing/sign-in page
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };
}

// --- Tab Navigation ---
async function showTab(targetTabId) {
  tabs.forEach(t => {
    t.classList.remove('bg-blue-100', 'dark:bg-blue-600');
    t.classList.add('hover:bg-gray-200', 'dark:hover:bg-gray-700');
    t.removeAttribute('aria-current');
  });
  const currentTab = document.querySelector(`a[data-tab="${targetTabId}"]`);
  if (currentTab) {
    currentTab.classList.add('bg-blue-100', 'dark:bg-blue-600');
    currentTab.classList.remove('hover:bg-gray-200', 'dark:hover:bg-gray-700');
    currentTab.setAttribute('aria-current', 'page');
  }
  sections.forEach(sec => {
    if (sec.id === targetTabId) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', async (e) => {
    e.preventDefault();
    const target = tab.getAttribute('data-tab');

    if (target === 'sell') {
      if (!userGlobal) {
        alert("Please sign in to access the 'Sell' section.");
        showTab('home'); // Redirect to home if not signed in
        return;
      }
      if (userPIN) {
        pinInput.value = ''; // Clear previous input
        pinErrorMessage.textContent = '';
        pinEntryModal.classList.remove('hidden');
        pinInput.focus();
      } else {
        // User has no PIN, generate and show initial PIN modal
        await generateAndShowInitialPIN();
      }
    } else {
      showTab(target);
      if (target !== 'sell' && !productForm.classList.contains('hidden')) {
        toggleProductForm(false);
      }
      productDetailsSection.classList.add('hidden');
      if (target === 'home') {
        await loadProducts(searchBar.value.trim());
        searchBar.value = '';
      } else if (target === 'dashboard') {
        await showDashboard();
      }
    }
  });
});

backToHomeBtn.addEventListener('click', () => {
  showTab('home');
  loadProducts(searchBar.value.trim());
});

startSellingBtn.addEventListener('click', () => {
  toggleProductForm(true);
});

function toggleProductForm(showForm) {
  if (showForm) {
    sellLandingContent.classList.add('hidden');
    productForm.classList.remove('hidden');
    // showTab('sell'); // This is already handled by the tab click
    productUploadForm.reset();
    restoreSellForm();
    enableSubmitButton();
  } else {
    sellLandingContent.classList.remove('hidden');
    productForm.classList.add('hidden');
  }
}

// --- PIN Management ---
async function retrieveUserPIN(userId) {
  try {
    const pinDocRef = doc(db, "userPINs", userId);
    const docSnap = await getDoc(pinDocRef);
    if (docSnap.exists()) {
      userPIN = docSnap.data().pin;
      console.log("PIN retrieved for user:", userId);
    } else {
      userPIN = null;
      console.log("No PIN found for user:", userId);
    }
  } catch (error) {
    console.error("Error retrieving PIN:", error);
    userPIN = null;
  }
}

async function generateNewPIN(userId) {
  const newPin = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit PIN
  try {
    const pinDocRef = doc(db, "userPINs", userId);
    await setDoc(pinDocRef, { pin: newPin, userId: userId, createdAt: serverTimestamp() }, { merge: true });
    userPIN = newPin;
    return newPin;
  } catch (error) {
    console.error("Error generating and saving PIN:", error);
    return null;
  }
}

async function generateAndShowInitialPIN() {
  if (!userGlobal) {
    alert("Please sign in to generate a PIN.");
    return;
  }
  const newPin = await generateNewPIN(userGlobal.uid);
  if (newPin) {
    initialPinDisplay.textContent = newPin;
    initialPinModal.classList.remove('hidden');
  } else {
    alert("Failed to generate PIN. Please try again.");
  }
}

closeInitialPinModalBtn.addEventListener('click', () => {
  initialPinModal.classList.add('hidden');
  showTab('home'); // Go back to home if user closes without confirming
});

initialPinConfirmBtn.addEventListener('click', () => {
  initialPinModal.classList.add('hidden');
  // After confirming PIN, proceed to sell tab
  toggleProductForm(true);
});

closePinEntryModalBtn.addEventListener('click', () => {
  pinEntryModal.classList.add('hidden');
  showTab('home'); // Go back to home if user closes
});

pinEntryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const enteredPin = pinInput.value.trim();
  if (enteredPin === userPIN) {
    pinEntryModal.classList.add('hidden');
    toggleProductForm(true); // Allow access to sell form
  } else {
    pinErrorMessage.textContent = 'Invalid PIN. Please try again.';
    pinInput.classList.add('input-invalid');
  }
});

pinInput.addEventListener('input', () => {
  pinInput.classList.remove('input-invalid');
  pinErrorMessage.textContent = '';
});

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
      alert("You must be signed in to list a product.");
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
    };
    await addDoc(collection(db, "products"), newProduct);
    alert('Product listed successfully!');
    localStorage.removeItem(SELL_FORM_KEY);
    toggleProductForm(false);
    await loadProducts('');
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid);
  } catch (error) {
    showFormErrors(["Failed to list product. Please try again."]);
    console.error("Error adding document to Firestore:", error);
    alert('Failed to list product. Please check console for details. (Check Firestore rules!)');
  } finally {
    enableSubmitButton();
    submitProductBtn.textContent = 'List Product';
  }
});

// --- PRODUCT LISTING & SEARCH ---
async function loadProducts(filterQuery = '') {
  productListContainer.innerHTML = '';
  noProductsMessage.textContent = 'Loading products...';
  noProductsMessage.classList.remove('hidden');
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.allProducts = fetchedProducts;
    const lowerCaseQuery = filterQuery.toLowerCase();
    const filteredProducts = fetchedProducts.filter(product =>
      (product.title || '').toLowerCase().includes(lowerCaseQuery) ||
      (product.description || '').toLowerCase().includes(lowerCaseQuery)
    );
    renderProducts(filteredProducts, productListContainer, noProductsMessage, false);
  } catch (error) {
    console.error("Error loading products:", error);
    noProductsMessage.textContent = 'Error loading products. Please try again.';
    noProductsMessage.classList.remove('hidden');
  }
}
searchBar.addEventListener('input', () => {
  if (!document.getElementById('home').classList.contains('hidden')) {
    const query = searchBar.value.trim().toLowerCase();
    if (!window.allProducts) return;
    if (!query) {
      renderProducts(window.allProducts, productListContainer, noProductsMessage, false);
      return;
    }
    const keywords = query.split(/\s+/).filter(Boolean);
    const filteredProducts = window.allProducts.filter(product => {
      const haystack = [
        product.title || '',
        product.description || ''
      ].join(' ').toLowerCase();
      return keywords.some(kw => haystack.includes(kw));
    });
    if (filteredProducts.length > 0) {
      renderProducts(filteredProducts, productListContainer, noProductsMessage, false);
      noProductsMessage.classList.add('hidden');
    } else {
      productListContainer.innerHTML = '';
      noProductsMessage.textContent = "No products found for your search. Try different keywords!";
      noProductsMessage.classList.remove('hidden');
    }
  }
});

// --- PRODUCT CARD RENDERING ---
function renderProducts(productArray, container, noResultsMsgElement, isDashboardView = false) {
  container.innerHTML = '';
  noResultsMsgElement.classList.add('hidden');
  if (!Array.isArray(productArray) || productArray.length === 0) {
    noResultsMsgElement.classList.remove('hidden');
    noResultsMsgElement.textContent = isDashboardView ? 'No products listed yet.' : 'No products found matching your search.';
    return;
  }
  productArray.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = `bg-white rounded-lg shadow-md p-4 flex flex-col product-card ${isDashboardView ? '' : 'interactive-card border border-transparent'} dark:bg-gray-800 dark:shadow-lg dark:border-gray-700`;
    productCard.setAttribute('data-product-id', product.id);
    const displayPrice = parseFloat(product.price) === 0 ? 'Free' : `$${parseFloat(product.price).toFixed(2)}`;
    let cardButtonsHtml = '';
    if (isDashboardView) {
      cardButtonsHtml = `
        <div class="mt-auto flex justify-end items-center pt-2">
          <button data-product-id="${product.id}" class="edit-product-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">Edit</button>
          <button data-product-id="${product.id}" class="delist-product-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition ml-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">Delist</button>
        </div>
      `;
    }
    productCard.innerHTML = `
      <img src="${product.previewImageUrl || 'https://via.placeholder.com/300x200?text=Product+Preview'}" alt="${product.title} preview" class="rounded mb-3 h-48 object-cover w-full border border-gray-200 dark:border-gray-700"/>
      <h3 class="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">${product.title}</h3>
      <p class="text-gray-600 text-sm flex-grow mb-2 overflow-hidden overflow-ellipsis whitespace-nowrap dark:text-gray-300">${product.description}</p>
      <div class="mt-auto flex justify-between items-center pt-2">
        <span class="font-bold text-blue-600 text-lg">${displayPrice}</span>
        ${cardButtonsHtml}
      </div>
    `;
    container.appendChild(productCard);
    if (isDashboardView) {
      const delistButton = productCard.querySelector('.delist-product-btn');
      if (delistButton) {
        delistButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const productId = delistButton.getAttribute('data-product-id');
          if (productId) deleteProduct(productId);
        });
      }
      const editButton = productCard.querySelector('.edit-product-btn');
      if (editButton) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const productId = editButton.getAttribute('data-product-id');
          const productToEdit = productArray.find(p => p.id === productId);
          if (productToEdit) openEditProductModal(productToEdit);
        });
      }
    } else {
      productCard.addEventListener('click', () => {
        const productId = productCard.getAttribute('data-product-id');
        if (productId) showProductDetails(productId);
      });
    }
  });
}

// --- PRODUCT DELISTING ---
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to permanently delist this product? This action cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, "products", productId));
    alert('Product delisted successfully!');
    await loadProducts(''); // Refresh home products
    if (auth.currentUser) await loadMyProducts(auth.currentUser.uid); // Refresh dashboard products
  } catch (error) {
    console.error("Error removing document: ", error);
    alert('Error delisting product. Please try again. (Check Firestore rules if it fails)');
  }
}

// --- PRODUCT DETAILS & PURCHASE ---
async function showProductDetails(productId) {
  showTab('productDetails');
  productDetailsError.classList.add('hidden');
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
    detailActionButton.className = 'w-full py-3 rounded-xl font-semibold transition';
    detailActionButton.disabled = false;

    if (parseFloat(product.price) > 0) {
      detailActionButton.style.display = 'none';
      paypalButtonContainer.innerHTML = '';
      if (typeof window.paypal !== "undefined" && window.paypal.Buttons) {
        window.paypal.Buttons({
          createOrder: function(data, actions) {
            return actions.order.create({
              purchase_units: [{
                amount: { value: product.price.toString() },
                description: product.title
              }]
            });
          },
          onApprove: async function(data, actions) {
            return actions.order.capture().then(async function(details) {
              alert('Payment completed by ' + details.payer.name.given_name + '!');
              paypalButtonContainer.innerHTML = `<a href="${product.fileUrl}" target="_blank" class="w-full block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl mt-2 font-semibold transition focus:outline-none focus:ring-4 focus:ring-green-300">Download Product</a>`;
              await handleProductPurchase(product);
              // --- Send EmailJS sale notification ---
              sendSaleEmail({
                buyerName: (details.payer && details.payer.name && details.payer.name.given_name) ? details.payer.name.given_name : 'Unknown',
                buyerEmail: (details.payer && details.payer.email_address) ? details.payer.email_address : 'Unknown',
                sellerPaypalEmail: product.paypalEmail || 'Not Provided',
                productTitle: product.title || 'Unknown',
                amount: typeof product.price !== "undefined" ? product.price : 'Unknown'
              });
            });
          },
          onError: function(err) {
            alert('Payment could not be completed. Please try again.');
            console.error(err);
          }
        }).render('#paypal-button-container');
      } else {
        paypalButtonContainer.innerHTML = '<p class="text-red-600 dark:text-red-400">PayPal buttons could not be loaded. Please refresh.</p>';
      }
    } else {
      detailActionButton.style.display = '';
      paypalButtonContainer.innerHTML = '';
      detailActionButton.textContent = 'Download';
      detailActionButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white', 'focus:outline-none', 'focus:ring-4', 'focus:ring-green-300');
      detailActionButton.onclick = () => {
        window.open(product.fileUrl, '_blank');
      };
      detailActionButton.setAttribute('aria-label', `Download ${product.title}`);
    }
  } catch (error) {
    console.error("Error loading product details:", error);
    productDetailsError.textContent = 'Error loading product details. Please try again.';
    productDetailsError.classList.remove('hidden');
  }
}

// --- DASHBOARD LOGIC ---
async function updateSellerBalance(userId) {
  try {
    const balDoc = await getDoc(doc(db, "balances", userId));
    let value = 0;
    if (balDoc.exists() && typeof balDoc.data().balance === 'number') {
      value = balDoc.data().balance;
    }
    sellerBalance.textContent = `$${value.toFixed(2)}`;
  } catch (e) {
    sellerBalance.textContent = "$0.00";
    console.error("Error fetching balance:", e);
  }
}
let balanceUnsub = null;
function watchSellerBalance(userId) {
  if (balanceUnsub) balanceUnsub();
  balanceUnsub = onSnapshot(doc(db, "balances", userId), (docSnap) => {
    let value = 0;
    if (docSnap.exists() && typeof docSnap.data().balance === 'number') value = docSnap.data().balance;
    sellerBalance.textContent = `$${value.toFixed(2)}`;
  }, (error) => {
    console.error("Error listening to balance:", error);
    sellerBalance.textContent = "$0.00"; // Fallback on error
  });
}
async function loadMyProducts(userId) {
  myProductsContainer.innerHTML = '';
  noMyProductsMessage.classList.add('hidden');
  try {
    const q = query(
      collection(db, "products"),
      where("sellerId", "==", userId),
      orderBy("createdAt", "desc") // Re-adding orderBy, assuming index is present
    );
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (products.length === 0) {
      noMyProductsMessage.classList.remove('hidden');
      return;
    }
    renderProducts(products, myProductsContainer, noMyProductsMessage, true);
  } catch (e) {
    console.error("Error loading user's products:", e);
    myProductsContainer.innerHTML = '<p class="col-span-full text-center text-red-600 dark:text-red-400">Error loading your products.<br>' + e.message + '</p>';
  }
}
function openEditProductModal(product) {
  editProductIdInput.value = product.id;
  editTitleInput.value = product.title;
  editDescriptionInput.value = product.description;
  editPriceInput.value = product.price;
  editFileUrlInput.value = product.fileUrl;
  editProductModal.classList.remove('hidden');
}
function closeEditProductModal() {
  editProductModal.classList.add('hidden');
}
editProductForm.onsubmit = async function (e) {
  e.preventDefault();
  const id = editProductIdInput.value;
  const updated = {
    title: editTitleInput.value.trim(),
    description: editDescriptionInput.value.trim(),
    price: parseFloat(editPriceInput.value),
    fileUrl: convertToGoogleDriveDirectDownload(editFileUrlInput.value.trim()) // Convert URL on edit too
  };

  // Simple validation for edit form
  let errors = [];
  if (!updated.title) errors.push("Title is required.");
  if (!updated.description) errors.push("Description is required.");
  if (isNaN(updated.price) || updated.price < 0) errors.push("Price must be a non-negative number.");
  if (!updated.fileUrl || !/^https?:\/\/.+\..+/.test(updated.fileUrl)) errors.push("Valid download link is required.");

  if (errors.length > 0) {
      alert("Please fix the following errors:\n" + errors.join("\n"));
      return;
  }

  try {
    await updateDoc(doc(db, "products", id), updated);
    alert("Product updated successfully!");
    closeEditProductModal();
    if (auth.currentUser) {
      await loadMyProducts(auth.currentUser.uid);
    }
  } catch (err) {
    console.error("Failed to update product:", err);
    alert("Failed to update product. Please try again. (Check Firestore rules!)");
  }
};
cancelEditBtn.onclick = closeEditProductModal;

async function showDashboard() {
  if (!auth.currentUser) return;
  showTab('dashboard');
  await updateSellerBalance(auth.currentUser.uid);
  watchSellerBalance(auth.currentUser.uid);
  await loadMyProducts(auth.currentUser.uid);
}
async function incrementSellerBalance(sellerId, amount) {
  const balRef = doc(db, "balances", sellerId);
  await runTransaction(db, async (tx) => {
    const docSnap = await tx.get(balRef);
    let newBalance = amount;
    if (docSnap.exists() && typeof docSnap.data().balance === 'number') {
      newBalance += docSnap.data().balance;
    }
    tx.set(balRef, { balance: newBalance }, { merge: true });
  });
}
async function handleProductPurchase(product) {
  if (!product || !product.sellerId || typeof product.price !== 'number') {
    console.error("Invalid product data for purchase handling:", product);
    return;
  }
  await incrementSellerBalance(product.sellerId, parseFloat(product.price));
}

// --- Initial Load ---
loadTheme(); // Load theme preference first
loadProducts();
showTab('home');
enableSubmitButton(); // Ensure submit button state is correct on load
