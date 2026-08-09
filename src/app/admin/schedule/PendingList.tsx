"use client";

import type { ScheduleAppointment } from "./types";

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function PendingList({
  pending,
  onSelect,
}: {
  pending: ScheduleAppointment[];
  onSelect: (appointment: ScheduleAppointment) => void;
}) {
  if (pending.length === 0) {
    return <p className="text-sm text-zinc-500">No pending requests.</p>;
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-zinc-900">
      {pending.map((appointment, i) => (
        <button
          key={appointment.id}
          onClick={() => onSelect(appointment)}
          className={`flex items-center gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.06] ${
            i > 0 ? "border-t border-black/[0.06] dark:border-white/10" : ""
          }`}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF9500]" />
          <span className="flex-1 font-medium">{appointment.customerName}</span>
          <span className="text-zinc-500">{formatDateTime(appointment.startAt)}</span>
          <span className="text-zinc-500">{appointment.address}</span>
          <span className="font-medium">{formatEuros(appointment.totalPriceCents)}</span>
        </button>
      ))}
    </div>
  );
}
