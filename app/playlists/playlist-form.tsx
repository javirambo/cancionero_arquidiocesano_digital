"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export type PlaylistFormData = {
  id?: string;
  parish_id: string;
  name: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  visibility: "public" | "unlisted" | "private";
  is_archdiocesan: boolean;
};

export function PlaylistForm({
  initial,
  mode,
  parishSlug,
  showArchdiocesan,
}: {
  initial?: PlaylistFormData;
  mode: "create" | "edit";
  parishSlug: string;
  showArchdiocesan: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlaylistFormData>(
    initial ?? {
      parish_id: "",
      name: "",
      description: "",
      event_date: "",
      visibility: "public",
      is_archdiocesan: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PlaylistFormData>(key: K, value: PlaylistFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      parish_id: form.parish_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date || null,
      visibility: form.visibility,
      is_archdiocesan: showArchdiocesan ? form.is_archdiocesan : false,
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
    router.push(`/parroquias/${parishSlug}/playlists`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Fecha del evento">
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
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
        {showArchdiocesan && (
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

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

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
          onClick={() =>
            router.push(
              mode === "edit" && form.id
                ? `/playlists/${form.id}`
                : `/parroquias/${parishSlug}/playlists`
            )
          }
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="ml-auto rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-primary-foreground disabled:opacity-60"
          >
            Eliminar playlist
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
