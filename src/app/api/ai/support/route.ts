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