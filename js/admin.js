import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { sanitizeProduct, getPriceData } from "./product-model.js";
import { escapeHtml } from "./utils.js";

const ADMIN_PASSWORD = "admin123";
const ADMIN_PASSWORD_STORAGE_KEY = "lux_admin_password";

function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || ADMIN_PASSWORD;
}

function setAdminPassword(newPassword) {
  localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, newPassword);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const loginSection = document.getElementById("adminLogin");
const panelSection = document.getElementById("adminPanel");
const adminAlert = document.getElementById("adminAlert");
const loginForm = document.getElementById("adminLoginForm");
const passwordInput = document.getElementById("adminPassword");
const logoutBtn = document.getElementById("adminLogout");
const productsTableBody = document.getElementById("productsTableBody");
const statProducts = document.getElementById("statProducts");
const statOutOfStock = document.getElementById("statOutOfStock");
const statPromos = document.getElementById("statPromos");
const statCategories = document.getElementById("statCategories");
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const refreshButton = document.getElementById("refreshProducts");

// New UI elements
const navButtons = document.querySelectorAll('.admin-nav [data-view]');
const views = document.querySelectorAll('.admin-view');
const addProductForm = document.getElementById('addProductForm');
const pCategorySelect = document.getElementById('pCategory');
const addProductAlert = document.getElementById('addProductAlert');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryName = document.getElementById('newCategoryName');
const categoryAlert = document.getElementById('categoryAlert');
const categoriesList = document.getElementById('categoriesList');
const ordersTableBody = document.getElementById('ordersTableBody');
const ordersBadge = document.getElementById('ordersBadge');
const orderDetailsPanel = document.getElementById('orderDetailsPanel');
const orderDetailsContent = document.getElementById('orderDetailsContent');
const ordersAlert = document.getElementById('ordersAlert');
const refreshOrders = document.getElementById('refreshOrders');
const settingsForm = document.getElementById('settingsForm');
const settingDelivery = document.getElementById('settingDelivery');
const settingEmail = document.getElementById('settingEmail');
const settingsAlert = document.getElementById('settingsAlert');

const pIdInput = document.getElementById('pId');
const pSubmitBtn = document.getElementById('pSubmitBtn');
const productFormTitle = document.getElementById('productFormTitle');
const clearProductFormBtn = document.getElementById('clearProductForm');

let allCategories = [];
let allProducts = [];
let allOrders = [];
let currentEditProductId = null;

function resetProductForm() {
  if (!addProductForm) return;
  addProductForm.reset();
  currentEditProductId = null;
  if (pIdInput) pIdInput.value = '';
  if (productFormTitle) productFormTitle.textContent = 'Ajouter un produit';
  if (pSubmitBtn) pSubmitBtn.textContent = 'Ajouter';
  if (addProductAlert) addProductAlert.textContent = '';
  if (document.getElementById('pDescription')) document.getElementById('pDescription').value = '';
  if (document.getElementById('pImages')) document.getElementById('pImages').value = '';
  if (document.getElementById('pColors')) document.getElementById('pColors').value = '';
  rebuildCategoryOptions();
}

function populateProductForm(product) {
  if (!product || !addProductForm) return;
  currentEditProductId = product.id;
  if (pIdInput) pIdInput.value = product.id;
  if (productFormTitle) productFormTitle.textContent = 'Modifier le produit';
  if (pSubmitBtn) pSubmitBtn.textContent = 'Mettre à jour';
  document.getElementById('pName').value = product.name || '';
  document.getElementById('pDescription').value = product.description || '';
  document.getElementById('pImages').value = (product.images || []).join('\n');
  document.getElementById('pImage').value = product.image || '';
  document.getElementById('pColors').value = (product.colors || []).join(',');
  document.getElementById('pPrice').value = product.price || '';
  document.getElementById('pOldPrice').value = product.oldPrice || '';
  document.getElementById('pCategory').value = product.category || '';
  document.getElementById('pTag').value = product.tag || '';
  document.getElementById('pSizes').value = (product.sizes || []).join(',');
  document.getElementById('pEur').value = (product.tailleEUR || []).join(',');
  document.getElementById('pUsa').value = (product.tailleUSA || []).join(',');
}

async function setProductEditMode(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;
  switchActiveNav(document.querySelector('.admin-nav [data-view="add"]'));
  switchView('add');
  populateProductForm(product);
}

