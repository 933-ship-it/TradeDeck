// production-app.js

import {
  auth, db,
  onAuthStateChanged, signOut, deleteUser,
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
  formatPrice, showToast, sendEmailNotification, openCloudinaryWidget
} from './helpers.js';

// DOM elements
const profilePic = document.getElementById('userProfilePic');
const dropdownMenu = document.getElementById('dropdownMenu');
const userEmailDisplay = document.getElementById('userEmail');
const authOverlay = document.getElementById('authOverlay');

const tabs = document.querySelectorAll('aside nav a[data-tab]');
const sections = document.querySelectorAll('main section');

const searchBar = document.getElementById('searchBar');
const productListContainer = document.getElementById('productList');
const noProductsMessage = document.getElementById('noProductsMessage');

const detailSection = document.getElementById('productDetails');
const detailImage = document.getElementById('detailProductImage');
const detailTitle = document.getElementById('detailProductTitle');
const detailDescription = document.getElementById('detailProductDescription');
const detailPrice = document.getElementById('detailProductPrice');
const paypalBtnContainer = document.getElementById('paypal-button-container');
const detailActionButton = document.getElementById('detailActionButton');
const backToHomeBtn = document.getElementById('backToHomeBtn');

const startSellingBtn = document.getElementById('startSellingBtn');
const productForm = document.getElementById('productForm');
const sellLandingContent = document.getElementById('sellLandingContent');
const productUploadForm = document.getElementById('productUploadForm');

const myProductsContainer = document.getElementById('myProducts');
const noMyProductsMessage = document.getElementById('noMyProductsMessage');
const sellerBalance = document.getElementById('sellerBalance');

const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const paypalEmailContainer = document.getElementById('paypalEmailContainer');
const paypalEmailInput = document.getElementById('paypalEmail');
const previewImageUrlInput = document.getElementById('previewImageUrl');
const openPreviewImageWidgetBtn = document.getElementById('openPreviewImageWidget');
const previewImageStatus = document.getElementById('previewImageStatus');
const previewImageContainer = document.getElementById('previewImageContainer');
const currentPreviewImage = document.getElementById('currentPreviewImage');
const productFileUrlInput = document.getElementById('productFileUrlInput');
const formErrorSummary = document.getElementById('formErrorSummary');
const submitProductBtn = document.getElementById('submitProductBtn');

