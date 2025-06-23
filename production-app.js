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
          await showAlert("Please sign out and sign in again to re-authenticate before deleting your account for security reasons.");
        } else {
          await showAlert("Error deleting account: " + err.message);
          console.error("Error deleting account:", err);
        }
      }
    }
  };
  document.getElementById('signOutBtn').onclick = async () => {
    const confirmed = await showConfirm("Are you sure you want to sign out?");
    if (confirmed) {
      try {
        await signOut(auth);
        await showAlert("Signed out successfully!");
        // Redirect to landing page or show auth overlay
        window.location.href = LANDING_URL;
      } catch (err) {
        await showAlert("Error signing out: " + err.message);
        console.error("Error signing out:", err);
      }
    }
  };
}

// --- Tab Navigation ---
tabs.forEach(tab => {
  tab.addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default anchor link behavior
    const targetTab = this.dataset.tab;

    // Remove active class from all tabs and add to clicked tab
    tabs.forEach(t => t.classList.remove('bg-blue-100'));
    this.classList.add('bg-blue-100');

    // Hide all sections and show the target section
    sections.forEach(section => section.classList.add('hidden'));
    document.getElementById(targetTab).classList.remove('hidden');

    // Specific logic for dashboard tab
    if (targetTab === 'dashboard') {
      showDashboard();
    } else if (targetTab === 'home') {
      loadProducts();
    }
  });
});

// --- Sell Section Logic ---
startSellingBtn.addEventListener('click', () => {
  sellLandingContent.classList.add('hidden');
  productForm.classList.remove('hidden');
  sessionStorage.setItem(SELL_FORM_KEY, "visible");
});

// Restore sell form state if user navigates back
function restoreSellForm() {
  if (sessionStorage.getItem(SELL_FORM_KEY) === "visible") {
    sellLandingContent.classList.add('hidden');
    productForm.classList.remove('hidden');
  }
}

// Cloudinary Widget for Preview Image
let cloudinaryWidget = cloudinary.createUploadWidget({
  cloudName: CLOUDINARY_CLOUD_NAME,
  uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  folder: 'tradedeck_product_previews',
  cropping: true,
  multiple: false,
  sources: ['local', 'url', 'camera']
}, (error, result) => {
  if (!error && result && result.event === "success") {
    previewImageUrl.value = result.info.secure_url;
    currentPreviewImage.src = result.info.secure_url;
    previewImageContainer.classList.remove('hidden');
    previewImageStatus.textContent = 'Preview image uploaded successfully!';
    previewImageStatus.classList.remove('error', 'loading');
    previewImageStatus.classList.add('success');
  } else if (error) {
    previewImageStatus.textContent = 'Image upload failed. Please try again.';
    previewImageStatus.classList.remove('success', 'loading');
    previewImageStatus.classList.add('error');
    console.error("Cloudinary upload error:", error);
  }
});

openPreviewImageWidgetBtn.addEventListener('click', () => {
  previewImageStatus.textContent = 'Opening upload widget...';
  previewImageStatus.classList.remove('success', 'error');
  previewImageStatus.classList.add('loading');
  cloudinaryWidget.open();
});


