/* ============================================================
   payment-form.js — تسجيل دفعة (أو تعديلها)
   التاريخ يُكتب تلقائيًا (اليوم) ويمكن تغييره لتاريخ سابق أو قادم،
   والمبلغ يُقترح بقيمة القسط لتقليل الكتابة.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  function loanOptions(activeId) {
    var loans = App.store.loans();
    return loans.map(function (l) {
      var st = App.calc.loanStats(l);
      var suffix = st.finished ? ' — مسدَّد' : ' — متبقّي ' + F.num(st.remaining);
      return { value: l.id, label: l.title + suffix };
    });
  }

  /** ملخّص أثر الدفعة قبل الحفظ */
  function refreshImpact(scope, excludePaymentId) {
    var v = W.values(scope);
    var loan = App.store.loan(v.loanId);
    var box = scope.querySelector('[data-impact]');
    if (!box || !loan) return;

    var st = App.calc.loanStats(loan);
    var already = excludePaymentId ? (App.store.payment(excludePaymentId) || {}).amount || 0 : 0;
    var base = U.round2(st.paid - already);
    var amount = U.toNum(v.amount);
    var afterPaid = U.round2(base + amount);
    var afterRemaining = U.round2(Math.max(0, st.total - afterPaid));
    var over = U.round2(Math.max(0, afterPaid - st.total));
    var instAfter = Math.min(st.count, Math.floor((afterPaid + 0.01) / st.installment));

    var rows = W.kv('المتبقي بعد الدفعة', F.moneyHtml(afterRemaining)) +
               W.kv('الأقساط المسدَّدة', '<span class="num">' + F.num(instAfter) + ' / ' + F.num(st.count) + '</span>');
    if (afterRemaining <= 0.01) {
      rows += W.kv('النتيجة', '<span class="t-ok">🎉 سيكتمل سداد هذا الدين</span>');
    }
    if (over > 0.01) {
      rows += W.kv('فائض عن المطلوب', '<span class="t-warn">' + F.moneyHtml(over) + '</span>');
    }

    // إن كان للدين مشاركون: نبيّن أثر الدفعة على حصّة الدافع نفسه
    if (App.store.sharingOn() && st.shared) {
      var payerId = v.payerId || 'me';
      var who = st.contributors.filter(function (c) { return c.id === payerId; })[0];
      if (who) {
        var alreadyHis = (excludePaymentId && (App.store.payment(excludePaymentId) || {}).payerId === payerId)
          ? U.toNum((App.store.payment(excludePaymentId) || {}).amount) : 0;
        var hisPaid = U.round2(who.paid - alreadyHis + amount);
        rows += W.kv('إجمالي ما دفعه ' + who.name, F.moneyHtml(hisPaid));
        if (who.hasShare) {
          rows += W.kv('المتبقي على حصّة ' + who.name + ' (' + F.pct(who.sharePct) + ')',
            F.moneyHtml(Math.max(0, U.round2(who.shareAmount - hisPaid))));
        }
      }
    }

    box.innerHTML = rows;
  }

  /** رقائق المبالغ السريعة — وتشمل «باقي حصّة الدافع» إن كان مشاركًا بحصّة */
  function amountChips(st, payerId) {
    if (!st) return '';
    var one = st.installment;
    var list = [
      { val: U.round2(Math.min(one, st.remaining)), label: 'قسط واحد' },
      { val: U.round2(Math.min(one * 2, st.remaining)), label: 'قسطان' },
      { val: U.round2(st.remaining), label: 'كامل المتبقي' }
    ];

    if (App.store.sharingOn() && st.shared && payerId && payerId !== 'me') {
      var who = st.contributors.filter(function (c) { return c.id === payerId; })[0];
      if (who && who.hasShare && who.remaining > 0) {
        list.unshift({ val: U.round2(Math.min(who.remaining, st.remaining)), label: 'باقي حصّته' });
      }
    }

    var chips = list.filter(function (c, i, arr) {
      return c.val > 0 && arr.findIndex(function (x) { return x.val === c.val; }) === i;
    });
    if (!chips.length) return '';
    return '<div class="chips" data-amount-chips>' + chips.map(function (c) {
      return '<button type="button" class="chip" data-val="' + c.val + '">' + c.label + ' · ' + F.num(c.val) + '</button>';
    }).join('') + '</div>';
  }

  /** اختيار الدافع — يظهر فقط إن كانت الميزة مفعّلة وللدين مشاركون */
  function payerField(loan, activeId) {
    if (!App.store.sharingOn() || !loan || !(loan.partners || []).length) {
      return '<input type="hidden" name="payerId" value="' + U.esc(activeId || 'me') + '">';
    }
    var people = [{ id: 'me', name: 'أنا' }].concat(loan.partners);
    var active = people.filter(function (p) { return p.id === activeId; }).length ? activeId : 'me';
    return '<div class="field">' +
      '<span class="field__label">مَن دفع هذه الدفعة؟</span>' +
      '<div class="chips" data-payer-chips>' +
        people.map(function (p) {
          return '<button type="button" class="chip' + (p.id === active ? ' is-active' : '') + '" data-val="' + U.esc(p.id) + '">' +
            U.esc(p.name) + '</button>';
        }).join('') +
      '</div>' +
      '<input type="hidden" name="payerId" value="' + U.esc(active) + '">' +
    '</div>';
  }

  function dateChips() {
    return '<div class="chips" data-date-chips>' +
      '<button type="button" class="chip" data-val="' + U.today() + '">اليوم</button>' +
      '<button type="button" class="chip" data-val="' + U.addDays(U.today(), -1) + '">أمس</button>' +
      '<button type="button" class="chip" data-val="' + U.addMonths(U.today(), -1) + '">الشهر الماضي</button>' +
    '</div>';
  }

  /**
   * فتح نموذج الدفعة.
   * @param {Object} opt {loanId, paymentId}
   */
  function open(opt) {
    opt = opt || {};
    var editing = opt.paymentId ? App.store.payment(opt.paymentId) : null;
    var loans = App.store.loans();

    if (!loans.length) {
      App.sheet.open({
        title: 'لا يوجد دين بعد',
        body: '<p class="t-2 t-sm">أضف أوّل تمويل أو دين حتى تتمكّن من تسجيل الدفعات عليه.</p>',
        footer: '<button class="btn btn--ghost" type="button" data-sheet-close>لاحقًا</button>' +
                '<button class="btn btn--primary" type="button" data-add-loan>' + D.icon('plus') + ' إضافة دين</button>',
        onMount: function (el) {
          el.querySelector('[data-add-loan]').addEventListener('click', function () {
            App.sheet.close();
            setTimeout(function () { App.loanForm.open(); }, 220);
          });
        }
      });
      return;
    }

    // تحديد الدين الافتراضي: المطلوب صراحة، أو الأكثر إلحاحًا
    var ov = App.calc.overview();
    var defaultLoanId = editing ? editing.loanId
      : (opt.loanId || (ov.suggested ? ov.suggested.loan.id : loans[0].id));

    var loan = App.store.loan(defaultLoanId) || loans[0];
    var st = App.calc.loanStats(loan);
    var defaultAmount = editing ? editing.amount : U.round2(Math.min(st.installment, st.remaining) || st.installment);

    var body =
      (loans.length > 1
        ? W.select({ name: 'loanId', label: 'الدين', required: true, value: loan.id, options: loanOptions(loan.id) })
        : '<input type="hidden" name="loanId" value="' + U.esc(loan.id) + '">') +

      '<div data-payer-slot>' + payerField(loan, editing ? editing.payerId : (opt.payerId || 'me')) + '</div>' +

      W.money({ name: 'amount', label: 'المبلغ المدفوع', required: true, value: defaultAmount, autofocus: true }) +
      '<div data-chips-slot>' + amountChips(st, editing ? editing.payerId : (opt.payerId || 'me')) + '</div>' +

      W.date({ name: 'date', label: 'تاريخ الدفعة', required: true, value: editing ? editing.date : U.today(),
               hint: 'مضبوط على تاريخ اليوم — غيّره لتاريخ سابق أو قادم إن احتجت.' }) +
      dateChips() +

      W.textarea({ name: 'note', label: 'ملاحظات', placeholder: 'مثال: تحويل بنكي، دفعة مقدّمة، سُدّد نقدًا',
                   value: editing ? editing.note : '' }) +

      '<div class="card card--soft"><div class="kv" data-impact></div></div>' +

      (editing ? '<button type="button" class="btn btn--danger btn--block" data-del-pay>' +
                   D.icon('trash') + ' حذف هذه الدفعة</button>' : '');

    App.sheet.open({
      title: editing ? 'تعديل الدفعة' : 'تسجيل دفعة',
      body: '<form data-form novalidate>' + body + '</form>',
      footer: '<button class="btn btn--ghost" type="button" data-sheet-close>إلغاء</button>' +
              '<button class="btn btn--primary" type="button" data-save>' + D.icon('check') + (editing ? ' حفظ' : ' تسجيل الدفعة') + '</button>',
      onMount: function (el, api) {
        var form = el.querySelector('[data-form]');
        refreshImpact(form, opt.paymentId);

        // اختيار الدافع
        el.addEventListener('click', function (e) {
          var pc = e.target.closest('[data-payer-chips] .chip');
          if (!pc) return;
          D.$$('[data-payer-chips] .chip', el).forEach(function (c) { c.classList.remove('is-active'); });
          pc.classList.add('is-active');
          var newPayer = pc.getAttribute('data-val');
          form.querySelector('[name="payerId"]').value = newPayer;
          // رقاقة «باقي حصّته» تتغيّر بتغيّر الدافع
          var curLoan = App.store.loan(form.querySelector('[name="loanId"]').value);
          if (curLoan) form.querySelector('[data-chips-slot]').innerHTML = amountChips(App.calc.loanStats(curLoan), newPayer);
          refreshImpact(form, opt.paymentId);
        });

        el.addEventListener('click', function (e) {
          var chip = e.target.closest('[data-amount-chips] .chip, [data-date-chips] .chip');
          if (!chip) return;
          var group = chip.parentNode;
          var isAmount = group.hasAttribute('data-amount-chips');
          D.$$('.chip', group).forEach(function (c) { c.classList.remove('is-active'); });
          chip.classList.add('is-active');
          form.querySelector(isAmount ? '[name="amount"]' : '[name="date"]').value = chip.getAttribute('data-val');
          refreshImpact(form, opt.paymentId);
        });

        // تغيير الدين يُحدّث الرقائق والمبلغ المقترح
        var sel = form.querySelector('[name="loanId"]');
        if (sel && sel.tagName === 'SELECT') {
          sel.addEventListener('change', function () {
            var l = App.store.loan(sel.value);
            if (!l) return;
            var s2 = App.calc.loanStats(l);
            form.querySelector('[data-chips-slot]').innerHTML = amountChips(s2, 'me');
            // مشاركو الدين الجديد يختلفون — نُعيد بناء اختيار الدافع
            form.querySelector('[data-payer-slot]').innerHTML = payerField(l, 'me');
            if (!editing) form.querySelector('[name="amount"]').value = U.round2(Math.min(s2.installment, s2.remaining) || s2.installment);
            refreshImpact(form, opt.paymentId);
          });
        }

        ['input', 'change'].forEach(function (ev) {
          form.addEventListener(ev, function () { refreshImpact(form, opt.paymentId); });
        });

        var delBtn = el.querySelector('[data-del-pay]');
        if (delBtn) {
          delBtn.addEventListener('click', function () {
            App.sheet.confirm({
              title: 'حذف الدفعة',
              text: 'سيُحذف مبلغ ' + F.money(editing.amount) + ' المسجّل بتاريخ ' + F.date(editing.date) + '.',
              okText: 'حذف', danger: true
            }).then(function (yes) {
              if (!yes) { open(opt); return; }
              App.store.deletePayment(opt.paymentId);
              App.toast.ok('تم حذف الدفعة');
            });
          });
        }

        el.querySelector('[data-save]').addEventListener('click', function () {
          W.clearErrors(form);
          var v = W.values(form);
          var amount = U.toNum(v.amount);
          var errors = 0;

          if (amount <= 0) { W.showError(form, 'amount', 'أدخل مبلغًا أكبر من صفر'); errors++; }
          if (!U.isValidISO(v.date)) { W.showError(form, 'date', 'أدخل تاريخًا صحيحًا'); errors++; }
          if (!v.loanId || !App.store.loan(v.loanId)) { W.showError(form, 'loanId', 'اختر الدين'); errors++; }
          if (errors) { App.toast.error('راجع الحقول المطلوبة'); return; }

          var payload = {
            loanId: v.loanId,
            amount: amount,
            date: v.date,
            payerId: v.payerId || 'me',
            note: String(v.note || '').trim()
          };

          if (editing) {
            App.store.updatePayment(opt.paymentId, payload);
            App.toast.ok('تم تحديث الدفعة');
          } else {
            App.store.addPayment(payload);
            var after = App.calc.loanStats(App.store.loan(v.loanId));
            App.toast.ok(after.finished ? '🎉 تم سداد الدين بالكامل!' : 'تم تسجيل ' + F.money(amount));
          }
          api.close();
        });
      }
    });
  }

  App.paymentForm = { open: open };
})(window.App);
