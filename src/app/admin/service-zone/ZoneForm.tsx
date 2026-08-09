"use client";

import dynamic from "next/dynamic";
import { useActionState, useMemo, useState } from "react";
import { saveServiceZoneAction, type ZoneActionState } from "./actions";
import type { ServiceZone } from "@/generated/prisma";
import type { LngLat } from "./ZoneMapEditor";

const ZoneMapEditor = dynamic(() => import("./ZoneMapEditor").then((m) => m.ZoneMapEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-500">Loading map...</p>,
});

const initialState: ZoneActionState = {};

function extractInitialRing(zone?: ServiceZone): LngLat[] | undefined {
  const geometry = zone?.geometry as { coordinates?: LngLat[][] } | undefined;
  return geometry?.coordinates?.[0];
}

export function ZoneForm({ zone }: { zone?: ServiceZone }) {
  const [state, formAction, pending] = useActionState(saveServiceZoneAction, initialState);
  const initialRing = useMemo(() => extractInitialRing(zone), [zone]);
  const [ring, setRing] = useState<LngLat[]>(initialRing ?? []);

  const geometryJson = JSON.stringify({ type: "Polygon", coordinates: [ring] });

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <input type="hidden" name="geometryJson" value={geometryJson} />
      <label className="text-sm">
        Name
        <input
          name="name"
          defaultValue={zone?.name}
          required
          className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>

      <div className="text-sm">
        <span className="mb-1 block">Service area</span>
        <ZoneMapEditor initialRing={initialRing} onChange={setRing} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={zone?.active ?? true} />
        Active
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {!state.error && state.savedAt && !pending && (
        <p className="text-sm text-green-600">Zone saved.</p>
      )}
      <button
        type="submit"
        disabled={pending || ring.length < 3}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving..." : "Save zone"}
      </button>
    </form>
  );
}