const editProductModal = document.getElementById('editProductModal');
const editProductForm = document.getElementById('editProductForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let userGlobal = null;

// --- Auth & Profile UI ---
onAuthStateChanged(auth, user => {
  if (!user) {
    authOverlay.classList.remove('hidden');
    return;
  }

  userGlobal = user;
  authOverlay.classList.add('hidden');

  profilePic.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`;
  profilePic.classList.remove('hidden');
  userEmailDisplay.textContent = user.email;

  showTab('home');
  loadProducts();
});

profilePic?.addEventListener('click', () => dropdownMenu.classList.toggle('hidden'));
document.addEventListener('click', e => {
  if (!profilePic?.contains(e.target) && !dropdownMenu?.contains(e.target))
    dropdownMenu.classList.add('hidden');
});

document.getElementById('signOutBtn')?.addEventListener('click', () => signOut(auth));
document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
  if (!confirm('Delete your account?')) return;
  try {
    await deleteUser(auth.currentUser);
    showToast('Account deleted', 'success');
    window.location.reload();
  } catch (err) {
    showToast('Failed to delete account', 'error');
  }
});

// --- Navigation Tabs ---
function showTab(tabId) {
  tabs.forEach(t => t.classList.toggle('bg-blue-100', t.dataset.tab === tabId));
  sections.forEach(sec => sec.id === tabId ? sec.classList.remove('hidden') : sec.classList.add('hidden'));
}
tabs.forEach(tab => tab.addEventListener('click', e => {
  e.preventDefault();
  showTab(tab.dataset.tab);
  if (tab.dataset.tab === 'home') loadProducts(searchBar.value.trim());
  if (tab.dataset.tab === 'dashboard') showDashboard();
}));

backToHomeBtn?.addEventListener('click', () => showTab('home'));

// --- Product Listing & Search ---
async function loadProducts(filter = '') {
  productListContainer.innerHTML = '';
  noProductsMessage.classList.remove('hidden');

  try {
    const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const filtered = filter
      ? products.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()))
      : products;

    if (!filtered.length) {
      noProductsMessage.classList.remove('hidden');
      return;
    }

    noProductsMessage.classList.add('hidden');

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg shadow p-4 flex flex-col cursor-pointer product-card';
      card.innerHTML = `
        <img src="${p.previewImageUrl}" class="rounded mb-3 h-48 object-cover"/>
        <h3>${p.title}</h3>
        <p class="text-blue-600 font-bold">${formatPrice(p.price)}</p>
      `;
      card.onclick = () => showProductDetails(p.id);
      productListContainer.appendChild(card);
    });
  } catch {
    noProductsMessage.textContent = 'Error loading products';
  }
}
searchBar?.addEventListener('input', () => loadProducts(searchBar.value.trim()));

// --- Product Details ---
async function showProductDetails(productId) {
  showTab('productDetails');
  try {
    const d = await getDoc(doc(db, 'products', productId));
    if (!d.exists()) return showToast('Product not found', 'error');
    const p = { id: d.id, ...d.data() };

    detailImage.src = p.previewImageUrl;
    detailTitle.textContent = p.title;
    detailDescription.textContent = p.description;
    detailPrice.textContent = formatPrice(p.price);

    if (p.price > 0) {
      paypalBtnContainer.innerHTML = '';
      detailActionButton.classList.add('hidden');

      paypal.Buttons({
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{ amount: { value: p.price.toString() } }]
        }),
        onApprove: async (data, actions) => {
          const order = await actions.order.capture();

          const res = await fetch('https://verify-payment-js.vercel.app/api/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID })
          });
          const { verified } = await res.json();
          if (!verified) return showToast('Payment not verified', 'error');

          await setDoc(doc(db, 'sales', data.orderID), {
            buyerEmail: order.payer.email_address,
            sellerEmail: p.paypalEmail,
            productId: p.id,
            price: p.price,
            time: serverTimestamp()
          });

          const sellerRef = doc(db, 'balances', p.sellerId);
          await setDoc(sellerRef, { balance: serverTimestamp() }, { merge: true });

          await sendEmailNotification({
            product_title: p.title,
            price: p.price,
            buyer_email: order.payer.email_address,
            seller_email: p.paypalEmail
          });

          showToast('Purchase complete', 'success');
          detailActionButton.textContent = 'Download';
          detailActionButton.onclick = () => window.open(p.fileUrl, '_blank');
          detailActionButton.classList.remove('hidden');
        },
        onError: () => showToast('Payment failed', 'error')
      }).render('#paypal-button-container');

    } else {
      detailActionButton.textContent = 'Download';
      detailActionButton.classList.remove('hidden');
      paypalBtnContainer.innerHTML = '';
      detailActionButton.onclick = () => window.open(p.fileUrl, '_blank');
    }
  } catch {
    showToast('Error loading product', 'error');
  }
}

// --- Sell Tab ---
if (startSellingBtn) {
  startSellingBtn.onclick = () => {
    showTab('sell');
    sellLandingContent?.classList.add('hidden');
    productForm?.classList.remove('hidden');
  };
}

openPreviewImageWidgetBtn?.addEventListener('click', () =>
  openCloudinaryWidget(url => {
    previewImageUrlInput.value = url;
    currentPreviewImage.src = url;
    previewImageContainer.classList.remove('hidden');
  })
);

productUploadForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const price = parseFloat(priceInput.value);
  const previewUrl = previewImageUrlInput.value;
  const fileUrl = productFileUrlInput.value.trim();
  const paypalEmail = paypalEmailContainer.classList.contains('hidden') ? '' : paypalEmailInput.value.trim();

  if (!title || !description || isNaN(price) || !previewUrl || !fileUrl || (price > 0 && !paypalEmail)) {
    return showToast('Fill all fields correctly', 'error');
  }

  try {
    await addDoc(collection(db, 'products'), {
      title, description, price, previewImageUrl: previewUrl,
      fileUrl, paypalEmail,
      sellerId: userGlobal.uid,
      createdAt: serverTimestamp()
    });
    showToast('Product listed!', 'success');
    productUploadForm.reset();
    previewImageContainer.classList.add('hidden');
    loadProducts();
    showDashboard();
  } catch {
    showToast('Failed to list product', 'error');
  }
});

// --- Dashboard ---
async function showDashboard() {
  showTab('dashboard');
  await loadMyProducts();
  await updateSellerBalance();
}

async function loadMyProducts() {
  myProductsContainer.innerHTML = '';
  noMyProductsMessage.classList.add('hidden');

  try {
    const snap = await getDocs(query(
      collection(db, 'products'),
      where('sellerId', '==', userGlobal.uid),
      orderBy('createdAt', 'desc')
    ));

    if (snap.empty) {
      noMyProductsMessage.classList.remove('hidden');
      return;
    }

    snap.forEach(d => {
      const p = d.data();
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow';
      card.innerHTML = `
        <h4 class="font-bold">${p.title}</h4>
        <p>${formatPrice(p.price)}</p>
      `;
      myProductsContainer.appendChild(card);
    });
  } catch (err) {
    console.warn("Failed to load dashboard:", err.message);
    showToast('Failed to load dashboard', 'error');
  }
}

async function updateSellerBalance() {
  try {
    const snap = await getDoc(doc(db, 'balances', userGlobal.uid));
    const balance = (snap.exists() && snap.data().balance) || 0;
    sellerBalance.textContent = formatPrice(balance);
  } catch {
    sellerBalance.textContent = formatPrice(0);
  }
}

// Init to home tab
showTab('home');
