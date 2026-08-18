/* ==========================================================================
   WSC Select — motion layer.

   One IntersectionObserver releases the reveal pre-states; one rAF-throttled
   scroll listener writes --sy (page progress, drives the field's slow drift)
   and --p per scrubbed section, and toggles the bar.

   The stylesheet's default IS the finished state, so with JS off the page is
   complete. Geometry is cached; nothing calls getBoundingClientRect per frame
   except the small scrub set.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SCRUB = { hero: "through", promise: "enter" };

  var scrub = [], links = [], sections = [], io = null;
  var bar = document.getElementById("bar");
  var vh = window.innerHeight, ticking = false, set = false;

  function clamp(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  function collect() {
    scrub = [];
    [].forEach.call(document.querySelectorAll("[data-fx]"), function (el) {
      var m = SCRUB[el.dataset.fx];
      if (m) scrub.push({ el: el, mode: m, p: -1 });
    });
    links = [].slice.call(document.querySelectorAll('.bar__nav a[href^="#"]:not(.cta)'));
    sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  }

  function progress(it) {
    var r = it.el.getBoundingClientRect();
    if (it.mode === "through") return clamp(-r.top / (vh * 0.9));
    return clamp((vh * 0.85 - r.top) / Math.min(r.height, vh * 0.7));
  }

  /* IntersectionObserver does not fire while a document is hidden, so a page
     loaded in a background tab would keep its pre-states. This sweep runs every
     frame and makes the observer an optimisation, not a correctness requirement. */
  function reveal() {
    var pending = document.querySelectorAll("[data-fx]:not(.is-in)");
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].getBoundingClientRect().top < vh * 0.8) {
        pending[i].classList.add("is-in");
        if (io) io.unobserve(pending[i]);
      }
    }
  }

  function frame() {
    ticking = false;
    reveal();
    var y = window.pageYOffset || root.scrollTop;
    var max = Math.max(1, root.scrollHeight - vh);
    root.style.setProperty("--sy", (y / max).toFixed(4));

    if (bar) {
      if (!set && y > 80) { set = true; bar.classList.add("is-set"); }
      else if (set && y < 64) { set = false; bar.classList.remove("is-set"); }
    }

    for (var i = 0; i < scrub.length; i++) {
      var it = scrub[i], p = progress(it);
      if (Math.abs(p - it.p) > 0.002) { it.p = p; it.el.style.setProperty("--p", p.toFixed(4)); }
    }

    var active = -1;
    for (var s = 0; s < sections.length; s++) {
      if (sections[s] && sections[s].getBoundingClientRect().top <= 160) active = s;
    }
    for (var l = 0; l < links.length; l++) links[l].classList.toggle("is-here", l === active);
  }

  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function sync() { ticking = false; frame(); }
  function resize() {
    vh = window.innerHeight;
    for (var i = 0; i < scrub.length; i++) scrub[i].p = -1;
    sync();
  }

  function observe() {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    [].forEach.call(document.querySelectorAll("[data-fx]"), function (el) { io.observe(el); });
  }

  function teardown() {
    window.removeEventListener("scroll", request);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pageshow", sync);
    if (io) { io.disconnect(); io = null; }
    [].forEach.call(document.querySelectorAll("[data-fx]"), function (el) {
      el.classList.add("is-in");
      el.style.removeProperty("--p");
    });
    root.style.removeProperty("--sy");
  }

  /* The field is decorative. If the visitor asked for less motion, or the tab is
     hidden, it should not be burning a decode loop. */
  function film() {
    var v = document.querySelector(".filmbed video");
    if (!v) return;
    if (reduce.matches) { v.pause(); v.removeAttribute("autoplay"); return; }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) v.pause();
      else { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    });
    var play = v.play();
    if (play && play.catch) play.catch(function () {});  /* autoplay blocked: poster stands in */
  }


  /* A <form action="mailto:"> POST is blocked or mangled by most browsers, so a
     nomination would silently never arrive. Build the mailto from the fields and
     navigate instead. The plain action stays as the no-JS fallback. */
  function nomination() {
    var f = document.querySelector(".form");
    if (!f) return;
    f.addEventListener("submit", function (e) {
      if (!f.reportValidity || !f.reportValidity()) return;
      e.preventDefault();
      var g = function (n) {
        var el = f.elements[n];
        return el && el.value ? el.value.trim() : "";
      };
      var player = g("player");
      var lines = [
        "Player name: " + player,
        "Age group: " + g("age"),
        "Current club: " + g("club"),
        "",
        "Nominated by: " + g("you"),
        "Contact email: " + g("email"),
        "",
        "Why this player:",
        g("why") || "(not given)",
        "",
        "Sent from the WSC Select nomination form."
      ];
      var to = (f.getAttribute("action") || "").replace(/^mailto:/, "") || "brian.mazza@gmail.com";
      window.location.href = "mailto:" + to
        + "?subject=" + encodeURIComponent("WSC Select nomination" + (player ? " — " + player : ""))
        + "&body=" + encodeURIComponent(lines.join("\n"));
    });
  }

  function start() {
    collect();
    film();
    nomination();
    if (reduce.matches) { teardown(); return; }
    observe();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    sync();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (!reduce.matches) resize(); });
  }
  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", function () { teardown(); start(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
