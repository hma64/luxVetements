import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  sanitizeProduct,
  getPriceData,
  isOutOfStockGlobally,
  formatPrice
} from "./product-model.js";
import { resolveColor } from "./colors.js";
import { getCart, setCart } from "./cart.js";
import { escapeHtml, formatCategoryName } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentProduct = null;
let selectedColor = "";
let selectedUsa = "";
let selectedEur = "";
let selectedSize = "";
let currentSizeMode = "eur";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const detailMainImage = document.getElementById("detailMainImage");
const detailGallery = document.getElementById("detailGallery");
const detailName = document.getElementById("detailName");
const detailPrice = document.getElementById("detailPrice");
const detailCategory = document.getElementById("detailCategory");
const detailTagText = document.getElementById("detailTagText");
const detailDescription = document.getElementById("detailDescription");
const colorOptions = document.getElementById("colorOptions");
const sizeOptions = document.getElementById("sizeOptions");
const sizeOptionsUsa = document.getElementById("sizeOptionsUsa");
const sizeOptionsEur = document.getElementById("sizeOptionsEur");
const sizeSwitcher = document.getElementById("sizeSwitcher");
const sizeBtnEur = document.getElementById("sizeBtnEur");
const sizeBtnUsa = document.getElementById("sizeBtnUsa");
const selectionError = document.getElementById("selectionError");
const stockMsg = document.getElementById("stockMsg");
const addToCartBtn = document.getElementById("addToCartBtn");
const langToggleBtn = document.getElementById("langToggleBtn");
const langMenu = document.getElementById("langMenu");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "ar" ? "ar" : "fr";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  const keys = [
    ["navHome", "navHome"],
    ["navShop", "navShop"],
    ["navCategories", "navCategories"],
    ["navContact", "navContact"],
    ["btnAllProducts", "navAllProducts"],
    ["labelColor", "colorLabel"],
    ["labelSizeGeneric", "sizeLabel"],
    ["labelSizeUsa", "sizeUsa"],
    ["labelSizeEur", "sizeEur"],
    ["addToCartBtn", "addToCart"],
    ["backLink", "backShop"]
  ];
  keys.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = i18n[lang][key];
  });

  langToggleBtn.innerHTML =
    lang === "ar"
      ? `<span dir="rtl" style="font-weight:800;">العربية</span>`
      : `<span style="font-weight:800;">Français</span>`;

  document.getElementById("langOptionFr").textContent = i18n.fr.langFr;
  document.getElementById("langOptionAr").textContent = i18n.ar.langAr;

  document.getElementById("cartLabelText").textContent = i18n[lang].cartLabel;
  if (sizeBtnUsa) sizeBtnUsa.textContent = i18n[lang].sizeSwitchUsa;
  if (sizeBtnEur) sizeBtnEur.textContent = i18n[lang].sizeSwitchEur;
  document.querySelectorAll(".nav-lang-opt").forEach((b) => b.classList.toggle("active-lang", b.dataset.lang === lang));

  if (currentProduct) {
    addToCartBtn.textContent = isOutOfStockGlobally(currentProduct)
      ? i18n[lang].productOos
      : i18n[lang].addToCart;
    updateStockMessage();
  }
}

function isUsaOos(size) {
  if (!currentProduct || !size) return false;
  return currentProduct.ruptureUSA.has(size);
}

function isEurOos(size) {
  if (!currentProduct || !size) return false;
  return currentProduct.ruptureEUR.has(size);
}

function updateStockMessage() {
  const lang = getLang();
  stockMsg.textContent = "";
  if (!currentProduct) return;
  const parts = [];
  if (selectedUsa && isUsaOos(selectedUsa)) {
    parts.push(`${i18n[lang].sizeUsa}: ${i18n[lang].outOfStock}`);
  }
  if (selectedEur && isEurOos(selectedEur)) {
    parts.push(`${i18n[lang].sizeEur}: ${i18n[lang].outOfStock}`);
  }
  stockMsg.textContent = parts.join(" · ");
}

