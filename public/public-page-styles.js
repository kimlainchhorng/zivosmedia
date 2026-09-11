// Public HTML includes the styles needed to read and navigate the page. Load
// the app stylesheet for interactive dialogs, or immediately on guide routes.
(function () {
  var pending;
  window.__zivoLoadPublicStyles = function () {
    if (pending) return pending;
    pending = Promise.all(Array.from(document.querySelectorAll('link[data-zivo-deferred-style]')).map(function (link) {
      return new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () { reject(new Error('Loading CSS chunk failed')); }, 10000);
        function enable() { clearTimeout(timeout); link.media = 'all'; resolve(); }
        if (link.sheet) { enable(); return; }
        link.addEventListener('load', enable, { once: true });
        link.addEventListener('error', function () { clearTimeout(timeout); reject(new Error('Loading CSS chunk failed')); }, { once: true });
        if (link.dataset.href) { link.href = link.dataset.href; delete link.dataset.href; }
      });
    })).catch(function (error) { pending = undefined; throw error; });
    return pending;
  };
  if (location.pathname !== '/') void window.__zivoLoadPublicStyles().catch(function () { /* Keep the readable guide. */ });
}());
