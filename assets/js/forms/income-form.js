/* ============================================================
   income-form.js — إدخال الراتب والدخل الإضافي
   يُستخدم من الرئيسية والملخّص والإعدادات (زر واحد في كل مكان)
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  function open() {
    var s = App.store.state.settings;

    App.sheet.open({
      title: 'الراتب والدخل',
      body: '<form data-form novalidate>' +
        W.money({ name: 'monthlyIncome', label: 'الراتب الشهري', value: s.monthlyIncome, autofocus: true,
                  hint: 'الراتب الذي يصل حسابك فعليًا كل شهر.' }) +
        W.money({ name: 'otherIncome', label: 'دخل إضافي شهري (اختياري)', value: s.otherIncome,
                  hint: 'أي دخل ثابت آخر: بدلات، عمل حرّ، إيجار…' }) +
        '<div class="card card--soft"><div class="kv" data-net></div></div>' +
      '</form>',
      footer: '<button class="btn btn--ghost" type="button" data-sheet-close>إلغاء</button>' +
              '<button class="btn btn--primary" type="button" data-save>' + D.icon('check') + ' حفظ</button>',
      onMount: function (el, api) {
        var form = el.querySelector('[data-form]');
        var ov = App.calc.overview();

        function refresh() {
          var v = W.values(form);
          var income = U.round2(U.toNum(v.monthlyIncome) + U.toNum(v.otherIncome));
          var net = U.round2(income - ov.monthlyCommitment);
          var dti = income > 0 ? U.round2((ov.monthlyCommitment / income) * 100) : 0;
          var level = dti === 0 ? 'none' : (dti <= App.config.DTI.safe ? 'ok' : (dti <= App.config.DTI.warn ? 'warn' : 'danger'));
          var box = form.querySelector('[data-net]');
          box.innerHTML =
            W.kv('إجمالي الدخل', F.moneyHtml(income)) +
            W.kv('أقساطك الشهرية', '<span class="t-warn">− ' + F.moneyHtml(ov.monthlyCommitment) + '</span>') +
            W.kv('الصافي لك شهريًا', '<span class="' + (net < 0 ? 't-danger' : 't-ok') + '">' + F.moneyHtml(net) + '</span>', 'kv__row--total') +
            (income > 0 ? W.kv('نسبة الاستقطاع', '<span class="num t-' + (level === 'ok' ? 'ok' : (level === 'warn' ? 'warn' : 'danger')) + '">' + F.pct(dti) + '</span>') : '');
        }

        refresh();
        ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, refresh); });

        el.querySelector('[data-save]').addEventListener('click', function () {
          var v = W.values(form);
          App.store.setSettings({
            monthlyIncome: U.toNum(v.monthlyIncome),
            otherIncome: U.toNum(v.otherIncome)
          });
          App.toast.ok('تم حفظ الراتب');
          api.close();
        });
      }
    });
  }

  App.incomeForm = { open: open };
})(window.App);
