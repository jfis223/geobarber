"use client";

import { useActionState, useState } from "react";
import { completeProfileAction, searchAddressAction, type OnboardingActionState } from "./actions";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { GeocodeResult } from "@/domain/geocoding/types";

const initialState: OnboardingActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(completeProfileAction, initialState);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="formattedAddress" value={selected?.formattedAddress ?? ""} />
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />

      <label className="text-sm">
        Phone number
        <input
          name="phone"
          type="tel"
          required
          placeholder="+34 600 000 000"
          className="mt-1 w-full rounded border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>

      <label className="text-sm">
        Address
        <div className="mt-1">
          <AddressAutocomplete
            search={searchAddressAction}
            onSelect={setSelected}
            placeholder="Calle Example 123, Madrid"
            showCoordinates={false}
          />
        </div>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !selected}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
