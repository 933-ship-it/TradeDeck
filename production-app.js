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
const PRODUCT_CATEGORIES = ["All", "eBooks", "Software", "Templates", "Graphics", "Audio", "Video", "Courses", "Photography", "Other"];
// const THEME_STORAGE_KEY = 'tradeDeckTheme'; // This constant can be removed if no other part of the app uses it for non-theme related storage.

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0RFkuXJjh7X43R6wWdQKrXtdUwVJ-4js",
  authDomain: "tradedeck-82bbb.firebaseapp.com",
  projectId: "tradedeck-82bbb",
  storageBucket: "tradedeck-82bbb.appspot.com",
  messagingSenderId: "367355172023",
  appId: "1:367355172023:web:5312389182390234a9b6c0",
  measurementId: "G-D1M91N7T0N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const loginRegisterBtn = document.getElementById('loginRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const userDropdownBtn = document.getElementById('userDropdownBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const userDisplayName = document.getElementById('userDisplayName');
const sellProductsBtn = document.getElementById('sellProductsBtn');
const myProductsBtn = document.getElementById('myProductsBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const sellProductModal = document.getElementById('sellProductModal');
const cancelSellBtn = document.getElementById('cancelSellBtn');
const sellProductForm = document.getElementById('sellProductForm');
const productImageInput = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const productGrid = document.getElementById('productGrid');
const productSearch = document.getElementById('productSearch');
const categoryFilterButtons = document.querySelectorAll('.category-filter-btn');
const productDetailModal = document.getElementById('productDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailProductName = document.getElementById('detailProductName');
const detailProductImage = document.getElementById('detailProductImage');
const detailProductDescription = document.getElementById('detailProductDescription');
const detailProductPrice = document.getElementById('detailProductPrice');
const detailProductCategory = document.getElementById('detailProductCategory');
const detailProductSeller = document.getElementById('detailProductSeller');
const detailProductDate = document.getElementById('detailProductDate');
const buyProductBtn = document.getElementById('buyProductBtn');
const downloadProductBtn = document.getElementById('downloadProductBtn');
const editProductBtn = document.getElementById('editProductBtn');
const deleteProductBtn = document.getElementById('deleteProductBtn');
const editProductModal = document.getElementById('editProductModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editProductForm = document.getElementById('editProductForm');
const browseProductsBtn = document.getElementById('browseProductsBtn');
const contactForm = document.getElementById('contactForm');
// const themeToggle = document.getElementById('themeToggle'); // Remove this line if only used for dark mode

// --- Global Variables ---
let currentProduct = null; // Stores the product currently viewed in the detail modal
let currentUser = null; // Stores the current logged-in user
let currentFilter = 'All'; // Stores the current product category filter
let currentSearchQuery = ''; // Stores the current search query

// --- Utility Functions ---
function showModal(modal) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Function to format price
function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

// Function to format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// --- Firebase Authentication ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    userDisplayName.textContent = user.displayName || user.email;
    loginRegisterBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    deleteAccountBtn.classList.remove('hidden');
    sellProductsBtn.classList.remove('hidden');
    myProductsBtn.classList.remove('hidden');
    dashboardBtn.classList.remove('hidden');
  } else {
    userDisplayName.textContent = 'Guest';
    loginRegisterBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    deleteAccountBtn.classList.add('hidden');
    sellProductsBtn.classList.add('hidden');
    myProductsBtn.classList.add('hidden');
    dashboardBtn.classList.add('hidden');
  }
  fetchProducts(); // Refresh products on auth state change
});

