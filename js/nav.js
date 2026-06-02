/**
 * nav.js — Shared navigation: slide menu, category nav bar (Firestore), hero slider
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { escapeHtml, formatCategoryName } from "./utils.js";

// ── Firebase init (re-use existing app if already initialised) ────────────────
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Inject top-bar + navbar-main + category-nav HTML before <main> ────────────
export function injectNav({ page = "home", cartCountEl } = {}) {

  const body = document.body;
  const main = document.querySelector("main") || document.querySelector("#catalog") || document.querySelector("#home");

  // Hide old navbar
  const oldNav = document.querySelector("header.navbar");
  if (oldNav) oldNav.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.id = "site-nav-wrapper";
  wrapper.innerHTML = `
    <!-- TOP BAR -->
    <div class="top-bar">
      <div class="container">
        <div class="top-bar-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13.94a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 3h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 21 18z"/></svg>
          51422127
        </div>
        <div class="top-bar-right">
          <a href="#" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="#" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.555 4.112 1.523 5.84L0 24l6.335-1.502A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.373l-.36-.213-3.724.883.927-3.613-.234-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.59a8.16 8.16 0 0 0 4.77 1.53V7.68a4.85 4.85 0 0 1-1-.99z"/></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- MAIN NAVBAR -->
    <header class="navbar-main">
      <div class="container nav-wrap">
        <button class="menu-btn" id="menuBtn" type="button" aria-label="Menu"><span></span></button>
        <a class="logo" href="index.html">
          <img src="logo-lux.png" width="48" height="48" alt="MZ Logo" />
        </a>
        <div class="nav-search-wrap">
          <input class="nav-search-input" type="search" placeholder="Rechercher un produit" />
          <span class="nav-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
        </div>
        <div class="nav-actions">
          <button class="nav-icon-btn" id="openCartBtn" type="button" title="Panier">
            <span class="cart-badge" style="position:relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span class="badge-count" id="cartCount" style="display:none">0</span>
            </span>
            Panier
          </button>
        </div>
      </div>
    </header>

    <!-- CATEGORY NAV BAR (dynamic from Firestore) -->
    <nav class="category-nav" id="categoryNav" aria-label="Catégories">
      <div class="container">
        <span class="category-nav-loading">Chargement…</span>
      </div>
    </nav>

    <!-- SLIDE MENU OVERLAY -->
    <div class="hamburger-overlay" id="hamburgerOverlay"></div>
    <aside class="slide-menu" id="slideMenu" aria-label="Menu de navigation">
      <div class="slide-menu-head">
        <a class="logo" href="index.html">
          <img src="logo-lux.png" width="38" height="38" alt="MZ" />
        </a>
        <button class="slide-menu-close" id="slideMenuClose" aria-label="Fermer le menu">✕</button>
      </div>
      <ul class="slide-menu-links" id="slideMenuLinks">
        <li><a href="index.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Accueil
        </a></li>
        <li><a href="produits.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Tous les produits
        </a></li>
        <hr class="slide-menu-divider" />
        <div class="slide-menu-category-title">Catégories</div>
        <div id="slideMenuCategories">
          <li><a href="produits.html">Chargement…</a></li>
        </div>
        <hr class="slide-menu-divider" />
        <li><a href="index.html#contact">Contact</a></li>
        <hr class="slide-menu-divider" />
        <li>
          <button type="button" class="slide-menu-cart-btn" id="slideMenuCartBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Panier (<span id="slideMenuCartCount">0</span>)
          </button>
        </li>
      </ul>
    </aside>
  `;

  // Insert before main
  if (main) {
    body.insertBefore(wrapper, main);
  } else {
    body.prepend(wrapper);
  }

  // ── Slide menu toggle ─────────────────────────────────────────────────────
  const menuBtn      = document.getElementById("menuBtn");
  const slideMenu    = document.getElementById("slideMenu");
  const overlay      = document.getElementById("hamburgerOverlay");
  const closeBtn     = document.getElementById("slideMenuClose");

  function openMenu() {
    slideMenu.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    slideMenu.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);

  // Slide menu cart button — open cart drawer
  const slideMenuCartBtn = document.getElementById("slideMenuCartBtn");
  if (slideMenuCartBtn) {
    slideMenuCartBtn.addEventListener("click", () => {
      closeMenu();
      // Trigger the main cart open
      const cartBtn = document.getElementById("openCartBtn");
      if (cartBtn) cartBtn.click();
    });
  }

  // ── Cart button wiring ────────────────────────────────────────────────────
  // The cart drawer open/close is handled by each page's own script.
  // We just expose the button with id="openCartBtn" — page scripts pick it up.

  // ── Load categories from Firestore ────────────────────────────────────────
  loadCategories(page);
}

async function loadCategories(currentPage) {
  const catNav    = document.getElementById("categoryNav");
  const catContainer = catNav?.querySelector(".container");
  const slideMenuCats = document.getElementById("slideMenuCategories");

  try {
    const catSnap = await getDocs(collection(db, "categories"));
    if (!catSnap.empty) {
      const cats = catSnap.docs.map(d => ({ name: d.data().name || d.id, slug: d.data().slug || d.id }));
      if (cats.length) {
        renderCategories(cats);
        return;
      }
    }

    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) {
      const catSet = new Set();
      snap.docs.forEach(d => {
        const cat = d.data().category;
        if (cat) catSet.add(cat);
      });
      const cats = Array.from(catSet).map(c => ({ name: c, slug: c })).filter(c => formatCategoryName(c.name));
      if (cats.length) {
        renderCategories(cats);
        return;
      }
    }

    // No data at all — hide nav bar gracefully
    if (catContainer) catContainer.innerHTML = "";
    if (slideMenuCats) slideMenuCats.innerHTML = "";
  } catch (e) {
    console.warn("Categories fetch failed:", e);
    if (catContainer) catContainer.innerHTML = "";
    if (slideMenuCats) slideMenuCats.innerHTML = "";
  }

  function renderCategories(cats) {
    if (catContainer) {
      catContainer.innerHTML = cats.map(c =>
        `<a href="produits.html?category=${encodeURIComponent(c.slug || c.name)}">${escapeHtml(formatCategoryName(c.name))}</a>`
      ).join("");
    }
    if (slideMenuCats) {
      slideMenuCats.innerHTML = cats.map(c =>
        `<li><a href="produits.html?category=${encodeURIComponent(c.slug || c.name)}">${escapeHtml(formatCategoryName(c.name))}</a></li>`
      ).join("");
    }
  }
}

// ── Hero Slider ───────────────────────────────────────────────────────────────
export function initHeroSlider(containerId = "heroSlider") {
  const slider = document.getElementById(containerId);
  if (!slider) return;

  const slides = slider.querySelector(".hero-slides");
  const dots = slider.querySelectorAll(".hero-dot");
  const prevBtn = slider.querySelector(".hero-prev");
  const nextBtn = slider.querySelector(".hero-next");
  const realSlides = Array.from(slider.querySelectorAll(".hero-slide"));
  const total = realSlides.length;
  if (total < 2) return;

  const transitionStyle = "transform 0.7s cubic-bezier(0.77, 0, 0.18, 1)";
  let current = 1;
  let autoTimer = null;
  let isWrapping = false;
  let isTransitioning = false;

  const lastClone = realSlides[total - 1].cloneNode(true);
  const firstClone = realSlides[0].cloneNode(true);
  slides.insertBefore(lastClone, slides.firstChild);
  slides.appendChild(firstClone);

  function getVisibleIndex() {
    return current - 1;
  }

  function updateDots() {
    const activeIndex = (getVisibleIndex() + total) % total;
    dots.forEach((d, i) => d.classList.toggle("active", i === activeIndex));
  }

  function setTransform(index, withTransition = true) {
    slides.style.transition = withTransition ? transitionStyle : "none";
    slides.style.transform = `translateX(-${index * 100}%)`;
    if (withTransition) {
      isTransitioning = true;
    }
  }

  function goTo(index) {
    if (isTransitioning) return;
    if (index === 0) {
      isWrapping = true;
      current = 0;
      setTransform(current, true);
      updateDots();
      return;
    }
    if (index === total + 1) {
      isWrapping = true;
      current = total + 1;
      setTransform(current, true);
      updateDots();
      return;
    }
    current = index;
    setTransform(current, true);
    updateDots();
  }

  slides.addEventListener("transitionend", () => {
    isTransitioning = false;
    if (!isWrapping) return;
    isWrapping = false;
    if (current === 0) {
      current = total;
      setTransform(current, false);
    }
    if (current === total + 1) {
      current = 1;
      setTransform(current, false);
    }
    updateDots();
  });

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(next, 4500);
  }
  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
  }

  prevBtn?.addEventListener("click", () => { prev(); startAuto(); });
  nextBtn?.addEventListener("click", () => { next(); startAuto(); });
  dots.forEach((d, i) => d.addEventListener("click", () => { goTo(i + 1); startAuto(); }));

  // Touch / swipe
  let touchX = null;
  slides.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  slides.addEventListener("touchend", e => {
    if (touchX === null) return;
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchX = null;
    startAuto();
  }, { passive: true });

  setTransform(current, false);
  updateDots();
  startAuto();
}
