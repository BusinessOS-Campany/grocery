"use client";

import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Fingerprint } from "lucide-react";

type Passkey = { id: string; name: string | null; deviceType: string | null; createdAt: string; lastUsedAt: string | null };

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/auth/passkey/list");
    const data = await res.json();
    if (data.passkeys) setPasskeys(data.passkeys);
  };

  useEffect(() => { load(); }, []);

  const register = async () => {
    setLoading(true);
    try {
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      const options = await optRes.json();
      if (!optRes.ok) { toast.error(options?.error ?? "Failed"); return; }
      const regResp = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regResp, name: "Passkey" }),
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData?.ok) {
        toast.success("Passkey registered");
        load();
      } else {
        toast.error(verifyData?.error ?? "Registration failed");
      }
    } catch {
      toast.error("Registration cancelled or failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this passkey?")) return;
    const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Delete failed");
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">تسجيل الدخول بالبصمة (Passkeys)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={register} disabled={loading}>
          <Fingerprint className="me-2 size-4" /> {loading ? "جارٍ التسجيل..." : "تفعيل بصمة جديدة"}
        </Button>
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بصمات مسجلة.</p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{p.name ?? "Passkey"} — {p.deviceType ?? "device"}</span>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => remove(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}