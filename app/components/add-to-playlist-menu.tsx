"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./toast";
import type {
  AddablePlaylist,
  AddablePlaylistGroup,
} from "@/app/api/playlists/mias/route";

type Props = {
  songId: string;
  songTitle: string;
  onClose: () => void;
};

type Mode = "list" | "create";

export function AddToPlaylistMenu({ songId, songTitle, onClose }: Props) {
  const { show: showToast } = useToast();
  const [groups, setGroups] = useState<AddablePlaylistGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<Mode>("list");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/playlists/mias");
        if (!res.ok) {
          if (!cancelled) setError("No se pudieron cargar tus playlists.");
          return;
        }
        const data = (await res.json()) as { groups: AddablePlaylistGroup[] };
        if (!cancelled) setGroups(data.groups ?? []);
      } catch {
        if (!cancelled) setError("No se pudieron cargar tus playlists.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === "create") newNameRef.current?.focus();
  }, [mode]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const term = filter.trim().toLowerCase();
    if (term.length === 0) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((p) => p.name.toLowerCase().includes(term)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, filter]);

  async function addToExisting(playlist: AddablePlaylist) {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    try {
      const { data: existing, error: existsErr } = await supabase
        .from("playlist_songs")
        .select("song_id")
        .eq("playlist_id", playlist.id)
        .eq("song_id", songId)
        .maybeSingle();
      if (existsErr) throw existsErr;
      if (existing) {
        showToast(
          `"${songTitle}" ya está en "${playlist.name}".`,
          "error"
        );
        onClose();
        return;
      }

      const { data: maxRow, error: maxErr } = await supabase
        .from("playlist_songs")
        .select("position")
        .eq("playlist_id", playlist.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextPosition = (maxRow?.position ?? 0) + 1;

      const { error: insertErr } = await supabase
        .from("playlist_songs")
        .insert({
          playlist_id: playlist.id,
          song_id: songId,
          position: nextPosition,
        });
      if (insertErr) throw insertErr;

      showToast(`Canto agregado a "${playlist.name}".`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      showToast(`No se pudo agregar: ${msg}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (name.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/playlists/nueva-rapida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "No se pudo crear la playlist");
      }
      const created = (await res.json()) as { id: string; name: string };

      const supabase = createClient();
      const { error: insertErr } = await supabase
        .from("playlist_songs")
        .insert({
          playlist_id: created.id,
          song_id: songId,
          position: 1,
        });
      if (insertErr) throw insertErr;

      showToast(`Canto agregado a "${created.name}".`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      showToast(`No se pudo crear: ${msg}`, "error");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "create") {
    return (
      <div className="flex flex-col gap-2 p-3">
        <button
          type="button"
          onClick={() => setMode("list")}
          className="self-start text-xs uppercase tracking-[0.15em] text-secondary hover:underline"
        >
          ← Volver
        </button>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.15em] text-secondary normal-case">
            Nombre de la playlist
          </span>
          <input
            ref={newNameRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createAndAdd();
              }
            }}
            disabled={busy}
            maxLength={120}
            placeholder="Mi nueva playlist"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode("list")}
            disabled={busy}
            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground hover:border-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={createAndAdd}
            disabled={busy || newName.trim().length === 0}
            className="rounded-full border border-primary bg-primary px-3 py-1 text-xs uppercase tracking-wide text-primary-foreground disabled:opacity-50"
          >
            Crear y agregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar lista…"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm normal-case"
        />
      </div>

      <div className="max-h-64 overflow-y-auto">
        {error && (
          <p className="px-4 py-3 text-sm normal-case text-destructive">
            {error}
          </p>
        )}
        {!error && filteredGroups === null && (
          <p className="px-4 py-3 text-sm normal-case text-muted-foreground">
            Cargando…
          </p>
        )}
        {!error && filteredGroups && filteredGroups.length === 0 && (
          <p className="px-4 py-3 text-sm normal-case text-muted-foreground">
            {filter.trim().length > 0
              ? "Sin resultados."
              : "Todavía no tenés playlists."}
          </p>
        )}
        {!error &&
          filteredGroups &&
          filteredGroups.map((g) => (
            <div key={g.label} className="py-1">
              <p className="px-4 pt-2 pb-1 text-xs uppercase tracking-[0.15em] text-secondary">
                {g.label}
              </p>
              <ul>
                {g.items.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addToExisting(p)}
                      disabled={busy}
                      className="flex w-full items-center px-4 py-2 text-left text-sm normal-case text-foreground hover:bg-sidebar disabled:opacity-50"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => {
            setNewName("");
            setMode("create");
          }}
          className="flex w-full items-center px-4 py-2 text-left text-sm normal-case text-primary hover:bg-sidebar"
        >
          + Nueva lista
        </button>
      </div>
    </div>
  );
}
