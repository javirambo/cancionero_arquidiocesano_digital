"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// Celdas del mes: nulls de relleno hasta el primer día (semana empieza lunes).
function buildCells(y: number, m: number): (number | null)[] {
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // 0 = lunes
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

// La fecha completa (ícono + fecha + chevron, dorado) es el trigger: abre un
// popup con un calendario mensual; al clickear un día navega a
// /salmos?fecha=YYYY-MM-DD para mostrar el salmo de ese día.
export function CambiarFecha({
  selected,
  today,
  dateLabel,
}: {
  selected: string;
  today: string;
  dateLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const [y, m] = selected.split("-").map(Number);
    return { y, m };
  });

  function pick(d: number) {
    setOpen(false);
    router.push(`/salmos?fecha=${iso(view.y, view.m, d)}`);
  }
  function shift(delta: number) {
    setView((v) => {
      const idx = v.m - 1 + delta;
      return { y: v.y + Math.floor(idx / 12), m: ((idx % 12) + 12) % 12 + 1 };
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const [y, m] = selected.split("-").map(Number);
          setView({ y, m });
          setOpen(true);
        }}
        aria-label="Cambiar fecha"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-secondary px-4 py-0.5 text-lg font-semibold text-secondary transition-opacity hover:opacity-70"
      >
        <CalendarIcon />
        <span className="normal-case first-letter:uppercase">{dateLabel}</span>
        <Chevron dir="down" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="Mes anterior"
                className="rounded-full p-1 text-primary hover:bg-sidebar"
              >
                <Chevron dir="left" />
              </button>
              <span className="text-sm font-semibold capitalize text-page-title">
                {MONTHS[view.m - 1]} {view.y}
              </span>
              <button
                type="button"
                onClick={() => shift(1)}
                aria-label="Mes siguiente"
                className="rounded-full p-1 text-primary hover:bg-sidebar"
              >
                <Chevron dir="right" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {w}
                </span>
              ))}
              {buildCells(view.y, view.m).map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const cellIso = iso(view.y, view.m, d);
                const isSelected = cellIso === selected;
                const isToday = cellIso === today;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pick(d)}
                    aria-current={isSelected ? "date" : undefined}
                    className={`flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
                      isSelected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : isToday
                          ? "border border-primary text-primary"
                          : "text-foreground hover:bg-sidebar"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" | "down" }) {
  const d =
    dir === "left" ? "M15 18l-6-6 6-6" : dir === "right" ? "M9 18l6-6-6-6" : "M6 9l6 6 6-6";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
