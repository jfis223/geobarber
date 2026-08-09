import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { WorkingHours, WorkingHoursException, WorkingHoursExceptionType } from "@/generated/prisma";
import type { Interval } from "./schema";

export function getWorkingHours(providerId: string): Promise<WorkingHours[]> {
  return prisma.workingHours.findMany({
    where: { providerId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });
}

/** Replaces all intervals for a single weekday (§12 — supports multiple intervals/day, e.g. lunch breaks). */
export async function setWorkingHoursForDay(
  providerId: string,
  dayOfWeek: number,
  intervals: Interval[],
): Promise<void> {
  await prisma.$transaction([
    prisma.workingHours.deleteMany({ where: { providerId, dayOfWeek } }),
    ...intervals.map((interval) =>
      prisma.workingHours.create({
        data: { providerId, dayOfWeek, startMinute: interval.startMinute, endMinute: interval.endMinute },
      }),
    ),
  ]);
}

export function getExceptionsInRange(
  providerId: string,
  fromDate: Date,
  toDate: Date,
): Promise<WorkingHoursException[]> {
  return prisma.workingHoursException.findMany({
    where: { providerId, date: { gte: fromDate, lte: toDate } },
    orderBy: { date: "asc" },
  });
}

export function listUpcomingExceptions(providerId: string): Promise<WorkingHoursException[]> {
  return prisma.workingHoursException.findMany({
    where: { providerId, date: { gte: new Date(new Date().toDateString()) } },
    orderBy: { date: "asc" },
  });
}

export async function addException(
  providerId: string,
  date: Date,
  type: WorkingHoursExceptionType,
  intervals: Interval[],
  reason?: string,
): Promise<void> {
  if (type === "DAY_OFF") {
    await prisma.workingHoursException.create({
      data: { providerId, date, type, reason: reason || undefined },
    });
    return;
  }

  if (intervals.length === 0) {
    throw new Error("Special-day hours require at least one time range");
  }
  await prisma.$transaction(
    intervals.map((interval) =>
      prisma.workingHoursException.create({
        data: {
          providerId,
          date,
          type,
          startMinute: interval.startMinute,
          endMinute: interval.endMinute,
          reason: reason || undefined,
        },
      }),
    ),
  );
}

export function removeException(id: string): Promise<WorkingHoursException> {
  return prisma.workingHoursException.delete({ where: { id } });
}
