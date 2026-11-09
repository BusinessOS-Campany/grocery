import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { db } from "@/shared/db";
import { executeTool, TOOL_LIST } from "@/features/ai-agent/tools";
import { createConversation, addMessage, autoTitle, getConversation } from "@/features/ai-agent/conversations";
import { createSale } from "@/features/sales/service";
import { getRelevantKnowledge, addKnowledge } from "@/features/ai-agent/knowledge";

export const maxDuration = 60;

async function buildDataSnapshot(): Promise<string> {
  try {
    const [products, inventoryAgg, lowStock, customers, salesToday, branding] = await Promise.all([
      db.product.count({ where: { deletedAt: null } }),
      db.inventory.aggregate({ _sum: { quantity: true } }),
      db.inventory.count({ where: { quantity: { lte: 5 } } }),
      db.customer.count({ where: { deletedAt: null } }),
      db.sale.count({ where: { saleDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      db.brandingSettings.findUnique({ where: { id: "branding" } }),
    ]);
    const totalStock = inventoryAgg._sum.quantity ?? 0;
    const systemName = branding?.systemName ?? "Grocery ERP";
    return `Data snapshot: systemName=${systemName}, products=${products}, totalStock=${totalStock}, lowStockItems=${lowStock}, customers=${customers}, salesToday=${salesToday}.`;
  } catch {
    return "Data snapshot unavailable.";
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_AI_TOKEN;

  let body: { messages?: { role: string; content: string }[]; confirm?: boolean; conversationId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "NO_MESSAGES" }, { status: 400 });
  }

  // Resolve or create conversation (verify ownership).
  let conversationId = body.conversationId;
  if (conversationId) {
    const conv = await getConversation(user.id, conversationId);
    if (!conv) conversationId = undefined;
  }
  if (!conversationId) {
    const conv = await createConversation(user.id, messages[0].content.slice(0, 40));
    conversationId = conv.id;
  }
  const lastUser = messages[messages.length - 1].content;
  const prevAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  await addMessage(conversationId, "user", lastUser);

  const finish = async (reply: string, navigate?: string) => {
    await addMessage(conversationId!, "assistant", reply);
    // auto-title on first exchange
    await autoTitle(user.id, conversationId!, lastUser);
    const out: Record<string, unknown> = { reply, conversationId };
    if (navigate) out.navigate = navigate;
    return NextResponse.json(out);
  };

  const confirm = body.confirm === true;

  // Learn from explicit user corrections.
  const isCorrection = /^(لا|خطأ|تصحيح|ليس)\b/i.test(lastUser.trim()) || /تصحيح|خطأ/i.test(lastUser);
  if (isCorrection) {
    const prevAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
    await addKnowledge("correction", `User correction: ${lastUser}. Previous AI: ${prevAssistant}`, user.id, true, "user-correction").catch(() => {});
    return finish("تم حفظ التصحيح في مركز التدريب. سأستخدمه في المحادثات المستقبلية.");
  }

  // --- Direct commands (reliability) ---
  const simpleAdd = /عميل/.test(lastUser) && /(اضف|أريد|add)/i.test(lastUser);
  const simpleName = simpleAdd ? (lastUser.match(/عميل\s+(?:جديد\s+)?(.+?)(?:\s+(?:اريد|مع|بحد|credit|phone|ورقم)|$)/i)?.[1]?.trim() ?? "") : "";
  const simpleCredit = simpleAdd ? (lastUser.match(/(?:حد\s*ائتمان|credit\s*limit|حد)\s*(\d[\d,]*)/i)?.[1]?.replace(/,/g, "") ?? "0") : "0";
  const simplePhone = simpleAdd ? (lastUser.match(/(?:ورقمه|phone|رقم)\s*(\d+)/i)?.[1] ?? null) : null;
  if (simpleAdd && simpleName && !/بحد|ورقمه/.test(simpleName)) {
    const result = await executeTool("create_customer", { name: simpleName, creditLimit: Number(simpleCredit), phone: simplePhone ?? undefined }, user);
    if (result.ok) await addKnowledge("operation", `Created customer ${simpleName}`, user.id, false, "ai-agent").catch(() => {});
    return finish(result.message, result.navigate);
  }

  const addMatch = lastUser.match(/اضف\s+العميل\s+(.+?)\s+بحد\s+.*?(\d[\d,]*)\s+ورقمه\s+(\d+)/i);
  if (addMatch) {
    const name = addMatch[1].trim();
    const creditLimit = addMatch[2].replace(/,/g, "");
    const phone = addMatch[3].trim();
    const result = await executeTool("create_customer", { name, creditLimit: Number(creditLimit), phone }, user);
    if (result.ok) await addKnowledge("operation", `Created customer ${name}`, user.id, false, "ai-agent").catch(() => {});
    return finish(result.message, result.navigate);
  }

  const creditMatch = lastUser.match(/العميل\s+(.+?)(?=\s+(?:اريد|مع|بمبلغ|ائتمان))[\s\S]*?ائتمان\s+(\d[\d,]*)/i);
  if (creditMatch) {
    const name = creditMatch[1].trim().replace(/اريد|مع|بمبلغ/g, "").trim();
    const creditLimit = creditMatch[2].replace(/,/g, "");
    const result = await executeTool("update_customer_credit", { name, creditLimit: Number(creditLimit) }, user);
    return finish(result.message, result.navigate);
  }

  const delMatch = lastUser.match(/حذف\s+(?:العميل\s+)?(.+)/i);
  if (delMatch && (lastUser.includes("حذف") || lastUser.includes("delete"))) {
    const isCustomer = /عميل|customer/i.test(lastUser);
    const isProduct = /منتج|product/i.test(lastUser);
    const isCategory = /فئة|category/i.test(lastUser);
    const isSupplier = /مورد|supplier/i.test(lastUser);
    const isExpense = /مصروف|expense/i.test(lastUser);
    if (!isCustomer && !isProduct && !isCategory && !isSupplier && !isExpense) {
      const candidate = delMatch[1].trim();
      const result = await executeTool("delete_user", { name: candidate }, user);
      if (!result.ok && result.message.includes("لم يتم العثور")) {
        const roleResult = await executeTool("delete_role", { name: candidate }, user);
        return finish(roleResult.message, roleResult.navigate);
      }
      return finish(result.message, result.navigate);
    }
    if (isCustomer) {
      const name = delMatch[1].replace(/العميل/g, "").trim();
      const result = await executeTool("delete_customer", { name }, user);
      return finish(result.message, result.navigate);
    }
    if (isProduct) {
      const name = delMatch[1].replace(/المنتج/g, "").trim();
      const result = await executeTool("delete_product", { name }, user);
      return finish(result.message, result.navigate);
    }
    if (isCategory) {
      const name = delMatch[1].replace(/الفئة/g, "").trim();
      const result = await executeTool("delete_category", { name }, user);
      return finish(result.message, result.navigate);
    }
    if (isSupplier) {
      const name = delMatch[1].replace(/المورد/g, "").trim();
      const result = await executeTool("delete_supplier", { name }, user);
      return finish(result.message, result.navigate);
    }
  }

  const storeNameMatch = lastUser.match(/عدل\s+اسم\s+المتجر\s+(?:الى|إلى|to)\s+(.+)/i)
    || lastUser.match(/change store name to (.+)/i)
    || lastUser.match(/rename store to (.+)/i)
    || ((lastUser.includes("تغيير") || lastUser.includes("غيّر") || lastUser.includes("غير")) && lastUser.includes("الى") && /اسم|نظام|متجر/.test(prevAssistant + lastUser) && !/لون|أزرار|ثيم/.test(lastUser)
        ? lastUser.match(/(?:الى|إلى|to)\s+(.+)/i) : null);
  if (storeNameMatch) {
    const name = storeNameMatch[1].trim();
    const result = await executeTool("update_store_name", { name }, user);
    if (result.ok) await addKnowledge("operation", `Updated store name to ${name}`, user.id, false, "ai-agent").catch(() => {});
    return finish(result.message, result.navigate);
  }

  const colorMatch = lastUser.match(/لون\s+(?:الأزرار|الزر|الازرار)\s+(?:الى|إلى|to)\s+(.+)/i)
    || lastUser.match(/لون\s+(?:الأزرار|الزر|الازرار)\s+(.+)/i);
  if (colorMatch && (lastUser.includes("أزرار") || lastUser.includes("زر") || lastUser.includes("ازرار"))) {
    const colorName = colorMatch[1].trim().replace(/اللون/g, "").trim();
    const colorMap: Record<string, string> = {
      "أزرق": "#2563eb", "ازرق": "#2563eb", "blue": "#2563eb",
      "أخضر": "#16a34a", "اخضر": "#16a34a", "green": "#16a34a",
      "أحمر": "#dc2626", "احمر": "#dc2626", "red": "#dc2626",
      "أصفر": "#eab308", "اصفر": "#eab308", "yellow": "#eab308",
      "أسود": "#0f172a", "black": "#0f172a",
      "أبيض": "#ffffff", "ابيض": "#ffffff", "white": "#ffffff",
      "رمادي": "#6b7280", "gray": "#6b7280", "grey": "#6b7280",
      "برتقالي": "#ea580c", "orange": "#ea580c",
      "بنفسجي": "#7c3aed", "purple": "#7c3aed",
    };
    const color = colorMap[colorName] ?? (colorName.startsWith("#") ? colorName : "#2563eb");
    const result = await executeTool("update_button_color", { color }, user);
    return finish(result.message, result.navigate);
  }

  const themeMatch = /ثيم|theme/i.test(lastUser);
  if (themeMatch) {
    const light = /أبيض|ابيض|white|light|فاتح/i.test(lastUser);
    const dark = /داكن|dark|أسود|dark mode/i.test(lastUser);
    if (light || dark) {
      const theme = light ? "light" : "dark";
      const reply = light ? "تم تفعيل الثيم الأبيض بنجاح." : "تم تفعيل الثيم الداكن بنجاح.";
      await addKnowledge("operation", `Theme changed to ${theme}`, user.id, false, "ai-agent").catch(() => {});
      return NextResponse.json({ reply, conversationId, theme });
    }
  }

  const sellMatch = lastUser.match(/(\d+)\s+(.+?)\s*بيع/);
  if (sellMatch) {
    const qty = Number(sellMatch[1]);
    const productName = sellMatch[2].trim();
    try {
      const product = await db.product.findFirst({ where: { OR: [{ name: { contains: productName, mode: "insensitive" } }, { nameAr: { contains: productName } }], deletedAt: null, isActive: true } });
      if (!product) return finish(`لم يتم العثور على منتج "${productName}".`);
      const total = Number(product.sellingPrice) * qty;
      const result = await createSale(user.id, {
        items: [{ productId: product.id, quantity: qty }],
        payments: [{ method: "CASH", amount: total }],
      });
      await addKnowledge("operation", `Sold ${qty} of ${product.name}`, user.id, false, "ai-agent").catch(() => {});
      return finish(`تم بيع ${qty} من ${product.name}. رقم الفاتورة: ${result.invoiceNumber}. الإجمالي: ${result.total}.`);
    } catch (e) {
      return finish(`فشل البيع: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
    }
  }

  // --- Navigation fallback using page registry ---
  const { findPage, hasPagePermission } = await import("@/shared/page-registry");
  const foundPage = findPage(lastUser);
  if (foundPage && /اذهب|فتح|صفحة|صفحه|انتقل|open|go/.test(lastUser)) {
    if (!hasPagePermission(user.permissions, foundPage)) {
      await addMessage(conversationId, "assistant", "ليس لديك صلاحية الوصول إلى هذه الصفحة.");
      await autoTitle(user.id, conversationId, lastUser);
      return NextResponse.json({ reply: "ليس لديك صلاحية الوصول إلى هذه الصفحة.", conversationId });
    }
    const reply = `جاري فتح ${foundPage.titleAr}...`;
    await addMessage(conversationId, "assistant", reply);
    await autoTitle(user.id, conversationId, lastUser);
    return NextResponse.json({ reply, conversationId, navigate: foundPage.href });
  }

  // --- LLM tool selection (primary) ---

  const historyText = messages.slice(-8).map((m) => `${m.role}: ${m.content}`).join("\n");
  if (accountId && token) {
    const toolPrompt = `You are an AI agent for a Grocery ERP. Available tools (JSON): ${JSON.stringify(TOOL_LIST)}. Respond ONLY with JSON: {"tool":"name","args":{...}} or {"answer":"..."}. Conversation:\n${historyText}\nUser: ${lastUser}`;
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${process.env.CLOUDFLARE_AI_CORRECT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: toolPrompt }] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { result?: { response?: string } } | null;
        const raw = data?.result?.response?.trim();
        if (raw) {
          let parsed: any = null;
          try { parsed = JSON.parse(raw); } catch { parsed = null; }
          if (parsed?.tool) {
            const result = await executeTool(String(parsed.tool), parsed.args ?? {}, user);
            if (result.ok) await addKnowledge("operation", `${parsed.tool}: ${result.message}`, user.id, false, "ai-agent").catch(() => {});
            const out: Record<string, unknown> = { reply: result.message, conversationId };
            if (result.navigate) out.navigate = result.navigate;
            await addMessage(conversationId, "assistant", result.message);
            await autoTitle(user.id, conversationId, lastUser);
            return NextResponse.json(out);
          }
          if (parsed?.answer) {
            await addMessage(conversationId, "assistant", String(parsed.answer));
            await autoTitle(user.id, conversationId, lastUser);
            return NextResponse.json({ reply: String(parsed.answer), conversationId });
          }
        }
      }
    } catch {
      // fall through to direct commands
    }
  }

  // --- Fallback chat ---
  const model = process.env.CLOUDFLARE_AI_CORRECT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const snapshot = await buildDataSnapshot();
  const knowledge = await getRelevantKnowledge(lastUser);
  const knowledgeText = knowledge.map((k) => k.content).join(" | ");
  const system = {
    role: "system",
    content: `You are a helpful support agent for a Grocery ERP system. Answer concisely in Arabic when the user writes Arabic, otherwise in English. Help with navigation, sales, inventory, customers, reports, and settings. Use the provided data snapshot when answering quantitative questions. ${snapshot} Relevant knowledge: ${knowledgeText}. NEVER invent sales, prices, or database records. If you did not execute a tool, do not claim success. If unsure, ask for clarification.`,
  };
  if (!accountId || !token) {
    const reply = "AI غير مهيأ (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN).";
    await addMessage(conversationId, "assistant", reply);
    return NextResponse.json({ reply, conversationId });
  }
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [system, ...messages.map((m) => ({ role: m.role, content: m.content }))] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const reply = "تعذر الحصول على رد من AI.";
      await addMessage(conversationId, "assistant", reply);
      return NextResponse.json({ reply, conversationId });
    }
    const data = (await res.json().catch(() => null)) as { result?: { response?: string } } | null;
    const reply = data?.result?.response?.trim() || "تعذر الحصول على رد.";
    await addMessage(conversationId, "assistant", reply);
    await autoTitle(user.id, conversationId, lastUser);
    return NextResponse.json({ reply, conversationId });
  } catch {
    const reply = "خطأ في الاتصال بـ AI.";
    await addMessage(conversationId, "assistant", reply);
    return NextResponse.json({ reply, conversationId });
  }
}