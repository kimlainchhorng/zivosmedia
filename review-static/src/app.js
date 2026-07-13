/* Safe Media Review renderer. Vanilla JS, no network, no imports, no mutations.
 * Every interactive control is rendered disabled. Unknown routes show a safe 404. */
(function () {
  "use strict";
  var F = window.__FIXTURES__ || {};
  var R = window.__REVIEW__ || {};
  var U = F.users || {};

  document.getElementById("rv-sha").textContent = String(R.sha || "unknown"); // full 40 chars
  document.getElementById("rv-built").textContent = String(R.builtAt || "unknown");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function inertBtn(label) {
    return '<button class="rv-btn" type="button" disabled aria-disabled="true" title="Actions are disabled in Review">' + esc(label) + "</button>";
  }
  function disabledNote() {
    return '<span class="rv-disabled-note">🔒 Actions disabled in Review — nothing is published, followed, blocked, reported, or changed.</span>';
  }
  function avatar(name) { return '<span class="rv-av" aria-hidden="true">' + esc(String(name || "?").charAt(0)) + "</span>"; }
  function userRow(u) { return '<div class="rv-user">' + avatar(u.name) + '<span class="rv-name"><b>' + esc(u.name) + "</b><span>" + esc(u.handle) + "</span></span></div>"; }
  function card(h, sub, body) {
    return '<section class="rv-card"><h1 class="rv-h">' + esc(h) + "</h1>" + (sub ? '<p class="rv-sub">' + esc(sub) + "</p>" : "") + body + "</section>";
  }
  function tiles(n) {
    var t = ""; for (var i = 0; i < n; i++) t += '<span class="rv-tile" aria-hidden="true"></span>';
    return '<div class="rv-tiles">' + t + "</div>";
  }
  function stateScreen(icon, title, body) {
    return card("", "", '<div class="rv-404" role="status"><div style="font-size:34px">' + esc(icon) + '</div><h2 style="margin:10px 0 6px">' + esc(title) + "</h2><p>" + esc(body) + "</p></div>");
  }

  var VIEWS = {
    feed: function () {
      var posts = (F.feed || []).map(function (p) {
        var u = U[p.user] || {};
        return '<div class="rv-post">' + userRow(u) +
          '<div class="rv-media" aria-label="Fictional image">Sample image</div>' +
          "<div>" + inertBtn("♥ " + p.likes) + " " + inertBtn("💬 " + p.comments) + " " + inertBtn("↗ Share") + "</div>" +
          '<p class="rv-cap"><b>' + esc(u.handle) + "</b> " + esc(p.caption) + "</p></div>";
      }).join('<hr style="border:none;border-top:1px solid var(--line);margin:12px 0">');
      return card("Feed", "Fictional posts. Like / comment / share / follow are disabled.", posts + "<div style='margin-top:10px'>" + disabledNote() + "</div>");
    },
    post: function () {
      var p = F.post || {}; var u = U[p.user] || {};
      var comments = (p.comments_list || []).map(function (c) {
        var cu = U[c.user] || {};
        return '<div class="rv-row">' + avatar(cu.name) + "<div style='flex:1'><b>" + esc(cu.handle) + "</b> <span>" + esc(c.text) + "</span></div></div>";
      }).join("");
      return card("Post", "", '<div class="rv-post">' + userRow(u) +
        '<div class="rv-media" aria-label="Fictional image">Sample image</div>' +
        "<div>" + inertBtn("♥ " + p.likes) + " " + inertBtn("💬 " + p.comments) + " " + inertBtn("↗ Share") + "</div>" +
        '<p class="rv-cap"><b>' + esc(u.handle) + "</b> " + esc(p.caption) + "</p></div>" +
        "<h3 style='margin:14px 0 4px;font-size:14px'>Comments</h3>" + comments +
        "<div style='margin-top:10px;display:flex;gap:8px;align-items:center'>" + inertBtn("Add a comment…") + "</div>" + disabledNote());
    },
    profile: function () {
      var pr = F.profile || {}; var u = U[pr.user] || {};
      return card("Profile", "", userRow(u) +
        "<p class='rv-sub' style='margin:8px 0'>" + esc(pr.posts) + " posts · " + esc(pr.followers) + " followers · " + esc(pr.following) + " following</p>" +
        "<div>" + inertBtn("Follow") + " " + inertBtn("Message") + "</div>" + tiles(pr.tiles || 9) +
        "<p class='rv-sub' style='margin-top:8px'>Phone numbers are never shown on profiles.</p>" + disabledNote());
    },
    "private-profile": function () {
      var pp = F.privateProfile || {}; var u = U[pp.user] || {};
      return card("Private profile", "", userRow(u) +
        "<p class='rv-sub' style='margin:8px 0'>" + esc(pp.followers) + " followers</p>" +
        stateScreen("🔒", "This account is private", "Follow this account to see their posts. Follow is disabled in Review.") +
        "<div>" + inertBtn("Follow") + "</div>" + disabledNote());
    },
    search: function () {
      var rows = (F.search || []).map(function (k) {
        var u = U[k] || {};
        return '<div class="rv-row">' + avatar(u.name) + "<div style='flex:1'><b>" + esc(u.name) + "</b><br><span>" + esc(u.handle) + "</span></div>" + inertBtn("Follow") + "</div>";
      }).join("");
      return card("Search", "", "<div class='rv-btn' style='width:100%;justify-content:flex-start' aria-disabled='true'>🔎 Search people, tags, places… (disabled)</div>" + rows);
    },
    discovery: function () {
      return card("Discover", "Trending fictional media. Opening a tile is disabled.", tiles(F.discovery || 12) + "<div style='margin-top:10px'>" + disabledNote() + "</div>");
    },
    notifications: function () {
      var rows = (F.notifications || []).map(function (n) {
        var u = U[n.user] || {};
        return '<div class="rv-row">' + avatar(u.name) + "<div style='flex:1'><b>" + esc(u.handle) + "</b><br><span>" + esc(n.text) + "</span></div><span>" + esc(n.when) + "</span></div>";
      }).join("");
      return card("Notifications", "", rows);
    },
    privacy: function () {
      var rows = (F.privacy || []).map(function (r) {
        return '<div class="rv-row"><div style="flex:1"><b>' + esc(r.label) + "</b><br><span>" + esc(r.sub) + "</span></div><span class='rv-btn' aria-disabled='true' style='min-height:30px'>" + esc(r.state) + "</span></div>";
      }).join("");
      return card("Privacy", "Read-only snapshot — toggling a setting is disabled; nothing is saved.", rows + "<div style='margin-top:10px'>" + disabledNote() + "</div>");
    },
    block: function () {
      return card("Blocked", "", stateScreen("🚫", "You blocked this account", "You can't see their posts or message them, and they can't contact you.") +
        "<div>" + inertBtn("Unblock") + "</div>" + disabledNote());
    },
    mute: function () {
      var u = U.vibol;
      return card("Muted", "", userRow(u) + "<p class='rv-sub' style='margin:8px 0'>You won't see their posts in your feed. They aren't notified.</p>" +
        "<div>" + inertBtn("Unmute") + "</div>" + disabledNote());
    },
    report: function () {
      var rows = (F.report || []).map(function (r) {
        return '<div class="rv-row"><div style="flex:1"><b>' + esc(r) + "</b></div><span>›</span></div>";
      }).join("");
      return card("Report", "Why are you reporting this post?", rows + "<div style='margin-top:10px'>" + inertBtn("Submit report") + " " + disabledNote() + "</div>");
    },
    empty: function () { return card("Feed", "", stateScreen("🌱", "Nothing here yet", "Follow a few creators and their posts will show up in your feed.")); },
    offline: function () { return card("Feed", "", stateScreen("📡", "You're offline", "Showing what we last loaded. New posts resume when you reconnect.")); },
    error: function () { return card("Feed", "", stateScreen("⚠️", "Something went wrong", "We couldn't load the feed. Try again in a moment.")); }
  };

  function buildNav(active) {
    document.getElementById("rv-nav").innerHTML = (F.snapshots || []).map(function (s) {
      var cur = s.id === active ? ' aria-current="page"' : "";
      return '<a href="#/' + esc(s.id) + '"' + cur + ">" + esc(s.label) + "</a>";
    }).join("");
  }

  function route() {
    var id = (location.hash || "").replace(/^#\/?/, "");
    if (!id) { location.replace("#/" + ((F.snapshots[0] && F.snapshots[0].id) || "feed")); return; }
    var main = document.getElementById("rv-main");
    if (VIEWS[id]) { buildNav(id); main.innerHTML = VIEWS[id](); }
    else {
      buildNav(null);
      main.innerHTML = '<section class="rv-card rv-404"><h2>404 — snapshot not found</h2><p>“' + esc(id) + '” is not a Review snapshot. Pick one above.</p></section>';
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
