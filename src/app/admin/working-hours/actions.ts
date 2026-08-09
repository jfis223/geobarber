"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseIntervalsInput, exceptionInputSchema } from "@/domain/working-hours/schema";
import * as workingHoursDomain from "@/domain/working-hours/working-hours";

export interface WorkingHoursActionState {
  error?: string;
}

export async function setWorkingHoursForDayAction(
  providerId: string,
  dayOfWeek: number,
  intervals: { startMinute: number; endMinute: number }[],
): Promise<WorkingHoursActionState> {
  await requireAdmin();

  for (const interval of intervals) {
    if (interval.startMinute < 0 || interval.endMinute > 1440 || interval.endMinute <= interval.startMinute) {
      return { error: "Invalid time range" };
    }
  }

  const sorted = [...intervals].sort((a, b) => a.startMinute - b.startMinute);
  await workingHoursDomain.setWorkingHoursForDay(providerId, dayOfWeek, sorted);
  revalidatePath("/admin/working-hours");
  return {};
}

export async function addExceptionAction(
  _prevState: WorkingHoursActionState,
  formData: FormData,
): Promise<WorkingHoursActionState> {
  await requireAdmin();

  const providerId = String(formData.get("providerId"));
  const parsed = exceptionInputSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    intervalsText: formData.get("intervalsText"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const intervals = parseIntervalsInput(parsed.data.intervalsText ?? "");
    // Date-only exceptions are stored at UTC midnight; availability lookups
    // compare against the same provider-timezone day boundary (see domain/availability).
    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
    await workingHoursDomain.addException(providerId, date, parsed.data.type, intervals, parsed.data.reason);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add exception" };
  }

  revalidatePath("/admin/working-hours");
  return {};
}

export async function removeExceptionAction(id: string): Promise<void> {
  await requireAdmin();
  await workingHoursDomain.removeException(id);
  revalidatePath("/admin/working-hours");
}
