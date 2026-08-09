"use client";

import { useState, useTransition } from "react";
import { acceptProposalAction, declineProposalAction } from "../actions";

export function ProposalResponse({
  appointmentId,
  requestedStartAt,
  proposedStartAt,
}: {
  appointmentId: string;
  requestedStartAt: string;
  proposedStartAt: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [responded, setResponded] = useState(false);

  function respond(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else setResponded(true);
    });
  }

  if (responded) {
    return <p className="mt-2 text-sm text-zinc-500">Thanks — we&apos;ve recorded your response.</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded border border-blue-600/30 bg-blue-50 p-3 text-sm dark:bg-blue-950">
      <p>Your stylist has suggested a different time for your appointment.</p>
      <p className="text-zinc-500">
        Originally requested: {new Date(requestedStartAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <p className="font-medium">
        Proposed: {new Date(proposedStartAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </p>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => respond(() => acceptProposalAction(appointmentId))}
          disabled={isPending}
          className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Accept new time
        </button>
        <button
          onClick={() => respond(() => declineProposalAction(appointmentId))}
          disabled={isPending}
          className="rounded border border-black/15 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
