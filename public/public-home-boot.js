// Public links and content work without JavaScript. Let that HTML paint before
// enhancing it with session recovery and client-side controls.
(function () {
  var entry = document.currentScript && document.currentScript.dataset.zivoEntry;
  if (!entry || !/^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(entry)) return;
  var started = false;
  function boot() {
    if (started) return;
    started = true;
    clearTimeout(fallback);
    import(entry).catch(function () {
      var km = document.documentElement.lang === 'km';
      var notice = document.createElement('p');
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'padding:16px;background:#fff7ed;color:#7c2d12;text-align:center';
      notice.textContent = km ? 'មុខងារអន្តរកម្មមិនអាចផ្ទុកបាន។ អ្នកអាចប្រើតំណភ្ជាប់ ឬផ្ទុកទំព័រឡើងវិញ។' : 'Interactive features could not load. You can use the page links or reload to try again.';
      document.body.prepend(notice);
    });
  }
  var fallback = setTimeout(boot, 1000);
  requestAnimationFrame(function () { requestAnimationFrame(boot); });
}());
