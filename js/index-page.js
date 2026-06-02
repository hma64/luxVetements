import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { sanitizeProduct, getPriceData, isOutOfStockGlobally, formatPrice } from "./product-model.js";
import { getCart, setCart, cartLineTotal, cartCount } from "./cart.js";
import { escapeHtml, formatCategoryName } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentFilter = "all";
let allProducts = [];
let currentSearch = "";

const productsContainer = document.getElementById("productsContainer");
const stateBox = document.getElementById("stateBox");
const filterBar = document.getElementById("filterBar");
const searchInput = document.getElementById("searchInput");
const layoutKebab = document.getElementById("layoutKebab");
const categoriesGrid = document.getElementById("categoriesGrid");

const cartDrawer = document.getElementById("cartDrawer");
const cartDim = document.getElementById("cartDim");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCountEl = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");

let previewVertical = false;

// ── Cart open/close ────────────────────────────────────────────────────────────
function openCart() {
  cartDrawer.classList.add("open");
  cartDim.classList.add("show");
  cartDrawer.setAttribute("aria-hidden", "false");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartDim.classList.remove("show");
  cartDrawer.setAttribute("aria-hidden", "true");
}

// The nav injects #openCartBtn — we wire it after a tick so the DOM is ready
setTimeout(() => {
  const openCartBtn = document.getElementById("openCartBtn");
  if (openCartBtn) openCartBtn.addEventListener("click", openCart);
}, 0);

closeCartBtn?.addEventListener("click", closeCart);
cartDim?.addEventListener("click", closeCart);

function renderCart() {
  const lang = getLang();
  const cart = getCart();
  cartItems.innerHTML = "";
  if (!cart.length) {
    cartItems.innerHTML = `<div class="state-box">${i18n[lang].cartEmpty || "Votre panier est vide"}</div>`;
  } else {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      const sizeText = item.size
        ? `${escapeHtml(item.color)} · Taille ${escapeHtml(item.size)}`
        : `${escapeHtml(item.color)} · USA ${escapeHtml(item.tailleUSA || "-")} / EUR ${escapeHtml(item.tailleEUR || "-")}`;
      row.innerHTML = `
        <img src="${escapeHtml(item.image)}" alt="" />
        <div>
          <div style="font-weight:700;">${escapeHtml(item.name)}</div>
          <div style="font-size:0.86rem;color:#666;">${sizeText}</div>
          <div style="font-weight:700;">${formatPrice(item.unitPrice * item.qty)}</div>
          <div class="qty-wrap">
            <button class="qty-btn" type="button" data-action="minus" data-id="${escapeHtml(item.cartId)}">-</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" type="button" data-action="plus" data-id="${escapeHtml(item.cartId)}">+</button>
            <button class="remove-btn" type="button" data-action="remove" data-id="${escapeHtml(item.cartId)}">${i18n[lang].remove || "Supprimer"}</button>
          </div>
        </div>
      `;
      cartItems.appendChild(row);
    });
  }
  cartTotal.textContent = formatPrice(cartLineTotal(cart));
  const count = cartCount(cart);
  if (cartCountEl) {
    cartCountEl.textContent = String(count);
    cartCountEl.style.display = count > 0 ? "inline-block" : "none";
  }
  // Also update slide menu cart count
  const smCount = document.getElementById("slideMenuCartCount");
  if (smCount) smCount.textContent = String(count);
}

cartItems?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const cart = getCart();
  const itemIndex = cart.findIndex((x) => x.cartId === id);
  if (itemIndex === -1) return;
  if (action === "plus") cart[itemIndex].qty = Number(cart[itemIndex].qty || 0) + 1;
  if (action === "minus") {
    const currentQty = Number(cart[itemIndex].qty || 0);
    cart[itemIndex].qty = Math.max(1, currentQty - 1);
  }
  if (action === "remove") cart.splice(itemIndex, 1);
  setCart(cart);
  renderCart();
});

checkoutBtn?.addEventListener("click", () => {
  if (!getCart().length) return;
  window.location.href = "checkout.html";
});

// ── Category filter bar (dynamic) ─────────────────────────────────────────────
function buildFilterBar(products) {
  if (!filterBar) return;
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].filter((c) => formatCategoryName(c));
  filterBar.innerHTML = `<button type="button" class="filter-btn active" data-category="all">Tout</button>` +
    cats.map(c => `<button type="button" class="filter-btn" data-category="${escapeHtml(c)}">${escapeHtml(formatCategoryName(c))}</button>`).join("");
  filterBar.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-btn");
    if (!btn) return;
    currentFilter = btn.dataset.category;
    applyFilter();
  });
}

// ── Categories section grid (dynamic) ────────────────────────────────────────
function buildCategoriesGrid(products) {
  if (!categoriesGrid) return;
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].filter((c) => formatCategoryName(c));
  categoriesGrid.innerHTML = cats.map(c =>
    `<a class="category-pill" href="produits.html?category=${encodeURIComponent(c)}">${escapeHtml(formatCategoryName(c))}</a>`
  ).join("");
}

// ── Product rendering ─────────────────────────────────────────────────────────
function getTagMeta(tag = "") {
  if (!tag) return { cardClass: "", text: "" };
  if (tag.match(/-?\s*(\d{1,2})\s*%/)) return { cardClass: "promo", text: tag };
  if (tag.toLowerCase().includes("out of stock") || tag.toLowerCase().includes("rupture")) return { cardClass: "stock", text: tag };
  return { cardClass: "", text: tag };
}

function bagSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" width="16" height="16">
    <path d="M6 7h15l-1.5 9h-12z"/><path d="M6 7 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`;
}

function renderProducts(list) {
  if (!productsContainer) return;
  const lang = getLang();
  const buyLabel = lang === "ar" ? (i18n.ar.buyAr || "شراء") : (i18n.fr.buy || "Acheter");
  productsContainer.innerHTML = "";
  if (!list.length) {
    if (stateBox) { stateBox.style.display = "block"; stateBox.textContent = i18n[lang].noProducts || "Aucun produit trouvé."; }
    return;
  }
  if (stateBox) { stateBox.style.display = "none"; stateBox.textContent = ""; }

  list.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = `product-card ${isOutOfStockGlobally(product) ? "is-out" : ""}`;
    card.style.animationDelay = `${index * 60}ms`;
    const pd = getPriceData(product);
    const tagM = getTagMeta(product.tag);
    const href = `product.html?id=${encodeURIComponent(product.id)}`;
    card.innerHTML = `
      <a class="product-image-wrap" href="${href}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </a>
      <div class="product-info">
        ${product.tag ? `<span class="product-tag ${tagM.cardClass}">${escapeHtml(product.tag)}</span>` : ""}
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-meta">
          <span class="price-wrap">
            <span class="price">${formatPrice(pd.finalPrice)}</span>
            ${pd.oldPrice ? `<span class="old-price">${formatPrice(pd.oldPrice)}</span>` : ""}
          </span>
          ${formatCategoryName(product.category) ? `<span class="badge">${escapeHtml(formatCategoryName(product.category))}</span>` : ""}
        </div>
        <div class="product-actions">
          <a class="mini-btn" href="${href}">${bagSvg()} ${escapeHtml(buyLabel)}</a>
        </div>
      </div>
    `;
    productsContainer.appendChild(card);
  });
}

function getCategoryProducts() {
  return currentFilter === "all" ? allProducts : allProducts.filter((item) => item.category === currentFilter);
}

function setActiveFilterButton(category) {
  if (!filterBar) return;
  filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
}

function applyFilter() {
  if (!productsContainer) return;
  const filtered = getCategoryProducts().filter((item) => {
    const text = `${item.name} ${item.category}`.toLowerCase();
    return text.includes(currentSearch.toLowerCase());
  });
  renderProducts(filtered);
  setActiveFilterButton(currentFilter);
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim();
    applyFilter();
  });
}

if (layoutKebab) {
  layoutKebab.addEventListener("click", () => {
    previewVertical = !previewVertical;
    productsContainer.classList.toggle("vertical", previewVertical);
    layoutKebab.classList.toggle("is-vertical", previewVertical);
    layoutKebab.setAttribute("aria-pressed", previewVertical ? "true" : "false");
  });
}

// ── Load products from Firestore ──────────────────────────────────────────────
function loadProducts() {
  const lang = getLang();
  if (stateBox) { stateBox.style.display = "block"; stateBox.textContent = i18n[lang].loading || "Chargement…"; }
  onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      const fetched = [];
      snapshot.forEach((docSnap) => {
        fetched.push(sanitizeProduct(docSnap.id, docSnap.data()));
      });
      allProducts = fetched;
      buildFilterBar(allProducts);
      buildCategoriesGrid(allProducts);
      if (!allProducts.length) {
        if (stateBox) { stateBox.style.display = "block"; stateBox.textContent = i18n[lang].noFirestore || "Aucun produit."; }
        if (productsContainer) productsContainer.innerHTML = "";
        return;
      }
      if (stateBox) { stateBox.style.display = "none"; stateBox.textContent = ""; }
      applyFilter();
    },
    () => {
      if (stateBox) stateBox.textContent = i18n[getLang()].loadError || "Erreur de chargement.";
    }
  );
}

// ── i18n basics ───────────────────────────────────────────────────────────────
function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "ar" ? "ar" : "fr";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const map = [
    ["sectionShopTitle", "sectionShopTitle", true],
    ["sectionCatTitle", "sectionCatTitle", true],
    ["sectionContactTitle", "sectionContactTitle", true],
    ["cartHeadLabel", "cartTitle"],
    ["cartTotalLabel", "total"],
    ["checkoutBtn", "validatePurchases"],
    ["footerNote", "footer"],
    ["callNowLbl", "callNow"],
  ];
  for (const [id, key, html] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
    const val = (i18n[lang] && i18n[lang][key]) || (i18n.fr && i18n.fr[key]) || "";
    if (html) el.innerHTML = val; else el.textContent = val;
  }
  if (searchInput) searchInput.placeholder = (i18n[lang] && i18n[lang].searchPlaceholder) || "Rechercher un produit…";
  if (filterBar) applyFilter();
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("show"); });
});
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.getElementById("year").textContent = String(new Date().getFullYear());

applyI18n();
renderCart();
loadProducts();

if (sessionStorage.getItem("lux_open_cart")) {
  sessionStorage.removeItem("lux_open_cart");
  setTimeout(() => openCart(), 400);
}
