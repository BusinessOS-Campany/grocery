"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBrandingAction, uploadBrandingAssetAction, resetBrandingAction } from "../actions";

type Data = Record<string, unknown>;

const RADIUS_PRESETS = [
  { label: "حاد", value: 0 },
  { label: "مستدير قليلاً", value: 4 },
  { label: "مستدير", value: 8 },
  { label: "عصري", value: 12 },
  { label: "مستدير جداً", value: 16 },
  { label: "مستدير بالكامل", value: 9999 },
];

const THEMES = [
  { name: "الأخضر الافتراضي", primary: "#16a34a", secondary: "#0ea5e9", accent: "#f59e0b" },
  { name: "الأزرق المحيطي", primary: "#2563eb", secondary: "#06b6d4", accent: "#f97316" },
  { name: "البنفسجي الملكي", primary: "#7c3aed", secondary: "#ec4899", accent: "#f59e0b" },
  { name: "غروب الشمس", primary: "#ea580c", secondary: "#f59e0b", accent: "#dc2626" },
  { name: "الرمادي", primary: "#334155", secondary: "#64748b", accent: "#0ea5e9" },
];

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function BrandingSettingsForm({ data }: { data: Data }) {
  const [state, setState] = useState<Data>({ ...data });
  const [pending, startTransition] = useTransition();

  const set = (key: string, value: unknown) => setState((s) => ({ ...s, [key]: value }));

  const upload = async (kind: string, file: File | null, targetKey: string) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const res = (await uploadBrandingAssetAction({ dataUrl, mime: file.type, kind })) as {
      ok?: boolean;
      data?: { path?: string };
      error?: { message?: string };
    };
    if (res?.ok && res.data?.path) {
      set(targetKey, res.data.path);
      toast.success("تم الرفع");
    } else {
      toast.error(res?.error?.message ?? "فشل الرفع");
    }
  };

  const save = () => {
    startTransition(async () => {
      const res = (await saveBrandingAction(state)) as { ok?: boolean; error?: { message?: string } };
      if (res?.ok) {
        toast.success("تم حفظ الإعدادات");
      } else {
        toast.error(res?.error?.message ?? "فشل الحفظ");
      }
    });
  };

  const resetAll = () => {
    startTransition(async () => {
      const res = (await resetBrandingAction()) as { ok?: boolean; error?: { message?: string } };
      if (res?.ok) {
        toast.success("تم إعادة الضبط");
        window.location.reload();
      } else {
        toast.error(res?.error?.message ?? "فشل إعادة الضبط");
      }
    });
  };

  const applyTheme = (theme: (typeof THEMES)[number]) => {
    set("primaryColor", theme.primary);
    set("secondaryColor", theme.secondary);
    set("accentColor", theme.accent);
    set("buttonColor", theme.primary);
  };

  const applyRadiusPreset = (v: number) => {
    set("buttonRadius", v);
    set("cardRadius", v === 9999 ? 16 : v);
    set("inputRadius", v === 9999 ? 16 : v);
    set("modalRadius", v === 9999 ? 16 : v);
    set("dropdownRadius", v === 9999 ? 16 : v);
    set("componentRadius", v);
  };

  const colorField = (key: string, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={str(state[key]) || "#000000"}
          onChange={(e) => set(key, e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border"
        />
        <Input
          value={str(state[key])}
          onChange={(e) => set(key, e.target.value)}
          placeholder="#000000"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );

  const assetUrl = (path: unknown) =>
    path ? `/api/branding/asset?path=${encodeURIComponent(String(path))}` : null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="logo">الشعار والهوية</TabsTrigger>
          <TabsTrigger value="colors">الألوان والسمات</TabsTrigger>
          <TabsTrigger value="radius">الأشكال ونصف القطر</TabsTrigger>
          <TabsTrigger value="background">الخلفية</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
          <TabsTrigger value="preview">معاينة مباشرة</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>الإعدادات العامة</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>اسم النظام</Label>
                <Input value={str(state.systemName)} onChange={(e) => set("systemName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>الاسم المختصر</Label>
                <Input value={str(state.shortName)} onChange={(e) => set("shortName", e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>الوصف</Label>
                <Input value={str(state.description)} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>اسم الشركة/المتجر</Label>
                <Input value={str(state.companyName)} onChange={(e) => set("companyName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>نص التذييل</Label>
                <Input value={str(state.footerText)} onChange={(e) => set("footerText", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>الشعار والهوية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(["logoLightPath", "logoDarkPath", "faviconPath", "pwaIconPath"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label>{key}</Label>
                  {assetUrl(state[key]) && (
                    <div className="flex gap-3">
                      <div className="flex h-24 w-44 items-center justify-center rounded-lg border bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(state[key])!} alt={key} className="h-full w-auto max-w-full object-contain object-center" />
                      </div>
                      <div className="flex h-24 w-44 items-center justify-center rounded-lg border bg-slate-900 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(state[key])!} alt={key} className="h-full w-auto max-w-full object-contain object-center" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={(e) => upload(key.replace("Path", "").toLowerCase(), e.target.files?.[0] ?? null, key)}
                    />
                    <Button variant="outline" size="sm" onClick={() => set(key, null)}>إزالة</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>سمات جاهزة</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {THEMES.map((th) => (
                <Button key={th.name} variant="outline" size="sm" onClick={() => applyTheme(th)}>
                  <span className="me-2 inline-block size-4 rounded" style={{ background: th.primary }} />
                  {th.name}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>تخصيص الألوان</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {colorField("primaryColor", "الأساسي")}
              {colorField("secondaryColor", "الثانوي")}
              {colorField("accentColor", "التأكيد")}
              {colorField("sidebarBgColor", "خلفية الشريط الجانبي")}
              {colorField("headerBgColor", "خلفية الترويسة")}
              {colorField("pageBgColor", "خلفية الصفحة")}
              {colorField("cardBgColor", "خلفية البطاقة")}
              {colorField("textColor", "لون النص")}
              {colorField("buttonColor", "لون الزر")}
              {colorField("borderColor", "لون الحد")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radius" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>إعدادات مسبقة</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {RADIUS_PRESETS.map((p) => (
                <Button key={p.label} variant="outline" size="sm" onClick={() => applyRadiusPreset(p.value)}>
                  {p.label}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>نصف قطر الحد (px)</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                ["buttonRadius", "زر"],
                ["cardRadius", "بطاقة"],
                ["inputRadius", "حقل"],
                ["modalRadius", "نافذة"],
                ["dropdownRadius", "قائمة منسدلة"],
                ["componentRadius", "المكون"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    value={num(state[key])}
                    onChange={(e) => set(key, Number(e.target.value))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تخصيص الخلفية</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {colorField("loginBgColor", "خلفية تسجيل الدخول")}
              <div className="space-y-1">
                <Label>صورة الخلفية</Label>
                <div className="flex items-center gap-3">
                  {assetUrl(state.pageBgImage) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(state.pageBgImage)!} alt="bg" className="h-10 w-16 rounded object-cover border" />
                  )}
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => upload("background", e.target.files?.[0] ?? null, "pageBgImage")}
                  />
                  <Button variant="outline" size="sm" onClick={() => set("pageBgImage", null)}>إزالة</Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>موضع الصورة</Label>
                <Input value={str(state.pageBgImagePosition)} onChange={(e) => set("pageBgImagePosition", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>حجم الصورة</Label>
                <Input value={str(state.pageBgImageSize)} onChange={(e) => set("pageBgImageSize", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pwa" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>إعدادات PWA</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>اسم PWA</Label>
                <Input value={str(state.pwaName)} onChange={(e) => set("pwaName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>الاسم المختصر لـ PWA</Label>
                <Input value={str(state.pwaShortName)} onChange={(e) => set("pwaShortName", e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>وصف PWA</Label>
                <Input value={str(state.pwaDescription)} onChange={(e) => set("pwaDescription", e.target.value)} />
              </div>
              {colorField("pwaThemeColor", "لون السمة")}
              {colorField("pwaBackgroundColor", "لون الخلفية")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>معاينة مباشرة</CardTitle></CardHeader>
            <CardContent>
              <div
                className="rounded-lg border p-4"
                style={{ background: str(state.pageBgColor), color: str(state.textColor), borderRadius: num(state.componentRadius) }}
              >
                <div
                  className="mb-3 flex items-center gap-2 rounded px-3 py-2"
                  style={{ background: str(state.sidebarBgColor), color: "#fff", borderRadius: num(state.componentRadius) }}
                >
                  {assetUrl(state.logoLightPath) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(state.logoLightPath)!} alt="logo" className="h-6 w-6 object-contain" />
                  ) : (
                    <span className="text-sm font-bold">Logo</span>
                  )}
                  <span className="font-bold">{str(state.systemName)}</span>
                </div>
                <div
                  className="mb-3 rounded px-3 py-2"
                  style={{ background: str(state.headerBgColor), border: `1px solid ${str(state.borderColor)}`, borderRadius: num(state.componentRadius) }}
                >
                  Header
                </div>
                <div
                  className="rounded p-3"
                  style={{ background: str(state.cardBgColor), border: `1px solid ${str(state.borderColor)}`, borderRadius: num(state.cardRadius) }}
                >
                  <p className="mb-2">Card content</p>
                  <button
                    className="px-3 py-1.5 text-white"
                    style={{ background: str(state.buttonColor), borderRadius: num(state.buttonRadius) }}
                  >
                    Button
                  </button>
                  <input
                    className="ms-2 rounded border px-2 py-1"
                    style={{ borderRadius: num(state.inputRadius), borderColor: str(state.borderColor) }}
                    placeholder="Input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending}>حفظ التغييرات</Button>
        <Button variant="outline" onClick={resetAll} disabled={pending}>إعادة ضبط الكل</Button>
      </div>
    </div>
  );
}