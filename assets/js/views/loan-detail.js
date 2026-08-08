/* ============================================================
   views/loan-detail.js — تفاصيل دين واحد + جدول أقساطه + دفعاته
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  var expanded = {};   // { loanId: true } لإظهار كل الأقساط

  /* ---------- جدول الأقساط ---------- */
  function schedule(st) {
    var id = st.loan.id;
    var count = st.count;
    var showAll = !!expanded[id];
    var from = 0, to = count;

    if (!showAll && count > 8) {
      from = Math.max(0, st.paidInstallments - 2);
      to = Math.min(count, from + 7);
    }

    var rows = '';
    for (var i = from; i < to; i++) {
      var date = st.schedule[i];
      var isPaid = i < st.paidInstallments;
      var isNext = !isPaid && i === st.paidInstallments;
      var isLate = !isPaid && U.diffDays(date, U.today()) >= 0;
      var cls = (isPaid ? ' is-paid' : '') + (isLate ? ' is-late' : '') + (isNext ? ' is-next' : '');
      var tag = isPaid ? '<span class="badge badge--ok">مدفوع</span>'
        : (isLate ? '<span class="badge badge--danger">متأخّر</span>'
        : (isNext ? '<span class="badge badge--brand">القادم</span>' : ''));

      rows += '<div class="sched__row' + cls + '">' +
        '<span class="sched__no">' + (isPaid ? D.icon('check') : F.num(i + 1)) + '</span>' +
        '<span class="grow"><time>' + F.dateShort(date) + '</time></span>' +
        tag +
        '<span class="sched__amt money">' + F.num(st.installment) + '</span>' +
      '</div>';
    }

    var toggle = count > 8
      ? '<button class="btn btn--sm btn--soft btn--block" data-toggle-sched="' + id + '" style="border-radius:0;min-height:42px">' +
          (showAll ? 'إخفاء الأقساط' : 'عرض كل الأقساط (' + F.num(count) + ')') + '</button>'
      : '';

    return W.sectionTitle('جدول الأقساط',
        '<span class="t-xs t-muted">' + F.num(st.paidInstallments) + ' مدفوع من ' + F.num(count) + '</span>') +
      '<div class="card card--flush"><div class="sched">' + rows + '</div>' + toggle + '</div>';
  }

  /* ---------- توزيع السداد بين صاحب الدين والمشاركين ---------- */
  function contributors(st) {
    if (!App.store.sharingOn() || !st.shared) return '';

    var rows = st.contributors.map(function (c) {
      var right = c.hasShare
        ? '<b class="money">' + F.num(c.paid) + '</b>' +
          '<div class="t-xs t-muted">من <span class="num">' + F.num(c.shareAmount) + '</span></div>'
        : '<b class="money">' + F.num(c.paid) + '</b><div class="t-xs t-muted">مدفوع</div>';
      // وصف الحصّة: بحسب ما اختاره المستخدم (نسبة / مبلغ محدّد / بلا حصّة)
      var shareText = !c.hasShare ? 'بلا حصّة محدّدة — يدفع بمبالغ متغيّرة'
        : (c.isMe ? 'حصّتك المتبقية ' + F.pct(c.sharePct)
          : (c.shareMode === 'amount'
              ? 'حصّته مبلغ محدّد ' + F.money(c.shareAmount) + ' (' + F.pct(c.sharePct) + ')'
              : 'حصّته ' + F.pct(c.sharePct)));
      var sub = c.hasShare
        ? shareText + ' · ' + (c.remaining > 0
            ? (c.isMe ? 'متبقٍ عليك ' : 'متبقٍ عليه ') + F.money(c.remaining)
            : (c.isMe ? 'أكملت حصّتك ✓' : 'أكمل حصّته ✓'))
        : shareText + (c.paymentsCount
            ? ' · ' + F.num(c.paymentsCount) + ' دفعة بمتوسّط ' + F.money(c.avgPayment)
            : '');
      if (c.lastPaymentDate) sub += ' · آخر دفعة ' + F.dateShort(c.lastPaymentDate);

      return '<div class="contrib">' +
        '<div class="row">' +
          '<span class="avatar' + (c.hasShare && c.remaining === 0 ? ' avatar--ok' : '') + '">' +
            (c.isMe ? D.icon('user') : U.esc(U.initials(c.name))) + '</span>' +
          '<div class="grow" style="min-width:0">' +
            '<div class="t-sm t-bold truncate">' + U.esc(c.name) +
              (c.isMe ? ' <span class="badge badge--brand">صاحب الدين</span>' : '') + '</div>' +
            '<div class="t-xs t-muted">' + sub + '</div>' +
          '</div>' +
          '<div style="text-align:end;flex-shrink:0">' + right + '</div>' +
        '</div>' +
        (c.progress !== null ? '<div style="margin-top:8px">' + W.bar(c.progress, true, c.remaining === 0) + '</div>' : '') +
      '</div>';
    }).join('');

    return W.sectionTitle('توزيع السداد',
        '<span class="t-xs t-muted">دفع الآخرون ' + F.money(st.paidByOthers) + '</span>') +
      '<div class="card card--flush">' + rows + '</div>';
  }

  /* ---------- دفعات هذا الدين ---------- */
  function payments(st) {
    var showPayer = App.store.sharingOn() && st.shared;
    if (!st.payments.length) {
      return W.sectionTitle('الدفعات المسجّلة') +
        '<div class="card center t-sm t-muted" style="padding:20px">' +
          'لم تسجّل أي دفعة على هذا الدين بعد.' +
          (st.loan.openingPaid > 0 ? '<div class="t-xs" style="margin-top:6px">يوجد مبلغ سابق مُدرج: ' + F.money(st.loan.openingPaid) + '</div>' : '') +
        '</div>';
    }

    return W.sectionTitle('الدفعات المسجّلة',
        '<span class="t-xs t-muted">' + F.num(st.payments.length) + ' دفعة · ' + F.money(st.loggedPaid) + '</span>') +
      '<div class="card card--flush">' + st.payments.map(function (p) {
        var payer = (showPayer && (p.payerId || 'me') !== 'me')
          ? ' <span class="badge">' + U.esc(App.calc.payerName(p)) + '</span>' : '';
        return '<button class="pay-row" data-action="edit-payment" data-id="' + p.id + '">' +
          '<span class="avatar avatar--ok">' + D.icon('check') + '</span>' +
          '<span class="grow" style="min-width:0">' +
            '<span class="t-sm t-bold" style="display:block"><time>' + F.dateShort(p.date) + '</time>' + payer + '</span>' +
            (p.note ? '<span class="t-xs t-muted truncate" style="display:block">' + U.esc(p.note) + '</span>' : '') +
          '</span>' +
          '<span class="pay-row__amt money">' + F.num(p.amount) + '</span>' +
          D.icon('chevron', 'chev') +
        '</button>';
      }).join('') + '</div>';
  }

  App.views = App.views || {};
  App.views.loanDetail = {
    back: true,

    title: function (params) {
      var loan = App.store.loan(params.id);
      return loan ? loan.title : 'تفاصيل الدين';
    },

    actions: function (params) {
      return '<button class="appbar__btn" data-action="edit-loan" data-id="' + U.esc(params.id) + '" aria-label="تعديل">' + D.icon('edit') + '</button>';
    },

    render: function (params) {
      var loan = App.store.loan(params.id);
      if (!loan) {
        return W.empty('alert', 'هذا الدين غير موجود', 'ربما حُذف.',
          '<a class="btn btn--primary btn--block" href="#/loans" style="margin-top:6px">رجوع للديون</a>');
      }

      var st = App.calc.loanStats(loan);
      var meta = App.calc.statusMeta(st.status);
      var extra = U.round2(st.total - loan.principal);

      var hero = '<div class="hero">' +
          '<div class="row row--between">' +
            '<div class="hero__label">' + (st.finished ? 'اكتمل السداد' : 'المتبقي على هذا الدين') + '</div>' +
            '<span class="badge ' + meta.cls + '">' + meta.label + '</span>' +
          '</div>' +
          '<div class="hero__value"><span class="money">' + F.num(st.remaining) + '</span><small>' + U.esc(F.currency()) + '</small></div>' +
          '<div class="hero__bar"><i style="width:' + U.clamp(st.progress, 0, 100) + '%"></i></div>' +
          '<div class="hero__meta">' +
            '<span>سدّدت ' + F.pct(st.progress) + ' (' + F.money(st.paid) + ')</span>' +
            '<span>من ' + F.money(st.total) + '</span>' +
          '</div>' +
          '<div class="hero__pills">' +
            '<div class="hero__pill"><b class="money">' + F.num(st.installment) + '</b><span>قيمة القسط</span></div>' +
            '<div class="hero__pill"><b class="num">' + F.num(st.remainingInstallments) + '</b><span>قسط متبقٍ</span></div>' +
            '<div class="hero__pill"><b class="num">' + F.num(Math.max(0, st.daysToEnd)) + '</b><span>يوم للانتهاء</span></div>' +
          '</div>' +
        '</div>';

      var warn = '';
      if (st.lateAmount > 0.01) {
        warn = W.alert('danger', 'alert',
          'متأخّر ' + F.installments(st.lateInstallments),
          'المطلوب سداده الآن: ' + F.money(st.lateAmount),
          '<button class="btn btn--sm btn--danger" data-action="pay-loan" data-id="' + loan.id + '">سدّد</button>');
      } else if (st.nextDueDays !== null && st.nextDueDays <= (App.store.state.settings.alertDays || 7)) {
        warn = W.alert('warn', 'clock', 'القسط القادم ' + F.relativeDue(st.nextDueDate),
          F.money(st.installment) + ' · ' + F.dateShort(st.nextDueDate),
          '<button class="btn btn--sm btn--soft" data-action="pay-loan" data-id="' + loan.id + '">سدّد</button>');
      } else if (st.finished) {
        warn = W.alert('ok', 'trophy', 'تم سداد هذا الدين بالكامل 🎉',
          st.lastPaymentDate ? 'آخر دفعة بتاريخ ' + F.dateShort(st.lastPaymentDate) : '');
      }

      var actionBtns = st.finished ? '' :
        '<button class="btn btn--primary btn--block" data-action="pay-loan" data-id="' + loan.id + '">' +
          D.icon('plus') + ' تسجيل دفعة على هذا الدين</button>';

      var info = W.sectionTitle('بيانات الدين') +
        '<div class="card card--flush"><div class="kv">' +
          (loan.lender ? W.kv('الجهة / الشخص', U.esc(loan.lender)) : '') +
          W.kv('النوع', D.lenderLabel(loan.type)) +
          W.kv('المبلغ الذي حصلت عليه', F.moneyHtml(loan.principal)) +
          W.kv('إجمالي ما ستسدّده', F.moneyHtml(st.total)) +
          (Math.abs(extra) > 0.01
            ? W.kv(extra > 0 ? 'تكلفة إضافية' : 'فرق لصالحك',
                '<span class="' + (extra > 0 ? 't-warn' : 't-ok') + '">' + F.moneyHtml(Math.abs(extra)) + '</span>')
            : '') +
          W.kv('قيمة القسط الشهري', F.moneyHtml(st.installment)) +
          W.kv('عدد الأقساط', '<span class="num">' + F.num(st.count) + '</span> (' + F.duration(st.count) + ')') +
          W.kv('تاريخ أوّل قسط', '<time>' + F.date(loan.startDate) + '</time>') +
          W.kv('تاريخ آخر قسط', '<time>' + F.date(st.endDate) + '</time>') +
        '</div></div>';

      var progressCard = W.sectionTitle('حالة السداد') +
        '<div class="card card--flush"><div class="kv">' +
          W.kv('المسدَّد', '<span class="t-ok">' + F.moneyHtml(st.paid) + '</span>') +
          (loan.openingPaid > 0 ? W.kv('منه مبلغ سابق قبل التطبيق', F.moneyHtml(loan.openingPaid)) : '') +
          W.kv('المتبقي', '<span class="t-danger">' + F.moneyHtml(st.remaining) + '</span>') +
          (App.store.sharingOn() && st.shared
            ? W.kv('منه دفع الآخرون', '<span class="t-ok">' + F.moneyHtml(st.paidByOthers) + '</span>') +
              (st.me.hasShare
                ? W.kv('المتبقي على حصّتك أنت (' + F.pct(st.me.sharePct) + ')',
                    '<span class="t-danger">' + F.moneyHtml(st.me.remaining) + '</span>')
                : '')
            : '') +
          W.kv('الأقساط المدفوعة', '<span class="num">' + F.num(st.paidInstallments) + ' / ' + F.num(st.count) + '</span>') +
          W.kv('الأقساط المتبقية', '<span class="num">' + F.num(st.remainingInstallments) + '</span>') +
          (st.finished ? '' : W.kv('القسط القادم', '<time>' + F.dateShort(st.nextDueDate) + '</time> <span class="t-xs t-muted">(' + F.relativeDue(st.nextDueDate) + ')</span>')) +
          (st.finished ? '' : W.kv('المدّة المتبقية', F.duration(st.monthsToEnd))) +
          (st.aheadAmount > 0.01 ? W.kv('متقدّم بمقدار', '<span class="t-ok">' + F.moneyHtml(st.aheadAmount) + '</span>') : '') +
        '</div></div>';

      var notes = loan.notes
        ? '<div class="note-box">' + D.icon('info') + '<span>' + U.esc(loan.notes).replace(/\n/g, '<br>') + '</span></div>'
        : '';

      return hero + warn + actionBtns + info + progressCard + contributors(st) + schedule(st) + payments(st) + notes +
        '<button class="btn btn--ghost btn--block" data-action="edit-loan" data-id="' + loan.id + '">' +
          D.icon('edit') + ' تعديل بيانات الدين</button>';
    },

    mount: function (el, params) {
      el.addEventListener('click', function (e) {
        var t = e.target.closest('[data-toggle-sched]');
        if (!t) return;
        var id = t.getAttribute('data-toggle-sched');
        expanded[id] = !expanded[id];
        App.render();
      });
    }
  };
})(window.App);
