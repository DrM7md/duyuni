/* ============================================================
   dom.js — مساعدات DOM + مكتبة الأيقونات (SVG بلا ملفات خارجية)
   ============================================================ */

(function (App) {
  'use strict';

  var D = {};

  D.$  = function (sel, root) { return (root || document).querySelector(sel); };
  D.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- الأيقونات ---------- */
  var ICONS = {
    home:     '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    chart:    '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check:    '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    x:        '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    back:     '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
    chevron:  '<path d="M14 6l-6 6 6 6"/>',
    bank:     '<path d="M3 10 12 4l9 6"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    user:     '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.4-3.6 4-5 7-5s5.6 1.4 7 5"/>',
    users:    '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.5 19.5c1.2-3.2 3.4-4.5 6-4.5s4.8 1.3 6 4.5"/><path d="M16.4 5.7a3.2 3.2 0 0 1 0 5.6"/><path d="M18.2 15.6c1.3.7 2.2 1.9 2.8 3.9"/>',
    store:    '<path d="M4 9h16l-1 11H5L4 9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    tag:      '<path d="M20 12.5 12.5 20 4 11.5V4h7.5L20 12.5Z"/><circle cx="8" cy="8" r="1.3"/>',
    wallet:   '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.5Z"/><path d="M16 12.5h2"/>',
    coins:    '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    alert:    '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5"/><path d="M12 17.4h.01"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
    download: '<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 20h16"/>',
    upload:   '<path d="M12 15V3"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M4 20h16"/>',
    share:    '<path d="M12 3v11"/><path d="M8 6.5 12 3l4 3.5"/><path d="M5 13v6.5h14V13"/>',
    copy:     '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 5.5H6A1.5 1.5 0 0 0 4.5 7v9.5"/>',
    trash:    '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/>',
    edit:     '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="M14.5 5.5 18.5 9.5"/>',
    list:     '<path d="M4 7h16M4 12h16M4 17h10"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    flag:     '<path d="M5 21V4"/><path d="M5 5h11l-1.5 4L16 13H5"/>',
    trophy:   '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5.5V7A3 3 0 0 0 8 10"/><path d="M16 5.5h2.5V7A3 3 0 0 1 16 10"/><path d="M12 13v3.5"/><path d="M8.5 20h7"/>',
    sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon:     '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
    salary:   '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 12h.01M17.5 12h.01"/>'
  };

  /** أيقونة SVG جاهزة للإدراج */
  D.icon = function (name, cls) {
    var body = ICONS[name] || ICONS.tag;
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + body + '</svg>';
  };

  D.hasIcon = function (name) { return !!ICONS[name]; };

  /** أيقونة نوع الجهة الدائنة */
  D.lenderIcon = function (type) {
    var found = App.config.LENDER_TYPES.filter(function (t) { return t.value === type; })[0];
    return D.icon(found ? found.icon : 'tag');
  };

  D.lenderLabel = function (type) {
    var found = App.config.LENDER_TYPES.filter(function (t) { return t.value === type; })[0];
    return found ? found.label : 'أخرى';
  };

  /* ---------- اهتزاز خفيف عند التأكيد (إن كان مدعومًا) ---------- */
  D.buzz = function (ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 14); } catch (e) {}
  };

  /** تمرير المحتوى للأعلى */
  D.scrollTop = function () { window.scrollTo({ top: 0, behavior: 'auto' }); };

  App.dom = D;
})(window.App);