// Function to open login/registration window
function openLoginRegistrationWindow() {
  const loginWindow = window.open('https://933-ship-it.github.io/TradeDeck-landing-page/', '_blank', 'width=800,height=600');
  // You might want to add a listener to check if the window is closed and then refresh auth state
  const checkLoginInterval = setInterval(() => {
    if (loginWindow.closed) {
      clearInterval(checkLoginInterval);
      // Re-check auth state after the login window is closed
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
          // User is logged in, refresh UI
          userDisplayName.textContent = user.displayName || user.email;
          loginRegisterBtn.classList.add('hidden');
          logoutBtn.classList.remove('hidden');
          deleteAccountBtn.classList.remove('hidden');
          sellProductsBtn.classList.remove('hidden');
          myProductsBtn.classList.remove('hidden');
          dashboardBtn.classList.remove('hidden');
        }
      });
    }
  }, 1000);
}

// --- Product Management ---
// Cloudinary uploader widget
let myUploader = cloudinary.createUploadWidget({
  cloudName: CLOUDINARY_CLOUD_NAME,
  uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  folder: 'tradedeck_products'
}, (error, result) => {
  if (!error && result && result.event === "success") {
    console.log('Done uploading!', result.info);
    const inputElementId = myUploader.currentInputId;
    if (inputElementId === 'productImage') {
      imagePreview.src = result.info.secure_url;
      imagePreview.classList.remove('hidden');
    }
    // Store the URL in a hidden input or directly in the form data
    document.getElementById(inputElementId).dataset.url = result.info.secure_url;
  }
});


// Open Cloudinary widget for image upload
productImageInput.addEventListener('click', (e) => {
  e.preventDefault(); // Prevent default file input behavior
  myUploader.open(e, {
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
    folder: 'tradedeck_products',
    resource_type: 'image',
    clientAllowedFormats: ['png', 'gif', 'jpeg', 'webp'],
    maxFileSize: 5000000 // 5MB
  });
  myUploader.currentInputId = 'productImage';
});

// Open Cloudinary widget for digital product file upload
document.getElementById('productFile').addEventListener('click', (e) => {
  e.preventDefault(); // Prevent default file input behavior
  myUploader.open(e, {
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
    folder: 'tradedeck_files',
    resource_type: 'raw', // For any file type
    clientAllowedFormats: ['pdf', 'zip', 'rar', 'tar', 'gz', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp3', 'wav', 'mp4', 'mov', 'avi', 'exe', 'app', 'dmg', 'iso', 'img'],
    maxFileSize: 500000000 // 500MB
  });
  myUploader.currentInputId = 'productFile';
});

// Handle sell product form submission
sellProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert('Please log in to sell products.');
    openLoginRegistrationWindow();
    return;
  }

  const submitBtn = sellProductForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const productName = document.getElementById('productName').value;
    const productDescription = document.getElementById('productDescription').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productCategory = document.getElementById('productCategory').value;
    const imageUrl = productImageInput.dataset.url; // Get URL from dataset
    const fileUrl = document.getElementById('productFile').dataset.url; // Get URL from dataset

    if (!imageUrl || !fileUrl) {
      alert('Please upload both an image and a digital file.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'List Product';
      return;
    }

    await addDoc(collection(db, 'products'), {
      name: productName,
      description: productDescription,
      price: productPrice,
      category: productCategory,
      imageUrl: imageUrl,
      fileUrl: fileUrl,
      sellerId: currentUser.uid,
      sellerEmail: currentUser.email,
      sellerName: currentUser.displayName || 'Anonymous',
      timestamp: serverTimestamp()
    });

    alert('Product listed successfully!');
    sellProductForm.reset();
    imagePreview.classList.add('hidden');
    imagePreview.src = '#'; // Clear preview
    delete productImageInput.dataset.url; // Clear stored URL
    delete document.getElementById('productFile').dataset.url; // Clear stored URL
    hideModal(sellProductModal);
    fetchProducts(); // Refresh product list
  } catch (error) {
    console.error('Error adding product: ', error);
    alert('Failed to list product: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'List Product';
  }
});


