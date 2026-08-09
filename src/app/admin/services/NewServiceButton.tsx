"use client";

import { useState } from "react";
import { ServiceForm } from "./ServiceForm";

export function NewServiceButton() {
  const [open, setOpen] = useState(false);

  if (open) return <ServiceForm onDone={() => setOpen(false)} />;

  return (
    <button
      onClick={() => setOpen(true)}
      className="self-start rounded bg-black px-4 py-1.5 text-sm text-white dark:bg-white dark:text-black"
    >
      + Add service
    </button>
  );
}