async function deleteProductById(productId) {
  if (!productId) return;
  if (!confirm('Supprimer ce produit définitivement ?')) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
    await loadProducts();
    showAlert('Produit supprimé.', 'success');
  } catch (err) {
    console.error(err);
    showAlert('Erreur lors de la suppression du produit.');
  }
}

function setLoggedIn(value) {
  if (value) {
    sessionStorage.setItem("lux_admin", "1");
  } else {
    sessionStorage.removeItem("lux_admin");
  }
}

function isLoggedIn() {
  return sessionStorage.getItem("lux_admin") === "1";
}

function showElement(el) {
  el.classList.remove("hidden");
}

function hideElement(el) {
  el.classList.add("hidden");
}

function showAlert(message, type = "error") {
  if (!adminAlert) return;
  adminAlert.textContent = message;
  adminAlert.className = `admin-alert ${type}`;
}

function clearAlert() {
  if (!adminAlert) return;
  adminAlert.textContent = "";
  adminAlert.className = "admin-alert";
}

async function loadProducts() {
  showAlert("Chargement des produits...");
  try {
    const snapshot = await getDocs(collection(db, "products"));
    const products = [];
    snapshot.forEach((doc) => {
      products.push(sanitizeProduct(doc.id, doc.data()));
    });
    allProducts = products;
    renderOverview();
    rebuildCategoryOptions();
    renderProductRows();
    showAlert("Produits chargés.", "success");
  } catch (error) {
    console.error(error);
    showAlert("Impossible de charger les produits. Vérifiez la connexion Firestore.");
  }
}

function formatCategory(category) {
  return category ? category.toUpperCase() : "-";
}

function renderOverview() {
  const total = allProducts.length;
  const outOfStock = allProducts.filter((product) => String(product.tag || "").toLowerCase().includes("out of stock") || String(product.tag || "").toLowerCase().includes("rupture")).length;
  const promos = allProducts.filter((product) => getPriceData(product).oldPrice !== null).length;
  const categories = new Set(allProducts.map((product) => product.category).filter(Boolean));
  statProducts.textContent = String(total);
  statOutOfStock.textContent = String(outOfStock);
  statPromos.textContent = String(promos);
  statCategories.textContent = String(categories.size);
}

function rebuildCategoryOptions() {
  const categories = Array.from(new Set(allCategories.map(c => c.name))).sort();
  categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  // populate add-product category select with explicit categories only
  pCategorySelect.innerHTML = '<option value="">— Choisir —</option>' + categories.map((c) => `<option value="${c}">${c}</option>`).join('');
}

async function loadCategories() {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const cats = [];
    snap.forEach(d => cats.push({ id: d.id, ...d.data() }));
    allCategories = cats.map(c => ({ id: c.id, name: String(c.name).trim() })).filter(c => c.name);
    renderCategoryList();
    rebuildCategoryOptions();
  } catch (err) {
    console.error('loadCategories', err);
  }
}

function renderCategoryList() {
  if (!categoriesList) return;
  categoriesList.innerHTML = allCategories.map(cat => `<li data-id="${cat.id}">${cat.name} <button class="btn btn-outline btn-sm" data-cat-id="${cat.id}">Supprimer</button></li>`).join('') || '<li>Aucune catégorie.</li>';
}

async function addCategory(name) {
  if (!name) return;
  try {
    await addDoc(collection(db, 'categories'), { name: String(name).trim() });
    await loadCategories();
    categoryAlert.textContent = 'Catégorie ajoutée.';
    setTimeout(() => categoryAlert.textContent = '', 1800);
  } catch (err) {
    console.error(err);
    categoryAlert.textContent = 'Échec lors de l\'ajout.';
  }
}

async function deleteCategoryById(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'categories', id));
    await loadCategories();
  } catch (err) {
    console.error(err);
  }
}

function getFilteredProducts() {
  const search = productSearch.value.trim().toLowerCase();
  const category = categoryFilter.value;
  return allProducts.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesText = [product.name, product.category, product.tag]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
    return matchesCategory && matchesText;
  });
}

