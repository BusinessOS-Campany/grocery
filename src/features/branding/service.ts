import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { STORE_ASSET_BUCKET, uploadObject } from "@/shared/supabase-storage";
import { decodeImageData, extensionForMime, sniffImageMime, type ImageMime } from "@/shared/core/image-data";
import { brandingSchema } from "./schema";

export const DEFAULT_BRANDING = {
  systemName: "Grocery ERP",
  shortName: "Grocery",
  description: "Grocery store management system",
  companyName: null,
  footerText: null,
  logoLightPath: null,
  logoDarkPath: null,
  faviconPath: null,
  pwaIconPath: null,
  primaryColor: "#16a34a",
  secondaryColor: "#0ea5e9",
  accentColor: "#f59e0b",
  sidebarBgColor: "#0f172a",
  headerBgColor: "#ffffff",
  pageBgColor: "#f8fafc",
  cardBgColor: "#ffffff",
  textColor: "#0f172a",
  buttonColor: "#16a34a",
  borderColor: "#e2e8f0",
  buttonRadius: 8,
  cardRadius: 12,
  inputRadius: 8,
  modalRadius: 12,
  dropdownRadius: 8,
  componentRadius: 8,
  pageBgImage: null,
  pageBgImagePosition: "center",
  pageBgImageSize: "cover",
  loginBgColor: "#f8fafc",
  pwaName: "Grocery ERP",
  pwaShortName: "Grocery",
  pwaDescription: "Grocery store management system",
  pwaThemeColor: "#16a34a",
  pwaBackgroundColor: "#ffffff",
};

export const getBrandingSettings = cache(async () => {
  const row = await db.brandingSettings.findUnique({ where: { id: "branding" } });
  if (row) return row;
  try {
    return await db.brandingSettings.create({ data: { id: "branding", ...DEFAULT_BRANDING } });
  } catch {
    return db.brandingSettings.findUniqueOrThrow({ where: { id: "branding" } });
  }
});

function clean(v: string | undefined | null) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function saveBrandingSettings(userId: string, raw: unknown) {
  const data = brandingSchema.parse(raw);
  const current = await getBrandingSettings();
  const payload: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) payload[key] = value;
  };
  assign("systemName", data.systemName ?? current.systemName);
  assign("shortName", data.shortName ?? current.shortName);
  assign("description", data.description !== undefined ? clean(data.description) : current.description);
  assign("companyName", data.companyName !== undefined ? clean(data.companyName) : current.companyName);
  assign("footerText", data.footerText !== undefined ? clean(data.footerText) : current.footerText);

  assign("logoLightPath", data.logoLightPath !== undefined ? clean(data.logoLightPath) : current.logoLightPath);
  assign("logoDarkPath", data.logoDarkPath !== undefined ? clean(data.logoDarkPath) : current.logoDarkPath);
  assign("faviconPath", data.faviconPath !== undefined ? clean(data.faviconPath) : current.faviconPath);
  assign("pwaIconPath", data.pwaIconPath !== undefined ? clean(data.pwaIconPath) : current.pwaIconPath);

  assign("primaryColor", data.primaryColor || current.primaryColor);
  assign("secondaryColor", data.secondaryColor || current.secondaryColor);
  assign("accentColor", data.accentColor || current.accentColor);
  assign("sidebarBgColor", data.sidebarBgColor || current.sidebarBgColor);
  assign("headerBgColor", data.headerBgColor || current.headerBgColor);
  assign("pageBgColor", data.pageBgColor || current.pageBgColor);
  assign("cardBgColor", data.cardBgColor || current.cardBgColor);
  assign("textColor", data.textColor || current.textColor);
  assign("buttonColor", data.buttonColor || current.buttonColor);
  assign("borderColor", data.borderColor || current.borderColor);

  assign("buttonRadius", data.buttonRadius ?? current.buttonRadius);
  assign("cardRadius", data.cardRadius ?? current.cardRadius);
  assign("inputRadius", data.inputRadius ?? current.inputRadius);
  assign("modalRadius", data.modalRadius ?? current.modalRadius);
  assign("dropdownRadius", data.dropdownRadius ?? current.dropdownRadius);
  assign("componentRadius", data.componentRadius ?? current.componentRadius);

  assign("pageBgImage", data.pageBgImage !== undefined ? clean(data.pageBgImage) : current.pageBgImage);
  assign("pageBgImagePosition", data.pageBgImagePosition || current.pageBgImagePosition);
  assign("pageBgImageSize", data.pageBgImageSize || current.pageBgImageSize);
  assign("loginBgColor", data.loginBgColor || current.loginBgColor);

  assign("pwaName", data.pwaName ?? current.pwaName);
  assign("pwaShortName", data.pwaShortName ?? current.pwaShortName);
  assign("pwaDescription", data.pwaDescription !== undefined ? clean(data.pwaDescription) : current.pwaDescription);
  assign("pwaThemeColor", data.pwaThemeColor || current.pwaThemeColor);
  assign("pwaBackgroundColor", data.pwaBackgroundColor || current.pwaBackgroundColor);

  const saved = await db.brandingSettings.upsert({
    where: { id: "branding" },
    update: payload,
    create: { id: "branding", ...DEFAULT_BRANDING, ...payload },
  });

  const { recordAudit } = await import("@/shared/core/audit");
  await recordAudit(db, {
    userId,
    action: "SETTINGS_UPDATE",
    entityType: "BrandingSettings",
    entityId: "branding",
    newValues: { section: "branding" },
  });
  return saved;
}

export async function uploadBrandingAsset(userId: string, input: { dataUrl: string; mime: string; kind: string }) {
  const buffer = decodeImageData(input.dataUrl, input.mime);
  const mime = sniffImageMime(new Uint8Array(buffer)) as ImageMime;
  const path = `branding/${input.kind}/${userId}/${randomUUID()}.${extensionForMime(mime)}`;
  const { path: savedPath } = await uploadObject(STORE_ASSET_BUCKET, path, new Uint8Array(buffer), mime);
  return { path: savedPath };
}

export async function resetBrandingSettings(userId: string) {
  await db.brandingSettings.deleteMany({ where: { id: "branding" } });
  const { recordAudit } = await import("@/shared/core/audit");
  await recordAudit(db, {
    userId,
    action: "SETTINGS_UPDATE",
    entityType: "BrandingSettings",
    entityId: "branding",
    newValues: { section: "reset" },
  });
  return getBrandingSettings();
}