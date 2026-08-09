import { z } from "zod";

const TIME_RANGE = /^([0-1]\d|2[0-3]):([0-5]\d)-([0-1]\d|2[0-3]):([0-5]\d)$/;

export interface Interval {
  startMinute: number;
  endMinute: number;
}

/** Parses "09:00-13:00,14:00-18:00" into sorted, validated minute-of-day intervals. */
export function parseIntervalsInput(text: string): Interval[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed.split(",").map((chunk) => {
    const part = chunk.trim();
    const match = TIME_RANGE.exec(part);
    if (!match) {
      throw new Error(`Invalid time range "${part}". Use HH:MM-HH:MM, comma-separated.`);
    }
    const startMinute = Number(match[1]) * 60 + Number(match[2]);
    const endMinute = Number(match[3]) * 60 + Number(match[4]);
    if (endMinute <= startMinute) {
      throw new Error(`Range "${part}" must end after it starts.`);
    }
    return { startMinute, endMinute };
  });
}

export const exceptionInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  type: z.enum(["DAY_OFF", "SPECIAL_HOURS"]),
  intervalsText: z.string().optional(),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ExceptionInput = z.infer<typeof exceptionInputSchema>;
