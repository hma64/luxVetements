// Secret admin trigger: click the footer logo 5 times within 3s to open admin.html
const TRIGGER_SELECTOR = ".footer-logo";
const CLICKS_REQUIRED = 5;
const WINDOW_MS = 3000;

function initAdminTrigger() {
  const el = document.querySelector(TRIGGER_SELECTOR);
  if (!el) return;
  let clicks = 0;
  let timer = null;
  el.addEventListener("click", (e) => {
    clicks += 1;
    if (!timer) {
      timer = setTimeout(() => {
        clicks = 0;
        timer = null;
      }, WINDOW_MS);
    }
    if (clicks >= CLICKS_REQUIRED) {
      // navigate to admin page (password still required on that page)
      window.location.href = "admin.html";
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminTrigger);
} else {
  initAdminTrigger();
}
