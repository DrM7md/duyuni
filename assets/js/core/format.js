/* ============================================================
   format.js — عرض الأرقام والتواريخ
   القاعدة: الأرقام لاتينية (123) والتواريخ ميلادية دائمًا.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils;
  var F = {};

  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var dLong  = new Intl.DateTimeFormat('ar-EG-u-nu-latn-ca-gregory', { day: '2-digit', month: 'long', year: 'numeric' });
  var dMed   = new Intl.DateTimeFormat('ar-EG-u-nu-latn-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
  var dMonth = new Intl.DateTimeFormat('ar-EG-u-nu-latn-ca-gregory', { month: 'long', year: 'numeric' });

  /** رقم بلا كسور إن كان صحيحًا، وبكسرين إن لزم */
  F.num = function (n) {
    var v = U.round2(n);
    return Math.abs(v % 1) < 0.005 ? nf0.format(Math.round(v)) : nf2.format(v);
  };

  /** مبلغ + رمز العملة الحالية */
  F.money = function (n, withSymbol) {
    var txt = F.num(n);
    if (withSymbol === false) return txt;
    return txt + ' ' + F.currency();
  };

  /** المبلغ داخل عنصر يضمن اتجاه الأرقام */
  F.moneyHtml = function (n) {
    return '<span class="money">' + F.num(n) + '</span> <small>' + U.esc(F.currency()) + '</small>';
  };

  F.currency = function () {
    var code = (App.store && App.store.state.settings.currency) || 'QAR';
    var found = App.config.CURRENCIES.filter(function (c) { return c.code === code; })[0];
    return found ? found.symbol : code;
  };

  F.pct = function (x) { return F.num(U.clamp(U.round2(x), 0, 999)) + '%'; };

  /* ---------- تواريخ ---------- */
  F.date = function (isoStr) {
    var d = U.parse(isoStr);
    return d ? dLong.format(d) : '—';
  };
  F.dateShort = function (isoStr) {
    var d = U.parse(isoStr);
    return d ? dMed.format(d) : '—';
  };
  F.month = function (isoStr) {
    var d = U.parse((isoStr || '').length === 7 ? isoStr + '-01' : isoStr);
    return d ? dMonth.format(d) : '—';
  };

  /** وصف المدّة بالأيام بصيغة عربية مفهومة */
  F.days = function (n) {
    var v = Math.abs(Math.round(n));
    if (v === 0) return 'اليوم';
    if (v === 1) return 'يوم واحد';
    if (v === 2) return 'يومان';
    if (v <= 10) return v + ' أيام';
    return v + ' يوم';
  };

  /** تحويل عدد الأشهر إلى «سنة و3 أشهر» */
  F.duration = function (months) {
    var m = Math.max(0, Math.round(months));
    var y = Math.floor(m / 12), r = m % 12;
    var parts = [];
    if (y === 1) parts.push('سنة');
    else if (y === 2) parts.push('سنتان');
    else if (y > 2) parts.push(y + ' سنوات');
    if (r === 1) parts.push('شهر');
    else if (r === 2) parts.push('شهران');
    else if (r > 2) parts.push(r + ' أشهر');
    return parts.length ? parts.join(' و') : 'أقل من شهر';
  };

  /** عدد الأقساط بصيغة عربية */
  F.installments = function (n) {
    var v = Math.max(0, Math.round(n));
    if (v === 1) return 'قسط واحد';
    if (v === 2) return 'قسطان';
    if (v <= 10) return v + ' أقساط';
    return v + ' قسط';
  };

  /** «بعد 12 يوم» / «متأخّر 3 أيام» / «اليوم» */
  F.relativeDue = function (isoStr) {
    var d = U.diffDays(U.today(), isoStr);
    if (d === 0) return 'استحقاق اليوم';
    if (d > 0) return 'بعد ' + F.days(d);
    return 'متأخّر ' + F.days(d);
  };

  App.format = F;
})(window.App);
