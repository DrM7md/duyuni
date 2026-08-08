/* ============================================================
   views/summary.js — شاشة الملخّص: كل الأرقام في مكان واحد
   المبالغ · الأقساط · الجدول الزمني · الراتب · توزيع الديون
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  function distribution(ov) {
    if (!ov.active.length) return '';
    var max = ov.active.reduce(function (a, x) { return Math.max(a, x.remaining); }, 0) || 1;
    return W.sectionTitle('أين يذهب المتبقي؟') +
      '<div class="card stack stack--sm">' +
        U.sortBy(ov.active, function (x) { return x.remaining; }, true).map(function (x) {
          var share = ov.remaining > 0 ? U.round2((x.remaining / ov.remaining) * 100) : 0;
          return '<a href="#/loan/' + x.loan.id + '" style="display:block">' +
            '<div class="row row--between t-sm">' +
              '<span class="truncate t-bold">' + U.esc(x.loan.title) + '</span>' +
              '<span class="money t-bold">' + F.num(x.remaining) + '</span>' +
            '</div>' +
            W.bar(U.round2((x.remaining / max) * 100), true) +
            '<div class="t-xs t-muted">' + F.pct(share) + ' من إجمالي المتبقي · قسط ' + F.num(x.installment) + '</div>' +
          '</a>';
        }).join('<div style="height:10px"></div>') +
      '</div>';
  }

  App.views = App.views || {};
  App.views.summary = {
    title: 'الملخّص',
    layout: 'grid',

    actions: function () {
      return '<a class="appbar__btn" href="#/history" aria-label="سجل الدفعات">' + D.icon('list') + '</a>';
    },

    render: function () {
      if (App.store.isEmpty()) {
        return W.empty('chart', 'لا توجد أرقام بعد',
          'أضف أوّل دين وسجّل دفعاتك، وستجد هنا كل الأرقام: المتبقي، الأقساط، تاريخ الانتهاء، وصافي راتبك.',
          '<button class="btn btn--primary btn--block" data-action="add-loan" style="margin-top:6px">' + D.icon('plus') + ' إضافة دين</button>');
      }

      var ov = App.calc.overview();
      var yearsText = ov.planMonths ? F.duration(ov.planMonths) : '—';

      /* --- المبالغ --- */
      var amounts =
        W.sectionTitle('المبالغ') +
        '<div class="tiles">' +
          W.tile('إجمالي الديون', '<span class="money">' + F.num(ov.total) + '</span>', U.esc(F.currency())) +
          W.tile('المتبقي عليك', '<span class="money">' + F.num(ov.remaining) + '</span>', F.pct(100 - ov.progress) + ' من الإجمالي', 't-danger') +
        '</div>' +
        '<div class="card stack stack--sm">' +
          '<div class="row row--between t-sm t-bold"><span>نسبة الإنجاز</span><span class="num">' + F.pct(ov.progress) + '</span></div>' +
          W.bar(ov.progress) +
          '<div class="row row--between t-xs t-muted">' +
            '<span>مسدَّد: ' + F.money(ov.paid) + '</span>' +
            '<span>متبقٍ: ' + F.money(ov.remaining) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card card--flush"><div class="kv">' +
          W.kv('مبلغ التمويل الأصلي (ما استلمته)', F.moneyHtml(ov.principalTotal)) +
          (ov.extraCost > 0.01 ? W.kv('تكلفة إضافية (فوائد ورسوم)', '<span class="t-warn">' + F.moneyHtml(ov.extraCost) + '</span>') : '') +
          W.kv('إجمالي المسدَّد حتى الآن', '<span class="t-ok">' + F.moneyHtml(ov.paid) + '</span>') +
          W.kv('المدفوع هذا الشهر', F.moneyHtml(ov.paidThisMonth)) +
          W.kv('إجمالي المتبقي', F.moneyHtml(ov.remaining), 'kv__row--total') +
        '</div></div>';

      /* --- الأقساط --- */
      var installments =
        W.sectionTitle('الأقساط') +
        '<div class="tiles tiles--3">' +
          W.tile('الإجمالي', '<span class="num">' + F.num(ov.totalInstallments) + '</span>') +
          W.tile('المدفوعة', '<span class="num">' + F.num(ov.paidInstallments) + '</span>', null, 't-ok') +
          W.tile('المتبقية', '<span class="num">' + F.num(ov.remainingInstallments) + '</span>', null, 't-danger') +
        '</div>' +
        '<div class="card card--flush"><div class="kv">' +
          W.kv('قيمة الأقساط الشهرية', F.moneyHtml(ov.monthlyCommitment)) +
          W.kv('عدد الديون', '<span class="num">' + F.num(ov.loansCount) + '</span> ' +
               (ov.finishedCount ? '<span class="badge badge--ok">' + F.num(ov.finishedCount) + ' مسدَّد</span>' : '')) +
          (ov.overdue.length
            ? W.kv('أقساط متأخّرة', '<span class="t-danger">' + F.num(ov.overdue.reduce(function (a, x) { return a + x.lateInstallments; }, 0)) +
                   ' قسط · ' + F.money(ov.overdueAmount) + '</span>')
            : W.kv('أقساط متأخّرة', '<span class="t-ok">لا يوجد</span>')) +
        '</div></div>';

      /* --- الجدول الزمني --- */
      var timeline =
        W.sectionTitle('الجدول الزمني') +
        (ov.freedomDate
          ? '<div class="card stack stack--sm">' +
              '<div class="row">' +
                '<span class="avatar">' + D.icon('flag') + '</span>' +
                '<div class="grow">' +
                  '<div class="t-xs t-muted">تاريخ الانتهاء من كل الديون</div>' +
                  '<div class="t-bold"><time>' + F.date(ov.freedomDate) + '</time></div>' +
                '</div>' +
              '</div>' +
              '<div class="tiles tiles--3">' +
                W.tile('الأيام المتبقية', '<span class="num">' + F.num(Math.max(0, ov.daysToFreedom)) + '</span>', 'يوم') +
                W.tile('المدّة المتبقية', F.duration(ov.monthsToFreedom)) +
                W.tile('مدّة خطة السداد', yearsText) +
              '</div>' +
            '</div>'
          : '<div class="card center t-sm t-ok t-bold">' + D.icon('trophy') + '<br>لا توجد ديون قائمة — انتهيت من السداد بالكامل 🎉</div>') +
        (ov.active.length
          ? '<div class="card card--flush"><div class="kv">' +
              U.sortBy(ov.active, function (x) { return x.endDate; }).map(function (x) {
                return W.kv(x.loan.title, '<time>' + F.dateShort(x.endDate) + '</time>' +
                  ' <span class="t-xs t-muted">(' + F.duration(x.monthsToEnd) + ')</span>');
              }).join('') +
            '</div></div>'
          : '');

      /* --- الراتب --- */
      var salary =
        W.sectionTitle('الراتب بعد الخصم',
          '<button data-action="edit-income">' + (ov.income ? 'تعديل' : 'إضافة الراتب') + '</button>') +
        (ov.income
          ? '<div class="card card--flush"><div class="kv">' +
              W.kv('الراتب الشهري', F.moneyHtml(App.store.state.settings.monthlyIncome)) +
              (App.store.state.settings.otherIncome ? W.kv('دخل إضافي', F.moneyHtml(App.store.state.settings.otherIncome)) : '') +
              W.kv('إجمالي الأقساط الشهرية', '<span class="t-warn">− ' + F.moneyHtml(ov.monthlyCommitment) + '</span>') +
              W.kv('صافي المتبقي لك شهريًا',
                '<span class="' + (ov.netIncome < 0 ? 't-danger' : 't-ok') + '">' + F.moneyHtml(ov.netIncome) + '</span>', 'kv__row--total') +
            '</div>' +
            '<div style="padding:12px var(--pad) 14px">' + W.gauge(ov.dti, ov.dtiLevel) +
              '<div class="t-xs t-muted" style="margin-top:6px">نسبة الاستقطاع = الأقساط ÷ الدخل. يُنصح ألّا تتجاوز 33%.</div>' +
            '</div></div>'
          : '<div class="card center stack stack--sm">' +
              '<div class="t-sm t-2">أدخل راتبك لنحسب لك صافي ما يتبقّى في يدك كل شهر بعد الأقساط.</div>' +
              '<button class="btn btn--soft btn--block" data-action="edit-income">' + D.icon('salary') + ' إدخال الراتب</button>' +
            '</div>');

      return amounts + installments + timeline + salary + distribution(ov) +
        '<button class="btn btn--ghost btn--block" data-action="export">' + D.icon('download') + ' تصدير نسخة من بياناتي</button>';
    }
  };
})(window.App);
