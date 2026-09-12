/**
 * Arabic UI strings.
 *
 * Every user-facing string lives here, never inline in a component
 * (CLAUDE.md § Language). Keys are English so the code stays readable.
 */

export const ar = {
  app: {
    title: 'نظام إدارة الصيدلية',
  },

  modules: {
    sales: 'المبيعات',
    returns: 'المرتجع',
    purchases: 'المشتريات',
    items: 'الأصناف',
    customers: 'العملاء',
    log: 'السجل',
  },

  drawer: {
    home: 'الرئيسية',
    customers: 'العملاء',
    customersList: 'العملاء',
    customersReports: 'التقارير',
    items: 'الأصناف',
    itemsList: 'الأصناف',
    itemsIbnSina: 'ابن سينا مباشر',
    warehouses: 'المخازن',
    sales: 'المبيعات',
    salesInvoices: 'فواتير المبيعات',
    salesShiftHandover: 'تسليم الدرج',
    salesReturnByInvoice: 'مرتجع فواتير البيع',
    salesReturnGeneral: 'مرتجع بيع عام',
    salesReports: 'التقارير',
    purchases: 'المشتريات',
    purchaseInvoices: 'فواتير الشراء',
    purchaseReturnByInvoice: 'مرتجعات فواتير الشراء',
    purchaseReturnGeneral: 'مرتجعات شراء عام',
    accounts: 'الحسابات',
    cashInOut: 'صرف وتوريد نقدية',
  },

  shell: {
    toggleDrawer: 'إظهار/إخفاء القائمة',
    showShortcutBadges: 'إظهار اختصارات لوحة المفاتيح',
    notImplemented: 'هذه الشاشة قيد الإنشاء',
    notImplementedHint: 'سيتم بناؤها في مرحلة لاحقة.',
  },

  status: {
    connectionOk: 'الاتصال سليم',
    connectionFailed: 'فشل الاتصال',
    connecting: 'جارٍ الاتصال بقاعدة البيانات…',
    sqliteVersion: 'إصدار SQLite',
    migrations: 'الترحيلات المطبقة',
    journalMode: 'وضع السجل',
    foreignKeys: 'المفاتيح الخارجية',
    enabled: 'مفعّلة',
    disabled: 'معطّلة',
    databasePath: 'مسار قاعدة البيانات',
  },
} as const;

export type Strings = typeof ar;
