/* ============================================================
   views/home.js — الشاشة الرئيسية: ماذا عليّ الآن؟
   ترتيب المحتوى مقصود: المتبقي ← التنبيهات ← زر السداد ← الراتب ← آخر الحركات
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  /* ---------- شاشة الترحيب (لا توجد بيانات بعد) ---------- */
  function onboarding() {
    return '<div class="hero">' +
        '<div class="hero__label">أهلًا بك في ' + App.config.APP_NAME + '</div>' +
        '<div class="hero__value" style="font-size:1.35rem;letter-spacing:0">تابِع ديونك وأقساطك في مكان واحد</div>' +
        '<div class="hero__meta"><span>بياناتك محفوظة على جهازك فقط</span></div>' +
      '</div>' +
      W.empty('coins', 'ابدأ بتسجيل أوّل دين',
        'سجّل التمويل أو السلفة التي حصلت عليها، ثم سجّل كل دفعة تدفعها — وسيحسب التطبيق المتبقي والأقساط وتاريخ انتهاء السداد نيابةً عنك.',
        '<button class="btn btn--primary btn--block" data-action="add-loan" style="margin-top:6px">' + D.icon('plus') + ' إضافة دين</button>' +
        '<button class="btn btn--ghost btn--block" data-action="import">' + D.icon('upload') + ' استيراد ملف نسخة احتياطية</button>'
      ) +
      '<div class="note-box">' + D.icon('info') +
        '<span>خطوات الاستخدام: ①&nbsp;أضف كل دين بقيمة قسطه وعدد أقساطه. ②&nbsp;كلّما دفعت، اضغط زر <b>سدّد</b> في الأسفل. ③&nbsp;راجع شاشة <b>الملخّص</b> لترى المتبقي وتاريخ التحرّر. ④&nbsp;صدّر نسخة احتياطية من الإعدادات.</span>' +
      '</div>';
  }

  /* ---------- بطاقة التنبيهات ---------- */
  function alerts(ov) {
    var out = '';

    if (ov.overdue.length) {
      var names = ov.overdue.slice(0, 2).map(function (x) { return x.loan.title; }).join('، ');
      var more = ov.overdue.length > 2 ? ' و' + (ov.overdue.length - 2) + ' غيرها' : '';
      out += W.alert('danger', 'alert',
        'متأخّرات بقيمة ' + F.money(ov.overdueAmount),
        U.esc(names) + more,
        '<button class="btn btn--sm btn--danger" data-action="quick-pay">سدّد</button>');
    }

    ov.dueSoon.forEach(function (x) {
      out += W.alert('warn', 'clock',
        'قسط ' + U.esc(x.loan.title) + ' ' + (x.nextDueDays === 0 ? 'اليوم' : 'بعد ' + F.days(x.nextDueDays)),
        F.money(x.installment) + ' · ' + F.dateShort(x.nextDueDate),
        '<button class="btn btn--sm btn--soft" data-action="pay-loan" data-id="' + x.loan.id + '">سدّد</button>');
    });

    if (!out && ov.active.length) {
      var next = ov.suggested;
      out += W.alert('ok', 'checkCircle', 'أنت منتظم في السداد 👌',
        next && next.nextDueDate ? 'القسط القادم ' + F.relativeDue(next.nextDueDate) + ' — ' + U.esc(next.loan.title) : '');
    }

    if (!ov.active.length && ov.loansCount) {
      out += W.alert('ok', 'trophy', 'مبروك! لا توجد ديون قائمة', 'سدّدت كل ما عليك بالكامل.');
    }

    return out;
  }

  /* ---------- بطاقة الراتب ---------- */
  function salaryCard(ov) {
    if (!ov.income) {
      return '<div class="card">' +
        '<div class="row row--between">' +
          '<div><div class="t-bold">أضف راتبك</div><div class="t-xs t-muted">لنعرض لك صافي الراتب بعد خصم الأقساط</div></div>' +
          '<button class="btn btn--sm btn--soft" data-action="edit-income">' + D.icon('salary') + ' إضافة</button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="card stack stack--sm">' +
      '<div class="row row--between">' +
        '<span class="t-sm t-bold">الراتب والأقساط</span>' +
        '<button class="btn btn--sm btn--soft" data-action="edit-income">' + D.icon('edit') + ' تعديل</button>' +
      '</div>' +
      '<div class="tiles tiles--3">' +
        W.tile('الدخل الشهري', '<span class="money">' + F.num(ov.income) + '</span>') +
        W.tile('أقساط الشهر', '<span class="money">' + F.num(ov.monthlyCommitment) + '</span>', null, 't-warn') +
        W.tile('الصافي لك', '<span class="money">' + F.num(ov.netIncome) + '</span>', null, ov.netIncome < 0 ? 't-danger' : 't-ok') +
      '</div>' +
      W.gauge(ov.dti, ov.dtiLevel) +
      (ov.netIncome < 0
        ? '<div class="t-xs t-danger t-bold">تنبيه: أقساطك أكبر من دخلك الشهري.</div>'
        : '') +
    '</div>';
  }

  /* ---------- آخر الدفعات ---------- */
  function recentPayments() {
    var pays = App.store.payments().slice(0, 4);
    if (!pays.length) return '';
    return W.sectionTitle('آخر الدفعات', '<a href="#/history">عرض السجل</a>') +
      '<div class="card card--flush">' + pays.map(function (p) {
        var loan = App.store.loan(p.loanId);
        return '<button class="pay-row" data-action="edit-payment" data-id="' + p.id + '">' +
          '<span class="avatar avatar--ok">' + D.icon('check') + '</span>' +
          '<span class="grow" style="min-width:0">' +
            '<span class="t-sm t-bold truncate" style="display:block">' + U.esc(loan ? loan.title : 'دين محذوف') + '</span>' +
            '<span class="t-xs t-muted"><time>' + F.dateShort(p.date) + '</time>' + (p.note ? ' · ' + U.esc(p.note) : '') + '</span>' +
          '</span>' +
          '<span class="pay-row__amt money">' + F.num(p.amount) + '</span>' +
        '</button>';
      }).join('') + '</div>';
  }

  /* ---------- تذكير النسخ الاحتياطي ---------- */
  function backupHint() {
    var last = App.store.state.settings.lastBackupAt;
    var days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
    if (days !== null && days < 7) return '';
    return '<div class="note-box">' + D.icon('download') +
      '<span>' + (last ? 'آخر نسخة احتياطية قبل ' + F.days(days) + '.' : 'لم تأخذ نسخة احتياطية بعد.') +
      ' بياناتك محفوظة على هذا الجهاز فقط — ' +
      '<a class="t-brand t-bold" href="#/settings">صدّر ملف JSON</a> لتحفظها أو تنقلها لجهاز آخر.</span></div>';
  }

  App.views = App.views || {};
  App.views.home = {
    title: App.config.APP_NAME,

    actions: function () {
      return '<button class="appbar__btn" data-action="add-loan" aria-label="إضافة دين">' + D.icon('plus') + '</button>';
    },

    render: function () {
      if (App.store.isEmpty()) return onboarding();

      var ov = App.calc.overview();

      var hero = '<div class="hero">' +
          '<div class="hero__label">إجمالي المتبقي عليك</div>' +
          '<div class="hero__value"><span class="money">' + F.num(ov.remaining) + '</span><small>' + U.esc(F.currency()) + '</small></div>' +
          '<div class="hero__bar"><i style="width:' + U.clamp(ov.progress, 0, 100) + '%"></i></div>' +
          '<div class="hero__meta">' +
            '<span>سدّدت ' + F.pct(ov.progress) + '</span>' +
            '<span>من إجمالي ' + F.money(ov.total) + '</span>' +
          '</div>' +
          '<div class="hero__pills">' +
            '<div class="hero__pill"><b class="money">' + F.num(ov.monthlyCommitment) + '</b><span>قسط شهري</span></div>' +
            '<div class="hero__pill"><b class="num">' + F.num(ov.remainingInstallments) + '</b><span>قسط متبقٍ</span></div>' +
            '<div class="hero__pill"><b class="num">' + F.num(ov.active.length) + '</b><span>دين قائم</span></div>' +
          '</div>' +
        '</div>';

      var payBtn = ov.active.length
        ? '<button class="btn btn--primary btn--block" data-action="quick-pay">' + D.icon('plus') + ' تسجيل دفعة جديدة</button>'
        : '';

      var freedom = (ov.freedomDate && ov.active.length)
        ? '<a class="card" href="#/summary" style="display:block">' +
            '<div class="row">' +
              '<span class="avatar">' + D.icon('flag') + '</span>' +
              '<div class="grow">' +
                '<div class="t-bold t-sm">تتخلّص من كل ديونك في</div>' +
                '<div class="t-xs t-muted"><time>' + F.date(ov.freedomDate) + '</time> · باقي ' + F.duration(ov.monthsToFreedom) + '</div>' +
              '</div>' +
              '<span class="badge badge--brand num">' + F.days(ov.daysToFreedom) + '</span>' +
            '</div>' +
          '</a>'
        : '';

      var loansPreview = ov.active.length
        ? W.sectionTitle('ديونك القائمة', '<a href="#/loans">الكل (' + F.num(ov.loansCount) + ')</a>') +
          U.sortBy(ov.active, function (x) { return x.nextDueDate || '9999'; }).slice(0, 3)
            .map(W.loanCard).join('')
        : '';

      return hero +
        alerts(ov) +
        payBtn +
        freedom +
        salaryCard(ov) +
        loansPreview +
        recentPayments() +
        backupHint();
    }
  };
})(window.App);
