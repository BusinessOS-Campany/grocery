import type { MetadataRoute } from "next";
import { getBrandingSettings } from "@/features/branding/service";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let b: Awaited<ReturnType<typeof getBrandingSettings>> | null = null;
  try {
    b = await getBrandingSettings();
  } catch {
    b = null;
  }
  const name = b?.pwaName ?? "Grocery ERP";
  const shortName = b?.pwaShortName ?? "Grocery";
  const description = b?.pwaDescription ?? "Grocery store management system";
  const themeColor = b?.pwaThemeColor ?? "#16a34a";
  const backgroundColor = b?.pwaBackgroundColor ?? "#ffffff";
  const iconPath = b?.pwaIconPath || b?.logoLightPath || null;
  const iconUrl = iconPath
    ? `/api/branding/asset?path=${encodeURIComponent(iconPath)}`
    : "/icons/icon-192.png";
  const icon512 = iconPath
    ? `/api/branding/asset?path=${encodeURIComponent(iconPath)}`
    : "/icons/icon-512.png";
  return {
    name,
    short_name: shortName,
    description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    dir: "rtl",
    lang: "ar",
    background_color: backgroundColor,
    theme_color: themeColor,
    categories: ["business", "productivity", "shopping"],
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/png" },
      { src: icon512, sizes: "512x512", type: "image/png" },
    ],
  };
}