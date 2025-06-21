// production-app.js

import { formatPrice, showToast, sendEmailNotification } from './helpers.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signOut, deleteUser
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  addDoc, updateDoc, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "...",  // <–– INSERT YOUR ACTUAL CONFIG VALUES
  authDomain: "...",
  projectId: "...",
  // ...other fields
};

const auth = getAuth(app);
const db = getFirestore(app);

window.addEventListener('DOMContentLoaded', () => {
  // DOM refs (ensure IDs match your HTML exactly)
  const profilePic = document.getElementById('userProfilePic');
  const dropdown = document.getElementById('dropdownMenu');
  const userEmailDisplay = document.getElementById('userEmail');
  const deleteBtn = document.getElementById('deleteAccountBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const authOverlay = document.getElementById('authOverlay');
  const navLinks = document.querySelectorAll('aside nav a');
  const sections = {
    home: document.getElementById('home'),
    sell: document.getElementById('sell'),
    dashboard: document.getElementById('dashboard'),
  };

  const productList = document.getElementById('productList');
  const noProductsMessage = document.getElementById('noProductsMessage');
  const detailSection = document.getElementById('productDetails');
  const homeSection = document.getElementById('home');
  const detailImage = document.getElementById('detailProductImage');
  const detailTitle = document.getElementById('detailProductTitle');
  const detailDescription = document.getElementById('detailProductDescription');
  const detailPrice = document.getElementById('detailProductPrice');
  const paypalContainer = document.getElementById('paypal-button-container');
  const backBtn = document.getElementById('backToHomeBtn');

  const sellerBalanceDisplay = document.getElementById('sellerBalance');
  const myProductsGrid = document.getElementById('myProducts');
  const noMyProductsMessage = document.getElementById('noMyProductsMessage');
  const uploadBtn = document.getElementById('uploadProductBtn');
  const productTitleInput = document.getElementById('productTitle');
  const productDescInput = document.getElementById('productDescription');
  const productPriceInput = document.getElementById('productPrice');
  const previewInput = document.getElementById('productPreview');
  const fileInput = document.getElementById('productFile');
  const previewThumbnail = document.getElementById('previewThumbnail');

  // --- Navigation ---
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.getAttribute('href').slice(1);
      Object.entries(sections).forEach(([key, el]) => {
        el.classList.toggle('hidden', key !== target);
      });
      navLinks.forEach(l => l.classList.remove('bg-blue-100'));
      link.classList.add('bg-blue-100');

      if (target === 'home') loadProducts();
      if (target === 'dashboard') loadMyProducts(currentUserEmail);
    });
  });

  backBtn.addEventListener('click', () => {
    detailSection.classList.add('hidden');
    homeSection.classList.remove('hidden');
  });

  // --- Auth State ---
  let currentUserEmail = null;
  onAuthStateChanged(auth, user => {
    if (!user) {
      authOverlay.style.display = 'flex';
      return;
    }
    authOverlay.style.display = 'none';
    currentUserEmail = user.email;

    if (user.photoURL) {
      profilePic.src = user.photoURL;
      profilePic.classList.remove('hidden');
    }

    userEmailDisplay.textContent = currentUserEmail;
    loadProducts();
    loadMyProducts();

    // Balance watcher via Firestore
    const userDoc = doc(db, 'users', currentUserEmail);
    onSnapshot(userDoc, snap => {
      const bal = snap.exists() && snap.data().balance ? snap.data().balance : 0;
      sellerBalanceDisplay.textContent = formatPrice(bal);
    });
  });

  // --- Dropdown Profile Menu ---
  profilePic.addEventListener('click', () => dropdown.classList.toggle('hidden'));
  document.addEventListener('click', e => {
    if (!profilePic.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  signOutBtn.addEventListener('click', () => signOut(auth).then(() => location.reload()));
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete account? This cannot be undone.')) return;
    try {
      await deleteUser(auth.currentUser);
      showToast('Account deleted', 'success');
      location.reload();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete account', 'error');
    }
  });

  // --- Load Products ---
  async function loadProducts() {
    productList.innerHTML = '';
    noProductsMessage.classList.remove('hidden');

    const snapshot = await getDocs(collection(db, 'products'));
    if (snapshot.empty) return;

    noProductsMessage.classList.add('hidden');
    snapshot.forEach(docSnap => {
      const pd = docSnap.data();
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow-lg p-4 cursor-pointer product-card';
      card.innerHTML = `
        <img src="${pd.preview}" class="w-full h-48 object-cover rounded-md mb-3">
        <div class="font-bold text-lg">${pd.title}</div>
        <div class="text-sm text-gray-500 mb-1">${pd.description}</div>
        <div class="text-blue-600 font-semibold">${formatPrice(pd.price)}</div>
      `;
      card.addEventListener('click', () => showProductDetail(pd, docSnap.id));
      productList.appendChild(card);
    });
  }

  // --- Show Product Details & PayPal integration ---
  function showProductDetail(product, id) {
    homeSection.classList.add('hidden');
    detailSection.classList.remove('hidden');

    detailImage.src = product.preview;
    detailTitle.textContent = product.title;
    detailDescription.textContent = product.description;
    detailPrice.textContent = formatPrice(product.price);

    paypalContainer.innerHTML = '';
    if (product.price > 0) {
      paypal.Buttons({
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{ amount: { value: product.price.toFixed(2) } }]
        }),
        onApprove: async (data, actions) => {
          const order = await actions.order.capture();

          // verify backend
          const resp = await fetch('https://your-verification-endpoint/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID })
          });
          const result = await resp.json();
          if (!result.verified) {
            showToast('Payment failed verification.', 'error');
            return;
          }

          // Log sale
          await setDoc(doc(db, 'sales', data.orderID), {
            productId: id,
            title: product.title,
            seller: product.seller,
            buyer: currentUserEmail,
            price: product.price,
            time: serverTimestamp()
          });

          // Update seller balance with 70% payout
          const userDocRef = doc(db, 'users', product.seller);
          const snap = await getDoc(userDocRef);
          const currentBal = snap.exists() && snap.data().balance ? snap.data().balance : 0;
          await setDoc(userDocRef, { balance: currentBal + product.price * 0.7 }, { merge: true });

          // Notify via email
          await sendEmailNotification({
            product_title: product.title,
            price: formatPrice(product.price),
            buyer_email: currentUserEmail,
            seller_email: product.seller
          });

          showToast('✅ Purchase successful', 'success');
        },
        onError: err => {
          console.error(err);
          showToast('Payment error', 'error');
        }
      }).render('#paypal-button-container');
    }
  }

  // --- Dashboard: My Products & Balance ---
  async function loadMyProducts() {
    myProductsGrid.innerHTML = '';
    const q = query(collection(db, 'products'), where('seller', '==', currentUserEmail));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      noMyProductsMessage.classList.remove('hidden');
      return;
    }
    snapshot.forEach(docSnap => {
      const pd = docSnap.data();
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow p-4 product-card';
      card.innerHTML = `
        <img src="${pd.preview}" class="w-full h-48 object-cover rounded-lg mb-3">
        <div class="font-bold">${pd.title}</div>
        <div class="text-gray-600">${pd.description}</div>
        <div class="text-blue-600 font-bold">${formatPrice(pd.price)}</div>
      `;
      myProductsGrid.appendChild(card);
    });
  }

  // --- Sell product handler ---
  uploadBtn.addEventListener('click', async () => {
    const title = productTitleInput.value.trim();
    const description = productDescInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const preview = previewInput.files[0];

    if (!title || !description || isNaN(price) || !preview) {
      showToast('❌ Complete all fields.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', preview);
    formData.append('upload_preset', 'Your_Cloudinary_Preset');

    try {
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload', {
        method: 'POST',
        body: formData
      });
      const { secure_url } = await cloudRes.json();

      await addDoc(collection(db, 'products'), {
        title, description, price, preview: secure_url,
        seller: currentUserEmail, time: serverTimestamp()
      });
      showToast('✅ Product listed!', 'success');

      // Refresh UI
      productTitleInput.value = '';
      productDescInput.value = '';
      productPriceInput.value = '';
      previewInput.value = '';
      previewThumbnail.src = '';
      loadProducts();
      loadMyProducts();
    } catch (e) {
      console.error(e);
      showToast('❌ Error listing product.', 'error');
    }
  });

  // --- Preview thumbnail view ---
  previewInput.addEventListener('change', () => {
    const f = previewInput.files[0];
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => previewThumbnail.src = reader.result;
      reader.readAsDataURL(f);
    }
  });
});
