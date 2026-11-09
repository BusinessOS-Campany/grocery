export interface PageEntry {
  id: string;
  href: string;
  titleAr: string;
  titleEn: string;
  permission?: string;
  synonyms: string[];
}

export const PAGE_REGISTRY: PageEntry[] = [
  { id: "dashboard", href: "/dashboard", titleAr: "لوحة التحكم", titleEn: "Dashboard", permission: "dashboard.view", synonyms: ["home", "الرئيسية", "dashboard"] },
  { id: "products", href: "/inventory/products", titleAr: "المنتجات", titleEn: "Products", permission: "products.view", synonyms: ["product", "المنتجات"] },
  { id: "categories", href: "/inventory/categories", titleAr: "التصنيفات", titleEn: "Categories", permission: "catalog.categories", synonyms: ["الفئات", "categories"] },
  { id: "stock", href: "/inventory/stock", titleAr: "المخزون", titleEn: "Stock", permission: "inventory.view", synonyms: ["أرصدة", "stock"] },
  { id: "expiring", href: "/inventory/expiring", titleAr: "قرب الانتهاء", titleEn: "Expiring", permission: "inventory.batches", synonyms: ["الانتهاء", "الصلاحية", "نافد", "expiring"] },
  { id: "pos", href: "/sales/pos", titleAr: "نقطة البيع", titleEn: "POS", permission: "sales.create", synonyms: ["بيع", "كاشير", "pos"] },
  { id: "orders", href: "/sales/orders", titleAr: "الفواتير والطلبات", titleEn: "Sales Orders", permission: "sales.view", synonyms: ["الفواتير", "الطلبات", "orders"] },
  { id: "suppliers", href: "/procurement/suppliers", titleAr: "الموردون", titleEn: "Suppliers", permission: "suppliers.view", synonyms: ["المورد", "suppliers"] },
  { id: "purchase_orders", href: "/procurement/purchase-orders", titleAr: "أوامر الشراء", titleEn: "Purchase Orders", permission: "procurement.create", synonyms: ["po", "أوامر"] },
  { id: "purchases", href: "/procurement/purchases", titleAr: "المشتريات", titleEn: "Purchases", permission: "procurement.view", synonyms: ["المشتريات"] },
  { id: "purchase_returns", href: "/procurement/returns", titleAr: "مرتجعات الشراء", titleEn: "Purchase Returns", permission: "procurement.return", synonyms: ["مرتجعات"] },
  { id: "customers", href: "/customers/list", titleAr: "العملاء", titleEn: "Customers", permission: "customers.view", synonyms: ["العميل", "customers"] },
  { id: "frozen", href: "/customers/frozen", titleAr: "الحسابات المجمدة", titleEn: "Frozen Accounts", permission: "customers.view", synonyms: ["مجمدة", "متجمدة", "frozen"] },
  { id: "transactions", href: "/customers/transactions", titleAr: "الآجل والمدفوعات", titleEn: "Transactions", permission: "customers.credit", synonyms: ["الآجل", "المدفوعات", "transactions"] },
  { id: "reports", href: "/reports/sales", titleAr: "التقارير", titleEn: "Reports", permission: "reports.view", synonyms: ["reports"] },
  { id: "expenses", href: "/expenses", titleAr: "المصروفات", titleEn: "Expenses", permission: "expenses.view", synonyms: ["المصروف", "expenses"] },
  { id: "users", href: "/users", titleAr: "المستخدمون", titleEn: "Users", permission: "users.view", synonyms: ["المستخدم", "users"] },
  { id: "roles", href: "/roles", titleAr: "الأدوار والصلاحيات", titleEn: "Roles", permission: "roles.manage", synonyms: ["الأدوار", "الصلاحيات", "permissions", "roles"] },
  { id: "audit", href: "/audit-log", titleAr: "سجل التدقيق", titleEn: "Audit Log", permission: "audit.view", synonyms: ["التدقيق", "audit"] },
  { id: "settings", href: "/settings/store", titleAr: "الإعدادات", titleEn: "Settings", permission: "settings.view", synonyms: ["الإعدادات", "settings"] },
  { id: "branding", href: "/settings/branding", titleAr: "الهوية والمظهر", titleEn: "Branding", permission: "settings.manage", synonyms: ["الهوية", "الهويه", "هويه", "هوية", "branding"] },
  { id: "ai_training", href: "/settings/ai-training", titleAr: "مركز تدريب الذكاء", titleEn: "AI Training", permission: "settings.manage", synonyms: ["مركز تدريب", "training", "ai training"] },
  { id: "backup", href: "/settings/backup", titleAr: "النسخ الاحتياطي", titleEn: "Backup", permission: "backup.manage", synonyms: ["backup", "النسخ"] },
  { id: "security", href: "/settings/security", titleAr: "الأمان", titleEn: "Security", permission: "settings.manage", synonyms: ["الأمان", "security", "حماية"] },
  { id: "localization", href: "/settings/localization", titleAr: "اللغة والتوطين", titleEn: "Localization", permission: "settings.view", synonyms: ["التوطين", "localization"] },
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