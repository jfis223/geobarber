import "server-only";

import { prisma } from "@/infrastructure/prisma/client";
import type { SystemSettings } from "@/generated/prisma";

/** §49 — single settings row, lazily created with spec defaults on first read. */
export async function getSettings(): Promise<SystemSettings> {
  const existing = await prisma.systemSettings.findFirst();
  if (existing) return existing;
  return prisma.systemSettings.create({ data: {} });
}

export interface SettingsInput {
  timezone: string;
  slotIntervalMinutes: number;
  nearbyThresholdMinutes: number;
  maxRouteAlternatives: number;
  pendingRequestExpirationHours: number;
  cancellationCutoffHours: number;
  reminderHourLocal: number;
  gtfsStalenessThresholdDays: number;
}

export async function updateSettings(input: SettingsInput): Promise<SystemSettings> {
  const current = await getSettings();
  return prisma.systemSettings.update({ where: { id: current.id }, data: input });
}
