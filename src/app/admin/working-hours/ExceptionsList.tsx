"use client";

import { useTransition } from "react";
import { removeExceptionAction } from "./actions";
import type { WorkingHoursException } from "@/generated/prisma";

function formatMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function ExceptionsList({ exceptions }: { exceptions: WorkingHoursException[] }) {
  const [isPending, startTransition] = useTransition();

  if (exceptions.length === 0) {
    return <p className="text-sm text-zinc-500">No upcoming exceptions.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {exceptions.map((exception) => (
        <li key={exception.id} className="flex items-center gap-3 text-sm">
          <span className="w-28">{new Date(exception.date).toISOString().slice(0, 10)}</span>
          <span className="w-32">
            {exception.type === "DAY_OFF"
              ? "Day off"
              : `${formatMinutes(exception.startMinute!)}-${formatMinutes(exception.endMinute!)}`}
          </span>
          <span className="flex-1 text-zinc-500">{exception.reason}</span>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => removeExceptionAction(exception.id))}
            className="rounded border border-black/15 px-2 py-0.5 text-xs dark:border-white/20"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
