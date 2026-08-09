import "server-only";

import { DateTime } from "luxon";

import { prisma } from "@/infrastructure/prisma/client";
import { getSettings } from "@/domain/settings/settings";
import type { Interval } from "@/domain/working-hours/schema";

export interface AvailabilitySlot {
  startAt: Date;
  endAt: Date;
}

const BLOCKING_STATUSES = ["REQUESTED", "PROPOSED", "CONFIRMED"] as const;

/**
 * §23-24 Stage 1 only — working hours + appointment-overlap feasibility.
 * Stage 2 (public-transport travel validation against previous/next
 * appointments and the provider's home, §25-27) is not implemented yet;
 * it slots in here once the OTP-backed TransitRoutingService exists,
 * filtering this function's output further rather than replacing it.
 */
export async function getAvailableSlots(params: {
  providerId: string;
  date: string; // YYYY-MM-DD, interpreted in the configured timezone
  durationMinutes: number;
}): Promise<AvailabilitySlot[]> {
  const settings = await getSettings();
  const dayStartLocal = DateTime.fromISO(params.date, { zone: settings.timezone }).startOf("day");
  if (!dayStartLocal.isValid) {
    throw new Error("Invalid date");
  }
  const dayEndLocal = dayStartLocal.endOf("day");
  // Luxon weekday: 1=Monday...7=Sunday. Our schema uses 0=Sunday...6=Saturday.
  const dayOfWeek = dayStartLocal.weekday % 7;

  const windows = await resolveDayWindows(params.providerId, dayStartLocal, dayOfWeek);
  if (windows.length === 0) return [];

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      providerId: params.providerId,
      status: { in: [...BLOCKING_STATUSES] },
      startAt: { lt: dayEndLocal.toJSDate() },
      endAt: { gt: dayStartLocal.toJSDate() },
    },
    select: { startAt: true, endAt: true },
  });

  const now = DateTime.now();
  const slots: AvailabilitySlot[] = [];

  for (const window of windows) {
    for (
      let startMinute = window.startMinute;
      startMinute + params.durationMinutes <= window.endMinute;
      startMinute += settings.slotIntervalMinutes
    ) {
      const startAt = dayStartLocal.plus({ minutes: startMinute });
      const endAt = startAt.plus({ minutes: params.durationMinutes });
      if (startAt < now) continue;

      const overlapsExisting = existingAppointments.some(
        (appt) => startAt.toJSDate() < appt.endAt && endAt.toJSDate() > appt.startAt,
      );
      if (overlapsExisting) continue;

      slots.push({ startAt: startAt.toJSDate(), endAt: endAt.toJSDate() });
    }
  }

  return slots;
}

async function resolveDayWindows(
  providerId: string,
  dayStartLocal: DateTime,
  dayOfWeek: number,
): Promise<Interval[]> {
  const dayStartUtc = dayStartLocal.startOf("day").toJSDate();
  const dayEndUtc = dayStartLocal.endOf("day").toJSDate();

  const exceptions = await prisma.workingHoursException.findMany({
    where: { providerId, date: { gte: dayStartUtc, lte: dayEndUtc } },
  });

  if (exceptions.some((e) => e.type === "DAY_OFF")) return [];

  const specialHours = exceptions.filter((e) => e.type === "SPECIAL_HOURS");
  if (specialHours.length > 0) {
    return specialHours
      .filter((e): e is typeof e & { startMinute: number; endMinute: number } => e.startMinute != null && e.endMinute != null)
      .map((e) => ({ startMinute: e.startMinute, endMinute: e.endMinute }));
  }

  const workingHours = await prisma.workingHours.findMany({ where: { providerId, dayOfWeek } });
  return workingHours.map((wh) => ({ startMinute: wh.startMinute, endMinute: wh.endMinute }));
}
