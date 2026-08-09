"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import * as settingsDomain from "@/domain/settings/settings";

export interface SettingsActionState {
  error?: string;
}

export async function updateSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const timezone = String(formData.get("timezone") ?? "Europe/Madrid").trim();
  const numbers: Record<string, number> = {};
  for (const field of [
    "slotIntervalMinutes",
    "nearbyThresholdMinutes",
    "maxRouteAlternatives",
    "pendingRequestExpirationHours",
    "cancellationCutoffHours",
    "reminderHourLocal",
    "gtfsStalenessThresholdDays",
  ]) {
    const value = Number(formData.get(field));
    if (!Number.isFinite(value) || value < 0) {
      return { error: `${field} must be a non-negative number` };
    }
    numbers[field] = Math.round(value);
  }

  await settingsDomain.updateSettings({
    timezone,
    slotIntervalMinutes: numbers.slotIntervalMinutes,
    nearbyThresholdMinutes: numbers.nearbyThresholdMinutes,
    maxRouteAlternatives: numbers.maxRouteAlternatives,
    pendingRequestExpirationHours: numbers.pendingRequestExpirationHours,
    cancellationCutoffHours: numbers.cancellationCutoffHours,
    reminderHourLocal: numbers.reminderHourLocal,
    gtfsStalenessThresholdDays: numbers.gtfsStalenessThresholdDays,
  });

  revalidatePath("/admin/settings");
  return {};
}
