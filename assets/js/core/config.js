/* ============================================================
   config.js — الثوابت العامّة ونقطة الدخول للمساحة العامة App
   ملاحظة: نستخدم سكربتات عادية (بلا ES Modules) حتى يعمل التطبيق
   عند فتح index.html مباشرة من الجهاز (بروتوكول file://).
   ============================================================ */

window.App = window.App || {};

App.config = {
  /* مفتاح التخزين المحلّي — أي تغيير في البنية يرفع الرقم */
  STORAGE_KEY: 'debt-tracker/v1',
  SCHEMA: 1,

  APP_NAME: 'ديوني',
  BACKUP_SIGNATURE: 'debt-tracker-backup',

  /* عدد أيام التنبيه المسبق للقسط القادم */
  DEFAULT_ALERT_DAYS: 7,

  /* العملات المتاحة */
  CURRENCIES: [
    { code: 'QAR', label: 'ريال قطري',  symbol: 'ر.ق' },
    { code: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
    { code: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
    { code: 'KWD', label: 'دينار كويتي', symbol: 'د.ك' },
    { code: 'BHD', label: 'دينار بحريني', symbol: 'د.ب' },
    { code: 'OMR', label: 'ريال عُماني', symbol: 'ر.ع' },
    { code: 'EGP', label: 'جنيه مصري',  symbol: 'ج.م' },
    { code: 'JOD', label: 'دينار أردني', symbol: 'د.أ' },
    { code: 'USD', label: 'دولار',      symbol: '$' }
  ],

  /* أنواع الجهة الدائنة */
  LENDER_TYPES: [
    { value: 'bank',    label: 'بنك / تمويل',  icon: 'bank' },
    { value: 'person',  label: 'شخص',          icon: 'user' },
    { value: 'company', label: 'شركة / متجر',  icon: 'store' },
    { value: 'other',   label: 'أخرى',         icon: 'tag' }
  ],

  /* حدود نسبة الاستقطاع من الراتب (للتلوين فقط) */
  DTI: { safe: 33, warn: 50 }
};
