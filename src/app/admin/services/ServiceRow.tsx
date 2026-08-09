"use client";

import { useState, useTransition } from "react";
import type { Service } from "@/generated/prisma";
import { ServiceForm } from "./ServiceForm";
import { toggleServiceActiveAction, moveServiceAction } from "./actions";

export function ServiceRow({
  service,
  isFirst,
  isLast,
}: {
  service: Service;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return <ServiceForm service={service} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-4 border-b border-black/10 py-3 text-sm dark:border-white/10">
      <div className="flex flex-col">
        <button
          disabled={isFirst || isPending}
          onClick={() => startTransition(() => moveServiceAction(service.id, "up"))}
          className="text-xs disabled:opacity-20"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          disabled={isLast || isPending}
          onClick={() => startTransition(() => moveServiceAction(service.id, "down"))}
          className="text-xs disabled:opacity-20"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>
      <div className="flex-1">
        <p className={service.active ? "" : "text-zinc-400 line-through"}>{service.name}</p>
        {service.description && <p className="text-xs text-zinc-500">{service.description}</p>}
      </div>
      <span className="w-20 text-zinc-500">{service.durationMinutes} min</span>
      <span className="w-20 text-zinc-500">€{(service.priceCents / 100).toFixed(2)}</span>
      <span className="w-16 text-zinc-500">{service.active ? "Active" : "Inactive"}</span>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded border border-black/15 px-3 py-1 dark:border-white/20">
          Edit
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleServiceActiveAction(service.id, !service.active))}
          className="rounded border border-black/15 px-3 py-1 dark:border-white/20"
        >
          {service.active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}
