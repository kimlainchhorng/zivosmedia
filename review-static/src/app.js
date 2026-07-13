/* Review build renderer. Vanilla JS, no network, no imports, no mutations.
 * Every interactive control is rendered disabled. Unknown routes show a safe 404. */
(function () {
  "use strict";
  var F = window.__FIXTURES__ || {};
  var R = window.__REVIEW__ || {};
  var U = F.users || {};

  // ── Build metadata (full 40-char SHA + timestamp), injected at build time ──
  var sha = String(R.sha || "unknown");
  document.getElementById("rv-sha").textContent = sha; // full 40 chars
  document.getElementById("rv-built").textContent = String(R.builtAt || "unknown");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var el = document.createElement("div"); // reusable for esc-free templating via innerHTML below

  // A control that does nothing (disabled) + the "actions disabled" contract.
  function inertBtn(label) {
    return '<button class="rv-btn" type="button" disabled aria-disabled="true" title="Actions are disabled in Review">' + esc(label) + "</button>";
  }
  function disabledNote() {
    return '<span class="rv-disabled-note">🔒 Actions disabled in Review — nothing is sent, saved, published, or paid.</span>';
  }
  function avatar(name) { return '<span class="rv-av" aria-hidden="true">' + esc(String(name).charAt(0)) + "</span>"; }

  // ── Snapshot renderers (fictional data only) ──
  var VIEWS = {
    "media-feed": function () {
      var posts = (F.feed || []).map(function (p) {
        var u = U[p.user] || {};
        return '<div class="rv-post">' +
          '<div class="rv-user">' + avatar(u.name) + '<span class="rv-name"><b>' + esc(u.name) + "</b><span>" + esc(u.handle) + "</span></span></div>" +
          '<div class="rv-media" aria-label="Fictional image">Sample image</div>' +
          '<div>' + inertBtn("♥ " + p.likes) + " " + inertBtn("💬 " + p.comments) + " " + inertBtn("↗ Share") + "</div>" +
          '<p class="rv-cap"><b>' + esc(u.handle) + "</b> " + esc(p.caption) + "</p></div>";
      }).join('<hr style="border:none;border-top:1px solid var(--line)">');
      return card("Feed", "Fictional posts. Like / comment / share / follow are disabled.", posts + "<div style='margin-top:10px'>" + disabledNote() + "</div>");
    },
    "media-profile": function () {
      var u = U.maya;
      return card("Profile", "", '<div class="rv-user">' + avatar(u.name) + '<span class="rv-name"><b>' + esc(u.name) + "</b><span>" + esc(u.handle) + "</span></span></div>" +
        "<p class='rv-sub'>128 posts · 24.1k followers · 310 following</p>" +
        "<div>" + inertBtn("Follow") + " " + inertBtn("Message") + "</div>" +
        "<p class='rv-sub'>Phone numbers are never shown. Contact is disabled in Review.</p>" + disabledNote());
    },
    "media-notifications": function () {
      var rows = (F.notifications || []).map(function (n) {
        var u = U[n.user] || {};
        return '<div class="rv-row">' + avatar(u.name) + "<div style='flex:1'><b>" + esc(u.handle) + "</b><br><span>" + esc(n.text) + "</span></div><span>" + esc(n.when) + "</span></div>";
      }).join("");
      return card("Notifications", "", rows);
    },
    "chat-conversations": function () {
      var rows = (F.conversations || []).map(function (c) {
        var u = U[c.user] || {};
        return '<div class="rv-row">' + avatar(u.name) + "<div style='flex:1'><b>" + esc(u.name) + "</b><br><span>" + esc(c.preview) + "</span></div><span>" + esc(c.when) + "</span></div>";
      }).join("");
      return card("Chats", "Fictional conversations. Sending is disabled.", rows + "<div style='margin-top:10px'>" + disabledNote() + "</div>");
    },
    "chat-direct": function () {
      var bubbles = (F.direct || []).map(function (b) {
        return '<div style="display:flex;justify-content:' + (b.me ? "flex-end" : "flex-start") + '"><div class="rv-bubble ' + (b.me ? "me" : "them") + '">' + esc(b.text) + "</div></div>";
      }).join("");
      return card("Direct message", "", "<div style='display:flex;flex-direction:column;gap:8px'>" + bubbles + "</div>" +
        "<div style='margin-top:12px;display:flex;gap:8px;align-items:center'>" + inertBtn("＋") + inertBtn("Message…") + inertBtn("🎤") + inertBtn("➤") + "</div>" + disabledNote());
    },
    "chat-payment-link": function () {
      var p = F.paymentLink || {}; var u = U[p.from] || {};
      return card("Payment link", "", '<div class="rv-bubble them" style="max-width:100%">' + esc(p.line) + "</div>" +
        "<div class='rv-card' style='margin-top:10px'><b>Wallet payment status</b> <span style='color:var(--muted)'>" + esc(p.id) + "</span>" +
        "<p class='rv-sub' style='margin:6px 0 0'>Amount " + esc(p.amount) + " · Status " + esc(p.status) + "</p>" +
        "<p class='rv-sub' style='margin:6px 0 0'>No client secret · never auto-pays · status shown from Wallet</p></div>" +
        "<div style='margin-top:10px'>" + inertBtn("Review request") + "</div>" + disabledNote());
    }
  };

  function card(h, sub, body) {
    return '<section class="rv-card"><h1 class="rv-h">' + esc(h) + "</h1>" + (sub ? '<p class="rv-sub">' + esc(sub) + "</p>" : "") + body + "</section>";
  }

  // ── Nav + hash router with a safe in-app 404 ──
  function buildNav(active) {
    document.getElementById("rv-nav").innerHTML = (F.snapshots || []).map(function (s) {
      var cur = s.id === active ? ' aria-current="page"' : "";
      return '<a href="#/' + esc(s.id) + '"' + cur + ">" + esc(s.group) + " · " + esc(s.label) + "</a>";
    }).join("");
  }

  function route() {
    var id = (location.hash || "").replace(/^#\/?/, "");
    if (!id) { location.replace("#/" + (F.snapshots[0] && F.snapshots[0].id || "media-feed")); return; }
    var main = document.getElementById("rv-main");
    if (VIEWS[id]) {
      buildNav(id);
      main.innerHTML = VIEWS[id]();
    } else {
      buildNav(null);
      main.innerHTML = '<section class="rv-card rv-404"><h2>404 — snapshot not found</h2><p>“' + esc(id) + '” is not a Review snapshot. Pick one above.</p></section>';
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
