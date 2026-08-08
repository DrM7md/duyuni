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

  /* ============================================================
     المشاركون في السداد — قسم اختياري يظهر فقط إن فُعّلت الميزة
     ============================================================ */

  function partnerRow(p) {
    var id = (p && p.id) || U.uid('prt');
    var pct = p && U.toNum(p.sharePct) > 0 ? U.esc(p.sharePct) : '';
    return '<div class="partner-row" data-prt="' + U.esc(id) + '">' +
      '<input class="input grow" data-prt-name placeholder="اسم المشارك" value="' + U.esc(p ? p.name : '') + '">' +
      '<div class="input-group partner-row__pct">' +
        '<input class="input" data-prt-pct type="number" inputmode="decimal" min="0" max="100" step="1" placeholder="حصّة" value="' + pct + '">' +
        '<span class="input-group__suffix">%</span>' +
      '</div>' +
      '<button type="button" class="partner-row__rm" data-prt-rm aria-label="إزالة المشارك">' + D.icon('trash') + '</button>' +
    '</div>';
  }

  function partnersSection(loan) {
    if (!App.store.sharingOn()) return '';
    var partners = (loan && loan.partners) || [];
    return '<hr style="border:0;border-top:1px solid var(--line)">' +
      '<div class="field" data-partners-field>' +
        '<span class="field__label">المشاركون في السداد</span>' +
        '<span class="field__hint">أشخاص يدفعون معك في هذا الدين. «الحصّة» نسبته من إجمالي الدين — اتركها فارغة إن كان يساعدك بمبالغ غير محدّدة.</span>' +
        '<div data-partners-list>' + partners.map(partnerRow).join('') + '</div>' +
        '<div class="row" style="gap:8px">' +
          '<button type="button" class="btn btn--soft btn--sm" data-prt-add>' + D.icon('plus') + ' إضافة مشارك</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-prt-equal>قسمة بالتساوي</button>' +
        '</div>' +
        '<div class="card card--soft" data-prt-preview></div>' +
        '<span class="field__err hidden" data-err-for="partners"></span>' +
      '</div>';
  }

  /** قراءة المشاركين من النموذج (نتجاهل الصفوف بلا اسم) */
  function readPartners(scope) {
    return D.$$('[data-prt]', scope).map(function (rowEl) {
      return {
        id: rowEl.getAttribute('data-prt'),
        name: rowEl.querySelector('[data-prt-name]').value.trim(),
        sharePct: U.toNum(rowEl.querySelector('[data-prt-pct]').value)
      };
    }).filter(function (p) { return p.name; });
  }

  /** ملخّص حيّ للحصص: نسبتي وقيمة حصّة كل مشارك */
  function refreshPartners(scope) {
    var box = scope.querySelector('[data-prt-preview]');
    if (!box) return;
    var v = W.values(scope);
    var total = U.round2(U.toNum(v.installmentAmount) * Math.round(U.toNum(v.installmentsCount)));
    var partners = readPartners(scope);

    if (!partners.length) {
      box.innerHTML = '<div class="kv__row"><span class="t-muted">لا مشاركين — الدين كلّه عليك</span><span>—</span></div>';
      return;
    }

    var sum = U.round2(partners.reduce(function (a, p) { return a + p.sharePct; }, 0));
    var myPct = U.round2(Math.max(0, 100 - sum));
    var amount = function (pct) { return total ? F.moneyHtml(U.round2(total * pct / 100)) : '—'; };

    var rows = W.kv('حصّتك أنت (' + F.pct(myPct) + ')', amount(myPct));
    partners.forEach(function (p) {
      rows += W.kv(p.name + (p.sharePct > 0 ? ' (' + F.pct(p.sharePct) + ')' : ' — بلا حصّة محدّدة'),
        p.sharePct > 0 ? amount(p.sharePct) : '—');
    });
    if (sum > 100) rows += W.kv('تنبيه', '<span class="t-danger">مجموع الحصص ' + F.pct(sum) + ' وهو أكبر من 100%</span>');
    box.innerHTML = rows;
  }

  /** توزيع الحصص بالتساوي بينك وبين المشاركين */
  function splitEqually(scope) {
    var rows = D.$$('[data-prt]', scope).filter(function (r) { return r.querySelector('[data-prt-name]').value.trim(); });
    if (!rows.length) { App.toast.error('أضف مشاركًا واكتب اسمه أوّلًا'); return; }
    var people = rows.length + 1;                       // أنا + المشاركون
    var each = Math.floor((100 / people) * 100) / 100;   // نصيب كل مشارك
    rows.forEach(function (r) { r.querySelector('[data-prt-pct]').value = each; });
    refreshPartners(scope);
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

      partnersSection(loan) +

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
        refreshPartners(form);

        // رقائق النوع
        el.addEventListener('click', function (e) {
          var chip = e.target.closest('[data-chips="type"] .chip');
          if (chip) {
            D.$$('[data-chips="type"] .chip', el).forEach(function (c) { c.classList.remove('is-active'); });
            chip.classList.add('is-active');
            form.querySelector('[name="type"]').value = chip.getAttribute('data-val');
          }
        });

        // أزرار المشاركين
        el.addEventListener('click', function (e) {
          if (e.target.closest('[data-prt-add]')) {
            var list = form.querySelector('[data-partners-list]');
            list.insertAdjacentHTML('beforeend', partnerRow(null));
            var inputs = D.$$('[data-prt-name]', list);
            if (inputs.length) inputs[inputs.length - 1].focus();
            refreshPartners(form);
            return;
          }
          if (e.target.closest('[data-prt-equal]')) { splitEqually(form); return; }

          var rm = e.target.closest('[data-prt-rm]');
          if (rm) {
            var rowEl = rm.closest('[data-prt]');
            var pid = rowEl.getAttribute('data-prt');
            // نمنع إزالة مشارك له دفعات مسجّلة حتى لا تُفقد نسبة دفعاته
            var n = isEdit ? App.store.partnerPaymentsCount(loanId, pid) : 0;
            if (n > 0) {
              W.showError(form, 'partners',
                'لا يمكن إزالة «' + rowEl.querySelector('[data-prt-name]').value.trim() + '» لأن له ' +
                F.num(n) + ' دفعة مسجّلة — احذف دفعاته أو غيّر الدافع فيها أوّلًا.');
              return;
            }
            rowEl.remove();
            refreshPartners(form);
          }
        });

        // تحديث الملخّص الحيّ
        ['input', 'change'].forEach(function (ev) {
          form.addEventListener(ev, function () { refreshPreview(form); refreshPartners(form); });
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

          // المشاركون: مجموع الحصص لا يتجاوز 100%
          var partners = App.store.sharingOn() ? readPartners(form) : ((loan && loan.partners) || []);
          if (App.store.sharingOn()) {
            var sumPct = U.round2(partners.reduce(function (a, p) { return a + p.sharePct; }, 0));
            if (sumPct > 100) {
              W.showError(form, 'partners', 'مجموع حصص المشاركين ' + F.pct(sumPct) + ' — لا يجوز أن يتجاوز 100%');
              errors++;
            }
          }

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
            partners: partners,
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
