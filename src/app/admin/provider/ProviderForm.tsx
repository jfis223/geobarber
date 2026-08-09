"use client";

import { useActionState, useState } from "react";
import { saveProviderAction, searchAddressAction, type ProviderActionState } from "./actions";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { Provider } from "@/generated/prisma";
import type { GeocodeResult } from "@/domain/geocoding/types";

const initialState: ProviderActionState = {};

export function ProviderForm({ provider }: { provider: Provider | null }) {
  const [state, formAction, pending] = useActionState(saveProviderAction, initialState);
  const [selected, setSelected] = useState<GeocodeResult | null>(
    provider
      ? { formattedAddress: provider.homeAddress, latitude: provider.homeLatitude, longitude: provider.homeLongitude }
      : null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      {provider && <input type="hidden" name="id" value={provider.id} />}
      <input type="hidden" name="formattedAddress" value={selected?.formattedAddress ?? ""} />
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />

      <label className="text-sm">
        Stylist name
        <input
          name="name"
          defaultValue={provider?.name}
          required
          className="mt-1 w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>

      <label className="text-sm">
        Home address
        <div className="mt-1">
          <AddressAutocomplete
            defaultValue={provider?.homeAddress}
            defaultResult={selected ?? undefined}
            onSelect={setSelected}
            search={searchAddressAction}
          />
        </div>
        <span className="mt-1 block text-xs text-zinc-500">
          Pick a suggestion from the list. Used as the origin/destination for the first/last appointment of each day.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !selected}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
