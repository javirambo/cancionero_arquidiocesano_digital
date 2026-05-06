"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrashIcon } from "@/app/components/icons";
import { ScheduleEditor } from "@/app/components/schedule-editor";
import { replaceSchedulesWith, type ScheduleInput } from "@/lib/schedule";

export type PlaylistFormData = {
  id?: string;
  parish_id: string | null;
  name: string;
  description: string;
  visibility: "public" | "unlisted" | "private";
  is_archdiocesan: boolean;
  schedules: ScheduleInput[];
};

export type ParishOption = { id: string; name: string };
export type AdminParishOption = { id: string; slug: string; name: string };

export function PlaylistForm({
  initial,
  mode,
  parishSlug,
  showArchdiocesan,
  parishOptions,
  personalAllowed,
  adminParishOptions,
}: {
  initial?: PlaylistFormData;
  mode: "create" | "edit";
  // Slug usado para el botón Cancelar y para el redirect tras eliminar.
  // Cuando la creación no parte de una parroquia, pasar null.
  parishSlug: string | null;
  showArchdiocesan: boolean;
  // Si está presente y tiene >1 entrada, se muestra un selector inline.
  // Si tiene exactamente 1, se preasigna y no se muestra.
  parishOptions?: ParishOption[];
  // Si true, permite crear con parish_id = null (playlist personal).
  // Aplica solo si parishOptions está vacío o ausente.
  personalAllowed?: boolean;
  // Sólo poblada cuando el editor es admin. Habilita reasignar el dueño
  // de la playlist (CU-17). Aplica únicamente en mode="edit".
  adminParishOptions?: AdminParishOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlaylistFormData>(
    initial ?? {
      parish_id: null,
      name: "",
      description: "",
      visibility: "public",
      is_archdiocesan: false,
      schedules: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PlaylistFormData>(key: K, value: PlaylistFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const needsParishSelector = (parishOptions?.length ?? 0) > 1;
  const canReassignOwner =
    mode === "edit" && (adminParishOptions?.length ?? 0) > 0;
  const selectedParishSlug = canReassignOwner
    ? adminParishOptions!.find((p) => p.id === form.parish_id)?.slug ?? null
    : parishSlug;
  const selectedIsArchdiocesis = selectedParishSlug === "arquidiocesis";
  // Para admin, el toggle archdiocesan se muestra cuando la parroquia
  // seleccionada es la virtual; para el resto sigue la prop original.
  const archdiocesanVisible = canReassignOwner
    ? selectedIsArchdiocesis
    : showArchdiocesan;
  const wasArchdiocesanInitial = initial?.is_archdiocesan === true;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (needsParishSelector && !form.parish_id) {
      setError("Elegí la parroquia.");
      return;
    }
    // Si admin reasigna el dueño y la playlist era arquidiocesana, pero la
    // nueva parroquia no es la virtual, pedimos confirmación porque dejará
    // de ser arquidiocesana.
    const wasArchdiocesan = initial?.is_archdiocesan === true;
    const movingOutOfArchdiocesis =
      canReassignOwner && wasArchdiocesan && !selectedIsArchdiocesis;
    if (movingOutOfArchdiocesis) {
      const ok = window.confirm(
        "Esta playlist es arquidiocesana. Al moverla a otra parroquia (o a personal) dejará de ser arquidiocesana. ¿Confirmás?"
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      parish_id: form.parish_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      visibility: form.visibility,
      is_archdiocesan: archdiocesanVisible ? form.is_archdiocesan : false,
    };

    if (mode === "create") {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      const { data, error } = await supabase
        .from("playlists")
        .insert({ ...payload, created_by: userId ?? null })
        .select("id")
        .single();
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      try {
        await replaceSchedulesWith(supabase, "playlist", data.id, form.schedules);
      } catch (err) {
        setError((err as Error).message);
        setSaving(false);
        return;
      }
      router.push(`/playlists/${data.id}/editar`);
      router.refresh();
    } else {
      const { error } = await supabase
        .from("playlists")
        .update(payload)
        .eq("id", form.id!);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      try {
        await replaceSchedulesWith(supabase, "playlist", form.id!, form.schedules);
      } catch (err) {
        setError((err as Error).message);
        setSaving(false);
        return;
      }
      router.push(`/playlists/${form.id}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    const ok = window.confirm(
      `¿Eliminar la playlist "${form.name}"? Se borrarán todas sus canciones asociadas. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("playlists").delete().eq("id", form.id);
    if (error) {
      setError(`No se pudo eliminar: ${error.message}`);
      setSaving(false);
      return;
    }
    router.push(parishSlug ? `/parroquias/${parishSlug}/playlists` : `/playlists`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {canReassignOwner && (
          <Field
            label="Dueño / Parroquia"
            full
          >
            <select
              value={form.parish_id ?? ""}
              onChange={(e) => update("parish_id", e.target.value || null)}
              className={inputClass}
            >
              <option value="">Personal (sin parroquia)</option>
              {adminParishOptions!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.slug === "arquidiocesis" ? `${p.name} (arquidiócesis)` : p.name}
                </option>
              ))}
            </select>
            {wasArchdiocesanInitial && !selectedIsArchdiocesis && (
              <span className="text-xs normal-case text-muted-foreground">
                Esta playlist es arquidiocesana. Al guardar con otra
                parroquia (o personal), pediremos confirmación y dejará de
                serlo.
              </span>
            )}
          </Field>
        )}
        {needsParishSelector && (
          <Field label="Parroquia *" full>
            <select
              required
              value={form.parish_id ?? ""}
              onChange={(e) => update("parish_id", e.target.value || null)}
              className={inputClass}
            >
              <option value="">Elegí una parroquia…</option>
              {parishOptions!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {personalAllowed && !needsParishSelector && (
          <Field label="Alcance" full>
            <p className="text-sm normal-case text-muted-foreground">
              Se creará como playlist personal.
            </p>
          </Field>
        )}
        <Field label="Nombre *" full>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
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
        <Field label="Visibilidad">
          <select
            value={form.visibility}
            onChange={(e) =>
              update("visibility", e.target.value as PlaylistFormData["visibility"])
            }
            className={inputClass}
          >
            <option value="public">Pública</option>
            <option value="unlisted">No listada (solo con link)</option>
            <option value="private">Privada</option>
          </select>
        </Field>
        {archdiocesanVisible && (
          <Field label="Alcance" full>
            <label className="flex items-center gap-2 text-sm normal-case">
              <input
                type="checkbox"
                checked={form.is_archdiocesan}
                onChange={(e) => update("is_archdiocesan", e.target.checked)}
              />
              Visible por defecto en todas las parroquias (arquidiocesana)
            </label>
          </Field>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
          Vigencia
        </h2>
        <p className="text-sm normal-case text-muted-foreground">
          Si no agregás reglas, la playlist se muestra siempre. Las reglas se evalúan en hora de Argentina; si hay varias, basta con que una se cumpla.
        </p>
        <ScheduleEditor
          value={form.schedules}
          onChange={(schedules) => update("schedules", schedules)}
        />
      </section>

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:px-5 sm:py-2 sm:text-sm"
        >
          {saving ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(
              mode === "edit" && form.id
                ? `/playlists/${form.id}`
                : parishSlug
                ? `/parroquias/${parishSlug}/playlists`
                : `/playlists`
            )
          }
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary sm:px-5 sm:py-2 sm:text-sm"
        >
          Cancelar
        </button>
        {mode === "edit" && (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              aria-label="Eliminar playlist"
              title="Eliminar playlist"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-destructive text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60 sm:hidden"
            >
              <TrashIcon />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="ml-auto hidden rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60 sm:inline-block"
            >
              Eliminar playlist
            </button>
          </>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

function Field({
  label,
  full,
  children,
}: {
  label: string;
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
    </label>
  );
}
