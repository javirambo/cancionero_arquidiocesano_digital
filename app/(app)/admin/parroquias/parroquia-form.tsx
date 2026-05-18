"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

export type ParishStatus = "active" | "inactive";

export type ParishFormData = {
  id?: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  description: string;
  status: ParishStatus;
  logo_url: string;
  decanato: string;
  parent_id: string;
  latitude: string;
  longitude: string;
  url: string;
};

type Candidate = {
  name: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
};

const empty: ParishFormData = {
  name: "",
  slug: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  description: "",
  status: "active",
  logo_url: "",
  decanato: "",
  parent_id: "",
  latitude: "",
  longitude: "",
  url: "",
};

export function ParroquiaForm({
  initial,
  mode,
  parishes,
  decanatos,
  restricted,
  backHref = "/admin/parroquias",
}: {
  initial?: ParishFormData;
  mode: "create" | "edit";
  parishes: Array<{ id: string; name: string; decanato: string | null }>;
  decanatos: string[];
  restricted: boolean;
  backHref?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ParishFormData>(initial ?? empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialDecanato = (initial?.decanato ?? "").trim();
  const [decanatoMode, setDecanatoMode] = useState<"list" | "new">(
    initialDecanato !== "" && !decanatos.includes(initialDecanato) ? "new" : "list"
  );
  const [coordsInput, setCoordsInput] = useState<string>(() => {
    const lat = initial?.latitude ?? "";
    const lon = initial?.longitude ?? "";
    return lat !== "" && lon !== "" ? `${lat}, ${lon}` : "";
  });
  const [coordsError, setCoordsError] = useState<string | null>(null);

  function handleCoordsChange(value: string) {
    setCoordsInput(value);
    if (value.trim() === "") {
      setCoordsError(null);
      update("latitude", "");
      update("longitude", "");
      return;
    }
    const parsed = parseCoords(value);
    if (!parsed) {
      setCoordsError("No pude leer las coordenadas. Pegá 'lat,lon' o una URL de Google Maps.");
      return;
    }
    setCoordsError(null);
    update("latitude", String(parsed.lat));
    update("longitude", String(parsed.lon));
  }

  // Autocomplete Nominatim
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  function update<K extends keyof ParishFormData>(key: K, value: ParishFormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (mode === "create" && (key === "name" || key === "city" || key === "decanato")) {
        next.slug = buildSlug(next.name, next.city, next.decanato);
      }
      if (key === "decanato" && next.parent_id) {
        const stillValid = parishes.some(
          (p) => p.id === next.parent_id && (p.decanato ?? "") === next.decanato
        );
        if (!stillValid) next.parent_id = "";
      }
      return next;
    });
  }

  function getCurrentPositionOnce(): Promise<{ lat: number; lon: number } | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 4000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { timeout: 4000, maximumAge: 600_000 }
      );
    });
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setSearching(true);
    setSearchError(null);
    setCandidates(null);
    setTotalFiltered(0);
    const origin = await getCurrentPositionOnce();
    try {
      const params = new URLSearchParams({ q: query });
      if (origin) {
        params.set("lat", String(origin.lat));
        params.set("lon", String(origin.lon));
      }
      const res = await fetch(`/api/parroquias/buscar?${params.toString()}`);
      const data = await res.json();
      setCandidates(data.results ?? []);
      setTotalFiltered(data.totalFiltered ?? (data.results ?? []).length);
    } catch {
      setSearchError("No se pudo conectar con el servicio de búsqueda.");
    } finally {
      setSearching(false);
    }
  }

  async function handleNearby() {
    if (!navigator.geolocation) {
      setSearchError("El navegador no soporta geolocalización.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    setCandidates(null);
    setTotalFiltered(0);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/parroquias/buscar?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          setCandidates(data.results ?? []);
          setTotalFiltered(data.totalFiltered ?? (data.results ?? []).length);
          if ((data.results ?? []).length === 0) {
            setSearchError("No encontramos parroquias cerca.");
          }
        } catch {
          setSearchError("No se pudo conectar con el servicio de búsqueda.");
        } finally {
          setSearching(false);
        }
      },
      () => {
        setSearching(false);
        setSearchError("No autorizaste el acceso a la ubicación.");
      }
    );
  }

  function applyCandidate(c: Candidate) {
    setForm((prev) => {
      const next = {
        ...prev,
        name: c.name,
        address: c.address,
        city: c.city,
        latitude: String(c.lat),
        longitude: String(c.lon),
      };
      if (mode === "create") {
        next.slug = buildSlug(next.name, next.city, next.decanato);
      }
      return next;
    });
    setCandidates(null);
    setQuery("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!form.decanato.trim()) {
      setError("El decanato es obligatorio.");
      return;
    }
    if (mode === "create" && !form.city.trim()) {
      setError("Para crear una parroquia, la ciudad es obligatoria (forma parte del atajo).");
      return;
    }
    if (!form.slug.trim()) {
      setError("El atajo no pudo generarse. Revisá nombre, ciudad y decanato.");
      return;
    }
    const lat = form.latitude.trim() === "" ? null : Number(form.latitude);
    const lon = form.longitude.trim() === "" ? null : Number(form.longitude);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      setError("Latitud inválida (rango -90 a 90).");
      return;
    }
    if (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
      setError("Longitud inválida (rango -180 a 180).");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const editablePayload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      latitude: lat,
      longitude: lon,
      url: form.url.trim() || null,
    };
    const payload = restricted
      ? editablePayload
      : {
          ...editablePayload,
          slug: form.slug.trim(),
          status: form.status,
          decanato: form.decanato.trim(),
          parent_id: form.parent_id || null,
        };

    if (mode === "create") {
      const { data, error } = await supabase
        .from("parishes")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          setError(`El atajo "${form.slug}" ya está en uso. Probá otro.`);
        } else {
          setError(error.message);
        }
        setSaving(false);
        return;
      }
      router.push(backHref === "/admin/parroquias" ? `/admin/parroquias/${data.id}` : backHref);
      router.refresh();
    } else {
      const { error } = await supabase
        .from("parishes")
        .update(payload)
        .eq("id", form.id!);
      if (error) {
        if (error.code === "23505") {
          setError(`El atajo "${form.slug}" ya está en uso. Probá otro.`);
        } else {
          setError(error.message);
        }
        setSaving(false);
        return;
      }
      router.push(backHref);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {mode === "create" && (
        <section className="rounded-2xl border border-border bg-sidebar p-5">
          <h2 className="text-sm uppercase tracking-[0.2em] text-secondary">
            Buscar en Maps
          </h2>
          <p className="mt-1 text-xs normal-case text-muted-foreground">
            Buscá la parroquia por nombre o ubicación para autocompletar los datos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: parroquia santa rosa rosario"
              className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || query.trim().length < 3}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={handleNearby}
              disabled={searching}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            >
              Cerca mío (GPS)
            </button>
          </div>
          {searching && (
            <p className="mt-3 text-xs normal-case text-muted-foreground">
              Buscando…
            </p>
          )}
          {searchError && (
            <p className="mt-3 text-xs normal-case text-destructive">
              {searchError}
            </p>
          )}
          {candidates && candidates.length > 0 && (
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
              {candidates.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => applyCandidate(c)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left normal-case hover:bg-sidebar"
                  >
                    <span className="text-sm text-primary">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.address}
                    </span>
                  </button>
                </li>
              ))}
              {totalFiltered > candidates.length && (
                <li className="px-3 py-2 text-center text-xs normal-case text-muted-foreground">
                  Hay {totalFiltered - candidates.length} resultados más, refiná tu búsqueda.
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Atajo"
          hint={
            mode === "create"
              ? "Se genera automáticamente desde Nombre + Ciudad + Decanato. No editable."
              : "Aparece en la dirección web de la parroquia. No editable."
          }
        >
          <input
            type="text"
            readOnly
            value={form.slug}
            className={`${inputClass} cursor-not-allowed bg-sidebar text-muted-foreground`}
            tabIndex={-1}
          />
        </Field>
        <Field label="Dirección">
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ciudad">
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Decanato *"
          hint={restricted ? "Solo editable por administrador o editor." : undefined}
        >
          {restricted ? (
            <input
              type="text"
              readOnly
              value={form.decanato}
              tabIndex={-1}
              className={`${inputClass} cursor-not-allowed bg-sidebar text-muted-foreground`}
            />
          ) : decanatoMode === "list" ? (
            <select
              required
              value={form.decanato}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") {
                  setDecanatoMode("new");
                  update("decanato", "");
                } else {
                  update("decanato", v);
                }
              }}
              className={inputClass}
            >
              <option value="" disabled>
                Seleccioná un decanato…
              </option>
              {decanatos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="__new__">+ Nuevo decanato…</option>
            </select>
          ) : (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={form.decanato}
                onChange={(e) => update("decanato", e.target.value)}
                placeholder="Nombre del nuevo decanato"
                autoFocus
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => {
                  setDecanatoMode("list");
                  update("decanato", "");
                }}
                className="self-start text-xs normal-case text-primary hover:underline"
              >
                ← elegir existente
              </button>
            </div>
          )}
        </Field>
        <Field
          label="Sede"
          hint={
            restricted
              ? "Solo editable por administrador o editor."
              : form.decanato.trim() === ""
              ? "Seleccioná primero un decanato para ver las sedes disponibles."
              : "Dejar vacío si esta parroquia no depende de otra."
          }
        >
          {restricted ? (
            <input
              type="text"
              readOnly
              value={
                parishes.find((p) => p.id === form.parent_id)?.name ??
                "— Parroquia Padre —"
              }
              tabIndex={-1}
              className={`${inputClass} cursor-not-allowed bg-sidebar text-muted-foreground`}
            />
          ) : (
            <select
              value={form.parent_id}
              onChange={(e) => update("parent_id", e.target.value)}
              disabled={form.decanato.trim() === ""}
              className={`${inputClass} ${
                form.decanato.trim() === "" ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <option value="">— Parroquia Padre —</option>
              {parishes
                .filter((p) => (p.decanato ?? "") === form.decanato)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          )}
        </Field>
        <Field label="Logo (URL)">
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => update("logo_url", e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Field label="Sitio web">
          <input
            type="url"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Field
          label="Coordenadas (Google Maps)"
          hint="Pegá 'lat,lon' (ej: -32.9812188,-60.7493701) o una URL de Google Maps."
          full
        >
          <input
            type="text"
            value={coordsInput}
            onChange={(e) => handleCoordsChange(e.target.value)}
            placeholder="-32.9812188,-60.7493701  o  https://www.google.com/maps/…"
            className={`${inputClass} ${coordsError ? "border-destructive" : ""}`}
          />
          {coordsError ? (
            <span className="text-xs text-destructive">{coordsError}</span>
          ) : form.latitude && form.longitude ? (
            <span className="text-xs text-muted-foreground">
              → lat: {form.latitude}, lon: {form.longitude}
            </span>
          ) : null}
        </Field>
        <Field label="Descripción (ejemplo horarios de misa)" full>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field
          label="Estado"
          hint={
            restricted
              ? "Solo editable por administrador o editor."
              : "Activa: visible en listados. Inactiva: dada de baja (oculta)."
          }
          full
        >
          {restricted ? (
            <input
              type="text"
              readOnly
              value={form.status === "active" ? "Activa" : "Inactiva"}
              tabIndex={-1}
              className={`${inputClass} cursor-not-allowed bg-sidebar text-muted-foreground`}
            />
          ) : (
            <select
              value={form.status}
              onChange={(e) => {
                const next = e.target.value as ParishStatus;
                if (next === "inactive" && mode === "edit") {
                  const ok = window.confirm(
                    `¿Marcar "${form.name}" como inactiva? Dejará de aparecer en la app pública. Podés reactivarla más tarde.`
                  );
                  if (!ok) return;
                }
                update("status", next);
              }}
              className={inputClass}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          )}
        </Field>
      </div>

      {error && (
        <p className="text-sm normal-case text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

function buildSlug(name: string, city: string, decanato: string): string {
  const parts = [name, city, decanato]
    .map((p) => slugify(p.trim()))
    .filter((p) => p.length > 0);
  return parts.join("_");
}

function parseCoords(input: string): { lat: number; lon: number } | null {
  const s = input.trim();
  if (s === "") return null;
  const candidates: Array<[string, string]> = [];

  // URL de Google Maps con @lat,lon,zoom
  const atMatch = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) candidates.push([atMatch[1], atMatch[2]]);

  // URL con ?q=lat,lon o &q=lat,lon
  const qMatch = s.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) candidates.push([qMatch[1], qMatch[2]]);

  // Par "lat,lon" simple (con o sin espacios)
  const pairMatch = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (pairMatch) candidates.push([pairMatch[1], pairMatch[2]]);

  for (const [latStr, lonStr] of candidates) {
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    ) {
      return { lat, lon };
    }
  }
  return null;
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""} normal-case`}
    >
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
