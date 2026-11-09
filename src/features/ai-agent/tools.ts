import "server-only";
import { db } from "@/shared/db";
import type { AuthUser } from "@/features/auth/session";
import { createProduct, updateProduct, softDeleteProduct, saveCategory, deleteCategory } from "@/features/inventory/service";
import { saveCustomer, softDeleteCustomer } from "@/features/customers/service";
import { saveSupplier, softDeleteSupplier } from "@/features/procurement/service";
import { saveExpense, deleteExpense } from "@/features/expenses/service";
import { saveStoreSettings, getStoreSettings } from "@/features/settings/service";
import { getBrandingSettings, saveBrandingSettings } from "@/features/branding/service";
import { softDeleteUser } from "@/features/users/service";
import { deleteRole } from "@/features/roles/service";

export interface ToolResult {
  ok: boolean;
  message: string;
  navigate?: string;
  data?: unknown;
}

const ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  products: "/inventory/products",
  categories: "/inventory/categories",
  stock: "/inventory/stock",
  expiring: "/inventory/expiring",
  suppliers: "/procurement/suppliers",
  purchase_orders: "/procurement/purchase-orders",
  purchases: "/procurement/purchases",
  customers: "/customers/list",
  frozen: "/customers/frozen",
  transactions: "/customers/transactions",
  reports: "/reports/sales",
  expenses: "/expenses",
  users: "/users",
  roles: "/roles",
  audit: "/audit-log",
  settings: "/settings/store",
  branding: "/settings/branding",
  backup: "/settings/backup",
  pos: "/sales/pos",
  orders: "/sales/orders",
};

function hasPerm(user: AuthUser, key: string) {
  return user.permissions.includes("*") || user.permissions.includes(key);
}

