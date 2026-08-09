"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { completeCustomerProfile } from "@/domain/customers/customer";
import { getGeocodingService } from "@/infrastructure/geocoding";
import type { GeocodeResult } from "@/domain/geocoding/types";

export interface OnboardingActionState {
  error?: string;
}

export async function searchAddressAction(
  query: string,
): Promise<{ results: GeocodeResult[] } | { error: string }> {
  await requireCustomer();
  if (query.trim().length < 3) return { results: [] };

  try {
    const results = await getGeocodingService().geocode({ query });
    return { results: results.slice(0, 5) };
  } catch {
    return { error: "We couldn't find that address. Please check it and try again." };
  }
}

export async function completeProfileAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const customer = await requireCustomer();

  const phone = String(formData.get("phone") ?? "").trim();
  const formattedAddress = String(formData.get("formattedAddress") ?? "");
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));

  if (!phone) return { error: "Phone number is required" };
  if (!formattedAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: "Select an address from the list" };
  }

  await completeCustomerProfile(customer.id, {
    phone,
    address: { formattedAddress, latitude, longitude },
  });

  redirect("/booking");
}
