"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import * as appointmentDomain from "@/domain/appointments/appointment";
import { getPrimaryProvider } from "@/domain/providers/provider";
import { toScheduleAppointment } from "./dto";
import type { ScheduleAppointment } from "./types";

export interface ScheduleActionState {
  error?: string;
}

export async function getAppointmentsInRangeAction(
  startIso: string,
  endIso: string,
): Promise<ScheduleAppointment[]> {
  await requireAdmin();
  const provider = await getPrimaryProvider();
  if (!provider) return [];

  const appointments = await appointmentDomain.listAppointmentsInRange(
    provider.id,
    new Date(startIso),
    new Date(endIso),
  );

  return appointments.map(toScheduleAppointment);
}

export async function getPendingAppointmentsAction(): Promise<ScheduleAppointment[]> {
  await requireAdmin();
  const provider = await getPrimaryProvider();
  if (!provider) return [];

  const appointments = await appointmentDomain.listPendingAppointments(provider.id);
  return appointments.map(toScheduleAppointment);
}

export async function confirmAppointmentAction(appointmentId: string): Promise<ScheduleActionState> {
  const admin = await requireAdmin();
  try {
    await appointmentDomain.confirmAppointment(appointmentId, admin.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to confirm" };
  }
  revalidatePath("/admin/schedule");
  return {};
}

export async function declineAppointmentAction(appointmentId: string): Promise<ScheduleActionState> {
  const admin = await requireAdmin();
  try {
    await appointmentDomain.declineAppointment(appointmentId, admin.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to decline" };
  }
  revalidatePath("/admin/schedule");
  return {};
}

export async function proposeAlternativeSlotAction(
  appointmentId: string,
  newStartAtIso: string,
): Promise<ScheduleActionState> {
  const admin = await requireAdmin();
  try {
    await appointmentDomain.proposeAlternativeSlot(appointmentId, admin.id, new Date(newStartAtIso));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to propose alternative" };
  }
  revalidatePath("/admin/schedule");
  return {};
}
