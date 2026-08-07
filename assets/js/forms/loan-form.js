/* ============================================================
   loan-form.js — نموذج إضافة/تعديل دين (تمويل، سلفة، دين شخص)
   الفكرة: المستخدم يعرف عادةً «قيمة القسط» و«عدد الأقساط»،
   فنحسب له الإجمالي المستحق تلقائيًا ونعرضه أمامه قبل الحفظ.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  function typeChips(active) {
    return '<div class="field">' +
      '<span class="field__label">نوع الجهة</span>' +
      '<div class="chips" data-chips="type">' +
        App.config.LENDER_TYPES.map(function (t) {
          return '<button type="button" class="chip' + (t.value === active ? ' is-active' : '') + '" data-val="' + t.value + '">' +
            U.esc(t.label) + '</button>';
        }).join('') +
      '</div>' +
      '<input type="hidden" name="type" value="' + U.esc(active) + '">' +
    '</div>';
  }

  function previewBox() {
    return '<div class="card card--soft" data-preview>' +
      '<div class="kv" data-preview-body></div>' +
    '</div>';
  }

  /** حساب وعرض الملخّص الحيّ أثناء الكتابة */
  function refreshPreview(scope) {
    var v = W.values(scope);
    var inst = U.toNum(v.installmentAmount);
    var count = Math.max(0, Math.round(U.toNum(v.installmentsCount)));
    var principal = U.toNum(v.principal);
    var total = U.round2(inst * count);
    var body = scope.querySelector('[data-preview-body]');
    if (!body) return;

    if (!inst || !count) {
      body.innerHTML = '<div class="kv__row"><span>أدخل قيمة القسط وعددها</span><span class="t-muted">—</span></div>';
      return;
    }

    var start = U.isValidISO(v.startDate) ? v.startDate : U.today();
    var end = U.addMonths(start, count - 1);
    var extra = U.round2(total - principal);

    var rows = W.kv('إجمالي ما ستسدّده', F.moneyHtml(total));
    if (principal > 0 && Math.abs(extra) >= 0.01) {
      rows += W.kv(extra > 0 ? 'تكلفة إضافية (فوائد/رسوم)' : 'فرق لصالحك',
        '<span class="' + (extra > 0 ? 't-warn' : 't-ok') + '">' + F.moneyHtml(Math.abs(extra)) + '</span>');
    }
    rows += W.kv('مدّة السداد', F.duration(count) + ' (' + F.installments(count) + ')');
    rows += W.kv('آخر قسط', '<time>' + F.date(end) + '</time>');
    body.innerHTML = rows;
  }

  /**
   * فتح النموذج.
   * @param {string|null} loanId معرّف الدين للتعديل، أو null للإضافة
   */
  function open(loanId) {
    var loan = loanId ? App.store.loan(loanId) : null;
    var isEdit = !!loan;
    var st = loan ? App.calc.loanStats(loan) : null;

    var body =
      W.text({ name: 'title', label: 'اسم الدين', required: true, autofocus: !isEdit,
               placeholder: 'مثال: تمويل شخصي، سلفة من أحمد', value: loan ? loan.title : '' }) +
      typeChips(loan ? loan.type : 'bank') +
      W.text({ name: 'lender', label: 'الجهة / الشخص', placeholder: 'مثال: بنك قطر الوطني، أحمد',
               value: loan ? loan.lender : '' }) +

      '<hr style="border:0;border-top:1px solid var(--line)">' +

      W.money({ name: 'principal', label: 'المبلغ الذي حصلت عليه', value: loan ? loan.principal : '',
                hint: 'المبلغ الأصلي قبل أي فوائد أو رسوم' }) +
      '<div class="field-grid">' +
        W.money({ name: 'installmentAmount', label: 'قيمة القسط',
                  value: st ? st.installment : '' }) +
        W.number({ name: 'installmentsCount', label: 'عدد الأقساط', required: true, min: 1,
                   value: loan ? loan.installmentsCount : '', placeholder: '48' }) +
      '</div>' +
      W.date({ name: 'startDate', label: 'تاريخ أول قسط', required: true,
               value: loan ? loan.startDate : U.today() }) +

      previewBox() +

      W.money({ name: 'openingPaid', label: 'مبلغ سُدّد قبل استخدام التطبيق', value: loan ? loan.openingPaid : '',
                hint: 'اتركه فارغًا إن لم تسدّد شيئًا بعد. الدفعات التي تسجّلها لاحقًا تُضاف عليه.' }) +
      W.textarea({ name: 'notes', label: 'ملاحظات', placeholder: 'رقم العقد، شروط، أي تفاصيل تريد تذكّرها',
                   value: loan ? loan.notes : '' }) +

      (isEdit ? '<button type="button" class="btn btn--danger btn--block" data-del-loan>' +
                  D.icon('trash') + ' حذف هذا الدين وكل دفعاته</button>' : '');

    App.sheet.open({
      title: isEdit ? 'تعديل الدين' : 'إضافة دين جديد',
      body: '<form data-form novalidate>' + body + '</form>',
      footer: '<button class="btn btn--ghost" type="button" data-sheet-close>إلغاء</button>' +
              '<button class="btn btn--primary" type="button" data-save>' + D.icon('check') + (isEdit ? ' حفظ التعديل' : ' إضافة الدين') + '</button>',
      onMount: function (el, api) {
        var form = el.querySelector('[data-form]');
        refreshPreview(form);

        // رقائق النوع
        el.addEventListener('click', function (e) {
          var chip = e.target.closest('[data-chips="type"] .chip');
          if (chip) {
            D.$$('[data-chips="type"] .chip', el).forEach(function (c) { c.classList.remove('is-active'); });
            chip.classList.add('is-active');
            form.querySelector('[name="type"]').value = chip.getAttribute('data-val');
          }
        });

        // تحديث الملخّص الحيّ
        ['input', 'change'].forEach(function (ev) {
          form.addEventListener(ev, function () { refreshPreview(form); });
        });

        // حذف الدين
        var delBtn = el.querySelector('[data-del-loan]');
        if (delBtn) {
          delBtn.addEventListener('click', function () {
            App.sheet.confirm({
              title: 'حذف الدين',
              text: 'سيُحذف «' + loan.title + '» مع كل الدفعات المسجّلة عليه. لا يمكن التراجع.',
              okText: 'حذف نهائيًا', danger: true
            }).then(function (yes) {
              if (!yes) { open(loanId); return; }
              App.store.deleteLoan(loanId);
              App.toast.ok('تم حذف الدين');
              App.router.go('/loans');
            });
          });
        }

        // الحفظ
        el.querySelector('[data-save]').addEventListener('click', function () {
          W.clearErrors(form);
          var v = W.values(form);
          var errors = 0;

          if (!String(v.title || '').trim()) { W.showError(form, 'title', 'أدخل اسمًا للدين'); errors++; }

          var inst = U.toNum(v.installmentAmount);
          var count = Math.round(U.toNum(v.installmentsCount));
          if (count < 1) { W.showError(form, 'installmentsCount', 'عدد الأقساط لا يقلّ عن 1'); errors++; }
          if (inst <= 0) { W.showError(form, 'installmentAmount', 'أدخل قيمة القسط'); errors++; }
          if (!U.isValidISO(v.startDate)) { W.showError(form, 'startDate', 'أدخل تاريخًا صحيحًا'); errors++; }
          if (errors) { App.toast.error('راجع الحقول المطلوبة'); return; }

          var total = U.round2(inst * count);
          var openingPaid = U.clamp(U.toNum(v.openingPaid), 0, total);

          var data = {
            title: String(v.title).trim(),
            lender: String(v.lender || '').trim(),
            type: v.type || 'other',
            principal: U.toNum(v.principal) || total,
            totalDue: total,
            installmentsCount: count,
            startDate: v.startDate,
            openingPaid: openingPaid,
            notes: String(v.notes || '').trim()
          };

          if (isEdit) {
            App.store.updateLoan(loanId, data);
            App.toast.ok('تم حفظ التعديل');
          } else {
            var created = App.store.addLoan(data);
            App.toast.ok('تمت إضافة الدين');
            api.close();
            App.router.go('/loan/' + created.id);
            return;
          }
          api.close();
        });
      }
    });
  }

  App.loanForm = { open: open };
})(window.App);
