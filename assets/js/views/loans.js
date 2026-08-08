/* ============================================================
   views/loans.js — قائمة الديون مع مرشّح بسيط
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  var filter = 'active'; // active | done | all

  function chips() {
    var opts = [
      { v: 'active', l: 'القائمة' },
      { v: 'done', l: 'المسدَّدة' },
      { v: 'all', l: 'الكل' }
    ];
    return '<div class="chips" data-loan-filter>' + opts.map(function (o) {
      return '<button type="button" class="chip' + (o.v === filter ? ' is-active' : '') + '" data-val="' + o.v + '">' + o.l + '</button>';
    }).join('') + '</div>';
  }

  App.views = App.views || {};
  App.views.loans = {
    title: 'الديون',
    layout: 'grid',

    actions: function () {
      return '<button class="appbar__btn" data-action="add-loan" aria-label="إضافة دين">' + D.icon('plus') + '</button>';
    },

    render: function () {
      if (App.store.isEmpty()) {
        return W.empty('coins', 'لا توجد ديون مسجّلة',
          'أضف كل دين أو تمويل عليك: البنك، السلفة من صديق، أو أي التزام بأقساط.',
          '<button class="btn btn--primary btn--block" data-action="add-loan" style="margin-top:6px">' + D.icon('plus') + ' إضافة دين</button>');
      }

      var ov = App.calc.overview();
      var list = ov.stats;
      if (filter === 'active') list = list.filter(function (x) { return !x.finished; });
      if (filter === 'done') list = list.filter(function (x) { return x.finished; });

      // الأكثر إلحاحًا أولًا: المتأخّر ثم الأقرب استحقاقًا
      list = U.sortBy(list, function (x) {
        return (x.finished ? '2' : (x.lateAmount > 0.01 ? '0' : '1')) + (x.nextDueDate || '9999-12-31');
      });

      var head = '<div class="card stack stack--sm">' +
          '<div class="row row--between">' +
            '<div><div class="t-xs t-muted">المتبقي على <span class="num">' + F.num(ov.active.length) + '</span> دين قائم</div>' +
            '<div class="t-bold" style="font-size:1.3rem"><span class="money">' + F.num(ov.remaining) + '</span> <small class="t-muted">' + U.esc(F.currency()) + '</small></div></div>' +
            '<div class="center"><div class="t-xs t-muted">قسط شهري</div><div class="t-bold money">' + F.num(ov.monthlyCommitment) + '</div></div>' +
          '</div>' +
          W.bar(ov.progress, true) +
        '</div>';

      var body = list.length
        ? '<div class="stack stack--sm">' + list.map(W.loanCard).join('') + '</div>'
        : W.empty('list', filter === 'done' ? 'لا يوجد دين مسدَّد بعد' : 'لا توجد ديون في هذا التصنيف', '');

      return head + chips() + body +
        '<button class="btn btn--ghost btn--block" data-action="add-loan">' + D.icon('plus') + ' إضافة دين آخر</button>';
    },

    mount: function (el) {
      el.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-loan-filter] .chip');
        if (!chip) return;
        filter = chip.getAttribute('data-val');
        App.render();
      });
    }
  };
})(window.App);
