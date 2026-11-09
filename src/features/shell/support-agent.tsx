"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send, X, Loader2, Mic, MicOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Msg = { role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; updatedAt: string };

const NAV_INTENTS: { keys: string[]; href: string; label: string }[] = [
  { keys: ["نقطة البيع", "pos", "نقطة بيع", "البيع"], href: "/sales/pos", label: "نقطة البيع" },
  { keys: ["الفواتير", "orders", "المبيعات"], href: "/sales/orders", label: "الفواتير والطلبات" },
  { keys: ["لوحة التحكم", "dashboard", "الرئيسية", "home"], href: "/dashboard", label: "لوحة التحكم" },
  { keys: ["المنتجات", "products"], href: "/inventory/products", label: "المنتجات" },
  { keys: ["التصنيفات", "categories"], href: "/inventory/categories", label: "التصنيفات" },
  { keys: ["المخزون", "stock"], href: "/inventory/stock", label: "المخزون" },
  { keys: ["الانتهاء", "expiring", "الصلاحية", "قريب", "نافد"], href: "/inventory/expiring", label: "قرب الانتهاء" },
  { keys: ["الموردون", "suppliers"], href: "/procurement/suppliers", label: "الموردون" },
  { keys: ["أوامر الشراء", "purchase orders", "po"], href: "/procurement/purchase-orders", label: "أوامر الشراء" },
  { keys: ["المشتريات", "purchases"], href: "/procurement/purchases", label: "المشتريات" },
  { keys: ["مرتجعات الشراء", "purchase returns"], href: "/procurement/returns", label: "مرتجعات الشراء" },
  { keys: ["العملاء", "customers"], href: "/customers/list", label: "العملاء" },
  { keys: ["الحسابات المجمدة", "frozen", "مجمدة", "متجمدة"], href: "/customers/frozen", label: "الحسابات المجمدة" },
  { keys: ["الآجل", "transactions", "المدفوعات"], href: "/customers/transactions", label: "الآجل والمدفوعات" },
  { keys: ["التقارير", "reports"], href: "/reports/sales", label: "التقارير" },
  { keys: ["المصروفات", "expenses"], href: "/expenses", label: "المصروفات" },
  { keys: ["المستخدمون", "users"], href: "/users", label: "المستخدمون" },
  { keys: ["الأدوار", "roles", "الصلاحيات", "permissions"], href: "/roles", label: "الأدوار والصلاحيات" },
  { keys: ["سجل التدقيق", "audit"], href: "/audit-log", label: "سجل التدقيق" },
  { keys: ["الإعدادات", "settings"], href: "/settings/store", label: "الإعدادات" },
  { keys: ["الهوية", "الهويه", "هويه", "هوية", "branding"], href: "/settings/branding", label: "الهوية والمظهر" },
  { keys: ["مركز تدريب", "ai training", "training"], href: "/settings/ai-training", label: "مركز تدريب الذكاء" },
  { keys: ["النسخ الاحتياطي", "backup"], href: "/settings/backup", label: "النسخ الاحتياطي" },
];

