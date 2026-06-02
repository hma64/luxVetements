import { getCart, setCart } from "./cart.js";
import { formatPrice } from "./product-model.js";
import { escapeHtml } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const ORDER_EMAIL = "mouhamedamineyousfi10@gmail.com";
const SHIPPING_DT = 7;
const CHECKOUT_DEFAULT_EMAIL = ORDER_EMAIL;
const CHECKOUT_DEFAULT_SHIPPING = SHIPPING_DT;
let checkoutSettings = {
  orderEmail: CHECKOUT_DEFAULT_EMAIL,
  shipping: CHECKOUT_DEFAULT_SHIPPING,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GOVERNORATES = [
  { id: 'tunis', fr: 'Tunis', ar: 'تونس' },
  { id: 'bizerte', fr: 'Bizerte', ar: 'بنزرت' },
  { id: 'ariana', fr: 'Ariana', ar: 'أريانة' },
  { id: 'beja', fr: 'Beja', ar: 'باجة' },
  { id: 'benarous', fr: 'Ben Arous', ar: 'بن عروس' },
  { id: 'gabes', fr: 'Gabes', ar: 'قابس' },
  { id: 'gafsa', fr: 'Gafsa', ar: 'قافصة' },
  { id: 'jendouba', fr: 'Jendouba', ar: 'جندوبة' },
  { id: 'kairouan', fr: 'Kairouan', ar: 'القيروان' },
  { id: 'kasserine', fr: 'Kasserine', ar: 'القصرين' },
  { id: 'kebili', fr: 'Kebili', ar: 'قبلي' },
  { id: 'kef', fr: 'Kef', ar: 'الكاف' },
  { id: 'mahdia', fr: 'Mahdia', ar: 'المهدية' },
  { id: 'manouba', fr: 'Mannouba', ar: 'منوبة' },
  { id: 'medenine', fr: 'Medenine', ar: 'مدنين' },
  { id: 'monastir', fr: 'Monastir', ar: 'المنستير' },
  { id: 'nabeul', fr: 'Nabeul', ar: 'نابل' },
  { id: 'sfax', fr: 'Sfax', ar: 'صفاقس' },
  { id: 'sidi_bouzid', fr: 'Sidi Bouzid', ar: 'سيدي بوزيد' },
  { id: 'siliana', fr: 'Siliana', ar: 'سليانة' },
  { id: 'sousse', fr: 'Sousse', ar: 'سوسة' },
  { id: 'tataouine', fr: 'Tataouine', ar: 'تطاوين' },
  { id: 'tozeur', fr: 'Tozeur', ar: 'توزر' },
  { id: 'zaghouan', fr: 'Zaghouan', ar: 'زغوان' }
];

const govSelect = document.getElementById("governorateSelect");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutError = document.getElementById("checkoutError");
const checkoutStatus = document.getElementById("checkoutStatus");
const cartReview = document.getElementById("cartReview");
const subtotalEl = document.getElementById("subtotalEl");
const shippingEl = document.getElementById("shippingEl");
const grandTotalEl = document.getElementById("grandTotalEl");
const confirmBtn = document.getElementById("confirmBtn");
const langToggleBtn = document.getElementById("langToggleBtn");
const langMenu = document.getElementById("langMenu");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

function buildOrderEmailBody(lang, {
  firstName,
  lastName,
  phone,
  address,
  addressExtra,
  governorate,
  items,
  subtotal,
  shipping,
  total,
  orderedAt
}) {
  const L = i18n[lang] || i18n.fr;
  const lines = items.map((item, i) => {
    const sizeDesc = item.size ? `${item.size}` : `${item.tailleUSA || '-'} / ${item.tailleEUR || '-'}`;
    return `${i + 1}. ${item.name}\n${L.colorLabel || 'Couleur'}: ${item.color} | ${L.sizeLabel || 'Taille'}: ${sizeDesc}\nQté: ${item.qty} × ${item.unitPrice} DT = ${item.unitPrice * item.qty} DT`;
  });

  const images = items.map((item, i) => `${i + 1}. ${item.name} — ${item.image}`).join("\n");

  if (lang === 'ar') {
    return `طلب شراء — LUX ملابس\n────────────────────────────\nتاريخ الطلب: ${orderedAt}\n\nالعميل\nالاسم واللقب: ${firstName} ${lastName}\nالهاتف: ${phone}\n\nالتوصيل\nالعنوان: ${address}\nتفاصيل إضافية: ${addressExtra || '—'}\nالولاية: ${governorate}\n\nتفاصيل المنتجات\n${lines.join("\n\n")}\n\nروابط صور المنتجات\n${images}\n\nالمبلغ\nمجموع المنتجات: ${subtotal} DT\nالتوصيل: ${shipping} DT\nالإجمالي: ${total} DT\n\n—\nتم إنشاء هذا الإشعار من موقع LUX ملابس.`;
  }

  return `BON DE COMMANDE — LUX VÉTEMENTS\n────────────────────────────\nDate de la commande : ${orderedAt}\n\nCLIENT\nPrénom / Nom : ${firstName} ${lastName}\nTéléphone : ${phone}\n\nLIVRAISON\nAdresse : ${address}\nComplément : ${addressExtra || '—'}\nGouvernorat : ${governorate}\n\nDÉTAIL DES ARTICLES\n${lines.join("\n\n")}\n\nLIENS VERS LES IMAGES DES PRODUITS\n${images}\n\nMONTANTS\nPrix total articles : ${subtotal} DT\nLivraison : ${shipping} DT\nTOTAL À PAYER : ${total} DT\n\n—\nMessage généré depuis le site LUX vêtements.`;
}


function applyI18n() {
  const lang = 'ar';
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  const map = [
    ["navHome", "navHome"],
    ["navShop", "navShop"],
    ["navCategories", "navCategories"],
    ["navContact", "navContact"],
    ["btnAllProducts", "navAllProducts"],
    ["pageTitle", "checkoutTitle"],
    ["pageSub", "checkoutSub"],
    ["labelFirst", "firstName"],
    ["labelLast", "lastName"],
    ["labelPhone", "phone"],
    ["labelAddress", "address"],
    ["labelExtra", "addressExtra"],
    ["labelGov", "governorate"],
    ["lblSubtotal", "subtotal"],
    ["lblShip", "shipping"],
    ["lblGrand", "grandTotal"],
    ["confirmBtn", "confirmOrder"],
    ["recapTitle", "recapTitle"]
  ];
  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = i18n[lang][key];
  });
  const first = govSelect.querySelector("option[value='']");
  if (first) first.textContent = i18n[lang].selectGov;

  if (langToggleBtn) {
    langToggleBtn.style.display = 'none';
  }
  if (langMenu) {
    langMenu.style.display = 'none';
  }
  document.querySelectorAll('.nav-lang-opt').forEach((b) => {
    b.style.display = 'none';
  });
  if (document.getElementById("cartLabelText")) {
    document.getElementById("cartLabelText").textContent = i18n[lang].cartLabel;
  }

  // populate governorate options for current language
  populateGovernorates(lang);

  loadCheckoutSettings().then(renderReview);
}

