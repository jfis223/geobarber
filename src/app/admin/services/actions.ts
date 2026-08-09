"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { serviceInputSchema } from "@/domain/services/schema";
import * as serviceDomain from "@/domain/services/service";

export interface ActionState {
  error?: string;
}

export async function createServiceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = serviceInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    priceCents: Math.round(Number(formData.get("priceEuros")) * 100),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await serviceDomain.createService(parsed.data);
  revalidatePath("/admin/services");
  return {};
}

export async function updateServiceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id"));
  const parsed = serviceInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    priceCents: Math.round(Number(formData.get("priceEuros")) * 100),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await serviceDomain.updateService(id, parsed.data);
  revalidatePath("/admin/services");
  return {};
}

export async function toggleServiceActiveAction(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await serviceDomain.setServiceActive(id, active);
  revalidatePath("/admin/services");
}

export async function moveServiceAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await serviceDomain.moveService(id, direction);
  revalidatePath("/admin/services");
}
