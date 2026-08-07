/* ============================================================
   calc.js — كل الحسابات المشتقّة (بلا أي لمس للواجهة)
   قاعدة عامّة: القسط = إجمالي المستحق ÷ عدد الأقساط
   والمسدَّد = ما سُدّد قبل التطبيق + مجموع الدفعات المسجّلة.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils;
  var C = {};
  var EPS = 0.01;

  /** مواعيد كل الأقساط لدين معيّن (مصفوفة تواريخ ISO) */
  C.schedule = function (loan) {
    var out = [];
    for (var i = 0; i < loan.installmentsCount; i++) out.push(U.addMonths(loan.startDate, i));
    return out;
  };

  /** قيمة القسط الشهري */
  C.installment = function (loan) {
    return U.round2(U.toNum(loan.totalDue) / Math.max(1, loan.installmentsCount));
  };

  /**
   * إحصاءات دين واحد.
   * @returns كائن يحتوي المسدَّد، المتبقي، عدد الأقساط المدفوعة/المتبقية،
   *          التأخير، القسط القادم، تاريخ الانتهاء، والحالة.
   */
  C.loanStats = function (loan) {
    var pays = App.store.payments(loan.id);
    var logged = U.sum(pays, function (p) { return p.amount; });
    var paid = U.round2(U.toNum(loan.openingPaid) + logged);

    var total = U.round2(loan.totalDue);
    var count = Math.max(1, loan.installmentsCount);
    var inst = C.installment(loan);

    paid = Math.min(paid, total);                       // لا يزيد المسدَّد عن الإجمالي
    var remaining = U.round2(Math.max(0, total - paid));
    var progress = total > 0 ? U.round2((paid / total) * 100) : 0;

    var dates = C.schedule(loan);
    var today = U.today();

    var paidInst = Math.min(count, Math.floor((paid + EPS) / inst));
    var remainingInst = Math.max(0, count - paidInst);

    // عدد الأقساط التي حلّ موعدها حتى اليوم
    var dueByNow = 0;
    for (var i = 0; i < dates.length; i++) if (U.diffDays(dates[i], today) >= 0) dueByNow++;

    var expectedPaid = U.round2(Math.min(total, dueByNow * inst));
    var lateAmount = U.round2(Math.max(0, expectedPaid - paid));
    var lateInst = Math.max(0, dueByNow - paidInst);

    var finished = remaining <= EPS;
    var nextDueDate = finished ? null : (dates[Math.min(paidInst, count - 1)] || null);
    var endDate = dates[count - 1];
    var lastPlannedRemaining = finished ? null : dates[count - 1];

    var status = 'ontrack';
    if (finished) status = 'finished';
    else if (lateAmount > EPS) status = 'late';
    else if (!dueByNow) status = 'notstarted';
    else if (paid > expectedPaid + EPS) status = 'ahead';

    return {
      loan: loan,
      payments: pays,
      installment: inst,
      total: total,
      paid: paid,
      loggedPaid: logged,
      remaining: remaining,
      progress: progress,
      count: count,
      paidInstallments: paidInst,
      remainingInstallments: remainingInst,
      dueByNow: dueByNow,
      lateInstallments: lateInst,
      lateAmount: lateAmount,
      aheadAmount: U.round2(Math.max(0, paid - expectedPaid)),
      finished: finished,
      status: status,
      nextDueDate: nextDueDate,
      nextDueDays: nextDueDate ? U.diffDays(today, nextDueDate) : null,
      endDate: endDate,
      endDateRemaining: lastPlannedRemaining,
      daysToEnd: U.diffDays(today, endDate),
      monthsToEnd: Math.max(0, remainingInst),
      schedule: dates,
      lastPaymentDate: pays.length ? pays[0].date : null
    };
  };

  /** إحصاءات كل الديون النشِطة + الراتب */
  C.overview = function () {
    var s = App.store.state.settings;
    var loans = App.store.loans();
    var stats = loans.map(C.loanStats);
    var active = stats.filter(function (x) { return !x.finished; });
    var today = U.today();

    var total     = U.sum(stats, function (x) { return x.total; });
    var paid      = U.sum(stats, function (x) { return x.paid; });
    var remaining = U.round2(Math.max(0, total - paid));

    var monthly = U.sum(active, function (x) { return x.installment; });
    var income  = U.round2(U.toNum(s.monthlyIncome) + U.toNum(s.otherIncome));
    var net     = U.round2(income - monthly);
    var dti     = income > 0 ? U.round2((monthly / income) * 100) : 0;

    var totalInst     = stats.reduce(function (a, x) { return a + x.count; }, 0);
    var paidInst      = stats.reduce(function (a, x) { return a + x.paidInstallments; }, 0);
    var remainingInst = Math.max(0, totalInst - paidInst);

    // تاريخ آخر قسط في كل الديون غير المنتهية = «موعد التحرّر»
    var freedomDate = null;
    active.forEach(function (x) {
      if (!freedomDate || U.diffDays(freedomDate, x.endDate) > 0) freedomDate = x.endDate;
    });

    // بداية أوّل دين (لحساب مدّة خطة السداد الكاملة)
    var firstStart = null;
    stats.forEach(function (x) {
      if (!firstStart || U.diffDays(x.loan.startDate, firstStart) > 0) firstStart = x.loan.startDate;
    });

    var alertDays = s.alertDays || App.config.DEFAULT_ALERT_DAYS;
    var overdue = active.filter(function (x) { return x.lateAmount > EPS; });
    var dueSoon = active.filter(function (x) {
      return x.lateAmount <= EPS && x.nextDueDays !== null && x.nextDueDays >= 0 && x.nextDueDays <= alertDays;
    });

    var monthNow = U.monthKey(today);
    var paidThisMonth = U.sum(
      App.store.payments().filter(function (p) { return U.monthKey(p.date) === monthNow; }),
      function (p) { return p.amount; }
    );

    return {
      stats: stats,
      active: active,
      finishedCount: stats.length - active.length,
      loansCount: stats.length,

      total: total,
      paid: paid,
      remaining: remaining,
      progress: total > 0 ? U.round2((paid / total) * 100) : 0,
      principalTotal: U.sum(stats, function (x) { return x.loan.principal; }),
      extraCost: U.round2(total - U.sum(stats, function (x) { return x.loan.principal; })),

      monthlyCommitment: monthly,
      income: income,
      netIncome: net,
      dti: dti,
      dtiLevel: dti === 0 ? 'none' : (dti <= App.config.DTI.safe ? 'ok' : (dti <= App.config.DTI.warn ? 'warn' : 'danger')),

      totalInstallments: totalInst,
      paidInstallments: paidInst,
      remainingInstallments: remainingInst,

      freedomDate: freedomDate,
      daysToFreedom: freedomDate ? U.diffDays(today, freedomDate) : null,
      monthsToFreedom: freedomDate ? Math.max(0, U.diffMonths(today, freedomDate) + 1) : null,
      planMonths: (firstStart && freedomDate) ? Math.max(1, U.diffMonths(firstStart, freedomDate) + 1) : null,

      overdue: overdue,
      dueSoon: dueSoon,
      overdueAmount: U.sum(overdue, function (x) { return x.lateAmount; }),
      paidThisMonth: paidThisMonth,

      /* أفضل دين يُقترح تسديده الآن: الأكثر تأخّرًا ثم الأقرب استحقاقًا */
      suggested: (function () {
        if (!active.length) return null;
        var sorted = U.sortBy(active, function (x) {
          return (x.lateAmount > EPS ? 0 : 1) + '|' + String(x.nextDueDate || '9999-12-31');
        });
        return sorted[0];
      })()
    };
  };

  /** تسمية الحالة + لون الوسم */
  C.statusMeta = function (status) {
    switch (status) {
      case 'finished':   return { label: 'مسدَّد بالكامل', cls: 'badge--ok' };
      case 'late':       return { label: 'متأخّر', cls: 'badge--danger' };
      case 'ahead':      return { label: 'متقدّم', cls: 'badge--brand' };
      case 'notstarted': return { label: 'لم يبدأ', cls: '' };
      default:           return { label: 'منتظم', cls: 'badge--ok' };
    }
  };

  App.calc = C;
})(window.App);
