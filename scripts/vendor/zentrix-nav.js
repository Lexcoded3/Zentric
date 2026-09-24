// Zentrix nav extension: adds section links AFTER React hydration.
// Idempotent, runs on both pages, never touches SSR content (no hydration mismatch).
(function () {
  'use strict';

  var LINKS = [
    { label: 'How It Works', hash: '#how-it-works', section: 'How It Works Section', id: 'how-it-works' },
    { label: 'Testimonials', hash: '#testimonials', section: 'Testimonials Section', id: 'testimonials' },
  ];

  // Set the text of the deepest text-bearing nodes: first leaf gets the label,
  // the rest are cleared (Framer items may have several text spans).
  function relabel(root, label) {
    var leaves = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (n.children.length === 0 && n.textContent && n.textContent.trim()) leaves.push(n);
    }
    if (!leaves.length) return false;
    leaves[0].textContent = label;
    for (var i = 1; i < leaves.length; i++) leaves[i].textContent = '';
    return true;
  }

  function addItem(container, link) {
    if (!container || container.querySelector('a[href$="' + link.hash + '"]')) return;
    var items = Array.prototype.filter.call(container.children, function (c) {
      return c.querySelector && c.querySelector('a');
    });
    var last = items[items.length - 1];
    if (!last) return;
    var clone = last.cloneNode(true);
    var a = clone.querySelector('a');
    if (!a) return;
    a.setAttribute('href', './' + link.hash);
    a.setAttribute('data-framer-name', link.label);
    if (!relabel(clone, link.label)) return;
    container.appendChild(clone);
  }

  function patch() {
    // 1. desktop nav row
    document.querySelectorAll('[data-framer-name="Navigation Links"]').forEach(function (c) {
      LINKS.forEach(function (l) { addItem(c, l); });
    });
    // 2. footer quick links (multiple breakpoint copies)
    document.querySelectorAll(
      '[data-framer-name="Quick Links Items"],[data-framer-name="Quick Links List"]'
    ).forEach(function (c) {
      LINKS.forEach(function (l) { addItem(c, l); });
    });
    // 3. mobile hamburger menus: any parent grouping 2+ "Menu Item" anchors
    var groups = new Set();
    document.querySelectorAll('[data-framer-name="Menu Item"]').forEach(function (mi) {
      var p = mi.parentElement;
      if (p) groups.add(p);
    });
    groups.forEach(function (p) {
      LINKS.forEach(function (l) { addItem(p, l); });
    });
    // 4. make sure the target sections carry their ids (survives re-renders)
    LINKS.forEach(function (l) {
      document.querySelectorAll('[data-framer-name="' + l.section + '"]').forEach(function (el) {
        if (!el.id) el.id = l.id;
      });
    });
  }

  // Hydration gate: the Framer badge anchor is server-rendered, so its presence
  // proves nothing. Deterministic gate instead: wait for `load` + a settle
  // window. Hydration work is committed long before then on any connection,
  // and the injected links are a non-critical enhancement.
  function startWhenSafe() {
    if (document.readyState === 'complete') {
      setTimeout(function () {
        patch();
        // re-check a few times (cheap + idempotent) for late menu renders
        var n = 0;
        var t = setInterval(function () {
          patch();
          if (++n >= 12) clearInterval(t);
        }, 500);
      }, 1200);
      return true;
    }
    return false;
  }

  if (!startWhenSafe()) {
    window.addEventListener('load', startWhenSafe, { once: true });
  }
})();