function setSizeMode(mode) {
  currentSizeMode = mode;
  const usaEl = document.getElementById("usaGroup");
  const eurEl = document.getElementById("eurGroup");
  if (usaEl) usaEl.style.display = mode === "usa" ? "" : "none";
  if (eurEl) eurEl.style.display = mode === "eur" ? "" : "none";
  if (sizeBtnUsa) sizeBtnUsa.className = mode === "usa" ? "btn btn-primary" : "btn btn-outline";
  if (sizeBtnEur) sizeBtnEur.className = mode === "eur" ? "btn btn-primary" : "btn btn-outline";

  if (mode === "usa") {
    selectedEur = "";
    sizeOptionsEur?.querySelectorAll("button").forEach((btn) => btn.classList.remove("selected"));
    const firstUsa = sizeOptionsUsa?.querySelector("button");
    if (firstUsa) {
      firstUsa.classList.add("selected");
      selectedUsa = firstUsa.textContent || "";
    }
  }

  if (mode === "eur") {
    selectedUsa = "";
    sizeOptionsUsa?.querySelectorAll("button").forEach((btn) => btn.classList.remove("selected"));
    const firstEur = sizeOptionsEur?.querySelector("button");
    if (firstEur) {
      firstEur.classList.add("selected");
      selectedEur = firstEur.textContent || "";
    }
  }
  updateStockMessage();
}

function renderOptionButtons(container, values, type) {
  container.innerHTML = "";
  values.forEach((value) => {
    const btn = document.createElement("button");
    const isColor = type === "color";
    if (isColor) {
      btn.className = "option-btn color-label";
      btn.textContent = value;
      btn.title = value;
      btn.setAttribute("aria-label", value);
    } else {
      btn.className = "option-btn";
      btn.textContent = value;
    }
    btn.type = "button";
    btn.addEventListener("click", () => {
      const alreadySelected = btn.classList.contains("selected");
      if (alreadySelected) {
        btn.classList.remove("selected");
        if (type === "color") selectedColor = "";
        if (type === "usa") selectedUsa = "";
        if (type === "eur") selectedEur = "";
        if (type === "size") selectedSize = "";
        updateStockMessage();
        return;
      }
      container.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (type === "color") selectedColor = value;
      if (type === "usa") selectedUsa = value;
      if (type === "eur") selectedEur = value;
      if (type === "size") selectedSize = value;
      selectionError.textContent = "";
      updateStockMessage();
    });
    container.appendChild(btn);
  });
}

if (sizeBtnUsa) sizeBtnUsa.addEventListener("click", () => setSizeMode("usa"));
if (sizeBtnEur) sizeBtnEur.addEventListener("click", () => setSizeMode("eur"));