export function SupportAgent() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "مرحباً! أنا وكيل الدعم. كيف يمكنني مساعدتك؟" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {}
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      const data = await res.json();
      if (data.conversation?.messages) {
        setMessages(data.conversation.messages.map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })));
        setCurrentId(id);
      }
    } catch {}
  };

  const newChat = async () => {
    try {
      const res = await fetch("/api/ai/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New conversation" }) });
      const data = await res.json();
      if (data.conversation) {
        setConversations((c) => [data.conversation, ...c]);
        setCurrentId(data.conversation.id);
        setMessages([{ role: "assistant", content: "مرحباً! أنا وكيل الدعم. كيف يمكنني مساعدتك؟" }]);
      }
    } catch {}
  };

  const deleteConv = async (id: string) => {
    if (!window.confirm("حذف هذه المحادثة؟")) return;
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    setConversations((c) => c.filter((x) => x.id !== id));
    if (currentId === id) {
      setCurrentId(null);
      setMessages([{ role: "assistant", content: "مرحباً! أنا وكيل الدعم. كيف يمكنني مساعدتك؟" }]);
    }
  };

  const [autoStartVoice, setAutoStartVoice] = useState(false);

  useEffect(() => {
    if (open) loadConversations();
    if (open && autoStartVoice) {
      setAutoStartVoice(false);
      setTimeout(() => toggleVoice(), 300);
    }
  }, [open, autoStartVoice]);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setAutoStartVoice(true);
    };
    window.addEventListener("openSupportAgentVoice", handler);
    return () => window.removeEventListener("openSupportAgentVoice", handler);
  }, []);

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("المتصفح لا يدعم الإدخال الصوتي.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ar-SA";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const send = async (confirm = false) => {
    const text = input.trim();
    if (!text || loading) return;
    const lower = text.toLowerCase();
    const isDelete = lower.includes("حذف") || lower.includes("delete");
    if (isDelete && !confirm) {
      const ok = window.confirm("هل أنت متأكد من الحذف؟");
      if (!ok) return;
      return send(true);
    }
    const navIntent = NAV_INTENTS.find((n) => n.keys.some((k) => lower.includes(k.toLowerCase())));
    const wantsNav = /ذهاب|اذهب|فتح|صفحة|صفحه|open|go to|انتقل|اذهب/.test(lower);
    const shortQuery = lower.split(/\s+/).filter(Boolean).length <= 6;
    if (navIntent && (wantsNav || shortQuery)) {
      const next: Msg[] = [...messages, { role: "user", content: text }];
      setMessages([...next, { role: "assistant", content: `جاري فتح صفحة ${navIntent.label}...` }]);
      setInput("");
      setTimeout(() => router.push(navIntent.href), 300);
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // ensure conversation exists
      let cid = currentId;
      if (!cid) {
        const res = await fetch("/api/ai/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: text.slice(0, 40) }) });
        const data = await res.json();
        if (data.conversation) {
          cid = data.conversation.id;
          setCurrentId(cid);
          setConversations((c) => [data.conversation, ...c]);
        }
      }
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })), confirm, conversationId: cid }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string; error?: string; navigate?: string; theme?: string } | null;
      if (res.ok && data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply! }]);
        if (data.navigate) setTimeout(() => router.push(data.navigate!), 400);
        if (data.theme) {
          try {
            localStorage.setItem("theme", data.theme);
            document.documentElement.classList.toggle("dark", data.theme === "dark");
            document.documentElement.style.colorScheme = data.theme;
          } catch {}
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data?.error ?? "تعذر الحصول على رد." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "خطأ في الاتصال." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 end-4 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        aria-label="support"
      >
        <MessageCircle className="size-6" />
      </button>
      {open && (
        <Card className="fixed bottom-20 end-4 z-50 flex h-[32rem] w-96 flex-col overflow-hidden p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-bold">وكيل الدعم</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={newChat} title="محادثة جديدة">
                <Plus className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
          {conversations.length > 0 && (
            <div className="max-h-24 overflow-y-auto border-b p-2 text-xs">
              {conversations.map((c) => (
                <div key={c.id} className={`flex items-center justify-between rounded px-2 py-1 ${currentId === c.id ? "bg-accent" : "hover:bg-muted"}`}>
                  <button className="flex-1 truncate text-start" onClick={() => loadConversation(c.id)}>
                    {c.title}
                  </button>
                  <button onClick={() => deleteConv(c.id)} className="ms-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 ${
                  m.role === "user" ? "bg-primary text-primary-foreground ms-auto max-w-[85%]" : "bg-muted max-w-[85%]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> يفكر...
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t p-2">
            <Button size="icon" variant={listening ? "default" : "outline"} onClick={toggleVoice} disabled={loading}>
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="اكتب رسالة..."
              className="text-sm"
            />
            <Button size="icon" onClick={() => send()} disabled={loading}>
              <Send className="size-4" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}