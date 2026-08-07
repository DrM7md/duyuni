/* ============================================================
   backup.js — تصدير واستيراد البيانات بصيغة JSON
   الملف المُصدَّر هو النسخة الاحتياطية الكاملة: افتح التطبيق
   على أي جهاز ثم استورد الملف لتعود البيانات كما هي.
   ============================================================ */

(function (App) {
  'use strict';

  var U = App.utils;
  var B = {};

  /** بناء كائن النسخة الاحتياطية */
  B.build = function () {
    var st = App.store.state;
    return {
      signature: App.config.BACKUP_SIGNATURE,
      schema: App.config.SCHEMA,
      app: App.config.APP_NAME,
      exportedAt: new Date().toISOString(),
      counts: { loans: st.loans.length, payments: st.payments.length },
      settings: st.settings,
      loans: st.loans,
      payments: st.payments
    };
  };

  B.toJson = function () { return JSON.stringify(B.build(), null, 2); };

  B.fileName = function () {
    return 'ديوني-نسخة-' + U.today() + '.json';
  };

  /** تنزيل ملف JSON */
  B.download = function () {
    var json = B.toJson();
    try {
      var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = B.fileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);

      App.store.setSettings({ lastBackupAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  /** مشاركة الملف (على الجوّال) إن كانت مدعومة */
  B.canShare = function () {
    return !!(navigator.share && navigator.canShare && window.File);
  };

  B.share = function () {
    if (!B.canShare()) return Promise.reject(new Error('غير مدعوم'));
    var file = new File([B.toJson()], B.fileName(), { type: 'application/json' });
    if (!navigator.canShare({ files: [file] })) return Promise.reject(new Error('غير مدعوم'));
    var self = this;
    return navigator.share({ files: [file], title: App.config.APP_NAME }).then(function () {
      App.store.setSettings({ lastBackupAt: new Date().toISOString() });
      return true;
    });
  };

  /** نسخ البيانات إلى الحافظة (خطّة بديلة إن تعذّر التنزيل) */
  B.copy = function () {
    var json = B.toJson();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(json);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = json;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  };

  /** التحقّق من صلاحية بيانات مستوردة */
  B.validate = function (data) {
    if (!data || typeof data !== 'object') return 'الملف غير صالح.';
    var hasLoans = Array.isArray(data.loans);
    var hasPays = Array.isArray(data.payments);
    if (!hasLoans && !hasPays) return 'لا توجد بيانات ديون في هذا الملف.';
    if (data.signature && data.signature !== App.config.BACKUP_SIGNATURE) {
      return 'هذا الملف يبدو من تطبيق آخر.';
    }
    return null;
  };

  /** قراءة ملف من input[type=file] */
  B.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('لم يتم اختيار ملف.'));
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch (e) {
          reject(new Error('الملف ليس بصيغة JSON صحيحة.'));
        }
      };
      reader.onerror = function () { reject(new Error('تعذّرت قراءة الملف.')); };
      reader.readAsText(file, 'utf-8');
    });
  };

  /** تحليل نصّ JSON ملصوق */
  B.parseText = function (text) {
    try { return JSON.parse(String(text || '').trim()); }
    catch (e) { return null; }
  };

  /** فتح منتقي الملفات وإرجاع البيانات */
  B.pickFile = function () {
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        document.body.removeChild(input);
        B.readFile(f).then(resolve, reject);
      });
      input.click();
    });
  };

  App.backup = B;
})(window.App);
