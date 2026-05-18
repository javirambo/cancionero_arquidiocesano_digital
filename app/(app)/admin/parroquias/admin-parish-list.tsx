"use client";

import Link from "next/link";
import { useState } from "react";

export type AdminParishRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  status: string | null;
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function uniqueCities(rows: AdminParishRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const c = r.city?.trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

export function AdminParishList({ rows }: { rows: AdminParishRow[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);

  const cities = uniqueCities(rows);

  const needle = normalize(query.trim());
  const filtered = rows.filter((r) => {
    if (city && (!r.city || normalize(r.city) !== normalize(city))) return false;
    if (!needle) return true;
    return (
      normalize(r.name).includes(needle) ||
      (r.address ? normalize(r.address).includes(needle) : false) ||
      (r.city ? normalize(r.city).includes(needle) : false)
    );
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar parroquia…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm normal-case"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {cities.length > 0 && (
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-secondary">
          <span>Ciudad:</span>
          <select
            value={city ?? ""}
            onChange={(e) => setCity(e.target.value || null)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
          >
            <option value="">Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-4 text-sm normal-case text-muted-foreground">
          Sin coincidencias.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar"
            >
              <Link
                href={`/admin/parroquias/${p.id}`}
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="text-base text-primary">{p.name}</span>
                <span className="text-xs normal-case text-muted-foreground">
                  {p.city ?? "—"}
                  {p.status === "inactive" && " · inactiva"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
