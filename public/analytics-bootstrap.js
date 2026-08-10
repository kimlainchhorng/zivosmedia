(function () {
  var loaded = false;

  function readCookiePrefs() {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return null;
    try {
      var raw = localStorage.getItem("zivo_cookie_consent");
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function metaContent(name) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    var value = meta && meta.getAttribute("content") ? meta.getAttribute("content").trim() : "";
    return value && value.charAt(0) !== "%" ? value : "";
  }

  function loadConsentPixels() {
    if (loaded) return;
    var prefs = readCookiePrefs();
    if (!prefs) return;
    var analyticsAllowed = prefs.analytics === true;
    var marketingAllowed = prefs.marketing === true;
    if (!analyticsAllowed && !marketingAllowed) return;
    if (
      window.Capacitor
      && window.Capacitor.isNativePlatform
      && window.Capacitor.isNativePlatform()
    ) {
      loaded = true;
      return;
    }
    loaded = true;

    var gaId = metaContent("zivo-google-analytics-id");
    var googleAdsId = metaContent("zivo-google-ads-id");
    var gtagId = analyticsAllowed && gaId ? gaId : marketingAllowed && googleAdsId ? googleAdsId : "";
    if (gtagId) {
      var googleScript = document.createElement("script");
      googleScript.async = true;
      googleScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gtagId);
      document.head.appendChild(googleScript);
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag("js", new Date());
      if (analyticsAllowed && gaId) gtag("config", gaId, { send_page_view: true });
      if (marketingAllowed && googleAdsId) gtag("config", googleAdsId, { send_page_view: false });
    }

    if (!marketingAllowed) return;

    var metaId = metaContent("zivo-meta-pixel");
    if (metaId) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", metaId);
      window.fbq("track", "PageView");
    }

    var tiktokId = metaContent("zivo-tiktok-pixel");
    if (tiktokId) {
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t;
        var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
        ttq.setAndDefer = function (target, method) {
          target[method] = function () {
            target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        for (var i = 0; i < ttq.methods.length; i += 1) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (id) {
          var queue = ttq._i && ttq._i[id] ? ttq._i[id] : [];
          for (var index = 0; index < ttq.methods.length; index += 1) {
            ttq.setAndDefer(queue, ttq.methods[index]);
          }
          return queue;
        };
        ttq.load = function (id, options) {
          var source = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {};
          ttq._i[id] = [];
          ttq._i[id]._u = source;
          ttq._t = ttq._t || {};
          ttq._t[id] = +new Date();
          ttq._o = ttq._o || {};
          ttq._o[id] = options || {};
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.async = true;
          script.src = source + "?sdkid=" + id + "&lib=" + t;
          var first = document.getElementsByTagName("script")[0];
          if (first && first.parentNode) first.parentNode.insertBefore(script, first);
        };
      }(window, document, "ttq");
      window.ttq.load(tiktokId);
      window.ttq.page();
    }

    var xId = metaContent("zivo-x-pixel");
    if (xId) {
      !function (e, t, n, s, u, a) {
        if (e.twq) return;
        s = e.twq = function () {
          s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
        };
        s.version = "1.1";
        s.queue = [];
        u = t.createElement(n);
        u.async = true;
        u.src = "https://static.ads-twitter.com/uwt.js";
        a = t.getElementsByTagName(n)[0];
        a.parentNode.insertBefore(u, a);
      }(window, document, "script");
      window.twq("config", xId);
    }

    var adsClient = metaContent("zivo-adsense-client");
    if (adsClient && adsClient.indexOf("ca-pub-") === 0) {
      var adsScript = document.createElement("script");
      adsScript.async = true;
      adsScript.crossOrigin = "anonymous";
      adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + adsClient;
      document.head.appendChild(adsScript);
    }
  }

  window.__zivoLoadAnalytics = loadConsentPixels;

  var fontLink = document.querySelector("link[data-zivo-font]");
  if (fontLink) {
    window.addEventListener("load", function () { fontLink.media = "all"; }, { once: true });
  }

  function schedule() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadConsentPixels, { timeout: 4000 });
    } else {
      window.setTimeout(loadConsentPixels, 2500);
    }
  }

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}());
