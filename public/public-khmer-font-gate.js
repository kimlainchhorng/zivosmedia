// CSP-safe first-paint gate for prerendered Khmer public pages.
// Holds body visibility until Noto Sans Khmer is ready (or 2s) so
// font-display:swap cannot land a late layout shift on /?lang=km.
// Loaded as a same-origin classic script (script-src 'self'); never inline.
(function () {
  var root = document.documentElement;
  var done = false;
  function reveal() {
    if (done) return;
    done = true;
    root.classList.remove("zivo-km-font-pending");
  }
  root.classList.add("zivo-km-font-pending");
  var sample = "ភាសាខ្មែរ";
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 16px "Noto Sans Khmer"', sample),
      document.fonts.load('700 16px "Noto Sans Khmer"', sample),
    ]).then(reveal, reveal);
  } else {
    reveal();
  }
  setTimeout(reveal, 2000);
})();
