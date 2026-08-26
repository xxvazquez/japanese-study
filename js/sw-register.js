// Registers the service worker for offline support and PWA installability
// on Android/Chrome. Split out from app.js so the main app logic stays
// untouched by this. iOS Safari ignores service-worker-based install
// prompts but still benefits from the offline caching once a page is
// visited, and "Add to Home Screen" there is driven by the manifest +
// apple-touch-icon/meta tags in index.html instead.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {
      // Offline support is a progressive enhancement -- if registration
      // fails (unsupported browser, blocked, etc.) the site still works.
    });
  });
}
