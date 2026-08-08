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

  var SHARE_MODES = [
    { value: 'pct',    label: 'نسبة %' },
    { value: 'amount', label: 'مبلغ محدّد' },
    { value: 'none',   label: 'بلا حصّة' }
  ];

  function modeSuffix(mode) { return mode === 'pct' ? '%' : F.currency(); }
  function modePlaceholder(mode) { return mode === 'pct' ? 'مثال: 40' : 'مثال: 40000'; }

  function partnerRow(p) {
    var id = (p && p.id) || U.uid('prt');
    var mode = (p && p.shareMode) || 'pct';
    var value = (p && U.toNum(p.shareValue) > 0) ? U.esc(p.shareValue) : '';

    return '<div class="partner-card" data-prt="' + U.esc(id) + '" data-mode="' + U.esc(mode) + '">' +
      '<div class="row">' +
        '<input class="input grow" data-prt-name placeholder="اسم المشارك" value="' + U.esc(p ? p.name : '') + '">' +
        '<button type="button" class="partner-card__rm" data-prt-rm aria-label="إزالة المشارك">' + D.icon('trash') + '</button>' +
      '</div>' +
      '<div class="row" style="gap:8px;margin-top:8px">' +
        '<div class="chips" data-prt-mode>' +
          SHARE_MODES.map(function (m) {
            return '<button type="button" class="chip' + (m.value === mode ? ' is-active' : '') + '" data-val="' + m.value + '">' +
              m.label + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="input-group partner-card__value' + (mode === 'none' ? ' hidden' : '') + '" data-prt-value-wrap>' +
        '<input class="input" data-prt-value type="number" inputmode="decimal" min="0" step="any"' +
        ' placeholder="' + modePlaceholder(mode) + '" value="' + value + '">' +
        '<span class="input-group__suffix" data-prt-suffix>' + U.esc(modeSuffix(mode)) + '</span>' +
      '</div>' +
    '</div>';
  }

  function partnersSection(loan) {
    if (!App.store.sharingOn()) return '';
    var partners = (loan && loan.partners) || [];
    return '<hr style="border:0;border-top:1px solid var(--line)">' +
      '<div class="field" data-partners-field>' +
        '<span class="field__label">المشاركون في السداد</span>' +
        '<span class="field__hint">أشخاص يدفعون معك في هذا الدين. حدّد حصّة كل واحد <b>بنسبة</b> أو <b>بمبلغ إجمالي</b>، أو اختر «بلا حصّة» إن كان يساعدك بمبالغ متغيّرة. الحصّة هدف فقط — الدفعات الفعلية تسجّلها بأي مبلغ وقت ما دفع.</span>' +
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
      var mode = rowEl.getAttribute('data-mode') || 'pct';
      return {
        id: rowEl.getAttribute('data-prt'),
        name: rowEl.querySelector('[data-prt-name]').value.trim(),
        shareMode: mode,
        shareValue: mode === 'none' ? 0 : U.toNum(rowEl.querySelector('[data-prt-value]').value)
      };
    }).filter(function (p) { return p.name; });
  }

  /** إجمالي الدين كما هو مُدخل الآن في النموذج */
  function formTotal(scope) {
    var v = W.values(scope);
    return U.round2(U.toNum(v.installmentAmount) * Math.round(U.toNum(v.installmentsCount)));
  }

  /** ملخّص حيّ للحصص: حصّتي وقيمة حصّة كل مشارك (بالنسبة والمبلغ معًا) */
  function refreshPartners(scope) {
    var box = scope.querySelector('[data-prt-preview]');
    if (!box) return;
    var total = formTotal(scope);
    var partners = readPartners(scope);

    if (!partners.length) {
      box.innerHTML = '<div class="kv__row"><span class="t-muted">لا مشاركين — الدين كلّه عليك</span><span>—</span></div>';
      return;
    }

    var shares = partners.map(function (p) { return App.calc.partnerShare(p, total); });
    var sum = U.sum(shares);
    var mine = U.round2(Math.max(0, total - sum));
    var pctOf = function (amt) { return total > 0 ? F.pct(U.round2(amt / total * 100)) : '—'; };

    var rows = W.kv('حصّتك أنت (المتبقي)', total ? F.moneyHtml(mine) + ' <span class="t-xs t-muted">' + pctOf(mine) + '</span>' : '—');
    partners.forEach(function (p, i) {
      var label = p.name + (p.shareMode === 'none' ? ' — بلا حصّة محدّدة'
        : (p.shareMode === 'pct' ? ' — نسبة ' + F.pct(U.toNum(p.shareValue)) : ' — مبلغ محدّد'));
      var val = p.shareMode === 'none' ? '<span class="t-muted">حرّ</span>'
        : (total ? F.moneyHtml(shares[i]) + ' <span class="t-xs t-muted">' + pctOf(shares[i]) + '</span>' : '—');
      rows += W.kv(label, val);
    });
    if (total > 0 && sum > total) {
      rows += W.kv('تنبيه', '<span class="t-danger">مجموع الحصص ' + F.money(sum) + ' وهو أكبر من إجمالي الدين</span>');
    }
    box.innerHTML = rows;
  }

  /** توزيع الحصص بالتساوي بينك وبين المشاركين (بالنسبة) */
  function splitEqually(scope) {
    var rows = D.$$('[data-prt]', scope).filter(function (r) { return r.querySelector('[data-prt-name]').value.trim(); });
    if (!rows.length) { App.toast.error('أضف مشاركًا واكتب اسمه أوّلًا'); return; }
    var each = Math.floor((100 / (rows.length + 1)) * 100) / 100;   // أنا + المشاركون
    rows.forEach(function (r) { setRowMode(r, 'pct', each); });
    refreshPartners(scope);
  }

  /** تبديل نوع الحصّة في صفّ مشارك */
  function setRowMode(rowEl, mode, value) {
    rowEl.setAttribute('data-mode', mode);
    D.$$('[data-prt-mode] .chip', rowEl).forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-val') === mode);
    });
    var wrap = rowEl.querySelector('[data-prt-value-wrap]');
    var input = rowEl.querySelector('[data-prt-value]');
    wrap.classList.toggle('hidden', mode === 'none');
    rowEl.querySelector('[data-prt-suffix]').textContent = modeSuffix(mode);
    input.placeholder = modePlaceholder(mode);
    if (value !== undefined) input.value = value;
    if (mode === 'none') input.value = '';
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

          // تبديل نوع الحصّة: نسبة / مبلغ / بلا حصّة
          var modeChip = e.target.closest('[data-prt-mode] .chip');
          if (modeChip) {
            setRowMode(modeChip.closest('[data-prt]'), modeChip.getAttribute('data-val'));
            refreshPartners(form);
            return;
          }

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

          // المشاركون: مجموع الحصص لا يتجاوز إجمالي الدين
          var partners = App.store.sharingOn() ? readPartners(form) : ((loan && loan.partners) || []);
          if (App.store.sharingOn() && inst > 0 && count > 0) {
            var totalNow = U.round2(inst * count);
            var sumShares = U.sum(partners, function (p) { return App.calc.partnerShare(p, totalNow); });
            if (sumShares > totalNow) {
              W.showError(form, 'partners',
                'مجموع حصص المشاركين ' + F.money(sumShares) + ' وهو أكبر من إجمالي الدين ' + F.money(totalNow));
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
