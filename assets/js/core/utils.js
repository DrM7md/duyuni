/* ============================================================
   utils.js — أدوات عامّة: معرّفات، حساب التواريخ، أرقام
   كل تواريخ التطبيق مخزّنة كنص ISO قصير: YYYY-MM-DD
   ============================================================ */

(function (App) {
  'use strict';

  var U = {};

  /* ---------- معرّف فريد ---------- */
  U.uid = function (prefix) {
    var rnd = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + Date.now().toString(36) + rnd;
  };

  /* ---------- أرقام ---------- */
  U.toNum = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    // نقبل الأرقام العربية والفواصل
    var s = String(v)
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; })
      .replace(/[,\s٬]/g, '')
      .replace(/٫/g, '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };

  U.round2 = function (n) { return Math.round((U.toNum(n) + Number.EPSILON) * 100) / 100; };
  U.clamp = function (n, min, max) { return Math.min(Math.max(n, min), max); };

  /* ---------- تواريخ ---------- */
  U.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  U.iso = function (date) {
    return date.getFullYear() + '-' + U.pad2(date.getMonth() + 1) + '-' + U.pad2(date.getDate());
  };

  U.today = function () { return U.iso(new Date()); };

  /** تحويل ISO إلى كائن Date محلّي (بلا انزياح المنطقة الزمنية) */
  U.parse = function (isoStr) {
    if (!isoStr) return null;
    var p = String(isoStr).slice(0, 10).split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  };

  U.isValidISO = function (isoStr) { return !!U.parse(isoStr); };

  U.lastDayOfMonth = function (year, monthIdx) {
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  /** إضافة أشهر مع تثبيت اليوم على آخر الشهر عند الحاجة (31 يناير + 1 = 28/29 فبراير) */
  U.addMonths = function (isoStr, months) {
    var d = U.parse(isoStr);
    if (!d) return isoStr;
    var day = d.getDate();
    var target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    var maxDay = U.lastDayOfMonth(target.getFullYear(), target.getMonth());
    target.setDate(Math.min(day, maxDay));
    return U.iso(target);
  };

  U.addDays = function (isoStr, days) {
    var d = U.parse(isoStr);
    if (!d) return isoStr;
    d.setDate(d.getDate() + days);
    return U.iso(d);
  };

  /** فرق الأيام (b - a) */
  U.diffDays = function (aIso, bIso) {
    var a = U.parse(aIso), b = U.parse(bIso);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
  };

  /** فرق الأشهر التقريبي (b - a) */
  U.diffMonths = function (aIso, bIso) {
    var a = U.parse(aIso), b = U.parse(bIso);
    if (!a || !b) return 0;
    var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return m;
  };

  U.monthKey = function (isoStr) { return String(isoStr || '').slice(0, 7); };

  U.isPast   = function (isoStr) { return U.diffDays(U.today(), isoStr) < 0; };
  U.isFuture = function (isoStr) { return U.diffDays(U.today(), isoStr) > 0; };

  /* ---------- مصفوفات ---------- */
  U.sum = function (arr, pick) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += U.toNum(pick ? pick(arr[i]) : arr[i]);
    return U.round2(t);
  };

  U.groupBy = function (arr, keyFn) {
    var out = {};
    arr.forEach(function (item) {
      var k = keyFn(item);
      (out[k] = out[k] || []).push(item);
    });
    return out;
  };

  U.sortBy = function (arr, pick, desc) {
    return arr.slice().sort(function (a, b) {
      var x = pick(a), y = pick(b);
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (desc ? -1 : 1);
    });
  };

  /* ---------- نصوص ---------- */
  U.esc = function (str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.initials = function (name) {
    var s = String(name || '').trim();
    if (!s) return '؟';
    var words = s.split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2);
    return (words[0][0] || '') + (words[1][0] || '');
  };

  App.utils = U;
})(window.App);
