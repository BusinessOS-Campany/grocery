import { Suspense } from "react";
import { getT } from "@/shared/i18n";
import { getBrandingSettings } from "@/features/branding/service";
import { LoginForm } from "@/features/auth/ui/login-form";

export default async function LoginPage() {
  const { t } = await getT();
  let branding: Awaited<ReturnType<typeof getBrandingSettings>> | null = null;
  try {
    branding = await getBrandingSettings();
  } catch {
    branding = null;
  }
  const logoPath = branding?.logoLightPath ?? null;
  const logoUrl = logoPath ? `/api/branding/asset?path=${encodeURIComponent(logoPath)}` : null;
  return (
    <Suspense>
      <LoginForm t={t.auth} tErrors={t.errors} storeName={branding?.systemName ?? undefined} logoUrl={logoUrl} />
    </Suspense>
  );
}