// Function to fetch and display products
async function fetchProducts() {
  productGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 dark:text-gray-400">Loading products...</div>';
  let productsRef = collection(db, 'products');
  let q = productsRef;

  if (currentFilter && currentFilter !== 'All') {
    q = query(q, where('category', '==', currentFilter));
  }

  if (currentSearchQuery) {
    const searchTermLower = currentSearchQuery.toLowerCase();
    // Firebase does not support full-text search directly.
    // For simple contains, you might filter on client-side or use more advanced techniques.
    // For now, we'll fetch all matching categories/no category and filter client-side for search.
  }

  // Add orderBy for timestamp, newest first
  q = query(q, orderBy('timestamp', 'desc'));

  try {
    const querySnapshot = await getDocs(q);
    let products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply client-side search filter if a query exists
    if (currentSearchQuery) {
      const searchTermLower = currentSearchQuery.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchTermLower) ||
        product.description.toLowerCase().includes(searchTermLower) ||
        product.category.toLowerCase().includes(searchTermLower) ||
        (product.sellerName && product.sellerName.toLowerCase().includes(searchTermLower))
      );
    }

    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products: ', error);
    productGrid.innerHTML = '<div class="col-span-full text-center text-red-500">Failed to load products.</div>';
  }
}

// Function to display products in the grid
function displayProducts(products) {
  productGrid.innerHTML = ''; // Clear previous products
  if (products.length === 0) {
    productGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 dark:text-gray-400">No products found.</div>';
    return;
  }

  products.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer';
    productCard.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-48 object-cover" />
      <div class="p-6">
        <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">${product.name}</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 truncate">${product.description}</p>
        <div class="flex items-center justify-between">
          <span class="text-blue-600 dark:text-blue-400 font-bold text-lg">${formatPrice(product.price)}</span>
          <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">${product.category}</span>
        </div>
      </div>
    `;
    productCard.addEventListener('click', () => showProductDetail(product.id));
    productGrid.appendChild(productCard);
  });
}

// Function to show product detail modal
async function showProductDetail(productId) {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (productDoc.exists()) {
      currentProduct = { id: productDoc.id, ...productDoc.data() };

      detailProductName.textContent = currentProduct.name;
      detailProductImage.src = currentProduct.imageUrl;
      detailProductDescription.textContent = currentProduct.description;
      detailProductPrice.textContent = formatPrice(currentProduct.price);
      detailProductCategory.textContent = currentProduct.category;
      detailProductSeller.textContent = currentProduct.sellerName || currentProduct.sellerEmail || 'N/A';
      detailProductDate.textContent = formatTimestamp(currentProduct.timestamp);

      // Show/hide buttons based on user login and product ownership
      buyProductBtn.classList.remove('hidden');
      downloadProductBtn.classList.add('hidden');
      editProductBtn.classList.add('hidden');
      deleteProductBtn.classList.add('hidden');

      if (currentUser) {
        if (currentUser.uid === currentProduct.sellerId) {
          buyProductBtn.classList.add('hidden');
          downloadProductBtn.classList.remove('hidden');
          editProductBtn.classList.remove('hidden');
          deleteProductBtn.classList.remove('hidden');
        }
        // Check if the user has already bought this product
        const purchaseDoc = await getDoc(doc(db, 'users', currentUser.uid, 'purchases', currentProduct.id));
        if (purchaseDoc.exists()) {
          buyProductBtn.classList.add('hidden');
          downloadProductBtn.classList.remove('hidden');
        }
      }

      showModal(productDetailModal);
    } else {
      alert('Product not found.');
    }
  } catch (error) {
    console.error('Error fetching product details: ', error);
    alert('Failed to load product details.');
  }
}

// Function to handle product deletion
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'products', productId));
    alert('Product deleted successfully!');
    hideModal(productDetailModal);
    fetchProducts(); // Refresh product list
  } catch (error) {
    console.error('Error deleting product: ', error);
    alert('Failed to delete product: ' + error.message);
  }
}

// Handle edit product form submission
editProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = editProductForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const productId = document.getElementById('editProductId').value;
    const updatedData = {
      name: document.getElementById('editName').value,
      description: document.getElementById('editDescription').value,
      category: document.getElementById('editCategory').value,
      price: parseFloat(document.getElementById('editPrice').value),
      fileUrl: document.getElementById('editFileUrl').value, // Assuming file URL can be edited directly
    };

    // If a new image was uploaded, update its URL
    // This assumes you might have another Cloudinary widget setup for editing images
    // For simplicity, we are not adding image re-upload logic for edit here
    // If you add it, uncomment and adapt the following:
    // if (document.getElementById('editProductImage').dataset.url) {
    //   updatedData.imageUrl = document.getElementById('editProductImage').dataset.url;
    // }

    await updateDoc(doc(db, 'products', productId), updatedData);

    alert('Product updated successfully!');
    hideModal(editProductModal);
    fetchProducts(); // Refresh product list
  } catch (error) {
    console.error('Error updating product: ', error);
    alert('Failed to update product: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
});


// --- Event Listeners ---
userDropdownBtn.addEventListener('click', () => {
  userDropdownMenu.classList.toggle('opacity-0');
  userDropdownMenu.classList.toggle('invisible');
  userDropdownMenu.classList.toggle('scale-95');
  userDropdownMenu.classList.toggle('scale-100');
});

// Close dropdown if clicked outside
document.addEventListener('click', (event) => {
  if (!userDropdownBtn.contains(event.target) && !userDropdownMenu.contains(event.target)) {
    userDropdownMenu.classList.add('opacity-0', 'invisible', 'scale-95');
    userDropdownMenu.classList.remove('scale-100');
  }
});

loginRegisterBtn.addEventListener('click', openLoginRegistrationWindow);

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Logged out successfully!');
    // onAuthStateChanged will handle UI update
  } catch (error) {
    console.error('Error logging out: ', error);
    alert('Failed to log out: ' + error.message);
  }
});

deleteAccountBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) {
    return;
  }
  if (!currentUser) {
    alert('No user is logged in.');
    return;
  }
  try {
    await deleteUser(currentUser);
    alert('Account deleted successfully!');
    // onAuthStateChanged will handle UI update
  } catch (error) {
    console.error('Error deleting account: ', error);
    alert('Failed to delete account: ' + error.message);
  }
});

sellProductsBtn.addEventListener('click', () => {
  if (!currentUser) {
    alert('Please log in to sell products.');
    openLoginRegistrationWindow();
    return;
  }
  sellProductForm.reset(); // Clear previous form data
  imagePreview.classList.add('hidden'); // Hide image preview
  delete productImageInput.dataset.url; // Clear stored URL
  delete document.getElementById('productFile').dataset.url; // Clear stored URL
  showModal(sellProductModal);
});

cancelSellBtn.addEventListener('click', () => hideModal(sellProductModal));

closeDetailModalBtn.addEventListener('click', () => hideModal(productDetailModal));

productSearch.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value;
  fetchProducts(); // Refetch products based on new search query
});

categoryFilterButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    categoryFilterButtons.forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    });
    e.target.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    e.target.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    currentFilter = e.target.dataset.category;
    fetchProducts(); // Refetch products based on new category filter
  });
});

buyProductBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert('Please log in to purchase this product.');
    openLoginRegistrationWindow();
    return;
  }
  if (!currentProduct) {
    alert('No product selected.');
    return;
  }

  // Simple PayPal integration setup (replace with actual backend processing for security)
  // In a real application, you would send currentProduct.id and currentProduct.price to your server
  // Your server would then interact with PayPal API to create an order
  // After successful payment, your server would record the purchase and make the digital file available.

  // For demonstration: Simulate PayPal checkout and record purchase
  alert(`Proceeding to buy "${currentProduct.name}" for ${formatPrice(currentProduct.price)}. (This is a simulation. In a real app, you'd integrate PayPal here.)`);

  try {
    // Record purchase in Firestore
    await setDoc(doc(db, 'users', currentUser.uid, 'purchases', currentProduct.id), {
      productId: currentProduct.id,
      productName: currentProduct.name,
      price: currentProduct.price,
      purchaseDate: serverTimestamp(),
      fileUrl: currentProduct.fileUrl,
      sellerId: currentProduct.sellerId
    });
    alert('Purchase recorded! You can now download your product.');
    buyProductBtn.classList.add('hidden');
    downloadProductBtn.classList.remove('hidden');
    // Hide modal or update UI to reflect purchase
    hideModal(productDetailModal); // Or simply update the modal buttons
  } catch (error) {
    console.error('Error recording purchase:', error);
    alert('Failed to record purchase. Please try again.');
  }
});

