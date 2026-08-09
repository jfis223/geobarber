"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsActionState } from "./actions";
import type { SystemSettings } from "@/generated/prisma";

const initialState: SettingsActionState = {};

const FIELDS: { name: keyof SystemSettings; label: string }[] = [
  { name: "slotIntervalMinutes", label: "Slot interval (minutes)" },
  { name: "nearbyThresholdMinutes", label: "Nearby threshold (minutes)" },
  { name: "maxRouteAlternatives", label: "Max route alternatives" },
  { name: "pendingRequestExpirationHours", label: "Pending request expiration (hours)" },
  { name: "cancellationCutoffHours", label: "Cancellation cutoff (hours)" },
  { name: "reminderHourLocal", label: "Reminder hour (0-23, local time)" },
  { name: "gtfsStalenessThresholdDays", label: "GTFS staleness threshold (days)" },
];

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <label className="text-sm">
        Timezone
        <input
          name="timezone"
          defaultValue={settings.timezone}
          className="mt-1 w-full max-w-xs rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <label key={field.name} className="text-sm">
            {field.label}
            <input
              name={field.name}
              type="number"
              min={0}
              defaultValue={settings[field.name] as number}
              className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
            />
          </label>
        ))}
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
