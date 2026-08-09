"use client";

import { useState, useTransition } from "react";
import { setWorkingHoursForDayAction } from "./actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Every 15 minutes, 00:00 through 24:00 inclusive (24:00 = midnight as an end boundary).
const TIME_OPTIONS = Array.from({ length: 97 }, (_, i) => {
  const minutes = i * 15;
  const label =
    minutes === 1440
      ? "24:00"
      : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return { value: minutes, label };
});

interface Range {
  startMinute: number;
  endMinute: number;
}

export function DayHoursEditor({
  providerId,
  dayOfWeek,
  initialRanges,
}: {
  providerId: string;
  dayOfWeek: number;
  initialRanges: Range[];
}) {
  const [ranges, setRanges] = useState<Range[]>(initialRanges);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRange(index: number, field: keyof Range, value: number) {
    setSaved(false);
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRange() {
    setSaved(false);
    const last = ranges[ranges.length - 1];
    const start = last ? Math.min(last.endMinute, 1440 - 15) : 540; // default 09:00, or right after the last range
    setRanges((prev) => [...prev, { startMinute: start, endMinute: Math.min(start + 240, 1440) }]);
  }

  function removeRange(index: number) {
    setSaved(false);
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setWorkingHoursForDayAction(providerId, dayOfWeek, ranges);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-1 border-b border-black/10 py-2 text-sm dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 shrink-0">{DAY_NAMES[dayOfWeek]}</span>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {ranges.length === 0 && <span className="text-zinc-400">Closed</span>}
          {ranges.map((range, i) => (
            <span key={i} className="flex items-center gap-1 rounded border border-black/15 px-1.5 py-0.5 dark:border-white/20">
              <select
                value={range.startMinute}
                onChange={(e) => updateRange(i, "startMinute", Number(e.target.value))}
                className="bg-transparent"
              >
                {TIME_OPTIONS.filter((o) => o.value < 1440).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span>-</span>
              <select
                value={range.endMinute}
                onChange={(e) => updateRange(i, "endMinute", Number(e.target.value))}
                className="bg-transparent"
              >
                {TIME_OPTIONS.filter((o) => o.value > 0).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRange(i)}
                aria-label="Remove range"
                className="ml-1 text-zinc-400 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" onClick={addRange} className="rounded border border-black/15 px-2 py-0.5 text-xs dark:border-white/20">
            + range
          </button>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded border border-black/15 px-3 py-1 disabled:opacity-50 dark:border-white/20"
        >
          {isPending ? "..." : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="text-xs text-green-600">Saved.</p>}
    </div>
  );
}
