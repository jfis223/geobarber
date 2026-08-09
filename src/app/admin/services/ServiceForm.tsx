"use client";

import { useActionState } from "react";
import { createServiceAction, updateServiceAction, type ActionState } from "./actions";
import type { Service } from "@/generated/prisma";

const initialState: ActionState = {};

export function ServiceForm({ service, onDone }: { service?: Service; onDone?: () => void }) {
  const action = service ? updateServiceAction : createServiceAction;
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) onDone?.();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          Name
          <input
            name="name"
            defaultValue={service?.name}
            required
            className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="w-28 text-sm">
          Duration (min)
          <input
            name="durationMinutes"
            type="number"
            min={1}
            defaultValue={service?.durationMinutes}
            required
            className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="w-28 text-sm">
          Price (€)
          <input
            name="priceEuros"
            type="number"
            min={0}
            step="0.01"
            defaultValue={service ? (service.priceCents / 100).toFixed(2) : undefined}
            required
            className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
          />
        </label>
      </div>
      <label className="text-sm">
        Description
        <textarea
          name="description"
          defaultValue={service?.description ?? ""}
          rows={2}
          className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving..." : service ? "Save changes" : "Add service"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="rounded border border-black/15 px-4 py-1.5 text-sm dark:border-white/20">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
