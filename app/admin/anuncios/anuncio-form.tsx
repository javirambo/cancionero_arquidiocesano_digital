"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export type AnnouncementFormData = {
  id?: string;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string;
  priority: number;
  target_kind: "none" | "song" | "playlist" | "parish" | "external";
  target_id: string | null;
  target_url: string;
  target_label: string;
  scope: "all" | "selected";
  parish_ids: string[];
};

export type ParishOption = { id: string; slug: string; name: string };

const empty: AnnouncementFormData = {
  title: "",
  body: "",
  starts_at: "",
  ends_at: "",
  priority: 0,
  target_kind: "none",
  target_id: null,
  target_url: "",
  target_label: "",
  scope: "all",
  parish_ids: [],
};

type SearchHit = {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
};

type SearchResponse = {
  songs?: SearchHit[];
  playlists?: SearchHit[];
  parishes?: SearchHit[];
};

export function AnuncioForm({
  initial,
  parishes,
  mode,
}: {
  initial?: AnnouncementFormData;
  parishes: ParishOption[];
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<AnnouncementFormData>(initial ?? empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parishFilter, setParishFilter] = useState("");
  const filteredParishes = parishes.filter((p) => {
    const q = parishFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  });

  // Buscador del recurso destino (target).
  const [targetQuery, setTargetQuery] = useState("");
  const [targetSearching, setTargetSearching] = useState(false);
  const [targetResults, setTargetResults] = useState<SearchHit[] | null>(null);

  function update<K extends keyof AnnouncementFormData>(
    key: K,
    value: AnnouncementFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleParish(id: string) {
    setForm((prev) => {
      const has = prev.parish_ids.includes(id);
      return {
        ...prev,
        parish_ids: has
          ? prev.parish_ids.filter((x) => x !== id)
          : [...prev.parish_ids, id],
      };
    });
  }

  // Buscar recursos cuando cambia targetQuery (con debounce simple).
  useEffect(() => {
    if (
      form.target_kind === "none" ||
      form.target_kind === "external" ||
      targetQuery.trim().length < 2
    ) {
      setTargetResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      setTargetSearching(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc("search_global", {
          q: targetQuery.trim(),
        });
        const res = (data ?? {}) as SearchResponse;
        if (form.target_kind === "song") setTargetResults(res.songs ?? []);
        else if (form.target_kind === "playlist") setTargetResults(res.playlists ?? []);
        else if (form.target_kind === "parish") setTargetResults(res.parishes ?? []);
      } finally {
        setTargetSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [targetQuery, form.target_kind]);

  function pickTarget(hit: SearchHit) {
    const label = hit.title ?? hit.name ?? hit.slug ?? hit.id;
    update("target_id", hit.id);
    update("target_label", label);
    setTargetResults(null);
    setTargetQuery("");
  }

  function clearTarget() {
    update("target_id", null);
    update("target_label", "");
    update("target_url", "");
  }

  function validate(): string | null {
    if (!form.title.trim()) return "El título es obligatorio.";
    if (!form.starts_at || !form.ends_at) return "Las fechas son obligatorias.";
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      return "La fecha de fin debe ser posterior a la de inicio.";
    }
    if (form.scope === "selected" && form.parish_ids.length === 0) {
      return "Elegí al menos una parroquia destinataria.";
    }
    if (
      (form.target_kind === "song" ||
        form.target_kind === "playlist" ||
        form.target_kind === "parish") &&
      !form.target_id
    ) {
      return "Seleccioná el recurso destino o cambiá el atajo a 'Ninguno'.";
    }
    if (form.target_kind === "external") {
      try {
        new URL(form.target_url);
      } catch {
        return "La URL del atajo no es válida.";
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      priority: form.priority,
      target_kind: form.target_kind,
      target_id:
        form.target_kind === "song" ||
        form.target_kind === "playlist" ||
        form.target_kind === "parish"
          ? form.target_id
          : null,
      target_url:
        form.target_kind === "external" ? form.target_url.trim() : null,
    };

    let announcementId = form.id;
    if (mode === "create") {
      const { data, error: insErr } = await supabase
        .from("announcements")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      announcementId = data.id;
    } else {
      const { error: updErr } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", form.id!);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      // Limpio destinatarios anteriores para reinsertar.
      const { error: delErr } = await supabase
        .from("announcement_parishes")
        .delete()
        .eq("announcement_id", form.id!);
      if (delErr) {
        setError(delErr.message);
        setSaving(false);
        return;
      }
    }

    if (form.scope === "selected" && announcementId) {
      const rows = form.parish_ids.map((parish_id) => ({
        announcement_id: announcementId!,
        parish_id,
      }));
      const { error: linkErr } = await supabase
        .from("announcement_parishes")
        .insert(rows);
      if (linkErr) {
        setError(linkErr.message);
        setSaving(false);
        return;
      }
    }

    router.push("/admin/anuncios");
    router.refresh();
  }

  async function handleDelete() {
    if (!form.id) return;
    const ok = window.confirm(
      `¿Eliminar el anuncio "${form.title}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase
      .from("announcements")
      .delete()
      .eq("id", form.id);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
      return;
    }
    router.push("/admin/anuncios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título *" full>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Cuerpo" hint="Texto opcional que aparece debajo del título" full>
          <textarea
            rows={3}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Inicio *">
          <input
            type="datetime-local"
            required
            value={form.starts_at}
            onChange={(e) => update("starts_at", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Fin *">
          <input
            type="datetime-local"
            required
            value={form.ends_at}
            onChange={(e) => update("ends_at", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Prioridad" hint="Mayor número aparece primero">
          <input
            type="number"
            value={form.priority}
            onChange={(e) => update("priority", Number(e.target.value) || 0)}
            className={inputClass}
          />
        </Field>
      </div>

      <section className="rounded-2xl border border-border bg-sidebar p-5">
        <h2 className="text-sm uppercase tracking-[0.2em] text-secondary">
          Destinatarios
        </h2>
        <div className="mt-3 flex flex-col gap-2 normal-case">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scope"
              checked={form.scope === "all"}
              onChange={() => update("scope", "all")}
            />
            Todas las parroquias
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scope"
              checked={form.scope === "selected"}
              onChange={() => update("scope", "selected")}
            />
            Parroquias específicas
          </label>
        </div>

        {form.scope === "selected" && (
          <div className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Filtrar parroquias…"
              value={parishFilter}
              onChange={(e) => setParishFilter(e.target.value)}
              className={inputClass}
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredParishes.length === 0 ? (
                <p className="px-3 py-2 text-xs normal-case text-muted-foreground">
                  Sin coincidencias.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredParishes.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm normal-case hover:bg-sidebar">
                        <input
                          type="checkbox"
                          checked={form.parish_ids.includes(p.id)}
                          onChange={() => toggleParish(p.id)}
                        />
                        <span className="flex-1">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.slug}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs normal-case text-muted-foreground">
              Seleccionadas: {form.parish_ids.length}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-sidebar p-5">
        <h2 className="text-sm uppercase tracking-[0.2em] text-secondary">
          Atajo (opcional)
        </h2>
        <p className="mt-1 text-xs normal-case text-muted-foreground">
          Si elegís un destino, el banner del anuncio será clickeable y llevará a ese recurso.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Tipo">
            <select
              value={form.target_kind}
              onChange={(e) => {
                const next = e.target.value as AnnouncementFormData["target_kind"];
                clearTarget();
                update("target_kind", next);
              }}
              className={inputClass}
            >
              <option value="none">Ninguno</option>
              <option value="song">Canción</option>
              <option value="playlist">Playlist</option>
              <option value="parish">Parroquia</option>
              <option value="external">Link externo</option>
            </select>
          </Field>

          {(form.target_kind === "song" ||
            form.target_kind === "playlist" ||
            form.target_kind === "parish") && (
            <div className="flex flex-col gap-2">
              {form.target_id ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case">
                  <span>
                    Seleccionado: <strong>{form.target_label}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={clearTarget}
                    className="text-xs uppercase tracking-wide text-muted-foreground hover:text-primary"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={targetQuery}
                    onChange={(e) => setTargetQuery(e.target.value)}
                    placeholder={`Buscar ${form.target_kind === "song" ? "canción" : form.target_kind === "playlist" ? "playlist" : "parroquia"}…`}
                    className={inputClass}
                  />
                  {targetSearching && (
                    <p className="text-xs normal-case text-muted-foreground">
                      Buscando…
                    </p>
                  )}
                  {targetResults && targetResults.length > 0 && (
                    <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                      {targetResults.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            onClick={() => pickTarget(hit)}
                            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left normal-case hover:bg-sidebar"
                          >
                            <span className="text-sm text-primary">
                              {hit.title ?? hit.name ?? hit.slug ?? hit.id}
                            </span>
                            {hit.slug && (
                              <span className="text-xs text-muted-foreground">
                                {hit.slug}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {targetResults && targetResults.length === 0 && targetQuery.trim().length >= 2 && !targetSearching && (
                    <p className="text-xs normal-case text-muted-foreground">
                      Sin resultados.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {form.target_kind === "external" && (
            <Field label="URL">
              <input
                type="url"
                value={form.target_url}
                onChange={(e) => update("target_url", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </section>

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/anuncios")}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="ml-auto rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        )}
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
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
