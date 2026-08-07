/* ============================================================
   sheet.js — ورقة سفلية (Bottom Sheet) لكل النماذج والتأكيدات
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils;
  var root, active = null;

  function rootEl() {
    root = root || document.getElementById('sheetRoot');
    return root;
  }

  /**
   * فتح ورقة.
   * @param {Object} opt {title, body(html), footer(html), onMount(el, api), size}
   */
  function open(opt) {
    close(true);
    var r = rootEl();
    if (!r) return null;

    var overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML =
      '<section class="sheet" role="dialog" aria-modal="true" aria-label="' + U.esc(opt.title || '') + '">' +
        '<div class="sheet__grip"></div>' +
        '<header class="sheet__head">' +
          '<h2 class="sheet__title">' + U.esc(opt.title || '') + '</h2>' +
          '<button class="sheet__close" type="button" data-sheet-close aria-label="إغلاق">' + App.dom.icon('x') + '</button>' +
        '</header>' +
        '<div class="sheet__body">' + (opt.body || '') + '</div>' +
        (opt.footer ? '<footer class="sheet__foot">' + opt.footer + '</footer>' : '') +
      '</section>';

    r.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var api = { el: overlay, close: function () { close(); } };
    active = { overlay: overlay };

    // الإغلاق: زر الإغلاق أو النقر خارج الورقة
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-sheet-close]')) close();
    });

    if (typeof opt.onMount === 'function') opt.onMount(overlay, api);

    // تركيز أوّل حقل غير مخفي
    setTimeout(function () {
      var first = overlay.querySelector('[data-autofocus]') || overlay.querySelector('input:not([type=hidden]), select, textarea');
      if (first && opt.autofocus !== false) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
    }, 260);

    return api;
  }

  function close(immediate) {
    if (!active) return;
    var overlay = active.overlay;
    active = null;
    document.body.style.overflow = '';
    if (immediate) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      return;
    }
    var panel = overlay.querySelector('.sheet');
    if (panel) panel.classList.add('sheet--closing');
    overlay.style.animation = 'fadeIn .18s var(--ease) reverse forwards';
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  }

  /** تأكيد بسيط — يعيد Promise<boolean> */
  function confirm(opt) {
    return new Promise(function (resolve) {
      var danger = !!opt.danger;
      var done = false;
      var api = open({
        title: opt.title || 'تأكيد',
        body: '<p class="t-2 t-sm" style="line-height:1.7">' + U.esc(opt.text || '') + '</p>' +
              (opt.hint ? '<div class="note-box">' + App.dom.icon('info') + '<span>' + U.esc(opt.hint) + '</span></div>' : ''),
        footer:
          '<button class="btn btn--ghost" type="button" data-c="no">' + U.esc(opt.cancelText || 'إلغاء') + '</button>' +
          '<button class="btn ' + (danger ? 'btn--danger' : 'btn--primary') + '" type="button" data-c="yes">' + U.esc(opt.okText || 'تأكيد') + '</button>',
        autofocus: false,
        onMount: function (el, a) {
          el.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-c]');
            if (!btn) return;
            done = true;
            a.close();
            resolve(btn.getAttribute('data-c') === 'yes');
          });
        }
      });
      // إن أُغلقت الورقة بأي طريقة أخرى نعيد false
      var iv = setInterval(function () {
        if (!active) { clearInterval(iv); if (!done) resolve(false); }
      }, 200);
      if (!api) { clearInterval(iv); resolve(false); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  App.sheet = { open: open, close: close, confirm: confirm, isOpen: function () { return !!active; } };
})(window.App);
