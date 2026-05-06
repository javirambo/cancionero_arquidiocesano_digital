"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

export type ParishStatus = "active" | "pending" | "inactive";

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
};

export function ParroquiaForm({
  initial,
  mode,
}: {
  initial?: ParishFormData;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ParishFormData>(initial ?? empty);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete Nominatim
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  function update<K extends keyof ParishFormData>(key: K, value: ParishFormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) {
        next.slug = slugify(String(value));
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
    setForm((prev) => ({
      ...prev,
      name: c.name,
      slug: prev.slug || slugify(c.name),
      address: c.address,
      city: c.city,
    }));
    setCandidates(null);
    setQuery("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Nombre y atajo son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
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
      router.push(`/admin/parroquias/${data.id}`);
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
      router.push("/admin/parroquias");
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
        <Field label="Atajo *" hint="Aparece en la dirección web de la parroquia">
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", slugify(e.target.value));
            }}
            className={inputClass}
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
        <Field label="Descripción" full>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field
          label="Estado"
          hint="Activa: visible en listados. Pendiente: alta de un member, esperando revisión. Inactiva: dada de baja."
          full
        >
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
            <option value="pending">Pendiente de revisión</option>
            <option value="inactive">Inactiva</option>
          </select>
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
          onClick={() => router.push("/admin/parroquias")}
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
