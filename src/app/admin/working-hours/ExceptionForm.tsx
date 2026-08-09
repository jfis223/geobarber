"use client";

import { useActionState, useState } from "react";
import { addExceptionAction, type WorkingHoursActionState } from "./actions";

const initialState: WorkingHoursActionState = {};

export function ExceptionForm({ providerId }: { providerId: string }) {
  const [state, formAction, pending] = useActionState(addExceptionAction, initialState);
  const [type, setType] = useState<"DAY_OFF" | "SPECIAL_HOURS">("DAY_OFF");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
      <input type="hidden" name="providerId" value={providerId} />
      <label>
        Date
        <input
          type="date"
          name="date"
          required
          className="mt-1 block rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label>
        Type
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "DAY_OFF" | "SPECIAL_HOURS")}
          className="mt-1 block rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        >
          <option value="DAY_OFF">Day off / holiday</option>
          <option value="SPECIAL_HOURS">Special hours</option>
        </select>
      </label>
      {type === "SPECIAL_HOURS" && (
        <label>
          Hours
          <input
            name="intervalsText"
            placeholder="10:00-14:00"
            className="mt-1 block rounded border border-black/15 px-2 py-1 font-mono text-xs dark:border-white/20 dark:bg-transparent"
          />
        </label>
      )}
      <label>
        Reason
        <input
          name="reason"
          className="mt-1 block rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding..." : "Add"}
      </button>
      {state.error && <span className="w-full text-red-600">{state.error}</span>}
    </form>
  );
}
