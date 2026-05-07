"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type NewPlaylistOption =
  | { kind: "personal"; label: string }
  | { kind: "parish"; parishId: string; label: string }
  | { kind: "archdiocesan"; label: string };

export function NewPlaylistButton({
  options,
}: {
  options: NewPlaylistOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Si solo hay una opción, el botón va directo (sin menú).
  if (options.length === 1) {
    const o = options[0];
    return (
      <Link
        href={hrefFor(o)}
        className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90"
      >
        + Nueva
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90"
      >
        + Nueva
      </button>
      {open && (
        <Dropdown buttonRef={buttonRef} options={options} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function Dropdown({
  buttonRef,
  options,
  onClose,
}: {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  options: NewPlaylistOption[];
  onClose: () => void;
}) {
  const [mobile, setMobile] = useState<{ top: number } | null>(null);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 640) {
        setMobile(null);
        return;
      }
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setMobile({ top: rect.bottom + 8 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [buttonRef]);

  return (
    <div
      role="menu"
      style={mobile ? { top: mobile.top } : undefined}
      className={
        mobile
          ? "fixed left-1/2 z-40 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          : "absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
      }
    >
      <ul className="py-1 text-sm">
        {options.map((o, i) => (
          <li key={i}>
            <Link
              role="menuitem"
              href={hrefFor(o)}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 normal-case text-foreground transition-colors hover:bg-sidebar"
            >
              <span aria-hidden="true" className="text-primary">
                •
              </span>
              <span>{o.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function hrefFor(o: NewPlaylistOption): string {
  if (o.kind === "personal") return "/playlists/nueva?scope=personal";
  if (o.kind === "archdiocesan") return "/playlists/nueva?scope=archdiocesan";
  return `/playlists/nueva?scope=parish&parish=${o.parishId}`;
}