export async function executeTool(name: string, args: Record<string, unknown>, user: AuthUser): Promise<ToolResult> {
  switch (name) {
    case "navigate_to_page": {
      const key = String(args.route ?? args.page ?? "").toLowerCase();
      const route = ROUTES[key] ?? (key.startsWith("/") ? key : null);
      if (!route) return { ok: false, message: `لم يتم العثور على صفحة "${key}".` };
      return { ok: true, message: `جاري فتح ${route}...`, navigate: route };
    }
    case "search_products": {
      if (!hasPerm(user, "products.view")) return { ok: false, message: "ليس لديك صلاحية عرض المنتجات." };
      const q = String(args.query ?? args.q ?? "").trim();
      const where: any = { deletedAt: null };
      if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { nameAr: { contains: q } }, { sku: { contains: q, mode: "insensitive" } }];
      const rows = await db.product.findMany({ where, take: 20, orderBy: { name: "asc" } });
      if (rows.length === 0) return { ok: true, message: "لم يتم العثور على منتجات." };
      const lines = rows.map((p) => `${p.sku} - ${p.name} (${p.nameAr ?? ""})`);
      return { ok: true, message: `تم العثور على ${rows.length} منتج:\n${lines.join("\n")}`, data: rows };
    }
    case "get_inventory_summary": {
      if (!hasPerm(user, "inventory.view")) return { ok: false, message: "ليس لديك صلاحية عرض المخزون." };
      const count = await db.product.count({ where: { deletedAt: null } });
      const agg = await db.inventory.aggregate({ _sum: { quantity: true } });
      const low = await db.inventory.count({ where: { quantity: { lte: 5 } } });
      return { ok: true, message: `المنتجات: ${count}، إجمالي المخزون: ${agg._sum.quantity ?? 0}، منتجات منخفضة: ${low}.` };
    }
    case "get_low_stock": {
      if (!hasPerm(user, "inventory.view")) return { ok: false, message: "ليس لديك صلاحية عرض المخزون." };
      const rows = await db.inventory.findMany({ where: { quantity: { lte: 5 } }, include: { product: true }, take: 20 });
      if (rows.length === 0) return { ok: true, message: "لا توجد منتجات منخفضة." };
      const lines = rows.map((r) => `${r.product.sku} - ${r.product.name}: ${r.quantity}`);
      return { ok: true, message: `منتجات منخفضة:\n${lines.join("\n")}` };
    }
    case "search_customers": {
      if (!hasPerm(user, "customers.view")) return { ok: false, message: "ليس لديك صلاحية عرض العملاء." };
      const q = String(args.query ?? args.q ?? "").trim();
      const where: any = { deletedAt: null };
      if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];
      const rows = await db.customer.findMany({ where, take: 20, orderBy: { name: "asc" } });
      if (rows.length === 0) return { ok: true, message: "لم يتم العثور على عملاء." };
      const lines = rows.map((c) => `${c.code} - ${c.name} (رصيد: ${c.balance})`);
      return { ok: true, message: `تم العثور على ${rows.length} عميل:\n${lines.join("\n")}` };
    }
    case "create_customer": {
      if (!hasPerm(user, "customers.create")) return { ok: false, message: "ليس لديك صلاحية إضافة العملاء." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم العميل مطلوب." };
      const creditLimit = Number(args.creditLimit ?? args.credit ?? 0);
      const phone = args.phone ? String(args.phone) : "";
      try {
        const created = await saveCustomer(null, { name, phone, creditLimit });
        return { ok: true, message: `تمت إضافة العميل ${created.name} (كود: ${created.code}).` };
      } catch (e) {
        return { ok: false, message: `فشل إضافة العميل: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_customer": {
      if (!hasPerm(user, "customers.update")) return { ok: false, message: "ليس لديك صلاحية حذف العملاء." };
      const name = String(args.name ?? "").trim();
      const customer = await db.customer.findFirst({ where: { name: { contains: name, mode: "insensitive" }, deletedAt: null } });
      if (!customer) return { ok: false, message: `لم يتم العثور على عميل "${name}".` };
      try {
        await softDeleteCustomer(customer.id);
        return { ok: true, message: `تم حذف العميل ${customer.name}.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف العميل: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "update_customer_credit": {
      if (!hasPerm(user, "customers.update")) return { ok: false, message: "ليس لديك صلاحية تعديل العملاء." };
      const name = String(args.name ?? "").trim();
      const creditLimit = String(args.creditLimit ?? args.credit ?? "").trim();
      if (!name) return { ok: false, message: "اسم العميل مطلوب." };
      if (!creditLimit) return { ok: false, message: "حد الإئتمان مطلوب." };
      const customer = await db.customer.findFirst({ where: { name: { contains: name, mode: "insensitive" }, deletedAt: null } });
      if (!customer) return { ok: false, message: `لم يتم العثور على عميل "${name}".` };
      await db.customer.update({ where: { id: customer.id }, data: { creditLimit } });
      return { ok: true, message: `تم تحديث حد الإئتمان للعميل ${customer.name} إلى ${creditLimit}.` };
    }
    case "add_customer_payment": {
      if (!hasPerm(user, "customers.credit")) return { ok: false, message: "ليس لديك صلاحية تسجيل الدفعات." };
      const name = String(args.name ?? "").trim();
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "المبلغ غير صالح." };
      const customer = await db.customer.findFirst({ where: { name: { contains: name, mode: "insensitive" }, deletedAt: null } });
      if (!customer) return { ok: false, message: `لم يتم العثور على عميل "${name}".` };
      const newBalance = Number(customer.balance) - amount;
      await db.customerTransaction.create({
        data: { customerId: customer.id, type: "PAYMENT", amount: amount.toFixed(2), balanceAfter: newBalance.toFixed(2), note: "عبر وكيل الدعم" },
      });
      await db.customer.update({ where: { id: customer.id }, data: { balance: newBalance.toFixed(2) } });
      return { ok: true, message: `تم تسجيل دفعة ${amount} للعميل ${customer.name}. الرصيد الجديد: ${newBalance.toFixed(2)}.` };
    }
    case "create_product": {
      if (!hasPerm(user, "products.create")) return { ok: false, message: "ليس لديك صلاحية إضافة المنتجات." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم المنتج مطلوب." };
      const costPrice = Number(args.costPrice ?? 0);
      const sellingPrice = Number(args.sellingPrice ?? 0);
      if (sellingPrice < costPrice) return { ok: false, message: "سعر البيع يجب أن يكون >= سعر التكلفة." };
      let categoryId = args.categoryId ? String(args.categoryId) : null;
      if (!categoryId && args.category) {
        const cat = await db.category.findFirst({ where: { name: { contains: String(args.category), mode: "insensitive" } } });
        categoryId = cat?.id ?? null;
      }
      if (!categoryId) {
        const first = await db.category.findFirst();
        categoryId = first?.id ?? null;
      }
      if (!categoryId) return { ok: false, message: "لا توجد فئات. أنشئ فئة أولاً." };
      try {
        const card = await createProduct(user.id, {
          name,
          nameAr: args.nameAr ?? "",
          categoryId,
          costPrice,
          sellingPrice,
          initialQty: args.initialQty ?? 0,
          minStock: args.minStock ?? 0,
          reorderLevel: args.reorderLevel ?? 0,
          isActive: true,
        });
        return { ok: true, message: `تم إنشاء المنتج ${card.name} (SKU: ${card.sku}).` };
      } catch (e) {
        return { ok: false, message: `فشل إنشاء المنتج: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_product": {
      if (!hasPerm(user, "products.delete")) return { ok: false, message: "ليس لديك صلاحية حذف المنتجات." };
      const name = String(args.name ?? args.sku ?? "").trim();
      const product = await db.product.findFirst({ where: { OR: [{ name: { contains: name, mode: "insensitive" } }, { sku: { equals: name, mode: "insensitive" } }], deletedAt: null } });
      if (!product) return { ok: false, message: `لم يتم العثور على منتج "${name}".` };
      try {
        await softDeleteProduct(user.id, product.id);
        return { ok: true, message: `تم حذف المنتج ${product.name}.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف المنتج: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "create_category": {
      if (!hasPerm(user, "catalog.categories")) return { ok: false, message: "ليس لديك صلاحية إدارة الفئات." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم الفئة مطلوب." };
      try {
        await saveCategory(null, { name, nameAr: args.nameAr ?? "" });
        return { ok: true, message: `تم إنشاء الفئة ${name}.` };
      } catch (e) {
        return { ok: false, message: `فشل إنشاء الفئة: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_category": {
      if (!hasPerm(user, "catalog.categories")) return { ok: false, message: "ليس لديك صلاحية حذف الفئات." };
      const name = String(args.name ?? "").trim();
      const cat = await db.category.findFirst({ where: { name: { contains: name, mode: "insensitive" } } });
      if (!cat) return { ok: false, message: `لم يتم العثور على فئة "${name}".` };
      try {
        await deleteCategory(cat.id);
        return { ok: true, message: `تم حذف الفئة ${cat.name}.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف الفئة: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "create_supplier": {
      if (!hasPerm(user, "suppliers.manage")) return { ok: false, message: "ليس لديك صلاحية إضافة الموردين." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم المورد مطلوب." };
      try {
        const s = await saveSupplier(null, { name, nameAr: args.nameAr ?? "", creditLimit: args.creditLimit ?? 0 });
        return { ok: true, message: `تم إضافة المورد ${s.name} (كود: ${s.code}).` };
      } catch (e) {
        return { ok: false, message: `فشل إضافة المورد: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_supplier": {
      if (!hasPerm(user, "suppliers.manage")) return { ok: false, message: "ليس لديك صلاحية حذف الموردين." };
      const name = String(args.name ?? "").trim();
      const s = await db.supplier.findFirst({ where: { name: { contains: name, mode: "insensitive" }, deletedAt: null } });
      if (!s) return { ok: false, message: `لم يتم العثور على مورد "${name}".` };
      try {
        await softDeleteSupplier(s.id);
        return { ok: true, message: `تم حذف المورد ${s.name}.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف المورد: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "create_expense": {
      if (!hasPerm(user, "expenses.manage")) return { ok: false, message: "ليس لديك صلاحية إضافة المصروفات." };
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "المبلغ غير صالح." };
      const description = String(args.description ?? "").trim() || "مصروف";
      try {
        // find or create category
        let cat = args.category ? await db.expenseCategory.findFirst({ where: { name: { contains: String(args.category), mode: "insensitive" } } }) : null;
        if (!cat) {
          cat = await db.expenseCategory.findFirst();
        }
        if (!cat) return { ok: false, message: "لا توجد فئات مصروفات." };
        const e = await saveExpense(user.id, { categoryId: cat.id, amount, description, method: "CASH" });
        return { ok: true, message: `تم إضافة مصروف ${amount} (${description}).` };
      } catch (err) {
        return { ok: false, message: `فشل إضافة المصروف: ${err instanceof Error ? err.message : "خطأ"}` };
      }
    }
    case "update_button_color": {
      if (!hasPerm(user, "settings.manage")) return { ok: false, message: "ليس لديك صلاحية تعديل الإعدادات." };
      const color = String(args.color ?? args.value ?? "").trim();
      if (!color) return { ok: false, message: "اللون مطلوب." };
      try {
        const branding = await getBrandingSettings();
        await saveBrandingSettings(user.id, { buttonColor: color });
        return { ok: true, message: `تم تغيير لون الأزرار إلى ${color} بنجاح.` };
      } catch (e) {
        return { ok: false, message: `فشل تغيير لون الأزرار: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "update_store_name": {
      if (!hasPerm(user, "settings.manage")) return { ok: false, message: "ليس لديك صلاحية تعديل الإعدادات." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم المتجر مطلوب." };
      try {
        const current = await getStoreSettings();
        await saveStoreSettings(user.id, {
          name,
          nameAr: current.nameAr ?? undefined,
          logoUrl: current.logoUrl ?? undefined,
          address: current.address ?? undefined,
          addressAr: current.addressAr ?? undefined,
          phone: current.phone ?? undefined,
          email: current.email ?? undefined,
          currencyCode: current.currencyCode,
          currencySymbol: current.currencySymbol,
          receiptFooter: current.receiptFooter ?? undefined,
        });
        const branding = await getBrandingSettings();
        await saveBrandingSettings(user.id, { systemName: name, shortName: branding.shortName ?? name });
        return { ok: true, message: `تم تغيير اسم المتجر بنجاح إلى "${name}".` };
      } catch (e) {
        return { ok: false, message: `فشل تحديث اسم المتجر: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "get_store_settings": {
      if (!hasPerm(user, "settings.view")) return { ok: false, message: "ليس لديك صلاحية عرض الإعدادات." };
      try {
        const store = await getStoreSettings();
        const branding = await getBrandingSettings();
        return { ok: true, message: `اسم المتجر: ${store.name}. اسم النظام: ${branding.systemName}.` };
      } catch (e) {
        return { ok: false, message: `فشل قراءة الإعدادات: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_user": {
      if (!hasPerm(user, "users.manage")) return { ok: false, message: "ليس لديك صلاحية حذف المستخدمين." };
      const name = String(args.name ?? "").trim();
      if (!name) return { ok: false, message: "اسم المستخدم مطلوب." };
      // find by username or role name
      let target = await db.user.findFirst({ where: { username: { equals: name, mode: "insensitive" }, deletedAt: null } });
      if (!target) {
        // try role name
        const role = await db.role.findFirst({ where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { nameAr: { contains: name } }] } });
        if (role) {
          const users = await db.user.findMany({ where: { roleId: role.id, deletedAt: null } });
          if (users.length === 0) return { ok: false, message: `لا يوجد مستخدمون بدور ${role.name}.` };
          if (users.length > 1) return { ok: false, message: `يوجد ${users.length} مستخدمين بدور ${role.name}. حدد المستخدم (username).` };
          target = users[0];
        }
      }
      if (!target) return { ok: false, message: `لم يتم العثور على مستخدم "${name}".` };
      if (target.id === user.id) return { ok: false, message: "لا يمكنك حذف حسابك الخاص." };
      try {
        await softDeleteUser(user, target.id);
        const verify = await db.user.findUnique({ where: { id: target.id } });
        if (!verify?.deletedAt) return { ok: false, message: "فشل التحقق من الحذف." };
        return { ok: true, message: `تم حذف المستخدم ${target.username} بنجاح.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف المستخدم: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "delete_role": {
      if (!hasPerm(user, "roles.manage")) return { ok: false, message: "ليس لديك صلاحية حذف الأدوار." };
      const name = String(args.name ?? "").trim();
      const role = await db.role.findFirst({ where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { nameAr: { contains: name } }] } });
      if (!role) return { ok: false, message: `لم يتم العثور على دور "${name}".` };
      try {
        await deleteRole(role.id);
        return { ok: true, message: `تم حذف الدور ${role.name} بنجاح.` };
      } catch (e) {
        return { ok: false, message: `فشل حذف الدور: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "inspect_database_schema": {
      if (!hasPerm(user, "settings.view")) return { ok: false, message: "ليس لديك صلاحية عرض الإعدادات." };
      try {
        const rows = await db.$queryRawUnsafe<{ table_name: string }[]>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        );
        const names = rows.map((r) => r.table_name);
        return { ok: true, message: `الجداول المكتشفة (${names.length}):\n${names.join("\n")}` };
      } catch (e) {
        return { ok: false, message: `فشل فحص قاعدة البيانات: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "get_table_structure": {
      if (!hasPerm(user, "settings.view")) return { ok: false, message: "ليس لديك صلاحية عرض الإعدادات." };
      const table = String(args.table ?? args.tableName ?? "").trim();
      if (!table) return { ok: false, message: "اسم الجدول مطلوب." };
      try {
        const rows = await db.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
          table
        );
        if (rows.length === 0) return { ok: false, message: `لم يتم العثور على جدول "${table}".` };
        const lines = rows.map((r) => `${r.column_name} (${r.data_type})`);
        return { ok: true, message: `هيكل ${table}:\n${lines.join("\n")}` };
      } catch (e) {
        return { ok: false, message: `فشل قراءة هيكل الجدول: ${e instanceof Error ? e.message : "خطأ"}` };
      }
    }
    case "get_sales_summary": {
      if (!hasPerm(user, "sales.view")) return { ok: false, message: "ليس لديك صلاحية عرض المبيعات." };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const count = await db.sale.count({ where: { saleDate: { gte: today } } });
      const agg = await db.sale.aggregate({ where: { saleDate: { gte: today } }, _sum: { total: true } });
      return { ok: true, message: `مبيعات اليوم: ${count} فاتورة، الإجمالي: ${agg._sum.total ?? 0}.` };
    }
    default:
      return { ok: false, message: `أداة غير معروفة: ${name}` };
  }
}

export const TOOL_LIST = [
  { name: "navigate_to_page", description: "Navigate to a page by key (dashboard, products, pos, customers, etc.)", args: { route: "string" } },
  { name: "search_products", description: "Search products by name/sku", args: { query: "string" } },
  { name: "get_inventory_summary", description: "Get inventory summary", args: {} },
  { name: "get_low_stock", description: "List low stock products", args: {} },
  { name: "search_customers", description: "Search customers by name/phone", args: { query: "string" } },
  { name: "create_customer", description: "Create a customer", args: { name: "string", creditLimit: "number?", phone: "string?" } },
  { name: "delete_customer", description: "Delete a customer by name (if balance zero)", args: { name: "string" } },
  { name: "update_customer_credit", description: "Update a customer's credit limit", args: { name: "string", creditLimit: "number" } },
  { name: "add_customer_payment", description: "Record a payment for a customer", args: { name: "string", amount: "number" } },
  { name: "get_sales_summary", description: "Get today's sales summary", args: {} },
  { name: "inspect_database_schema", description: "List all database tables", args: {} },
  { name: "get_table_structure", description: "Get columns of a table", args: { table: "string" } },
  { name: "update_store_name", description: "Update store/system name", args: { name: "string" } },
  { name: "update_button_color", description: "Update button color (hex)", args: { color: "string" } },
  { name: "get_store_settings", description: "Get store settings", args: {} },
  { name: "create_product", description: "Create a product", args: { name: "string", costPrice: "number", sellingPrice: "number", category: "string?", initialQty: "number?" } },
  { name: "delete_product", description: "Delete a product by name/sku", args: { name: "string" } },
  { name: "create_category", description: "Create a category", args: { name: "string", nameAr: "string?" } },
  { name: "delete_category", description: "Delete a category by name", args: { name: "string" } },
  { name: "create_supplier", description: "Create a supplier", args: { name: "string", creditLimit: "number?" } },
  { name: "delete_supplier", description: "Delete a supplier by name", args: { name: "string" } },
  { name: "create_expense", description: "Create an expense", args: { amount: "number", description: "string?", category: "string?" } },
  { name: "update_customer_credit", description: "Update a customer's credit limit", args: { name: "string", creditLimit: "number" } },
  { name: "delete_user", description: "Delete a user by username or role name", args: { name: "string" } },
  { name: "delete_role", description: "Delete a role by name", args: { name: "string" } },
];