/* ============================================================
   app.js — التشغيل: المظهر، المسارات، الأحداث المشتركة، الرسم
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, D = App.dom;

  var viewEl, titleEl, actionsEl, backEl;
  var currentPath = null;

  /* ---------- المظهر ---------- */
  function applyTheme() {
    var t = App.store.state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    var cur = App.store.state.settings.theme || 'auto';
    var next = order[(order.indexOf(cur) + 1) % order.length];
    App.store.setSettings({ theme: next });
    applyTheme();
    App.toast.show(next === 'auto' ? 'المظهر: تلقائي' : (next === 'light' ? 'المظهر: نهاري' : 'المظهر: ليلي'));
  }

  /* ---------- الرسم ---------- */
  function paint(view, params, path) {
    var samePath = currentPath === path;
    var scrollY = window.scrollY;

    viewEl.innerHTML = view.render(params) || '';
    titleEl.textContent = typeof view.title === 'function' ? view.title(params) : (view.title || App.config.APP_NAME);
    actionsEl.innerHTML = view.actions ? view.actions(params) : '';
    backEl.innerHTML = view.back
      ? '<button class="appbar__btn" data-action="back" aria-label="رجوع">' + D.icon('back') + '</button>'
      : '';

    if (view.mount) view.mount(viewEl, params);

    // نحافظ على موضع القراءة عند إعادة الرسم بعد تغيير البيانات
    if (samePath) window.scrollTo(0, scrollY);
    else D.scrollTop();

    currentPath = path;
    highlightTabs(path);
  }

  function highlightTabs(path) {
    var base = '/' + (path.split('/')[1] || '');
    if (path === '/') base = '/';
    D.$$('.tab[data-tab]').forEach(function (a) {
      var t = a.getAttribute('data-tab');
      var on = t === path || (t !== '/' && base === t) || (t === '/loans' && base === '/loan');
      a.classList.toggle('is-active', on);
    });
  }

  /** إعادة رسم الشاشة الحالية (بعد أي تغيير في البيانات) */
  App.render = function () { App.router.render(); };

  /* ---------- الأحداث المشتركة ---------- */
  var actions = {
    'add-loan':     function () { App.loanForm.open(); },
    'edit-loan':    function (id) { App.loanForm.open(id); },
    'quick-pay':    function () { App.paymentForm.open(); },
    'pay-loan':     function (id) { App.paymentForm.open({ loanId: id }); },
    'edit-payment': function (id) { App.paymentForm.open({ paymentId: id }); },
    'edit-income':  function () { App.incomeForm.open(); },
    'export':       function () { App.settingsSheets.export(); },
    'import':       function () { App.settingsSheets.import(); },
    'currency':     function () { App.settingsSheets.currency(); },
    'alert-days':   function () { App.settingsSheets.alertDays(); },
    'theme':        function () { cycleTheme(); App.render(); },
    'back':         function () { App.router.back(); },
    'reset':        function () {
      App.sheet.confirm({
        title: 'حذف كل البيانات',
        text: 'سيُمسح كل ما سجّلته: الديون، الدفعات، والراتب. لا يمكن التراجع عن هذه الخطوة.',
        hint: 'إن أردت الاحتفاظ بنسخة، أغلق هذه النافذة وصدّر ملف JSON أولًا.',
        okText: 'حذف كل شيء', danger: true
      }).then(function (yes) {
        if (!yes) return;
        App.store.reset();
        App.toast.ok('تم حذف كل البيانات');
        App.router.go('/');
      });
    }
  };

  function bindGlobalEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var name = el.getAttribute('data-action');
      if (!actions[name]) return;
      e.preventDefault();
      actions[name](el.getAttribute('data-id'));
    });

    // تحديث الأرقام عند حفظ أي تغيير
    App.store.onChange(function () { applyTheme(); App.render(); });

    // إعادة الرسم عند العودة للتطبيق (قد يتغيّر اليوم فتتغيّر التنبيهات)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) App.render();
    });
  }

  /* ---------- المسارات ---------- */
  function registerRoutes() {
    App.router
      .add('/', App.views.home)
      .add('/summary', App.views.summary)
      .add('/loans', App.views.loans)
      .add('/loan/:id', App.views.loanDetail)
      .add('/history', App.views.history)
      .add('/settings', App.views.settings);

    App.router.onRender = paint;
  }

  /* ---------- الإقلاع ---------- */
  function boot() {
    viewEl = document.getElementById('view');
    titleEl = document.getElementById('pageTitle');
    actionsEl = document.getElementById('appbarActions');
    backEl = document.getElementById('appbarBack');

    App.store.load();
    applyTheme();
    registerRoutes();
    bindGlobalEvents();
    App.router.start();

    // تنبيه إن كان التخزين المحلّي معطّلًا (وضع التصفّح الخاص مثلًا)
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
    } catch (e) {
      App.toast.error('التخزين المحلّي معطّل — لن تُحفظ بياناتك بعد إغلاق الصفحة', 6000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.App);