function populateGovernorates(lang) {
  if (!govSelect) return;
  govSelect.innerHTML = '<option value="">' + (i18n[lang].selectGov || 'Choisir…') + '</option>' + GOVERNORATES.map(g => `\n    <option value="${g.id}">${lang === 'ar' ? g.ar : g.fr}</option>`).join('');
}

async function loadCheckoutSettings() {
  try {
    const settingsDoc = doc(db, 'settings', 'site');
    const snap = await getDoc(settingsDoc);
    if (snap.exists()) {
      const data = snap.data();
      checkoutSettings.orderEmail = data.orderEmail || CHECKOUT_DEFAULT_EMAIL;
      checkoutSettings.shipping = Number(data.deliveryFee ?? CHECKOUT_DEFAULT_SHIPPING);
    } else {
      checkoutSettings.orderEmail = CHECKOUT_DEFAULT_EMAIL;
      checkoutSettings.shipping = CHECKOUT_DEFAULT_SHIPPING;
    }
    if (shippingEl) shippingEl.textContent = formatPrice(checkoutSettings.shipping);
  } catch (err) {
    console.error('loadCheckoutSettings', err);
    checkoutSettings.orderEmail = CHECKOUT_DEFAULT_EMAIL;
    checkoutSettings.shipping = CHECKOUT_DEFAULT_SHIPPING;
    if (shippingEl) shippingEl.textContent = formatPrice(checkoutSettings.shipping);
  }
}

async function saveOrderToFirestore(orderData) {
  try {
    console.log('💾 Saving order to Firestore...', orderData);
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    console.log('✅ Order saved successfully. Doc ID:', docRef.id);
    return true;
  } catch (err) {
    console.error('❌ saveOrderToFirestore failed:', err.message, err.code);
    return false;
  }
}

