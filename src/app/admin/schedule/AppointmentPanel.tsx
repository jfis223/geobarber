"use client";

import { useState, useTransition } from "react";
import type { ScheduleAppointment } from "./types";
import type { ScheduleActionState } from "./actions";

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function AppointmentPanel({
  appointment,
  onClose,
  onConfirm,
  onDecline,
  onPropose,
}: {
  appointment: ScheduleAppointment;
  onClose: () => void;
  onConfirm: (id: string) => Promise<ScheduleActionState>;
  onDecline: (id: string) => Promise<ScheduleActionState>;
  onPropose: (id: string, newStartAtIso: string) => Promise<ScheduleActionState>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [proposedTime, setProposedTime] = useState("");

  function run(action: () => Promise<ScheduleActionState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <aside className="w-80 shrink-0 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
      <div className="mb-3 flex items-start justify-between">
        <h2 className="font-semibold">{appointment.customerName}</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-black dark:hover:text-white" aria-label="Close">
          ×
        </button>
      </div>

      <p className="mb-1 text-xs font-medium uppercase text-zinc-500">{appointment.status}</p>
      <p className="mb-2">{formatDateTime(appointment.startAt)}</p>

      {appointment.status === "PROPOSED" && appointment.requestedStartAt !== appointment.startAt && (
        <p className="mb-2 text-xs text-zinc-500">Originally requested: {formatDateTime(appointment.requestedStartAt)}</p>
      )}

      <p className="mb-2 text-zinc-500">{appointment.address}</p>
      {appointment.customerPhone && <p className="mb-2 text-zinc-500">{appointment.customerPhone}</p>}

      <div className="mb-2 flex flex-col gap-0.5">
        {appointment.services.map((s, i) => (
          <p key={i}>
            {s.serviceName} × {s.quantity}
          </p>
        ))}
      </div>
      <p className="mb-4 font-medium">{formatEuros(appointment.totalPriceCents)}</p>

      {error && <p className="mb-2 text-red-600">{error}</p>}

      {appointment.status === "REQUESTED" && !proposing && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => run(() => onConfirm(appointment.id))}
            disabled={isPending}
            className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Confirm
          </button>
          <button
            onClick={() => setProposing(true)}
            disabled={isPending}
            className="rounded border border-black/15 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
          >
            Propose another time
          </button>
          <button
            onClick={() => run(() => onDecline(appointment.id))}
            disabled={isPending}
            className="rounded border border-red-600/30 px-3 py-1.5 text-red-600 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {appointment.status === "REQUESTED" && proposing && (
        <div className="flex flex-col gap-2">
          <input
            type="datetime-local"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
            className="rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
          />
          <button
            onClick={() => proposedTime && run(() => onPropose(appointment.id, new Date(proposedTime).toISOString()))}
            disabled={isPending || !proposedTime}
            className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Send proposal
          </button>
          <button
            onClick={() => setProposing(false)}
            disabled={isPending}
            className="rounded border border-black/15 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
          >
            Cancel
          </button>
        </div>
      )}

      {appointment.status === "PROPOSED" && (
        <p className="text-zinc-500">Awaiting client response to the proposed time.</p>
      )}
    </aside>
  );
}
