/* ============================================================
   widgets.js — قوالب HTML مشتركة تُستخدم في كل الشاشات
   (تعيد نصوصًا، والشاشات تجمّعها — يمنع التكرار)
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, D = App.dom;
  var W = {};

  /* ---------- خلية إحصاء ---------- */
  W.tile = function (label, value, sub, cls) {
    return '<div class="tile">' +
      '<span class="tile__label">' + U.esc(label) + '</span>' +
      '<span class="tile__value ' + (cls || '') + '">' + value + '</span>' +
      (sub ? '<span class="tile__sub">' + sub + '</span>' : '') +
    '</div>';
  };

  /* ---------- شريط تقدّم ---------- */
  W.bar = function (pct, thin, ok) {
    var w = U.clamp(U.toNum(pct), 0, 100);
    return '<div class="bar' + (thin ? ' bar--thin' : '') + (ok ? ' bar--ok' : '') + '">' +
      '<div class="bar__fill" style="width:' + w + '%"></div></div>';
  };

  /* ---------- صف مفتاح/قيمة ---------- */
  W.kv = function (key, value, cls) {
    return '<div class="kv__row ' + (cls || '') + '"><span>' + U.esc(key) + '</span><span>' + value + '</span></div>';
  };

  /* ---------- تنبيه ---------- */
  W.alert = function (kind, icon, title, text, actionHtml) {
    return '<div class="alert alert--' + kind + '">' +
      '<span class="alert__icon">' + D.icon(icon) + '</span>' +
      '<div class="grow"><div class="alert__title">' + title + '</div>' +
      (text ? '<div class="alert__text">' + text + '</div>' : '') + '</div>' +
      (actionHtml || '') +
    '</div>';
  };

  /* ---------- حالة فارغة ---------- */
  W.empty = function (icon, title, text, actionHtml) {
    return '<div class="card"><div class="empty">' +
      '<div class="empty__icon">' + D.icon(icon) + '</div>' +
      '<div class="empty__title">' + U.esc(title) + '</div>' +
      (text ? '<div class="empty__text">' + U.esc(text) + '</div>' : '') +
      (actionHtml || '') +
    '</div></div>';
  };

  /* ---------- عنوان قسم ---------- */
  W.sectionTitle = function (title, actionHtml) {
    return '<div class="section-title"><span>' + U.esc(title) + '</span>' + (actionHtml || '') + '</div>';
  };

  /* ---------- بطاقة دين في القائمة ---------- */
  W.loanCard = function (st) {
    var loan = st.loan;
    var meta = App.calc.statusMeta(st.status);
    var sub = [];
    if (loan.lender) sub.push(U.esc(loan.lender));
    sub.push(D.lenderLabel(loan.type));

    var footRight = st.finished
      ? 'اكتمل السداد ' + (st.lastPaymentDate ? 'في ' + F.dateShort(st.lastPaymentDate) : '')
      : (st.nextDueDate ? 'القسط القادم: ' + F.dateShort(st.nextDueDate) : '');

    return '<a class="loan-card" href="#/loan/' + loan.id + '">' +
      '<div class="loan-card__top">' +
        '<span class="avatar' + (st.finished ? ' avatar--ok' : '') + '">' + (st.finished ? D.icon('check') : D.lenderIcon(loan.type)) + '</span>' +
        '<div class="grow">' +
          '<div class="loan-card__name truncate">' + U.esc(loan.title) + '</div>' +
          '<div class="loan-card__sub truncate">' + sub.join(' · ') + '</div>' +
        '</div>' +
        '<div class="loan-card__amt">' +
          '<b class="money">' + F.num(st.remaining) + '</b>' +
          '<span>' + (st.finished ? 'لا شيء متبقٍ' : 'المتبقي') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="loan-card__bar">' + W.bar(st.progress, true, st.finished) + '</div>' +
      '<div class="loan-card__foot">' +
        '<span>' + F.num(st.paidInstallments) + '/' + F.num(st.count) + ' قسط · <span class="badge ' + meta.cls + '">' + meta.label + '</span></span>' +
        '<span>' + footRight + '</span>' +
      '</div>' +
    '</a>';
  };

  /* ---------- مؤشّر نسبة الاستقطاع من الراتب ---------- */
  W.gauge = function (dti, level) {
    var w = U.clamp(dti, 0, 100);
    var txt = level === 'ok' ? 'نسبة مريحة' : (level === 'warn' ? 'نسبة مرتفعة' : 'نسبة خطرة');
    return '<div class="gauge">' +
      '<div class="row row--between t-sm t-bold"><span>' + U.esc(txt) + '</span><span class="num">' + F.pct(dti) + '</span></div>' +
      '<div class="gauge__track"><div class="gauge__fill gauge__fill--' + level + '" style="width:' + w + '%"></div></div>' +
      '<div class="gauge__scale"><span>0%</span><span>33%</span><span>50%</span><span>100%</span></div>' +
    '</div>';
  };

  /* ---------- حقول النماذج ---------- */
  W.field = function (opt) {
    var id = opt.id || opt.name;
    return '<div class="field">' +
      '<label class="field__label" for="' + id + '">' + U.esc(opt.label) + (opt.required ? ' <span class="t-danger">*</span>' : '') + '</label>' +
      opt.control +
      (opt.hint ? '<span class="field__hint">' + opt.hint + '</span>' : '') +
      '<span class="field__err hidden" data-err-for="' + id + '"></span>' +
    '</div>';
  };

  W.text = function (opt) {
    return W.field({
      id: opt.name, label: opt.label, required: opt.required, hint: opt.hint,
      control: '<input class="input" id="' + opt.name + '" name="' + opt.name + '" type="' + (opt.type || 'text') +
        '" value="' + U.esc(opt.value === undefined ? '' : opt.value) + '"' +
        (opt.placeholder ? ' placeholder="' + U.esc(opt.placeholder) + '"' : '') +
        (opt.autofocus ? ' data-autofocus' : '') +
        (opt.attrs || '') + '>'
    });
  };

  W.money = function (opt) {
    return W.field({
      id: opt.name, label: opt.label, required: opt.required, hint: opt.hint,
      control: '<div class="input-group">' +
        '<input class="input" id="' + opt.name + '" name="' + opt.name + '" type="number" inputmode="decimal" step="0.01" min="0"' +
        ' value="' + (opt.value === undefined || opt.value === null || opt.value === 0 ? '' : U.esc(opt.value)) + '"' +
        (opt.placeholder ? ' placeholder="' + U.esc(opt.placeholder) + '"' : ' placeholder="0"') +
        (opt.autofocus ? ' data-autofocus' : '') + '>' +
        '<span class="input-group__suffix">' + U.esc(F.currency()) + '</span>' +
      '</div>'
    });
  };

  W.number = function (opt) {
    return W.field({
      id: opt.name, label: opt.label, required: opt.required, hint: opt.hint,
      control: '<input class="input" id="' + opt.name + '" name="' + opt.name + '" type="number" inputmode="numeric" step="1"' +
        ' min="' + (opt.min !== undefined ? opt.min : 1) + '"' +
        (opt.max !== undefined ? ' max="' + opt.max + '"' : '') +
        ' value="' + (opt.value === undefined || opt.value === null ? '' : U.esc(opt.value)) + '"' +
        (opt.placeholder ? ' placeholder="' + U.esc(opt.placeholder) + '"' : '') + '>'
    });
  };

  W.date = function (opt) {
    return W.field({
      id: opt.name, label: opt.label, required: opt.required, hint: opt.hint,
      control: '<input class="input" id="' + opt.name + '" name="' + opt.name + '" type="date" value="' + U.esc(opt.value || '') + '">'
    });
  };

  W.select = function (opt) {
    var options = opt.options.map(function (o) {
      var sel = String(o.value) === String(opt.value) ? ' selected' : '';
      return '<option value="' + U.esc(o.value) + '"' + sel + '>' + U.esc(o.label) + '</option>';
    }).join('');
    return W.field({
      id: opt.name, label: opt.label, required: opt.required, hint: opt.hint,
      control: '<select class="select" id="' + opt.name + '" name="' + opt.name + '">' + options + '</select>'
    });
  };

  W.textarea = function (opt) {
    return W.field({
      id: opt.name, label: opt.label, hint: opt.hint,
      control: '<textarea class="textarea" id="' + opt.name + '" name="' + opt.name + '"' +
        (opt.placeholder ? ' placeholder="' + U.esc(opt.placeholder) + '"' : '') + '>' +
        U.esc(opt.value || '') + '</textarea>'
    });
  };

  /* ---------- إظهار خطأ حقل ---------- */
  W.showError = function (scope, name, msg) {
    var input = scope.querySelector('[name="' + name + '"]');
    var err = scope.querySelector('[data-err-for="' + name + '"]');
    if (input) input.classList.add('is-err');
    if (err) { err.textContent = msg; err.classList.remove('hidden'); }
  };

  W.clearErrors = function (scope) {
    App.dom.$$('.is-err', scope).forEach(function (el) { el.classList.remove('is-err'); });
    App.dom.$$('[data-err-for]', scope).forEach(function (el) { el.classList.add('hidden'); });
  };

  /** قراءة قيم النموذج */
  W.values = function (scope) {
    var out = {};
    App.dom.$$('input, select, textarea', scope).forEach(function (el) {
      if (!el.name) return;
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  };

  App.widgets = W;
})(window.App);
