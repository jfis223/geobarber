"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { serviceZoneInputSchema } from "@/domain/service-zones/schema";
import * as serviceZoneDomain from "@/domain/service-zones/service-zone";

export interface ZoneActionState {
  error?: string;
  savedAt?: number;
}

export async function saveServiceZoneAction(
  _prevState: ZoneActionState,
  formData: FormData,
): Promise<ZoneActionState> {
  await requireAdmin();

  const id = formData.get("id");
  let geometry: unknown;
  try {
    geometry = JSON.parse(String(formData.get("geometryJson")));
  } catch {
    return { error: "Geometry must be valid JSON" };
  }

  const parsed = serviceZoneInputSchema.safeParse({
    name: formData.get("name"),
    geometry,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await serviceZoneDomain.saveServiceZone(id ? String(id) : undefined, parsed.data);
  revalidatePath("/admin/service-zone");
  return { savedAt: Date.now() };
}

export async function setServiceZoneActiveAction(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await serviceZoneDomain.setServiceZoneActive(id, active);
  revalidatePath("/admin/service-zone");
}
