/* ============================================================
   toast.js — رسائل تأكيد خفيفة أسفل الشاشة
   ============================================================ */

(function (App) {
  'use strict';

  var root;

  function show(msg, kind, ms) {
    root = root || document.getElementById('toastRoot');
    if (!root) return;

    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    var iconName = kind === 'err' ? 'alert' : (kind === 'ok' ? 'checkCircle' : 'info');
    el.innerHTML = App.dom.icon(iconName) + '<span>' + App.utils.esc(msg) + '</span>';
    root.appendChild(el);

    setTimeout(function () {
      el.classList.add('toast--out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, ms || 2200);
  }

  App.toast = {
    show: function (m, ms) { show(m, '', ms); },
    ok: function (m, ms) { App.dom.buzz(12); show(m, 'ok', ms); },
    error: function (m, ms) { show(m, 'err', ms || 3000); }
  };
})(window.App);