downloadProductBtn.addEventListener('click', () => {
  if (currentProduct && currentProduct.fileUrl) {
    // Ideally, this link would be a secure, time-limited download URL generated by your backend
    // after verifying purchase. For this demo, we're using the direct URL.
    window.open(currentProduct.fileUrl, '_blank');
  } else {
    alert('No download link available for this product.');
  }
});

editProductBtn.addEventListener('click', async () => {
  if (!currentProduct || !currentUser || currentUser.uid !== currentProduct.sellerId) {
    alert('You are not authorized to edit this product.');
    return;
  }
  // Populate the edit form
  document.getElementById('editProductId').value = currentProduct.id;
  document.getElementById('editName').value = currentProduct.name;
  document.getElementById('editDescription').value = currentProduct.description;
  document.getElementById('editCategory').value = currentProduct.category;
  document.getElementById('editPrice').value = currentProduct.price;
  document.getElementById('editFileUrl').value = currentProduct.fileUrl;
  document.getElementById('editCurrentImageUrl').value = currentProduct.imageUrl; // Store current image URL

  showModal(editProductModal);
});

cancelEditBtn.addEventListener('click', () => hideModal(editProductModal));

deleteProductBtn.addEventListener('click', () => {
  if (currentProduct) {
    deleteProduct(currentProduct.id);
  }
});

