const CATEGORY_DISPLAY_LABELS = {
  accessories: "",
  Accessoires: ""
};

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatCategoryName(category) {
  if (category === undefined || category === null) return "";
  const key = String(category).trim();
  return CATEGORY_DISPLAY_LABELS[key.toLowerCase()] || key;
}