function renderProductRows() {
  const products = getFilteredProducts();
  productsTableBody.innerHTML = products.map((product) => {
    const priceData = getPriceData(product);
    const productLabel = product.name || "Sans nom";
    const promoText = priceData.oldPrice ? `Oui (${product.tag || "-"})` : "Non";
    const status = String(product.tag || "").toLowerCase().includes("out of stock") || String(product.tag || "").toLowerCase().includes("rupture") ? "Rupture" : "En stock";
    return `<tr>
      <td>
        <div class="admin-product-cell">
          <img src="${product.image}" alt="${productLabel}" />
          <div>
            <strong>${productLabel}</strong>
            <span>${product.id}</span>
          </div>
        </div>
      </td>
      <td>${formatCategory(product.category)}</td>
      <td>${priceData.finalPrice} DT</td>
      <td>${status}</td>
      <td>${promoText}</td>
      <td>
        <button class="btn btn-outline" type="button" data-action="edit" data-id="${product.id}">Modifier</button>
        <button class="btn btn-outline" type="button" style="border-color:#e53935;color:#e53935;" data-action="delete" data-id="${product.id}">Supprimer</button>
      </td>
    </tr>`;
  }).join("");
  if (products.length === 0) {
    productsTableBody.innerHTML = `<tr><td colspan="6" class="admin-empty">Aucun produit trouvé.</td></tr>`;
  }
}

productsTableBody?.addEventListener('click', (ev) => {
  const button = ev.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'edit') {
    setProductEditMode(id);
  }
  if (action === 'delete') {
    deleteProductById(id);
  }
});

function showLogin() {
  hideElement(panelSection);
  showElement(loginSection);
  clearAlert();
  passwordInput.value = "";
  passwordInput.focus();
}

function showDashboard() {
  hideElement(loginSection);
  showElement(panelSection);
  clearAlert();
  loadProducts();
  loadCategories();
  loadOrders();
  loadSettings();
  // default to products view and mark nav active
  const defaultBtn = document.querySelector('.admin-nav [data-view="products"]') || navButtons[0];
  if (defaultBtn) {
    switchActiveNav(defaultBtn);
    switchView('products');
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = passwordInput.value.trim();
  if (!value) {
    showAlert("Veuillez saisir le mot de passe.");
    return;
  }
  if (value === getAdminPassword()) {
    setLoggedIn(true);
    showDashboard();
  } else {
    showAlert("Mot de passe incorrect.");
  }
});

logoutBtn.addEventListener("click", () => {
  setLoggedIn(false);
  showLogin();
});

productSearch.addEventListener("input", renderProductRows);
categoryFilter.addEventListener("change", renderProductRows);
refreshButton.addEventListener("click", loadProducts);

if (refreshOrders) {
  refreshOrders.addEventListener("click", () => {
    console.log('🔄 User clicked refresh orders');
    loadOrders();
  });
}

// navigation between admin views
navButtons.forEach(btn => btn.addEventListener('click', (e) => {
  const view = btn.getAttribute('data-view');
  switchActiveNav(btn);
  switchView(view);
}));

function switchView(name) {
  views.forEach(v => v.classList.add('hidden'));
  const el = document.getElementById('view' + (name === 'products' ? 'Products' : name.charAt(0).toUpperCase() + name.slice(1)));
  if (el) el.classList.remove('hidden');
  if (name === 'add') {
    resetProductForm();
  }
  // Reload orders when switching to orders view
  if (name === 'orders') {
    loadOrders();
  }
}

function switchActiveNav(btn) {
  if (!btn) return;
  navButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// add category form
if (addCategoryForm) {
  addCategoryForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = newCategoryName.value.trim();
    if (!name) return;
    await addCategory(name);
    newCategoryName.value = '';
  });
}

// categories list delete handler
if (categoriesList) {
  categoriesList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-cat-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-cat-id');
    if (confirm('Supprimer cette catégorie ?')) deleteCategoryById(id);
  });
}