function renderReview() {
  const lang = 'ar';
  const cart = getCart();
  cartReview.innerHTML = "";

  if (!cart.length) {
    cartReview.innerHTML = `<div class="state-box">${i18n[lang].checkoutEmpty}</div>`;
    checkoutForm.style.display = "none";
    return;
  }
  checkoutForm.style.display = "";

  const subtotal = cart.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty || 1), 0);
  const ship = checkoutSettings.shipping;
  const total = subtotal + ship;

  subtotalEl.textContent = formatPrice(subtotal);
  shippingEl.textContent = formatPrice(ship);
  grandTotalEl.textContent = formatPrice(total);

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-mini-row";
    const sizeText = item.size
      ? `${escapeHtml(item.color)} · ${i18n[lang].sizeLabel} ${escapeHtml(item.size)}`
      : `${escapeHtml(item.color)} · ${i18n[lang].sizeUsa} ${escapeHtml(item.tailleUSA || "-")} / ${i18n[lang].sizeEur} ${escapeHtml(item.tailleEUR || "-")}`;
    row.innerHTML = `
      <img src="${escapeHtml(item.image)}" alt="" />
      <div>
        <div style="font-weight:800;">${escapeHtml(item.name)}</div>
        <div style="color:#666;font-size:0.88rem;">${sizeText}</div>
        <div>${i18n[lang].total}: ${formatPrice(item.unitPrice * item.qty)} × ${item.qty}</div>
      </div>
    `;
    cartReview.appendChild(row);
  });
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const lang = 'ar';
  console.log('📋 Checkout form submitted');
  checkoutError.textContent = "";
  checkoutStatus.textContent = "";

  const cart = getCart();
  console.log('📋 Cart contents:', cart);
  if (!cart.length) {
    checkoutError.textContent = i18n[lang].checkoutEmpty;
    return;
  }

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const addressExtra = document.getElementById("addressExtra").value.trim();
  const governorate = govSelect.value;
  // if governorate is an id, translate to display string for email
  const governorateDisplay = (GOVERNORATES.find(g => g.id === governorate) || {})[lang] || governorate || '';

  if (!firstName || !lastName || !phone || !address || !governorate) {
    checkoutError.textContent = i18n[lang].fieldError;
    return;
  }

  const phoneRegex = /^[2579]\d{7}$/;
  if (!phoneRegex.test(phone)) {
    checkoutError.textContent = i18n[lang].phoneError;
    return;
  }

  const subtotal = cart.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty || 1), 0);
  const ship = checkoutSettings.shipping;
  const total = subtotal + ship;
  const orderedAt = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short"
  });

  const items = cart.map((item) => ({
    name: item.name,
    color: item.color,
    size: item.size,
    tailleUSA: item.tailleUSA,
    tailleEUR: item.tailleEUR,
    qty: item.qty,
    unitPrice: item.unitPrice,
    image: item.image
  }));

  const body = buildOrderEmailBody(lang, {
    firstName,
    lastName,
    phone,
    address,
    addressExtra,
    governorate: governorateDisplay || governorate,
    items,
    subtotal,
    shipping: ship,
    total,
    orderedAt
  });

  const subject = `Bon de commande LUX — ${firstName} ${lastName} — ${orderedAt}`;
  const orderData = {
    firstName,
    lastName,
    phone,
    address,
    addressExtra,
    governorate: governorateDisplay || governorate,
    items,
    subtotal,
    shipping: ship,
    total,
    status: 'nouvelle',
    new: true,
    createdAt: serverTimestamp()
  };

  confirmBtn.disabled = true;
  checkoutStatus.textContent = i18n[lang].sending;

  try {
    console.log('📋 About to save order to Firestore:', orderData);
    const saved = await saveOrderToFirestore(orderData);
    console.log('📋 Firestore save result:', saved);

    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(checkoutSettings.orderEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        _subject: subject,
        _template: "table",
        _captcha: "false",
        name: `${firstName} ${lastName}`,
        email: checkoutSettings.orderEmail.replace("@", "+luxorders@"),
        phone,
        governorate,
        address,
        addressExtra,
        message: body
      })
    });

    const data = await res.json().catch(() => ({}));
    const ok = res.ok && (data.success === true || data.success === "true" || data.success === "OK");

    if (!ok || data.error) {
      if (saved) {
        checkoutStatus.textContent = i18n[lang].savedButMailFailed;
        setCart([]);
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2200);
        return;
      }
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    checkoutStatus.textContent = i18n[lang].sentOk;
    setCart([]);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1800);
  } catch (err) {
    console.error(err);
    if (err.message === 'Firestore save failed') {
      checkoutError.textContent = i18n[lang].sendError;
    } else {
      checkoutError.textContent = i18n[lang].sendError;
    }
    checkoutStatus.textContent = "";
    confirmBtn.disabled = false;
  }
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
