"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParishCard, type AnimState, type Parish } from "./parish-card";

type Props = {
  parishes: Parish[];
  initialMemberIds: string[];
  initialPrimaryId: string | null;
  userId: string | null;
  canSeeMeta: boolean;
};

const ANIM_MS = 300;

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function sortByDistance(parishes: Parish[], origin: { lat: number; lon: number }): Parish[] {
  const withCoords: Array<Parish & { _d: number }> = [];
  const withoutCoords: Parish[] = [];
  for (const p of parishes) {
    if (
      p.latitude !== null &&
      p.longitude !== null &&
      p.latitude !== 0 &&
      p.longitude !== 0
    ) {
      withCoords.push({
        ...p,
        _d: haversineKm(origin, { lat: p.latitude, lon: p.longitude }),
      });
    } else {
      withoutCoords.push(p);
    }
  }
  withCoords.sort((a, b) => a._d - b._d);
  return [...withCoords.map(({ _d, ...rest }) => rest as Parish), ...withoutCoords];
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function filterByQuery(parishes: Parish[], q: string): Parish[] {
  const needle = normalize(q.trim());
  if (!needle) return parishes;
  return parishes.filter(
    (p) =>
      normalize(p.name).includes(needle) ||
      (p.address ? normalize(p.address).includes(needle) : false) ||
      (p.city ? normalize(p.city).includes(needle) : false)
  );
}

function uniqueCities(parishes: Parish[]): string[] {
  const set = new Set<string>();
  for (const p of parishes) {
    const c = p.city?.trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

function filterByCity(parishes: Parish[], city: string | null): Parish[] {
  if (!city) return parishes;
  const target = normalize(city);
  return parishes.filter((p) => p.city && normalize(p.city) === target);
}

export function ParishList({
  parishes,
  initialMemberIds,
  initialPrimaryId,
  userId,
  canSeeMeta,
}: Props) {
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () => new Set(initialMemberIds)
  );
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId);
  const [anim, setAnim] = useState<Map<string, AnimState>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);

  // Filtros y colapso por sección.
  const [mineQuery, setMineQuery] = useState("");
  const [othersQuery, setOthersQuery] = useState("");
  const [othersCity, setOthersCity] = useState<string | null>(null);
  const [mineSearchOpen, setMineSearchOpen] = useState(false);
  const [othersSearchOpen, setOthersSearchOpen] = useState(false);
  const [mineCollapsed, setMineCollapsed] = useState(false);
  const [othersCollapsed, setOthersCollapsed] = useState(false);

  useEffect(() => setMemberIds(new Set(initialMemberIds)), [initialMemberIds]);
  useEffect(() => setPrimaryId(initialPrimaryId), [initialPrimaryId]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {},
      { timeout: 6000, maximumAge: 600_000 }
    );
  }, []);

  const displayMembers = new Set(memberIds);
  for (const [id, state] of anim) {
    if (state === "leaving") displayMembers.add(id);
  }

  const sortByName = (a: Parish, b: Parish) =>
    a.name.localeCompare(b.name, "es");

  // Las parroquias (sin parent_id) van siempre antes que las capillas.
  const parishesFirst = (list: Parish[]): Parish[] => [
    ...list.filter((p) => !p.parent_id),
    ...list.filter((p) => p.parent_id),
  ];

  const mine = parishes
    .filter((p) => displayMembers.has(p.id))
    .sort((a, b) => {
      const aPrim = a.id === primaryId ? 0 : 1;
      const bPrim = b.id === primaryId ? 0 : 1;
      if (aPrim !== bPrim) return aPrim - bPrim;
      const aChapel = a.parent_id ? 1 : 0;
      const bChapel = b.parent_id ? 1 : 0;
      if (aChapel !== bChapel) return aChapel - bChapel;
      return sortByName(a, b);
    });
  const othersAlpha = parishes
    .filter((p) => !displayMembers.has(p.id))
    .sort(sortByName);
  const others = parishesFirst(
    origin ? sortByDistance(othersAlpha, origin) : othersAlpha
  );

  const mineFiltered = filterByQuery(mine, mineQuery);
  const othersFiltered = filterByQuery(filterByCity(others, othersCity), othersQuery);
  const othersCities = uniqueCities(others);

  async function handleAdd(parishId: string) {
    if (!userId) return;
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase
      .from("parish_members")
      .insert({ user_id: userId, parish_id: parishId, role: "member" });
    if (e) {
      setError(e.message);
      return;
    }
    setMemberIds((prev) => new Set(prev).add(parishId));
    setAnim((prev) => new Map(prev).set(parishId, "entering"));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnim((prev) => {
          const next = new Map(prev);
          next.delete(parishId);
          return next;
        });
      });
    });
  }

  async function handleRemove(parishId: string) {
    if (!userId) return;
    setError(null);
    const supabase = createClient();
    if (primaryId === parishId) {
      await supabase
        .from("users")
        .update({ parish_id: null })
        .eq("id", userId);
      setPrimaryId(null);
    }
    const { error: e } = await supabase
      .from("parish_members")
      .delete()
      .eq("user_id", userId)
      .eq("parish_id", parishId);
    if (e) {
      setError(e.message);
      return;
    }
    setAnim((prev) => new Map(prev).set(parishId, "leaving"));
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(parishId);
      return next;
    });
    setTimeout(() => {
      setAnim((prev) => {
        const next = new Map(prev);
        next.delete(parishId);
        return next;
      });
    }, ANIM_MS);
  }

  async function handleTogglePrimary(parishId: string) {
    if (!userId) return;
    setError(null);
    const next = primaryId === parishId ? null : parishId;
    const supabase = createClient();
    const { error: e } = await supabase
      .from("users")
      .update({ parish_id: next })
      .eq("id", userId);
    if (e) {
      setError(e.message);
      return;
    }
    setPrimaryId(next);
  }

  const isLogged = Boolean(userId);

  function renderCard(p: Parish, showDescription: boolean) {
    return (
      <ParishCard
        key={p.id}
        parish={p}
        isLogged={isLogged}
        isMember={memberIds.has(p.id)}
        isPrimary={primaryId === p.id}
        animState={anim.get(p.id)}
        canSeeMeta={canSeeMeta}
        showDescription={showDescription}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onTogglePrimary={handleTogglePrimary}
      />
    );
  }

  // ----- Invitado: una sola lista con buscador arriba. -----
  if (!isLogged) {
    return (
      <>
        {error && (
          <p className="text-sm normal-case text-destructive">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <SearchInput
            value={othersQuery}
            onChange={setOthersQuery}
            placeholder="Buscar parroquia…"
          />
        </div>
        {othersCities.length > 0 && (
          <CityChips
            cities={othersCities}
            selected={othersCity}
            onSelect={setOthersCity}
          />
        )}
        {othersFiltered.length === 0 ? (
          <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
            Sin coincidencias.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {othersFiltered.map((p) => renderCard(p, false))}
          </ul>
        )}
      </>
    );
  }

  // ----- Member/Coord/Admin: dos secciones con acordeón + lupa. -----
  return (
    <>
      {error && (
        <p className="text-sm normal-case text-destructive">{error}</p>
      )}

      {mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Mis parroquias"
            count={mine.length}
            collapsed={mineCollapsed}
            onToggleCollapsed={() => setMineCollapsed((v) => !v)}
            searchOpen={mineSearchOpen}
            onToggleSearch={() => setMineSearchOpen((v) => !v)}
          />
          <Collapsible open={!mineCollapsed}>
            <div className="flex flex-col gap-3 pt-1">
              {mineSearchOpen && (
                <SearchInput
                  value={mineQuery}
                  onChange={setMineQuery}
                  placeholder="Filtrar mis parroquias…"
                  autoFocus
                />
              )}
              {mineFiltered.length === 0 ? (
                <p className="rounded-xl border border-border bg-background p-4 text-sm normal-case text-muted-foreground">
                  Sin coincidencias.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {mineFiltered.map((p) => renderCard(p, true))}
                </ul>
              )}
            </div>
          </Collapsible>
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Otras parroquias"
            count={others.length}
            collapsed={othersCollapsed}
            onToggleCollapsed={() => setOthersCollapsed((v) => !v)}
            searchOpen={othersSearchOpen}
            onToggleSearch={() => setOthersSearchOpen((v) => !v)}
          />
          <Collapsible open={!othersCollapsed}>
            <div className="flex flex-col gap-3 pt-1">
              {othersSearchOpen && (
                <SearchInput
                  value={othersQuery}
                  onChange={setOthersQuery}
                  placeholder="Filtrar otras parroquias…"
                  autoFocus
                />
              )}
              {othersSearchOpen && othersCities.length > 0 && (
                <CityChips
                  cities={othersCities}
                  selected={othersCity}
                  onSelect={setOthersCity}
                />
              )}
              {othersFiltered.length === 0 ? (
                <p className="rounded-xl border border-border bg-background p-4 text-sm normal-case text-muted-foreground">
                  Sin coincidencias.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {othersFiltered.map((p) => renderCard(p, false))}
                </ul>
              )}
            </div>
          </Collapsible>
        </section>
      )}
    </>
  );
}

function SectionHeader({
  title,
  count,
  collapsed,
  onToggleCollapsed,
  searchOpen,
  onToggleSearch,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex flex-1 items-center gap-2 text-left text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        aria-expanded={!collapsed}
      >
        <ChevronIcon
          className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
        <span>{title}</span>
        <span className="text-muted-foreground">({count})</span>
      </button>
      <button
        type="button"
        onClick={onToggleSearch}
        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
          searchOpen
            ? "border-primary text-primary"
            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
        }`}
        aria-label={searchOpen ? "Ocultar filtro" : "Filtrar"}
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm normal-case"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function CityChips({
  cities,
  selected,
  onSelect,
}: {
  cities: string[];
  selected: string | null;
  onSelect: (city: string | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-secondary">
      <span>Ciudad:</span>
      <select
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground"
      >
        <option value="">Todas</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </label>
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

function ChevronIcon({ className }: { className?: string }) {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
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