// add product
if (addProductForm) {
  addProductForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = document.getElementById('pName').value.trim();
    const id = currentEditProductId || (pIdInput && pIdInput.value.trim());
    const image = document.getElementById('pImage').value.trim();
    const description = document.getElementById('pDescription').value.trim();
    const images = String(document.getElementById('pImages').value).split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    const colors = String(document.getElementById('pColors').value).split(',').map(s => s.trim()).filter(Boolean);
    const price = parseFloat(document.getElementById('pPrice').value) || 0;
    const oldPrice = parseFloat(document.getElementById('pOldPrice').value) || null;
    const category = document.getElementById('pCategory').value.trim() || '';
    const tag = document.getElementById('pTag').value.trim() || '';
    const sizes = document.getElementById('pSizes').value.split(',').map(s=>s.trim()).filter(Boolean);
    const eurs = document.getElementById('pEur').value.split(',').map(s=>s.trim()).filter(Boolean);
    const usas = document.getElementById('pUsa').value.split(',').map(s=>s.trim()).filter(Boolean);
    const payload = {
      name,
      description,
      image,
      price: Number(price),
      oldPrice: oldPrice || null,
      category,
      tag,
    };
    if (images.length) payload.images = images;
    if (colors.length) payload.colors = colors;
    if (sizes.length) payload.sizes = sizes;
    if (eurs.length) payload.eursize = eurs;
    if (usas.length) payload.usasize = usas;
    try {
      if (id) {
        await updateDoc(doc(db, 'products', id), payload);
        addProductAlert.textContent = 'Produit mis à jour.';
      } else {
        await addDoc(collection(db, 'products'), payload);
        addProductAlert.textContent = 'Produit ajouté.';
      }
      resetProductForm();
      await loadProducts();
    } catch (err) {
      console.error(err);
      addProductAlert.textContent = id ? 'Erreur lors de la mise à jour.' : 'Erreur lors de l\'ajout.';
    }
    setTimeout(() => {
      if (addProductAlert) addProductAlert.textContent = '';
    }, 2200);
  });
}

if (clearProductFormBtn) {
  clearProductFormBtn.addEventListener('click', () => resetProductForm());
}