// Form validation and submission
productUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formErrorSummary.classList.add('hidden'); // Hide previous errors
  let errors = [];

  // Basic validation checks
  if (!titleInput.value.trim()) errors.push("Product Title is required.");
  if (!descriptionInput.value.trim()) errors.push("Product Description is required.");
  if (!category.value) errors.push("Product Category is required.");
  if (!priceInput.value || parseFloat(priceInput.value) < 0) errors.push("Price must be a positive number (or 0 for free).");
  if (!productFileUrlInput.value.trim()) errors.push("Digital Product File Link is required.");
  if (!previewImageUrl.value.trim()) errors.push("Product Preview Image is required.");

  const priceValue = parseFloat(priceInput.value);
  const isFreeProduct = priceValue === 0;

  if (!isFreeProduct && !paypalEmailInput.value.trim()) {
    errors.push("PayPal Email is required for paid products.");
  } else if (!isFreeProduct && paypalEmailInput.value.trim() && !validateEmail(paypalEmailInput.value)) {
    errors.push("Please enter a valid PayPal Email address.");
  }


  if (errors.length > 0) {
    formErrorSummary.innerHTML = `<ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul>`;
    formErrorSummary.classList.remove('hidden');
    showAlert("Please correct the errors in the form.");
    return;
  }

  submitProductBtn.textContent = 'Listing Product...';
  submitProductBtn.disabled = true;
  submitProductBtn.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    const productData = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      category: category.value,
      price: priceValue,
      previewImageUrl: previewImageUrl.value.trim(),
      productFileUrl: productFileUrlInput.value.trim(),
      sellerId: auth.currentUser.uid,
      sellerEmail: auth.currentUser.email,
      sellerPaypalEmail: isFreeProduct ? null : paypalEmailInput.value.trim(), // Store PayPal email
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, "products"), productData);
    showAlert("Product listed successfully!");
    productUploadForm.reset();
    previewImageContainer.classList.add('hidden');
    previewImageStatus.textContent = '';
    paypalEmailContainer.classList.add('hidden');
    paypalEmailInput.value = '';
    paypalEmailValidationMsg.textContent = '';
    sessionStorage.removeItem(SELL_FORM_KEY); // Reset form state
    // Automatically switch to dashboard after successful listing
    document.getElementById('sell').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    tabs.forEach(t => t.classList.remove('bg-blue-100'));
    document.querySelector('a[data-tab="dashboard"]').classList.add('bg-blue-100');
    showDashboard();

  } catch (e) {
    console.error("Error adding document: ", e);
    showAlert("Error listing product: " + e.message);
  } finally {
    submitProductBtn.textContent = 'List Product';
    submitProductBtn.disabled = false;
    submitProductBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
});

// Show/hide PayPal email field based on price
priceInput.addEventListener('input', () => {
  const price = parseFloat(priceInput.value);
  if (price > 0) {
    paypalEmailContainer.classList.remove('hidden');
  } else {
    paypalEmailContainer.classList.add('hidden');
  }
});

paypalEmailInput.addEventListener('input', () => {
  if (paypalEmailInput.value.trim() && !validateEmail(paypalEmailInput.value)) {
    paypalEmailValidationMsg.textContent = "Please enter a valid email address.";
    paypalEmailValidationMsg.classList.remove('hidden');
  } else {
    paypalEmailValidationMsg.textContent = '';
    paypalEmailValidationMsg.classList.add('hidden');
  }
});

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}


// --- Home Section (Product Listing) ---
async function loadProducts(categoryFilter = 'All', searchTerm = '') {
  productListContainer.innerHTML = ''; // Clear previous products
  noProductsMessage.classList.remove('hidden');
  noProductsMessage.textContent = 'Loading products...';

  let productsRef = collection(db, "products");
  let q = query(productsRef, orderBy("timestamp", "desc")); // Order by newest first

  const products = [];
  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      products.push(product);
    });
    window.allProducts = products; // Store all fetched products
    filterAndRenderProducts(categoryFilter, searchTerm);

  } catch (error) {
    console.error("Error fetching products: ", error);
    noProductsMessage.textContent = 'Error loading products.';
    noProductsMessage.classList.remove('hidden');
  }
}

function filterAndRenderProducts(categoryFilter, searchTerm) {
  let filteredProducts = window.allProducts;

  if (categoryFilter !== 'All') {
    filteredProducts = filteredProducts.filter(product => product.category === categoryFilter);
  }

  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product =>
      product.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      product.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  productListContainer.innerHTML = '';
  if (filteredProducts.length === 0) {
    noProductsMessage.textContent = 'No products found matching your criteria.';
    noProductsMessage.classList.remove('hidden');
  } else {
    noProductsMessage.classList.add('hidden');
    filteredProducts.forEach(product => {
      const productCard = `
        <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl product-card interactive-card" data-product-id="${product.id}">
          <img src="${product.previewImageUrl}" alt="${product.title}" class="w-full h-48 object-cover rounded-t-2xl mb-4" />
          <div class="p-5">
            <h3 class="text-xl font-bold text-gray-900 mb-2 truncate">${product.title}</h3>
            <p class="text-gray-600 text-sm mb-4 line-clamp-3">${product.description}</p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-extrabold text-blue-600">${product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}</span>
              <button class="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors view-product-btn" data-product-id="${product.id}">
                Details
              </button>
            </div>
          </div>
        </div>
      `;
      productListContainer.insertAdjacentHTML('beforeend', productCard);
    });
  }
}

