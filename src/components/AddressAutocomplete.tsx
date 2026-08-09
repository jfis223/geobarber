"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "@/domain/geocoding/types";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

export type AddressSearchFn = (query: string) => Promise<{ results: GeocodeResult[] } | { error: string }>;

export function AddressAutocomplete({
  defaultValue,
  defaultResult,
  onSelect,
  search,
  placeholder = "Start typing an address...",
  showCoordinates = true,
}: {
  defaultValue?: string;
  defaultResult?: GeocodeResult;
  onSelect: (result: GeocodeResult | null) => void;
  search: AddressSearchFn;
  placeholder?: string;
  showCoordinates?: boolean;
}) {
  const [query, setQuery] = useState(defaultValue ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GeocodeResult | null>(defaultResult ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (selected && query === selected.formattedAddress) return;
    if (query.trim().length < MIN_QUERY_LENGTH) return;

    const timeout = setTimeout(async () => {
      const result = await search(query);
      setResults("results" in result ? result.results : []);
      setOpen(true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, selected, search]);

  function pick(result: GeocodeResult) {
    setSelected(result);
    setQuery(result.formattedAddress);
    setOpen(false);
    onSelect(result);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          onSelect(null);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
      />
      {open && query.trim().length >= MIN_QUERY_LENGTH && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-black/15 bg-white text-sm shadow-lg dark:border-white/20 dark:bg-zinc-900">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => pick(r)}
                className="block w-full px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10"
              >
                {r.formattedAddress}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showCoordinates && selected && (
        <p className="mt-1 text-xs text-zinc-500">
          {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