// Orders
async function loadOrders() {
  try {
    console.log('📦 loadOrders called...');
    console.log('📦 ordersTableBody element:', ordersTableBody);
    console.log('📦 ordersAlert element:', ordersAlert);
    
    if (!ordersTableBody) {
      console.error('❌ ordersTableBody element not found!');
      return;
    }
    
    if (ordersAlert) {
      ordersAlert.style.display = 'none';
      ordersAlert.textContent = '';
    }
    
    const snap = await getDocs(collection(db, 'orders'));
    console.log('📦 Firestore query returned', snap.size, 'documents');
    
    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      console.log('📦 Order doc:', d.id, data);
      rows.push({ id: d.id, ...data });
    });
    
    allOrders = rows.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    console.log('📦 Orders loaded. Total:', allOrders.length);
    renderOrders(allOrders);
    updateOrdersBadge(allOrders);
  } catch (err) {
    console.error('❌ loadOrders error:', err.message, err.code);
    if (ordersAlert) {
      ordersAlert.textContent = `❌ Erreur Firestore: ${err.message} (${err.code})`;
      ordersAlert.style.display = 'block';
    }
    if (ordersTableBody) {
      ordersTableBody.innerHTML = `<tr><td colspan="6" class="admin-empty" style="color:red;">❌ Erreur Firestore: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function renderOrders(rows) {
  console.log('🎨 renderOrders called with', rows.length, 'rows');
  if (!ordersTableBody) {
    console.error('❌ ordersTableBody not found in renderOrders!');
    return;
  }
  if (rows.length === 0) {
    console.log('🎨 Showing empty state');
    ordersTableBody.innerHTML = '<tr><td colspan="6" class="admin-empty">Aucune commande.</td></tr>';
    return;
  }
  console.log('🎨 Rendering', rows.length, 'order rows');
  ordersTableBody.innerHTML = rows.map(r => {
    const customerName = escapeHtml((r.firstName ? `${r.firstName} ${r.lastName}` : (r.customer && r.customer.name) || r.customerName || '-'));
    return `<tr data-order-id="${r.id}" class="order-summary-row">
    <td>${escapeHtml(r.id)}</td>
    <td>${customerName}</td>
    <td>${escapeHtml(String(r.total || '-'))} DT</td>
    <td>${escapeHtml(String(r.status || 'nouvelle'))}</td>
    <td>${r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '-'}</td>
    <td><button class="btn btn-outline" data-order-id="${r.id}">Voir</button></td>
  </tr>`;
  }).join('');
}

function updateOrdersBadge(rows) {
  if (!ordersBadge) return;
  const newCount = rows.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    return status === 'nouvelle' || status === 'new' || order.new === true;
  }).length;
  if (newCount > 0) {
    ordersBadge.textContent = String(newCount);
    ordersBadge.classList.remove('hidden');
  } else {
    ordersBadge.textContent = '0';
    ordersBadge.classList.add('hidden');
  }
}

function renderOrderDetails(order) {
  if (!orderDetailsPanel || !orderDetailsContent) return;
  const customerName = escapeHtml((order.firstName ? `${order.firstName} ${order.lastName}` : (order.customer && order.customer.name) || order.customerName || '-'));
  const customerPhone = escapeHtml((order.customer && order.customer.phone) || order.phone || '-');
  const address = escapeHtml(order.address || '-');
  const extra = escapeHtml(order.addressExtra || '-');
  const governorate = escapeHtml(order.governorate || '-');
  const status = escapeHtml(order.status || 'nouvelle');
  const orderedAt = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '-';
  const itemsHtml = (order.items || []).map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.color || '-')}</td>
        <td>${escapeHtml(item.size || item.tailleUSA || item.tailleEUR || '-')}</td>
        <td>${escapeHtml(String(item.qty || 1))}</td>
        <td>${escapeHtml(String(item.unitPrice || 0))} DT</td>
        <td>${escapeHtml(String((item.unitPrice || 0) * (item.qty || 1)))} DT</td>
      </tr>`).join('');

  const statuses = ['nouvelle', 'en cours', 'envoyée', 'livrée', 'annulée'];
  const statusOptions = statuses.map((value) => `
      <option value="${value}" ${value === (order.status || 'nouvelle') ? 'selected' : ''}>
        ${value.charAt(0).toUpperCase() + value.slice(1)}
      </option>
    `).join('');

  orderDetailsContent.innerHTML = `
    <div class="order-meta-grid">
      <div><strong>ID :</strong> ${escapeHtml(order.id)}</div>
      <div><strong>Statut :</strong> ${status}</div>
      <div><strong>Date :</strong> ${orderedAt}</div>
      <div><strong>Client :</strong> ${customerName}</div>
      <div><strong>Téléphone :</strong> ${customerPhone}</div>
      <div><strong>Gouvernorat :</strong> ${governorate}</div>
      <div><strong>Adresse :</strong> ${address}</div>
      <div><strong>Détails supplémentaires :</strong> ${extra}</div>
    </div>
    <div class="admin-table-wrap" style="margin-top:16px;">
      <table class="admin-table admin-order-table">
        <thead><tr><th>#</th><th>Produit</th><th>Couleur</th><th>Tailles</th><th>Qté</th><th>Prix unitaire</th><th>Montant</th></tr></thead>
        <tbody>${itemsHtml || '<tr><td colspan="7">Aucun article.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="order-summary-row" style="margin-top:16px; display:flex; gap:18px; flex-wrap:wrap;">
      <div><strong>Prix total :</strong> ${escapeHtml(String(order.total || '-'))} DT</div>
      <div><strong>Livraison :</strong> ${escapeHtml(String(order.shipping || '-'))} DT</div>
      <div><strong>À payer :</strong> ${escapeHtml(String((order.total || 0) + (order.shipping || 0)))} DT</div>
    </div>
  `;

  const orderActions = document.getElementById('orderDetailsActions');
  if (orderActions) {
    orderActions.innerHTML = `
      <div class="field" style="min-width:240px;">
        <label for="orderStatusSelect">Statut de la commande</label>
        <select id="orderStatusSelect">${statusOptions}</select>
      </div>
      <button class="btn btn-primary" type="button" id="orderUpdateStatusBtn">Mettre à jour le statut</button>
      <button class="btn btn-outline" type="button" id="orderDeleteBtn" style="border-color:#e53935;color:#e53935;">Supprimer la commande</button>
      <div id="orderActionResult" class="admin-alert" style="margin-top:0.5rem;width:100%"></div>
    `;
  }

  orderDetailsPanel.dataset.orderId = order.id;
  orderDetailsPanel.classList.remove('hidden');
}

async function updateOrderStatus(orderId, statusValue) {
  if (!orderId) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), { status: statusValue });
    await loadOrders();
    renderOrderDetails(allOrders.find((o) => o.id === orderId));
    const actionResult = document.getElementById('orderActionResult');
    if (actionResult) {
      actionResult.textContent = 'Statut mis à jour.';
      actionResult.className = 'admin-alert success';
    }
  } catch (err) {
    console.error(err);
    const actionResult = document.getElementById('orderActionResult');
    if (actionResult) {
      actionResult.textContent = 'Impossible de mettre à jour la commande.';
      actionResult.className = 'admin-alert error';
    }
  }
}

