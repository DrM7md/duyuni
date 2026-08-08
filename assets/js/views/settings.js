/* ============================================================
   views/settings.js — الإعدادات + النسخ الاحتياطي (تصدير/استيراد)
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils, F = App.format, W = App.widgets, D = App.dom;

  /* ---------- ورقة الاستيراد ---------- */
  function openImport() {
    App.sheet.open({
      title: 'استيراد نسخة احتياطية',
      body:
        '<div class="note-box">' + D.icon('info') +
          '<span>اختر ملف <b>JSON</b> صدّرته من هذا التطبيق سابقًا. يمكنك <b>استبدال</b> كل البيانات الحالية، أو <b>دمج</b> الملف مع الموجود.</span>' +
        '</div>' +
        '<button class="btn btn--primary btn--block" type="button" data-pick>' + D.icon('upload') + ' اختيار ملف من الجهاز</button>' +
        '<div class="field">' +
          '<span class="field__label">أو الصق محتوى الملف هنا</span>' +
          '<textarea class="textarea" data-paste placeholder=\'{ "loans": [...], "payments": [...] }\' style="font-size:.75rem;direction:ltr"></textarea>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-use-paste>استخدام النصّ الملصوق</button>' +
        '</div>',
      footer: '<button class="btn btn--ghost" type="button" data-sheet-close>إلغاء</button>',
      autofocus: false,
      onMount: function (el, api) {
        function handle(data) {
          var err = App.backup.validate(data);
          if (err) { App.toast.error(err); return; }

          var loans = (data.loans || []).length, pays = (data.payments || []).length;
          api.close();
          setTimeout(function () { chooseMode(data, loans, pays); }, 230);
        }

        el.querySelector('[data-pick]').addEventListener('click', function () {
          App.backup.pickFile().then(handle, function (e) { App.toast.error(e.message || 'تعذّرت قراءة الملف'); });
        });

        el.querySelector('[data-use-paste]').addEventListener('click', function () {
          var data = App.backup.parseText(el.querySelector('[data-paste]').value);
          if (!data) { App.toast.error('النصّ ليس JSON صحيحًا'); return; }
          handle(data);
        });
      }
    });
  }

  function chooseMode(data, loans, pays) {
    App.sheet.open({
      title: 'كيف نستورد البيانات؟',
      body:
        '<div class="card card--flush"><div class="kv">' +
          W.kv('ديون في الملف', '<span class="num">' + F.num(loans) + '</span>') +
          W.kv('دفعات في الملف', '<span class="num">' + F.num(pays) + '</span>') +
          (data.exportedAt ? W.kv('تاريخ النسخة', '<time>' + F.dateShort(String(data.exportedAt).slice(0, 10)) + '</time>') : '') +
        '</div></div>' +
        '<div class="note-box">' + D.icon('alert') +
          '<span><b>استبدال:</b> يحذف بياناتك الحالية ويضع بيانات الملف مكانها.<br>' +
          '<b>دمج:</b> يضيف ما هو غير موجود ويحافظ على بياناتك الحالية.</span>' +
        '</div>',
      footer:
        '<button class="btn btn--ghost" type="button" data-mode="merge">' + D.icon('plus') + ' دمج</button>' +
        '<button class="btn btn--primary" type="button" data-mode="replace">' + D.icon('upload') + ' استبدال</button>',
      autofocus: false,
      onMount: function (el, api) {
        el.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-mode]');
          if (!btn) return;
          var mode = btn.getAttribute('data-mode');

          if (mode === 'replace') {
            api.close();
            App.sheet.confirm({
              title: 'تأكيد الاستبدال',
              text: 'ستُحذف كل البيانات الحالية على هذا الجهاز وتُستبدل ببيانات الملف.',
              okText: 'استبدال الآن', danger: true
            }).then(function (yes) {
              if (!yes) return;
              App.store.replaceAll(data);
              App.toast.ok('تم استيراد البيانات');
              App.router.go('/');
            });
          } else {
            var res = App.store.mergeAll(data);
            api.close();
            App.toast.ok('تم الدمج: ' + res.loans + ' دين و' + res.payments + ' دفعة');
            App.router.go('/');
          }
        });
      }
    });
  }

  /* ---------- التصدير ---------- */
  function openExport() {
    App.sheet.open({
      title: 'تصدير نسخة احتياطية',
      body:
        '<div class="note-box">' + D.icon('info') +
          '<span>سيُنزَّل ملف <b>JSON</b> يحتوي كل ديونك ودفعاتك وإعداداتك. احفظه في مكان آمن — يمكنك استيراده لاحقًا على أي جهاز.</span>' +
        '</div>' +
        '<div class="card card--flush"><div class="kv">' +
          W.kv('عدد الديون', '<span class="num">' + F.num(App.store.state.loans.length) + '</span>') +
          W.kv('عدد الدفعات', '<span class="num">' + F.num(App.store.state.payments.length) + '</span>') +
          W.kv('اسم الملف', '<span class="t-xs">' + U.esc(App.backup.fileName()) + '</span>') +
        '</div></div>' +
        '<button class="btn btn--primary btn--block" type="button" data-dl>' + D.icon('download') + ' تنزيل الملف</button>' +
        (App.backup.canShare() ? '<button class="btn btn--soft btn--block" type="button" data-sh>' + D.icon('share') + ' مشاركة الملف</button>' : '') +
        '<button class="btn btn--ghost btn--block" type="button" data-cp>' + D.icon('copy') + ' نسخ البيانات كنصّ</button>',
      footer: '<button class="btn btn--ghost" type="button" data-sheet-close>إغلاق</button>',
      autofocus: false,
      onMount: function (el, api) {
        el.querySelector('[data-dl]').addEventListener('click', function () {
          if (App.backup.download()) { App.toast.ok('تم تنزيل الملف'); api.close(); }
          else App.toast.error('تعذّر التنزيل — استخدم «نسخ البيانات كنصّ»');
        });
        var sh = el.querySelector('[data-sh]');
        if (sh) sh.addEventListener('click', function () {
          App.backup.share().then(function () { api.close(); }, function () { App.toast.error('تعذّرت المشاركة'); });
        });
        el.querySelector('[data-cp]').addEventListener('click', function () {
          App.backup.copy().then(function () { App.toast.ok('تم نسخ البيانات'); }, function () { App.toast.error('تعذّر النسخ'); });
        });
      }
    });
  }

  /* ---------- ورقة العملة ---------- */
  function openCurrency() {
    var cur = App.store.state.settings.currency;
    App.sheet.open({
      title: 'العملة',
      body: '<div class="card card--flush"><div class="list">' +
        App.config.CURRENCIES.map(function (c) {
          return '<button class="list__item" type="button" data-cur="' + c.code + '">' +
            '<span class="avatar">' + U.esc(c.symbol) + '</span>' +
            '<span class="grow"><span class="t-bold t-sm" style="display:block">' + U.esc(c.label) + '</span>' +
            '<span class="t-xs t-muted">' + c.code + '</span></span>' +
            (c.code === cur ? '<span class="badge badge--brand">مختارة</span>' : '') +
          '</button>';
        }).join('') + '</div></div>',
      autofocus: false,
      onMount: function (el, api) {
        el.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-cur]');
          if (!btn) return;
          App.store.setSettings({ currency: btn.getAttribute('data-cur') });
          App.toast.ok('تم تغيير العملة');
          api.close();
        });
      }
    });
  }

  /* ---------- ورقة التنبيه المسبق ---------- */
  function openAlertDays() {
    var cur = App.store.state.settings.alertDays;
    var opts = [3, 5, 7, 10, 14, 30];
    App.sheet.open({
      title: 'التنبيه قبل موعد القسط',
      body: '<p class="t-sm t-2">يظهر تنبيه في الرئيسية قبل موعد كل قسط بهذه المدّة.</p>' +
        '<div class="chips">' + opts.map(function (n) {
          return '<button type="button" class="chip' + (n === cur ? ' is-active' : '') + '" data-days="' + n + '">' + F.days(n) + '</button>';
        }).join('') + '</div>',
      autofocus: false,
      onMount: function (el, api) {
        el.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-days]');
          if (!btn) return;
          App.store.setSettings({ alertDays: parseInt(btn.getAttribute('data-days'), 10) });
          App.toast.ok('تم الحفظ');
          api.close();
        });
      }
    });
  }

  /* ---------- صفّ إعداد ---------- */
  function row(icon, title, value, action, danger) {
    return '<button class="list__item" type="button" ' + (action ? 'data-action="' + action + '"' : '') + '>' +
      '<span class="avatar' + (danger ? '' : '') + '">' + D.icon(icon) + '</span>' +
      '<span class="grow"><span class="t-sm t-bold' + (danger ? ' t-danger' : '') + '" style="display:block">' + U.esc(title) + '</span>' +
      (value ? '<span class="t-xs t-muted">' + value + '</span>' : '') + '</span>' +
      D.icon('chevron', 'chev') +
    '</button>';
  }

  App.views = App.views || {};
  App.views.settings = {
    title: 'الإعدادات',

    render: function () {
      var s = App.store.state.settings;
      var ov = App.calc.overview();
      var themeLabel = s.theme === 'dark' ? 'ليلي' : (s.theme === 'light' ? 'نهاري' : 'تلقائي (حسب النظام)');
      var lastBackup = s.lastBackupAt
        ? F.dateShort(String(s.lastBackupAt).slice(0, 10))
        : 'لم تُصدَّر بعد';

      /* حالة التثبيت — تظهر فقط عند التشغيل من رابط (لا من ملف محلّي) */
      var onWeb = location.protocol === 'http:' || location.protocol === 'https:';
      var installed = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      var appCard = !onWeb ? '' : (installed
        ? W.alert('ok', 'checkCircle', 'التطبيق مثبَّت على جهازك',
            'يعمل بلا إنترنت، وبياناتك محفوظة محليًّا.')
        : W.alert('warn', 'download', 'ثبّت التطبيق على جهازك',
            'من قائمة المتصفّح اختر «إضافة إلى الشاشة الرئيسية» — يعمل بعدها بلا إنترنت وبأيقونة مستقلّة.'));

      return appCard +
        W.sectionTitle('بياناتي') +
        '<div class="card card--flush"><div class="list">' +
          row('salary', 'الراتب والدخل الشهري', ov.income ? F.money(ov.income) : 'غير مُدخل', 'edit-income') +
          row('coins', 'العملة', U.esc(F.currency()), 'currency') +
          row('clock', 'التنبيه قبل موعد القسط', F.days(s.alertDays), 'alert-days') +
          row(s.theme === 'dark' ? 'moon' : 'sun', 'المظهر', themeLabel, 'theme') +
        '</div></div>' +

        W.sectionTitle('النسخ الاحتياطي') +
        '<div class="card card--flush"><div class="list">' +
          row('download', 'تصدير نسخة (JSON)', 'آخر تصدير: ' + lastBackup, 'export') +
          row('upload', 'استيراد نسخة من ملف', 'استبدال أو دمج', 'import') +
        '</div></div>' +
        '<div class="note-box">' + D.icon('info') +
          '<span>بياناتك محفوظة داخل هذا المتصفّح على هذا الجهاز فقط — لا تُرسل لأي جهة. ' +
          'إن حذفت بيانات المتصفّح أو غيّرت الجهاز فستحتاج ملف النسخة الاحتياطية، لذا صدّر نسخة بعد كل تحديث مهم.</span>' +
        '</div>' +

        W.sectionTitle('محتوى التطبيق') +
        '<div class="card card--flush"><div class="kv">' +
          W.kv('عدد الديون', '<span class="num">' + F.num(App.store.state.loans.length) + '</span>') +
          W.kv('عدد الدفعات', '<span class="num">' + F.num(App.store.state.payments.length) + '</span>') +
          W.kv('بدأت الاستخدام', '<time>' + F.dateShort(String(s.createdAt).slice(0, 10)) + '</time>') +
        '</div></div>' +

        W.sectionTitle('منطقة الخطر') +
        '<div class="card card--flush"><div class="list">' +
          row('trash', 'حذف كل البيانات', 'يمسح كل الديون والدفعات', 'reset', true) +
        '</div></div>' +

        '<div class="center t-xs t-muted" style="margin-top:6px">' +
          App.config.APP_NAME + ' · يعمل بدون إنترنت · بياناتك على جهازك' +
        '</div>';
    }
  };

  /* تُستدعى من app.js عبر data-action */
  App.settingsSheets = {
    export: openExport,
    import: openImport,
    currency: openCurrency,
    alertDays: openAlertDays
  };
})(window.App);
