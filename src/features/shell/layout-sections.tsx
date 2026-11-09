import { getT } from "@/shared/i18n";
import { getStoreSettings } from "@/features/settings/service";
import { getBrandingSettings } from "@/features/branding/service";
import { syncNotifications } from "@/features/notifications/service";
import type { AuthUser } from "@/features/auth/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Streamed shell sections. The (app) layout only blocks on auth, then renders
 * these inside Suspense so the sidebar, topbar and page (including its own
 * skeletons) paint independently. getStoreSettings() is React-cache()'d and
 * syncNotifications() has a 20s TTL, so the two sections share one of each.
 */

export async function SidebarSection({ user }: { user: AuthUser }) {
  const { t } = await getT();
  const [store, branding] = await Promise.all([getStoreSettings(), getBrandingSettings()]);
  const logoPath = branding?.logoLightPath ?? null;
  const logoUrl = logoPath ? `/api/branding/asset?path=${encodeURIComponent(logoPath)}` : null;
  return (
    <Sidebar
      t={t}
      permissions={user.permissions}
      storeName={branding?.systemName ?? store?.nameAr ?? store?.name ?? t.auth.storeName}
      logoUrl={logoUrl}
      userName={user.fullNameAr ?? user.fullName}
    />
  );
}

export async function TopbarSection({ user }: { user: AuthUser }) {
  const { t } = await getT();
  const [store, branding, notificationRows] = await Promise.all([
    getStoreSettings(),
    getBrandingSettings(),
    syncNotifications(),
  ]);
  const notifications = notificationRows.map((n) => ({
    id: n.id, type: n.type, body: n.body ?? "", href: n.href,
    isRead: n.isRead, createdAt: n.createdAt.toISOString(),
  }));
  const aiVoice = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_AI_TOKEN));
  return (
    <Topbar
      t={t}
      userName={user.fullNameAr ?? user.fullName}
      roleName={user.roleName}
      permissions={user.permissions}
      notifications={notifications}
      storeName={branding?.systemName ?? store?.nameAr ?? store?.name ?? t.auth.storeName}
      aiVoice={aiVoice}
    />
  );
}