async function deleteOrderById(orderId) {
  if (!orderId || !confirm('Supprimer cette commande définitivement ?')) return;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    await loadOrders();
    if (orderDetailsPanel) orderDetailsPanel.classList.add('hidden');
    showAlert('Commande supprimée.', 'success');
  } catch (err) {
    console.error(err);
    showAlert('Erreur lors de la suppression de la commande.');
  }
}

orderDetailsPanel?.addEventListener('click', (ev) => {
  const updateBtn = ev.target.closest('#orderUpdateStatusBtn');
  const deleteBtn = ev.target.closest('#orderDeleteBtn');
  if (!updateBtn && !deleteBtn) return;
  const orderId = orderDetailsPanel.dataset.orderId;
  if (updateBtn) {
    const select = document.getElementById('orderStatusSelect');
    if (select) updateOrderStatus(orderId, select.value);
  }
  if (deleteBtn) {
    deleteOrderById(orderId);
  }
});

if (ordersTableBody) {
  ordersTableBody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-order-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-order-id');
    const order = allOrders.find((o) => o.id === id);
    if (order) {
      renderOrderDetails(order);
    }
  });
}

// Settings
async function loadSettings() {
  try {
    const docRef = doc(db, 'settings', 'site');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (settingDelivery) settingDelivery.value = data.deliveryFee ?? 7;
      if (settingEmail) settingEmail.value = data.orderEmail ?? 'mouhamedamineyousfi10@gmail.com';
    } else {
      if (settingDelivery) settingDelivery.value = 7;
      if (settingEmail) settingEmail.value = 'mouhamedamineyousfi10@gmail.com';
    }
  } catch (err) {
    console.error('loadSettings', err);
    if (settingDelivery) settingDelivery.value = 7;
    if (settingEmail) settingEmail.value = 'mouhamedamineyousfi10@gmail.com';
  }
}

if (settingsForm) {
  settingsForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const delivery = parseFloat(settingDelivery.value) || 0;
    const email = (settingEmail.value || '').trim();
    try {
      await setDoc(doc(db, 'settings', 'site'), { deliveryFee: delivery, orderEmail: email }, { merge: true });
      settingsAlert.textContent = 'Paramètres sauvegardés.';
      setTimeout(()=> settingsAlert.textContent = '', 2000);
    } catch (err) {
      console.error(err);
      settingsAlert.textContent = 'Erreur lors de l\'enregistrement.';
    }
  });
}

// Password toggle eye icon
const passwordToggle = document.getElementById('passwordToggle');
if (passwordToggle) {
  passwordToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    passwordToggle.classList.toggle('active', type === 'text');
  });
}

// Change password form
const changePasswordForm = document.getElementById('changePasswordForm');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordChangeAlert = document.getElementById('passwordChangeAlert');

if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const current = currentPasswordInput.value.trim();
    const newPass = newPasswordInput.value.trim();
    const confirm = confirmPasswordInput.value.trim();
    
    passwordChangeAlert.textContent = '';
    passwordChangeAlert.className = 'admin-alert';
    
    if (!current || !newPass || !confirm) {
      passwordChangeAlert.textContent = 'Veuillez remplir tous les champs.';
      passwordChangeAlert.className = 'admin-alert error';
      return;
    }
    
    if (current !== getAdminPassword()) {
      passwordChangeAlert.textContent = 'Le mot de passe actuel est incorrect.';
      passwordChangeAlert.className = 'admin-alert error';
      return;
    }
    
    if (newPass !== confirm) {
      passwordChangeAlert.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
      passwordChangeAlert.className = 'admin-alert error';
      return;
    }
    
    if (newPass.length < 4) {
      passwordChangeAlert.textContent = 'Le nouveau mot de passe doit contenir au moins 4 caractères.';
      passwordChangeAlert.className = 'admin-alert error';
      return;
    }
    
    setAdminPassword(newPass);
    passwordChangeAlert.textContent = 'Mot de passe changé avec succès.';
    passwordChangeAlert.className = 'admin-alert success';
    changePasswordForm.reset();
    setTimeout(() => {
      passwordChangeAlert.textContent = '';
      passwordChangeAlert.className = 'admin-alert';
    }, 2500);
  });
}

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}
