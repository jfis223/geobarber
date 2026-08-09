"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { providerInputSchema } from "@/domain/providers/schema";
import * as providerDomain from "@/domain/providers/provider";
import { getGeocodingService } from "@/infrastructure/geocoding";
import type { GeocodeResult } from "@/domain/geocoding/types";

export interface ProviderActionState {
  error?: string;
}

export async function searchAddressAction(
  query: string,
): Promise<{ results: GeocodeResult[] } | { error: string }> {
  await requireAdmin();
  if (query.trim().length < 3) return { results: [] };

  try {
    const results = await getGeocodingService().geocode({ query });
    return { results: results.slice(0, 5) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Address search failed" };
  }
}

export async function saveProviderAction(
  _prevState: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  await requireAdmin();

  const parsed = providerInputSchema.safeParse({
    name: formData.get("name"),
    formattedAddress: formData.get("formattedAddress"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = formData.get("id");
  try {
    await providerDomain.saveProvider(id ? String(id) : undefined, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save provider" };
  }

  revalidatePath("/admin/provider");
  return {};
}