browseProductsBtn.addEventListener('click', () => {
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
});

// My Products section (requires a separate function to fetch user's products)
myProductsBtn.addEventListener('click', () => {
  if (currentUser) {
    productGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 dark:text-gray-400">Loading your products...</div>';
    const q = query(collection(db, 'products'), where('sellerId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
      let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      displayProducts(products); // Use existing display function
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' }); // Scroll to products section
    }, (error) => {
      console.error('Error fetching user products: ', error);
      productGrid.innerHTML = '<div class="col-span-full text-center text-red-500">Failed to load your products.</div>';
    });
  } else {
    alert('Please log in to view your products.');
    openLoginRegistrationWindow();
  }
});

// Dashboard button (placeholder - would typically link to a separate dashboard page or section)
dashboardBtn.addEventListener('click', () => {
  alert('Dashboard functionality coming soon!');
});


// EmailJS integration for contact form
(function() {
  emailjs.init({
    publicKey: "1x1Jt00nE-s7f0aG_", // Replace with your Public Key
  });
})();

contactForm.addEventListener('submit', function(event) {
  event.preventDefault();

  const serviceID = 'default_service'; // Replace with your Service ID
  const templateID = 'template_v8fzxqg'; // Replace with your Template ID

  emailjs.sendForm(serviceID, templateID, this)
    .then(() => {
      alert('Message sent successfully!');
      contactForm.reset();
    }, (error) => {
      console.error('Failed to send message:', error);
      alert('Failed to send the message. Please try again later.');
    });
});

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  // The loadDarkModePreference() call is now removed from here as per your request.
  // The theme logic is fully handled in the inline script in index.html.

  // Set initial category filter button state
  const allCategoryButton = document.querySelector('.category-filter-btn[data-category="All"]');
  if (allCategoryButton) {
    allCategoryButton.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    // Ensure this correctly removes light mode specific classes
    allCategoryButton.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
  }
});
