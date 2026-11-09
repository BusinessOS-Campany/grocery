export interface PageEntry {
  id: string;
  href: string;
  titleAr: string;
  titleEn: string;
  permission?: string;
  synonyms: string[];
}

export const PAGE_REGISTRY: PageEntry[] = [
  { id: "dashboard", href: "/dashboard", titleAr: "لوحة التحكم", titleEn: "Dashboard", permission: "dashboard.view", synonyms: ["home", "الرئيسية", "dashboard", "main"] },
  { id: "products", href: "/inventory/products", titleAr: "المنتجات", titleEn: "Products", permission: "products.view", synonyms: ["product", "المنتجات", "منتج"] },
  { id: "categories", href: "/inventory/categories", titleAr: "التصنيفات", titleEn: "Categories", permission: "catalog.categories", synonyms: ["الفئات", "categories", "category"] },
  { id: "stock", href: "/inventory/stock", titleAr: "المخزون", titleEn: "Stock", permission: "inventory.view", synonyms: ["أرصدة", "stock", "inventory"] },
  { id: "expiring", href: "/inventory/expiring", titleAr: "قرب الانتهاء", titleEn: "Expiring", permission: "inventory.batches", synonyms: ["الانتهاء", "الصلاحية", "نافد", "expiring"] },
  { id: "pos", href: "/sales/pos", titleAr: "نقطة البيع", titleEn: "POS", permission: "sales.create", synonyms: ["بيع", "كاشير", "pos", "cashier"] },
  { id: "orders", href: "/sales/orders", titleAr: "الفواتير والطلبات", titleEn: "Sales Orders", permission: "sales.view", synonyms: ["الفواتير", "الطلبات", "orders", "invoices"] },
  { id: "suppliers", href: "/procurement/suppliers", titleAr: "الموردون", titleEn: "Suppliers", permission: "suppliers.view", synonyms: ["المورد", "suppliers", "supplier"] },
  { id: "purchase_orders", href: "/procurement/purchase-orders", titleAr: "أوامر الشراء", titleEn: "Purchase Orders", permission: "procurement.create", synonyms: ["po", "أوامر", "purchase orders"] },
  { id: "purchases", href: "/procurement/purchases", titleAr: "المشتريات", titleEn: "Purchases", permission: "procurement.view", synonyms: ["المشتريات", "purchases"] },
  { id: "purchase_returns", href: "/procurement/returns", titleAr: "مرتجعات الشراء", titleEn: "Purchase Returns", permission: "procurement.return", synonyms: ["مرتجعات", "returns"] },
  { id: "receiving", href: "/procurement/receiving", titleAr: "الاستلام", titleEn: "Receiving", permission: "procurement.receive", synonyms: ["استلام", "receiving"] },
  { id: "customers", href: "/customers/list", titleAr: "العملاء", titleEn: "Customers", permission: "customers.view", synonyms: ["العميل", "customers", "customer"] },
  { id: "frozen", href: "/customers/frozen", titleAr: "الحسابات المجمدة", titleEn: "Frozen Accounts", permission: "customers.view", synonyms: ["مجمدة", "متجمدة", "frozen"] },
  { id: "transactions", href: "/customers/transactions", titleAr: "الآجل والمدفوعات", titleEn: "Transactions", permission: "customers.credit", synonyms: ["الآجل", "المدفوعات", "transactions"] },
  { id: "reports_sales", href: "/reports/sales", titleAr: "تقرير المبيعات", titleEn: "Sales Report", permission: "reports.view", synonyms: ["تقرير المبيعات", "sales report"] },
  { id: "reports_purchases", href: "/reports/purchases", titleAr: "تقرير المشتريات", titleEn: "Purchases Report", permission: "reports.view", synonyms: ["تقرير المشتريات", "purchases report"] },
  { id: "reports_profit", href: "/reports/profit", titleAr: "تقرير الأرباح", titleEn: "Profit Report", permission: "reports.view", synonyms: ["تقرير الأرباح", "profit", "أرباح"] },
  { id: "reports_inventory", href: "/reports/inventory", titleAr: "تقرير المخزون", titleEn: "Inventory Report", permission: "reports.view", synonyms: ["تقرير المخزون", "inventory report"] },
  { id: "reports_customers", href: "/reports/customers", titleAr: "تقرير العملاء", titleEn: "Customers Report", permission: "reports.view", synonyms: ["تقرير العملاء", "customers report"] },
  { id: "reports_suppliers", href: "/reports/suppliers", titleAr: "تقرير الموردين", titleEn: "Suppliers Report", permission: "reports.view", synonyms: ["تقرير الموردين", "suppliers report"] },
  { id: "reports_expenses", href: "/reports/expenses", titleAr: "تقرير المصروفات", titleEn: "Expenses Report", permission: "reports.view", synonyms: ["تقرير المصروفات", "expenses report"] },
  { id: "reports_summary", href: "/reports/summary", titleAr: "الملخص المالي", titleEn: "Financial Summary", permission: "reports.view", synonyms: ["ملخص مالي", "summary"] },
  { id: "reports_tax", href: "/reports/tax", titleAr: "تقرير الضرائب", titleEn: "Tax Report", permission: "reports.view", synonyms: ["ضرائب", "tax"] },
  { id: "expenses", href: "/expenses", titleAr: "المصروفات", titleEn: "Expenses", permission: "expenses.view", synonyms: ["المصروف", "expenses"] },
  { id: "users", href: "/users", titleAr: "المستخدمون", titleEn: "Users", permission: "users.view", synonyms: ["المستخدم", "users", "user"] },
  { id: "roles", href: "/roles", titleAr: "الأدوار والصلاحيات", titleEn: "Roles", permission: "roles.manage", synonyms: ["الأدوار", "الصلاحيات", "permissions", "roles", "role"] },
  { id: "audit", href: "/audit-log", titleAr: "سجل التدقيق", titleEn: "Audit Log", permission: "audit.view", synonyms: ["التدقيق", "audit", "audit log"] },
  { id: "settings", href: "/settings/store", titleAr: "الإعدادات", titleEn: "Settings", permission: "settings.view", synonyms: ["الإعدادات", "settings"] },
  { id: "branding", href: "/settings/branding", titleAr: "الهوية والمظهر", titleEn: "Branding", permission: "settings.manage", synonyms: ["الهوية", "الهويه", "هويه", "هوية", "branding", "هوية بصرية"] },
  { id: "ai_training", href: "/settings/ai-training", titleAr: "مركز تدريب الذكاء", titleEn: "AI Training", permission: "settings.manage", synonyms: ["مركز تدريب", "training", "ai training", "ذكاء"] },
  { id: "backup", href: "/settings/backup", titleAr: "النسخ الاحتياطي", titleEn: "Backup", permission: "backup.manage", synonyms: ["backup", "النسخ", "نسخ احتياطي"] },
  { id: "security", href: "/settings/security", titleAr: "الأمان", titleEn: "Security", permission: "settings.manage", synonyms: ["الأمان", "security", "حماية", "security settings"] },
  { id: "localization", href: "/settings/localization", titleAr: "اللغة والتوطين", titleEn: "Localization", permission: "settings.view", synonyms: ["التوطين", "localization", "لغة"] },
  { id: "sales_settings", href: "/settings/sales", titleAr: "إعدادات المبيعات", titleEn: "Sales Settings", permission: "settings.view", synonyms: ["إعدادات المبيعات", "sales settings"] },
  { id: "inventory_settings", href: "/settings/inventory", titleAr: "إعدادات المخزون", titleEn: "Inventory Settings", permission: "settings.view", synonyms: ["إعدادات المخزون", "inventory settings"] },
];

export function findPage(query: string): PageEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // exact id/title
  let found = PAGE_REGISTRY.find((p) =>
    p.id.toLowerCase() === q ||
    p.titleAr === query.trim() ||
    p.titleEn.toLowerCase() === q ||
    p.href.toLowerCase() === q
  );
  if (found) return found;
  // synonym/contains
  found = PAGE_REGISTRY.find((p) =>
    p.synonyms.some((s) => s.toLowerCase() === q) ||
    p.titleAr.includes(query.trim()) ||
    query.trim().includes(p.titleAr)
  );
  if (found) return found;
  // partial contains on synonyms
  found = PAGE_REGISTRY.find((p) => p.synonyms.some((s) => q.includes(s.toLowerCase()) || s.toLowerCase().includes(q)));
  return found ?? null;
}

export function hasPagePermission(userPermissions: string[], page: PageEntry): boolean {
  if (!page.permission) return true;
  return userPermissions.includes("*") || userPermissions.includes(page.permission);
}