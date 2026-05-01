"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "./icons";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function AccordionSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar"
      >
        <span
          aria-hidden="true"
          className={`text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          <ChevronRightIcon />
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">
          {title}
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-4">{children}</div>
      )}
    </section>
  );
}
