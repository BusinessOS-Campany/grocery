"use server";

import { revalidatePath } from "next/cache";
import { guard, ok } from "@/shared/core/api-response";
import { requirePermission } from "@/features/auth/session";
import { saveBrandingSettings, uploadBrandingAsset, resetBrandingSettings } from "./service";

export async function saveBrandingAction(raw: unknown) {
  return guard(async () => {
    const user = await requirePermission("settings.manage");
    const saved = await saveBrandingSettings(user.id, raw);
    revalidatePath("/settings/branding");
    revalidatePath("/", "layout");
    return ok({ id: saved.id });
  });
}

export async function uploadBrandingAssetAction(input: { dataUrl: string; mime: string; kind: string }) {
  return guard(async () => {
    const user = await requirePermission("settings.manage");
    const { path } = await uploadBrandingAsset(user.id, input);
    return ok({ path });
  });
}

export async function resetBrandingAction() {
  return guard(async () => {
    const user = await requirePermission("settings.manage");
    await resetBrandingSettings(user.id);
    revalidatePath("/settings/branding");
    revalidatePath("/", "layout");
    return ok({ reset: true });
  });
}