import { getBrandingSettings } from "@/features/branding/service";
import { BrandingSettingsForm } from "@/features/branding/ui/branding-form";

export default async function BrandingSettingsPage() {
  const data = await getBrandingSettings();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">الهوية والمظهر</h1>
      <BrandingSettingsForm data={data} />
    </div>
  );
}