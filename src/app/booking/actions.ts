"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { getGeocodingService } from "@/infrastructure/geocoding";
import { isInsideServiceArea } from "@/domain/service-zones/service-zone";
import { getAvailableSlots } from "@/domain/availability/availability";
import { createAppointmentRequest } from "@/domain/appointments/appointment";
import { getPrimaryProvider } from "@/domain/providers/provider";
import type { GeocodeResult } from "@/domain/geocoding/types";

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

export async function checkZoneAction(
  latitude: number,
  longitude: number,
): Promise<{ insideServiceArea: boolean }> {
  await requireCustomer();
  const insideServiceArea = await isInsideServiceArea(latitude, longitude);
  return { insideServiceArea };
}

export interface SlotDto {
  startAt: string;
  endAt: string;
}

export async function getSlotsAction(date: string, durationMinutes: number): Promise<{ slots?: SlotDto[]; error?: string }> {
  const provider = await getPrimaryProvider();
  if (!provider) return { error: "There are no available appointments for this date." };

  try {
    const slots = await getAvailableSlots({ providerId: provider.id, date, durationMinutes });
    return { slots: slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() })) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "There are no available appointments for this date." };
  }
}

export interface SubmitBookingInput {
  address: string;
  latitude: number;
  longitude: number;
  startAt: string;
  serviceSelections: { serviceId: string; quantity: number }[];
  notes?: string;
}

export async function submitBookingAction(
  input: SubmitBookingInput,
): Promise<{ error?: string; appointmentId?: string }> {
  const customer = await requireCustomer();
  const provider = await getPrimaryProvider();
  if (!provider) return { error: "Booking is not available yet. Please try again later." };

  try {
    const appointment = await createAppointmentRequest({
      customerId: customer.id,
      providerId: provider.id,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      startAt: new Date(input.startAt),
      serviceSelections: input.serviceSelections,
      notes: input.notes,
    });
    return { appointmentId: appointment.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "That time is no longer available. Please select another time." };
  }
}

export async function goToAppointment(id: string): Promise<never> {
  redirect(`/appointments/${id}`);
}
