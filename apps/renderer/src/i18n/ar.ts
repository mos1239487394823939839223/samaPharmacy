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

  items: {
    listTitle: 'الأصناف',
    add: 'اضافة صنف',
    edit: 'تعديل صنف',
    search: 'بحث بالاسم أو الباركود',
    count: 'عدد الأصناف',
    empty: 'لا توجد أصناف',
    noResults: 'لا توجد نتائج',
    loading: 'جارٍ التحميل…',
    deactivate: 'إيقاف',
    confirmDeactivate: 'إيقاف هذا الصنف؟ لن يظهر في البحث ولن يُحذف.',

    tabs: {
      basic: 'المعلومات الأساسية',
      pricing: 'الأسعار و الوحدات',
      supplier: 'بيانات مورد الصنف',
      settings: 'اعدادات الصنف',
    },

    fields: {
      code: 'مؤشر الصنف',
      itemType: 'نوع الصنف',
      internationalCode: 'الكود الدولي',
      nameAr: 'اسم الصنف باللغة العربية',
      nameEn: 'اسم الصنف باللغة الانجليزية',
      origin: 'منشأ الصنف',
      originLocal: 'محلي',
      originImported: 'مستورد',
      manufacturer: 'اسم الشركة المنتجة',
      itemNature: 'طبيعة الصنف',
      scientificData: 'بيانات علمية',
      scientificName: 'الاسم العلمي',
      mainIngredient: 'المادة الفعالة الأساسية',
      mainIngredientPct: 'نسبة المادة الفعالة الأساسية %',
      noExpiry: 'ليس له تاريخ صلاحية',
      scheduleClass: 'صنف جدول',
      storageCondition: 'صنف تخزين',
      requiresPrescription: 'يتطلب روشتة',
      additionalData: 'بيانات اضافية',
      shelfLocation: 'مكان الصنف',
      publicPrice: 'سعر الجمهور',
      minStock: 'الحد الأدنى للمخزون',
      maxStock: 'الحد الأقصى للمخزون',
      barcodes: 'اضافة باركود اخر للصنف',
      barcode: 'الباركود',
      scientificGroups: 'المجموعات العلمية',
      units: 'الوحدات',
      unitName: 'الوحدة',
      unitFactor: 'المعامل',
      unitPrice: 'سعر البيع',
      unitIsBase: 'الوحدة الأساسية',
      unitDefaultSale: 'افتراضي للبيع',
    },

    schedule: {
      none: 'غير مجدول',
      table1: 'جدول ١',
      table2: 'جدول ٢',
      table3: 'جدول ٣',
    },

    storage: {
      room: 'حرارة الغرفة',
      fridge: 'ثلاجة',
      freezer: 'فريزر',
    },

    actions: {
      save: 'حفظ',
      cancel: 'إلغاء',
      addRow: 'إضافة سطر',
      removeRow: 'حذف',
      back: 'رجوع',
    },

    errors: {
      nameRequired: 'اسم الصنف باللغة العربية مطلوب',
      duplicateBarcode: 'هذا الباركود مستخدم بالفعل',
      needBaseUnit: 'يجب تحديد وحدة أساسية واحدة بمعامل ١',
      priceAbovePublic: 'سعر البيع لا يمكن أن يتجاوز سعر الجمهور',
      invalidNumber: 'قيمة غير صالحة',
      saveFailed: 'تعذّر الحفظ',
    },
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
    noBridge:
      'لا يمكن الوصول إلى قاعدة البيانات من المتصفح. افتح التطبيق عبر Electron باستخدام npm run dev.',
  },
} as const;

export type Strings = typeof ar;