// Event listeners for category tabs
categoryTabs.forEach(tab => {
  tab.addEventListener('click', function() {
    categoryTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    currentCategoryFilter = this.dataset.category;
    filterAndRenderProducts(currentCategoryFilter, searchBar.value);
  });
});

// Event listener for search bar
searchBar.addEventListener('input', () => {
  filterAndRenderProducts(currentCategoryFilter, searchBar.value);
});


// --- Product Details Section ---
async function showProductDetails(productId) {
  // Hide all sections first
  sections.forEach(section => section.classList.add('hidden'));
  productDetailsSection.classList.remove('hidden');
  productDetailsError.classList.add('hidden'); // Hide any previous errors
  paypalButtonContainer.innerHTML = ''; // Clear previous PayPal button

  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const product = docSnap.data();
      detailProductImage.src = product.previewImageUrl;
      detailProductTitle.textContent = product.title;
      detailProductDescription.textContent = product.description;
      detailProductPrice.textContent = product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`;

      // Action button logic
      if (product.sellerId === auth.currentUser.uid) {
        detailActionButton.textContent = "Your Product (Can't Buy)";
        detailActionButton.classList.add('bg-gray-400', 'text-white', 'cursor-not-allowed');
        detailActionButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-green-600', 'hover:bg-green-700');
        detailActionButton.disabled = true;
      } else if (product.price === 0) {
        detailActionButton.textContent = "Download Now";
        detailActionButton.classList.remove('bg-blue-600', 'bg-gray-400', 'cursor-not-allowed');
        detailActionButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
        detailActionButton.disabled = false;
        detailActionButton.onclick = () => {
          window.open(product.productFileUrl, '_blank');
          showAlert("Download started!");
        };
      } else {
        // Paid product: Render PayPal button
        detailActionButton.textContent = "Buy Now"; // This button will be replaced by PayPal
        detailActionButton.classList.add('hidden'); // Hide default button for PayPal
        // Clear existing PayPal buttons
        paypalButtonContainer.innerHTML = '';

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
              // Show a success message to the buyer
              showAlert('Transaction completed by ' + details.payer.name.given_name + '!');

              // Update seller's balance via a transaction
              const sellerDocRef = doc(db, "users", product.sellerId);
              runTransaction(db, async (transaction) => {
                const sellerDoc = await transaction.get(sellerDocRef);
                if (!sellerDoc.exists()) {
                  throw "Seller does not exist!";
                }
                const newBalance = (sellerDoc.data().balance || 0) + product.price;
                transaction.update(sellerDocRef, { balance: newBalance });
              }).then(() => {
                console.log("Seller balance updated successfully!");
              }).catch((error) => {
                console.error("Transaction failed: ", error);
                showAlert("Failed to update seller balance. Please contact support.");
              });

              // Send email notification to seller
              if (product.sellerPaypalEmail) {
                sendSaleEmail({
                  buyerName: details.payer.name.given_name + ' ' + details.payer.name.surname,
                  buyerEmail: details.payer.email_address,
                  sellerPaypalEmail: product.sellerPaypalEmail,
                  productTitle: product.title,
                  amount: product.price.toFixed(2)
                });
              } else {
                console.warn("Seller PayPal email not available, skipping sale notification.");
              }

              // Optionally, provide the digital product file
              window.open(product.productFileUrl, '_blank');
            });
          },
          onError: function(err) {
            console.error('PayPal button error: ', err);
            showAlert('PayPal transaction failed. Please try again or contact support.');
          }
        }).render('#paypal-button-container'); // Render the button into the container
      }

    } else {
      productDetailsError.classList.remove('hidden');
      console.error("No such document!");
    }
  } catch (error) {
    productDetailsError.classList.remove('hidden');
    console.error("Error getting product details:", error);
  }
}

backToHomeBtn.addEventListener('click', () => {
  sections.forEach(section => section.classList.add('hidden'));
  document.getElementById('home').classList.remove('hidden');
  tabs.forEach(t => t.classList.remove('bg-blue-100'));
  document.querySelector('a[data-tab="home"]').classList.add('bg-blue-100');
  loadProducts(); // Reload products when returning to home
});


// --- Dashboard Section ---
async function showDashboard() {
  if (!userGlobal) {
    showAlert("Please sign in to view your dashboard.");
    return;
  }
  myProductsContainer.innerHTML = '';
  noMyProductsMessage.classList.remove('hidden');
  noMyProductsMessage.textContent = 'Loading your products...';

  try {
    // Fetch user's balance
    const userDocRef = doc(db, "users", userGlobal.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists() && userDocSnap.data().balance !== undefined) {
      sellerBalance.textContent = `$${userDocSnap.data().balance.toFixed(2)}`;
    } else {
      sellerBalance.textContent = `$0.00`;
      // Initialize balance if it doesn't exist
      await setDoc(userDocRef, { balance: 0 }, { merge: true });
    }

    // Fetch user's products
    await loadMyProducts(userGlobal.uid);

  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showAlert("Error loading dashboard: " + error.message);
    noMyProductsMessage.textContent = 'Error loading your products.';
  }
}

async function loadMyProducts(userId) {
  myProductsContainer.innerHTML = '';
  noMyProductsMessage.classList.remove('hidden');
  noMyProductsMessage.textContent = 'Loading your products...';

  const q = query(collection(db, "products"), where("sellerId", "==", userId), orderBy("timestamp", "desc"));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      noMyProductsMessage.textContent = 'You haven\'t listed any products yet. Start selling now!';
    } else {
      noMyProductsMessage.classList.add('hidden');
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        const productCard = `
          <div class="bg-white rounded-2xl shadow-lg p-5">
            <img src="${product.previewImageUrl}" alt="${product.title}" class="w-full h-40 object-cover rounded-xl mb-4" />
            <h3 class="text-lg font-bold text-gray-900 mb-1 truncate">${product.title}</h3>
            <p class="text-gray-600 text-sm mb-3">${product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}</p>
            <div class="flex flex-col space-y-2">
              <button class="w-full bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors delete-product-btn" data-product-id="${product.id}">Delete Product</button>
            </div>
          </div>
        `;
        myProductsContainer.insertAdjacentHTML('beforeend', productCard);
      });

      // Attach event listeners for delete buttons AFTER they are added to the DOM
      document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.onclick = () => {
          const productId = button.dataset.productId;
          deleteProduct(productId);
        };
      });
    }
  } catch (error) {
    console.error("Error fetching user products: ", error);
    noMyProductsMessage.textContent = 'Error loading your products.';
    showAlert("Error loading your products: " + error.message);
  }
}

async function deleteProduct(productId) {
  console.log("Log 1: Attempting to delete product:", productId);

  if (!userGlobal) {
    showAlert("You must be logged in to delete products.");
    console.warn("Delete attempt failed: User not logged in.");
    return;
  }

  const confirmed = await showConfirm("Are you sure you want to delete this product? This action cannot be undone.");
  console.log("Log 2: Confirmation result:", confirmed);

  if (confirmed) {
    try {
      console.log("Log 3: User confirmed deletion. Deleting product from Firestore...");
      await deleteDoc(doc(db, "products", productId));
      showAlert("Product deleted successfully!");
      console.log("Log 4: Product deleted successfully:", productId);

      if (auth.currentUser) {
        await loadMyProducts(auth.currentUser.uid);
        console.log("Log 5: My products reloaded.");
      }
      await loadProducts();
      console.log("Log 6: All products reloaded.");

    } catch (error) {
      console.error("Log 7: Error deleting product:", error);
      showAlert("Failed to delete product: " + error.message);
    }
  } else {
    console.log("Log 8: Product deletion cancelled by user.");
    showAlert("Product deletion cancelled.");
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
