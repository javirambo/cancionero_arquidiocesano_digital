"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@/app/components/icons";

export function Accordion({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border bg-sidebar">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm uppercase tracking-[0.2em] text-primary">
          {title}
        </span>
        <span
          aria-hidden
          className={`inline-flex text-primary transition-transform ${open ? "rotate-90" : ""}`}
        >
          <ChevronRightIcon />
        </span>
      </button>
      {open && (
        <div className="border-t border-border bg-background p-5">
          {children}
        </div>
      )}
    </section>
  );
}
