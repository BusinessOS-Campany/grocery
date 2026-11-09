import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ZodLocale } from "@/components/zod-locale";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { dict } from "@/shared/i18n";
import { getBrandingSettings } from "@/features/branding/service";

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = dict();
  let branding: Awaited<ReturnType<typeof getBrandingSettings>> | null = null;
  try {
    branding = await getBrandingSettings();
  } catch {
    branding = null;
  }
  const appName = branding?.systemName ?? t.common.appName;
  const description = branding?.description ?? "Grocery store management system / نظام إدارة متجر البقالة";
  return {
    title: `${appName}`,
    description,
    manifest: "/manifest.webmanifest",
    applicationName: appName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    icons: branding?.faviconPath
      ? [{ url: `/api/branding/asset?path=${encodeURIComponent(branding.faviconPath)}` }]
      : branding?.logoLightPath
        ? [{ url: `/api/branding/asset?path=${encodeURIComponent(branding.logoLightPath)}` }]
        : [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
  };
}

export async function generateViewport(): Promise<Viewport> {
  let branding: Awaited<ReturnType<typeof getBrandingSettings>> | null = null;
  try {
    branding = await getBrandingSettings();
  } catch {
    branding = null;
  }
  return {
    themeColor: branding?.pwaThemeColor ?? "#16a34a",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let branding: Awaited<ReturnType<typeof getBrandingSettings>> | null = null;
  try {
    branding = await getBrandingSettings();
  } catch {
    branding = null;
  }
  const css = branding
    ? `html:not(.dark){--primary:${branding.primaryColor};--primary-foreground:#ffffff;--secondary:${branding.secondaryColor};--secondary-foreground:${branding.textColor};--accent:${branding.accentColor};--accent-foreground:${branding.textColor};--background:${branding.pageBgColor};--foreground:${branding.textColor};--card:${branding.cardBgColor};--card-foreground:${branding.textColor};--popover:${branding.cardBgColor};--popover-foreground:${branding.textColor};--muted:${branding.pageBgColor};--muted-foreground:${branding.textColor};--border:${branding.borderColor};--input:${branding.borderColor};--ring:${branding.primaryColor};--radius:${branding.componentRadius}px;--sidebar:${branding.sidebarBgColor};--sidebar-foreground:${branding.textColor};--sidebar-primary:${branding.primaryColor};--sidebar-primary-foreground:#ffffff;--sidebar-accent:${branding.secondaryColor};--sidebar-accent-foreground:${branding.textColor};--sidebar-border:${branding.borderColor};}
.dark{--primary:${branding.primaryColor};--primary-foreground:#ffffff;--secondary:${branding.secondaryColor};--accent:${branding.accentColor};--ring:${branding.primaryColor};--radius:${branding.componentRadius}px;}
.login-bg{background-color:${branding.loginBgColor};}` +
      (branding.pageBgImage ? `:root body{background-image:url('/api/branding/asset?path=${encodeURIComponent(branding.pageBgImage)}');background-position:${branding.pageBgImagePosition};background-size:${branding.pageBgImageSize};background-repeat:no-repeat;}` : "")
    : "";
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>{css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}</head>
      <body
        className={`${cairo.variable} ${geistMono.variable} h-full font-sans antialiased`}
      >
        <ThemeProvider>
          <PwaRegister />
          <ZodLocale />
          {children}
          <Toaster position="bottom-left" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