function renderGallery(images) {
  detailGallery.innerHTML = "";
  images.forEach((imgUrl, index) => {
    const thumb = document.createElement("button");
    thumb.className = `thumb ${index === 0 ? "active" : ""}`;
    thumb.type = "button";
    thumb.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="" />`;
    thumb.addEventListener("click", () => {
      detailMainImage.src = imgUrl;
      detailGallery.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
    detailGallery.appendChild(thumb);
  });
}

function openProductDetails(product) {
  const lang = getLang();
  const L = i18n[lang];
  document.getElementById("labelColor").textContent = L.colorLabel;
  document.getElementById("labelSizeUsa").textContent = L.sizeUsa;
  document.getElementById("labelSizeEur").textContent = L.sizeEur;
  currentProduct = product;
  selectedColor = "";
  selectedUsa = "";
  selectedEur = "";
  selectedSize = "";
  selectionError.textContent = "";
  stockMsg.textContent = "";

  detailName.textContent = product.name;
  const priceData = getPriceData(product);
  detailPrice.innerHTML = `${formatPrice(priceData.finalPrice)}${
    priceData.oldPrice ? ` <span class="old-price">${formatPrice(priceData.oldPrice)}</span>` : ""
  }`;
  detailCategory.textContent = formatCategoryName(product.category);
  detailTagText.textContent = product.tag || "";
  detailDescription.textContent = product.description;
  detailMainImage.src = product.image;
  detailMainImage.alt = product.name;

  const oos = isOutOfStockGlobally(product);
  addToCartBtn.disabled = oos || false;
  addToCartBtn.textContent = oos ? i18n[lang].productOos : i18n[lang].addToCart;

  renderGallery(product.images);
  renderOptionButtons(colorOptions, product.colors, "color");
  const colorGroup = document.getElementById("colorOptions")?.closest('.option-group');
  if (colorGroup) {
    colorGroup.style.display = product.colors.length ? "" : "none";
  }

  const sizeEl = document.getElementById("sizeGroup");
  const switcherEl = document.getElementById("sizeSwitcher");
  const usaEl = document.getElementById("usaGroup");
  const eurEl = document.getElementById("eurGroup");

  const canSwitchUsaEur = !product.sizes.length && product.tailleUSA.length && product.tailleEUR.length;
  if (sizeEl) sizeEl.style.display = product.sizes.length ? "" : "none";
  if (switcherEl) switcherEl.style.display = canSwitchUsaEur ? "flex" : "none";

  renderOptionButtons(sizeOptions, product.sizes, "size");
  renderOptionButtons(sizeOptionsUsa, product.tailleUSA, "usa");
  renderOptionButtons(sizeOptionsEur, product.tailleEUR, "eur");

  if (canSwitchUsaEur) {
    setSizeMode("eur");
  } else {
    if (usaEl) usaEl.style.display = product.tailleUSA.length ? "" : "none";
    if (eurEl) eurEl.style.display = product.tailleEUR.length ? "" : "none";
  }
}

async function loadOneProduct() {
  const lang = getLang();
  if (!productId) {
    document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].productNotFound }));
    return;
  }
  try {
    const ref = doc(db, "products", productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].productNotFound }));
      return;
    }
    const product = sanitizeProduct(snap.id, snap.data());
    openProductDetails(product);
  } catch (e) {
    console.error(e);
    document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].loadError }));
  }
}

function addProductToCart(product, color, tailleUSA, tailleEUR, size) {
  const priceData = getPriceData(product);
  const cart = getCart();
  const line = {
    cartId: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    name: product.name,
    image: product.image,
    color: color || "-",
    unitPrice: priceData.finalPrice,
    qty: 1
  };

  if (size) {
    line.size = size;
  } else {
    line.tailleUSA = tailleUSA || "-";
    line.tailleEUR = tailleEUR || "-";
  }

  cart.push(line);
  setCart(cart);
}

addToCartBtn.addEventListener("click", () => {
  const lang = getLang();
  if (!currentProduct) return;

  const needSize = currentProduct.sizes.length > 0;
  const hasUsaEurSwitch = !currentProduct.sizes.length && currentProduct.tailleUSA.length && currentProduct.tailleEUR.length;
  const needUsa = currentProduct.tailleUSA.length > 0 && (!currentProduct.tailleEUR.length || currentSizeMode === "usa" || !hasUsaEurSwitch);
  const needEur = currentProduct.tailleEUR.length > 0 && (!currentProduct.tailleUSA.length || currentSizeMode === "eur" || !hasUsaEurSwitch);

  const needColor = currentProduct.colors && currentProduct.colors.length > 0;
  if (
    (needColor && !selectedColor) ||
    (needUsa && !selectedUsa) ||
    (needEur && !selectedEur) ||
    (needSize && !selectedSize)
  ) {
    selectionError.textContent = i18n[lang].needSelections;
    return;
  }
  if (isOutOfStockGlobally(currentProduct)) {
    selectionError.textContent = i18n[lang].productOos;
    return;
  }
  if (selectedUsa && isUsaOos(selectedUsa)) {
    selectionError.textContent = i18n[lang].outOfStock;
    return;
  }
  if (selectedEur && isEurOos(selectedEur)) {
    selectionError.textContent = i18n[lang].outOfStock;
    return;
  }

  addProductToCart(currentProduct, selectedColor, selectedUsa, selectedEur, selectedSize);
  selectionError.textContent = "";
  sessionStorage.setItem("lux_open_cart", "1");
  window.location.href = "produits.html";
});

langToggleBtn?.addEventListener("click", () => langMenu?.classList.toggle("open"));
langMenu?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-lang]");
  if (!btn) return;
  setLang(btn.dataset.lang);
  langMenu?.classList.remove("open");
  applyI18n();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".lang-dropdown")) langMenu?.classList.remove("open");
});

// Mobile nav lang buttons
document.querySelectorAll(".nav-lang-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
    applyI18n();
  });
});

menuBtn?.addEventListener("click", () => {
  menuBtn.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

document.getElementById("year").textContent = String(new Date().getFullYear());

applyI18n();
loadOneProduct();
