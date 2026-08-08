/* ============================================================
   store.js — الحالة + التخزين المحلّي + عمليات البيانات
   البيانات كلها في localStorage على جهاز المستخدم فقط.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils;
  var KEY = App.config.STORAGE_KEY;

  /* ---------- الحالة الافتراضية ---------- */
  function blank() {
    return {
      schema: App.config.SCHEMA,
      settings: {
        currency: 'QAR',
        monthlyIncome: 0,          // الراتب الشهري
        otherIncome: 0,            // دخل إضافي شهري
        alertDays: App.config.DEFAULT_ALERT_DAYS,
        theme: 'auto',             // auto | light | dark
        sharingEnabled: false,     // ميزة المشاركين في السداد (اختيارية)
        lastBackupAt: null,
        createdAt: new Date().toISOString()
      },
      loans: [],      // الديون / التمويلات
      payments: []    // الدفعات
    };
  }

  var listeners = [];

  var store = {
    state: blank(),

    /* ---------- التحميل والحفظ ---------- */
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var data = JSON.parse(raw);
          this.state = store.normalize(data);
        }
      } catch (e) {
        console.warn('تعذّر قراءة البيانات المحفوظة:', e);
      }
      return this.state;
    },

    save: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
        return true;
      } catch (e) {
        console.error('تعذّر الحفظ:', e);
        if (App.toast) App.toast.error('تعذّر حفظ البيانات على الجهاز');
        return false;
      }
    },

    /** حفظ + إبلاغ الواجهة بالتغيير */
    commit: function () {
      this.save();
      this.emit();
    },

    onChange: function (fn) { listeners.push(fn); },
    emit: function () { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); },

    /* ---------- تنظيف/توحيد بيانات قادمة من ملف أو نسخة قديمة ---------- */
    normalize: function (data) {
      var base = blank();
      if (!data || typeof data !== 'object') return base;

      var s = data.settings || {};
      base.settings.currency      = typeof s.currency === 'string' ? s.currency : base.settings.currency;
      base.settings.monthlyIncome = U.toNum(s.monthlyIncome);
      base.settings.otherIncome   = U.toNum(s.otherIncome);
      base.settings.alertDays     = U.clamp(Math.round(U.toNum(s.alertDays) || App.config.DEFAULT_ALERT_DAYS), 1, 60);
      base.settings.theme         = ['auto', 'light', 'dark'].indexOf(s.theme) > -1 ? s.theme : 'auto';
      base.settings.sharingEnabled = !!s.sharingEnabled;
      base.settings.lastBackupAt  = s.lastBackupAt || null;
      base.settings.createdAt     = s.createdAt || base.settings.createdAt;

      base.loans = (Array.isArray(data.loans) ? data.loans : []).map(function (l) {
        var count = Math.max(1, Math.round(U.toNum(l.installmentsCount)) || 1);
        var total = U.round2(l.totalDue !== undefined ? l.totalDue : l.principal);
        return {
          id: l.id || U.uid('loan'),
          title: String(l.title || 'دين'),
          lender: String(l.lender || ''),
          type: ['bank', 'person', 'company', 'other'].indexOf(l.type) > -1 ? l.type : 'other',
          principal: U.round2(l.principal),
          totalDue: total > 0 ? total : U.round2(l.principal),
          installmentsCount: count,
          startDate: U.isValidISO(l.startDate) ? String(l.startDate).slice(0, 10) : U.today(),
          openingPaid: U.round2(l.openingPaid),   // ما سُدّد قبل استخدام التطبيق
          partners: store.cleanPartners(l.partners),
          notes: String(l.notes || ''),
          archived: !!l.archived,
          createdAt: l.createdAt || new Date().toISOString()
        };
      });

      var byId = {};
      base.loans.forEach(function (l) { byId[l.id] = l; });

      base.payments = (Array.isArray(data.payments) ? data.payments : [])
        .filter(function (p) { return p && byId[p.loanId]; })
        .map(function (p) {
          // الدافع: «أنا» افتراضًا، أو مشارك موجود فعلًا في هذا الدين
          var payer = String(p.payerId || 'me');
          var exists = byId[p.loanId].partners.some(function (x) { return x.id === payer; });
          return {
            id: p.id || U.uid('pay'),
            loanId: p.loanId,
            amount: U.round2(p.amount),
            date: U.isValidISO(p.date) ? String(p.date).slice(0, 10) : U.today(),
            payerId: exists ? payer : 'me',
            note: String(p.note || ''),
            createdAt: p.createdAt || new Date().toISOString()
          };
        })
        .filter(function (p) { return p.amount > 0; });

      return base;
    },

    /* ---------- المشاركون في السداد ----------
       كل مشارك: { id, name, shareMode, shareValue }
       shareMode: 'pct' نسبة من إجمالي الدين · 'amount' مبلغ إجمالي محدّد
                  · 'none' بلا حصّة محدّدة (يساعد بمبالغ متغيّرة)
       الدفعات الفعلية حرّة دائمًا ولا علاقة لها بالحصّة — الحصّة هدف فقط. */
    cleanPartners: function (list) {
      if (!Array.isArray(list)) return [];
      var out = [];
      list.forEach(function (p) {
        if (!p) return;
        var name = String(p.name || '').trim();
        if (!name) return;

        var mode = ['pct', 'amount', 'none'].indexOf(p.shareMode) > -1 ? p.shareMode : null;
        var value = U.round2(p.shareValue);

        // ترحيل الصيغة القديمة: sharePct فقط
        if (!mode) {
          var legacy = U.round2(p.sharePct);
          mode = legacy > 0 ? 'pct' : 'none';
          value = legacy;
        }
        if (mode === 'pct') value = U.clamp(value, 0, 100);
        if (mode === 'amount') value = Math.max(0, value);
        if (mode !== 'none' && value <= 0) mode = 'none';
        if (mode === 'none') value = 0;

        out.push({ id: p.id || U.uid('prt'), name: name.slice(0, 60), shareMode: mode, shareValue: value });
      });
      return out.slice(0, 10);
    },

    partner: function (loan, id) {
      if (!loan || !loan.partners) return null;
      return loan.partners.filter(function (p) { return p.id === id; })[0] || null;
    },

    /** هل لهذا المشارك دفعات مسجّلة؟ (نمنع حذفه حتى لا تُفقد نسبة الدفعات) */
    partnerPaymentsCount: function (loanId, partnerId) {
      return this.state.payments.filter(function (p) {
        return p.loanId === loanId && p.payerId === partnerId;
      }).length;
    },

    sharingOn: function () { return !!this.state.settings.sharingEnabled; },

    /** عدد الديون التي فيها مشاركون (لعرضه في الإعدادات) */
    loansWithPartners: function () {
      return this.state.loans.filter(function (l) { return (l.partners || []).length > 0; }).length;
    },

    /* ---------- الديون ---------- */
    loans: function (includeArchived) {
      return this.state.loans.filter(function (l) { return includeArchived ? true : !l.archived; });
    },

    loan: function (id) {
      return this.state.loans.filter(function (l) { return l.id === id; })[0] || null;
    },

    addLoan: function (data) {
      var loan = {
        id: U.uid('loan'),
        title: data.title,
        lender: data.lender || '',
        type: data.type || 'other',
        principal: U.round2(data.principal),
        totalDue: U.round2(data.totalDue || data.principal),
        installmentsCount: Math.max(1, Math.round(U.toNum(data.installmentsCount))),
        startDate: data.startDate || U.today(),
        openingPaid: U.round2(data.openingPaid),
        partners: this.cleanPartners(data.partners),
        notes: data.notes || '',
        archived: false,
        createdAt: new Date().toISOString()
      };
      this.state.loans.push(loan);
      this.commit();
      return loan;
    },

    updateLoan: function (id, patch) {
      var loan = this.loan(id);
      if (!loan) return null;
      Object.keys(patch).forEach(function (k) { loan[k] = patch[k]; });
      loan.partners = this.cleanPartners(loan.partners);
      // أي دفعة لمشارك أُزيل تُعاد إلى «أنا» حتى لا تبقى معلّقة
      var valid = loan.partners.map(function (p) { return p.id; });
      this.state.payments.forEach(function (p) {
        if (p.loanId === loan.id && p.payerId !== 'me' && valid.indexOf(p.payerId) === -1) p.payerId = 'me';
      });
      loan.principal = U.round2(loan.principal);
      loan.totalDue = U.round2(loan.totalDue);
      loan.openingPaid = U.round2(loan.openingPaid);
      loan.installmentsCount = Math.max(1, Math.round(U.toNum(loan.installmentsCount)));
      this.commit();
      return loan;
    },

    deleteLoan: function (id) {
      this.state.loans = this.state.loans.filter(function (l) { return l.id !== id; });
      this.state.payments = this.state.payments.filter(function (p) { return p.loanId !== id; });
      this.commit();
    },

    /* ---------- الدفعات ---------- */
    /**
     * الدفعات مرتّبة: الأحدث تاريخًا أوّلًا، وعند تساوي التاريخ
     * تُقدَّم الدفعة المُسجّلة لاحقًا (ترتيب حتمي لا يعتمد على الملّي ثانية).
     */
    payments: function (loanId) {
      var indexed = this.state.payments.map(function (p, i) { return { p: p, i: i }; });
      if (loanId) indexed = indexed.filter(function (x) { return x.p.loanId === loanId; });
      indexed.sort(function (a, b) {
        if (a.p.date !== b.p.date) return a.p.date < b.p.date ? 1 : -1;
        return b.i - a.i;
      });
      return indexed.map(function (x) { return x.p; });
    },

    payment: function (id) {
      return this.state.payments.filter(function (p) { return p.id === id; })[0] || null;
    },

    addPayment: function (data) {
      var loan = this.loan(data.loanId);
      var payer = data.payerId && this.partner(loan, data.payerId) ? data.payerId : 'me';
      var pay = {
        id: U.uid('pay'),
        loanId: data.loanId,
        amount: U.round2(data.amount),
        date: data.date || U.today(),
        payerId: payer,
        note: data.note || '',
        createdAt: new Date().toISOString()
      };
      this.state.payments.push(pay);
      this.commit();
      return pay;
    },

    updatePayment: function (id, patch) {
      var pay = this.payment(id);
      if (!pay) return null;
      Object.keys(patch).forEach(function (k) { pay[k] = patch[k]; });
      pay.amount = U.round2(pay.amount);
      if (pay.payerId !== 'me' && !this.partner(this.loan(pay.loanId), pay.payerId)) pay.payerId = 'me';
      this.commit();
      return pay;
    },

    deletePayment: function (id) {
      this.state.payments = this.state.payments.filter(function (p) { return p.id !== id; });
      this.commit();
    },

    /* ---------- الإعدادات ---------- */
    setSettings: function (patch) {
      var s = this.state.settings;
      Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
      this.commit();
    },

    /* ---------- استبدال / دمج / تصفير ---------- */
    replaceAll: function (data) {
      this.state = this.normalize(data);
      this.commit();
    },

    /** دمج ملف نسخة احتياطية مع البيانات الحالية (بلا تكرار بالمعرّف) */
    mergeAll: function (data) {
      var incoming = this.normalize(data);
      var self = this;
      var loanIds = this.state.loans.map(function (l) { return l.id; });
      var payIds = this.state.payments.map(function (p) { return p.id; });
      var addedL = 0, addedP = 0;

      incoming.loans.forEach(function (l) {
        if (loanIds.indexOf(l.id) === -1) { self.state.loans.push(l); loanIds.push(l.id); addedL++; }
      });
      incoming.payments.forEach(function (p) {
        if (payIds.indexOf(p.id) === -1 && loanIds.indexOf(p.loanId) > -1) { self.state.payments.push(p); addedP++; }
      });

      if (!this.state.settings.monthlyIncome && incoming.settings.monthlyIncome) {
        this.state.settings.monthlyIncome = incoming.settings.monthlyIncome;
      }
      this.commit();
      return { loans: addedL, payments: addedP };
    },

    reset: function () {
      var theme = this.state.settings.theme;
      var currency = this.state.settings.currency;
      this.state = blank();
      this.state.settings.theme = theme;
      this.state.settings.currency = currency;
      this.commit();
    },

    isEmpty: function () { return this.state.loans.length === 0; }
  };

  App.store = store;
})(window.App);
