/* ============================================================
   views/history.js — سجل كل الدفعات مجمّعة بالشهر
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  App.views = App.views || {};
  App.views.history = {
    back: true,
    title: 'سجل الدفعات',

    actions: function () {
      return '<button class="appbar__btn" data-action="quick-pay" aria-label="تسجيل دفعة">' + D.icon('plus') + '</button>';
    },

    render: function () {
      var pays = App.store.payments();
      if (!pays.length) {
        return W.empty('list', 'لا توجد دفعات مسجّلة',
          'كلّما سدّدت قسطًا، اضغط زر «سدّد» في شريط التنقّل السفلي ليُسجَّل هنا بتاريخه.',
          '<button class="btn btn--primary btn--block" data-action="quick-pay" style="margin-top:6px">' + D.icon('plus') + ' تسجيل دفعة</button>');
      }

      var total = U.sum(pays, function (p) { return p.amount; });
      var groups = U.groupBy(pays, function (p) { return U.monthKey(p.date); });
      var months = Object.keys(groups).sort().reverse();

      var head = '<div class="card">' +
        '<div class="tiles tiles--3">' +
          W.tile('عدد الدفعات', '<span class="num">' + F.num(pays.length) + '</span>') +
          W.tile('إجمالي المسجّل', '<span class="money">' + F.num(total) + '</span>', U.esc(F.currency())) +
          W.tile('هذا الشهر', '<span class="money">' + F.num(U.sum(groups[U.monthKey(U.today())] || [], function (p) { return p.amount; })) + '</span>') +
        '</div>' +
      '</div>';

      var body = months.map(function (m) {
        var list = groups[m];
        var mTotal = U.sum(list, function (p) { return p.amount; });
        return '<div class="card card--flush">' +
          '<div class="month-head"><span>' + F.month(m) + '</span><span class="money">' + F.num(mTotal) + ' ' + U.esc(F.currency()) + '</span></div>' +
          list.map(function (p) {
            var loan = App.store.loan(p.loanId);
            return '<button class="pay-row" data-action="edit-payment" data-id="' + p.id + '">' +
              '<span class="avatar avatar--ok">' + D.icon('check') + '</span>' +
              '<span class="grow" style="min-width:0">' +
                '<span class="t-sm t-bold truncate" style="display:block">' + U.esc(loan ? loan.title : 'دين محذوف') + '</span>' +
                '<span class="t-xs t-muted truncate" style="display:block"><time>' + F.dateShort(p.date) + '</time>' +
                  (p.note ? ' · ' + U.esc(p.note) : '') + '</span>' +
              '</span>' +
              '<span class="pay-row__amt money">' + F.num(p.amount) + '</span>' +
              D.icon('chevron', 'chev') +
            '</button>';
          }).join('') +
        '</div>';
      }).join('');

      return head + W.sectionTitle('كل الدفعات', '<span class="t-xs t-muted">اضغط أي دفعة لتعديلها أو حذفها</span>') + body;
    }
  };
})(window.App);
