// --- production-app.js ---
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { debounce, isValidUrl, convertToDriveDirect } from "./helpers.js";

// Config
const firebaseConfig = { /* your config */ };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Refs
const authOverlay = document.getElementById('authOverlay');
const tabs = [...document.querySelectorAll('aside nav a[data-tab]')];
const sections = [...document.querySelectorAll('main section')];
const searchBar = document.getElementById('searchBar');
const productList = document.getElementById('productList');
const noProductsMessage = document.getElementById('noProductsMessage');
// ... other elements omitted for brevity

// Auth & Profile
onAuthStateChanged(auth, user => {
  document.body.style.visibility = 'visible';
  if (!user) {
    authOverlay.style.display = 'flex';
  } else {
    authOverlay.style.display = 'none';
    initUser(user);
    loadProducts();
  }
});

function initUser(user) {
  // Set profile pic, email, dropdown event handlers ...
  document.getElementById('signOutBtn').onclick = () => signOut(auth);
  document.getElementById('deleteAccountBtn').onclick = async () => {
    try {
      if (confirm("Delete account?")) {
        await deleteUser(user);
        location.reload();
      }
    } catch (e) { alert(e.message) }
  };
}

// Navigation
tabs.forEach(tab => {
  tab.addEventListener('click', async e => {
    e.preventDefault();
    switchTab(tab.dataset.tab);
  });
});

function switchTab(tabName) {
  tabs.forEach(t => {
    t.classList.toggle('bg-blue-100', t.dataset.tab === tabName);
    t.setAttribute('aria-current', t.dataset.tab === tabName ? 'page' : 'false');
  });
  sections.forEach(sec => sec.id === tabName ? sec.classList.remove('hidden') : sec.classList.add('hidden'));
  if (tabName === 'home') loadProducts(searchBar.value.trim());
  if (tabName === 'dashboard') loadDashboard();
}

// Product Fetching & Rendering
async function loadProducts(filter = '') {
  productList.innerHTML = '';
  noProductsMessage.classList.remove('hidden');
  noProductsMessage.textContent = 'Loading…';

  const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = all.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()) || p.description.toLowerCase().includes(filter.toLowerCase()));
  renderProductCards(filtered, productList, noProductsMessage, false);
}

function renderProductCards(arr, containerEl, emptyEl, isDashboard) {
  containerEl.innerHTML = '';
  if (!arr.length) {
    emptyEl.textContent = isDashboard ? 'No your products yet.' : 'No products found.';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  arr.forEach(p => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow p-4 flex flex-col cursor-pointer';
    div.innerHTML = `
      <img src="${p.previewImageUrl}" alt="${p.title}" class="h-40 object-cover rounded mb-2">
      <h3 class="font-bold">${p.title}</h3>
      <p class="text-gray-600 truncate">${p.description}</p>
      <div class="mt-auto flex justify-between">
        <span class="font-semibold">${p.price > 0 ? '$'+p.price : 'Free'}</span>
        ${isDashboard ? `<button data-id="${p.id}" class="btn-delist text-red-600">Delist</button>` : ''}
      </div>`;
    containerEl.appendChild(div);

    if (isDashboard) {
      div.querySelector('.btn-delist').onclick = async e => {
        e.stopPropagation();
        if (confirm('Delist product?')) {
          await deleteDoc(doc(db, 'products', p.id));
          switchTab('dashboard');
        }
      };
    } else {
      div.onclick = () => showProductDetails(p.id);
    }
  });
}

// Search Debounced
searchBar.addEventListener('input', debounce(e => {
  if (!sections.find(s => !s.classList.contains('hidden')).id === 'home') return;
  loadProducts(e.target.value);
}, 300));

// Sell, Dashboard, Product details, PayPal purchase, form upload logic omitted but should follow same pattern:
// - validate using helpers
// - update Firestore
// - switch tabs, reload data

// Init
document.body.style.visibility = 'hidden';
