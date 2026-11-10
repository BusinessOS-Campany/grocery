"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Msg = { role: "user" | "assistant"; content: string };

export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mute, setMute] = useState(false);
  const recRef = useRef<any>(null);
  const wantRef = useRef(false);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("المتصفح لا يدعم الإدخال الصوتي.");
      return;
    }
    const rec = new SR();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let finalTranscript = "";
      let interimChunk = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + " ";
        else interimChunk += t;
      }
      setTranscript(finalTranscript.trim());
      setInterim(interimChunk);
    };
    rec.onend = () => {
      if (wantRef.current) {
        try { rec.start(); return; } catch {}
      }
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => {
      wantRef.current = false;
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); setListening(true); } catch {}
  };

  const stopListening = () => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  };

  const cancel = () => {
    stopListening();
    setTranscript("");
    setResult("");
  };

  const send = async () => {
    const text = (transcript + (interim ? " " + interim : "")).trim();
    if (!text) return;
    stopListening();
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string; navigate?: string } | null;
      const reply = data?.reply ?? "تعذر الحصول على رد.";
      setResult(reply);
      if (data?.navigate) setTimeout(() => (window.location.href = data.navigate!), 400);
      if (!mute && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(reply);
        u.lang = "ar-SA";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {
      setResult("خطأ في الاتصال.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setOpen(false);
  };

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openVoiceAssistant", handler);
    return () => window.removeEventListener("openVoiceAssistant", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">المساعد الصوتي</h2>
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={listening ? stopListening : startListening}
            className={`flex size-24 items-center justify-center rounded-full shadow-lg transition-all ${
              listening ? "bg-destructive text-white animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            aria-label="mic"
          >
            {listening ? <MicOff className="size-10" /> : <Mic className="size-10" />}
          </button>
          <div className="text-sm text-muted-foreground">
            {listening ? "يستمع... تحدث الآن" : loading ? "جارٍ المعالجة..." : "اضغط على الميكروفون للبدء"}
          </div>
          {listening && (
            <div className="flex h-8 items-end gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="w-1 animate-pulse rounded bg-primary" style={{ height: `${8 + Math.random() * 24}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">النص المُعرّف:</div>
          <div className="min-h-[3rem] rounded-lg border bg-muted/40 p-3 text-sm">
            {transcript || interim || "—"}
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">رد المساعد:</div>
            <div className="rounded-lg border bg-card p-3 text-sm">{result}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={send} disabled={loading || (!transcript && !interim)}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            إرسال
          </Button>
          <Button variant="outline" onClick={cancel} disabled={loading}>
            إلغاء
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMute((m) => !m)}>
            {mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}