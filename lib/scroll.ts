/** Scroll the document to the top (instant, not smooth). */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
