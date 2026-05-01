import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/dates";
import { PlaylistRowActions } from "./playlist-row-actions";

export default async function AdminPlaylistsPage() {
  const supabase = await createClient();
  const { data: playlists } = await supabase
    .from("playlists")
    .select(
      "id, name, event_date, visibility, description, playlist_songs(count)"
    )
    .eq("is_archdiocesan", true)
    .order("event_date", { ascending: false, nullsFirst: false });

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-2xl">Playlists generales</h1>
          <p className="text-sm normal-case text-muted-foreground">
            Repertorio arquidiocesano (visible en todas las parroquias).
          </p>
        </div>
        <Link
          href="/playlists/nueva"
          className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
        >
          + Nueva playlist pública
        </Link>
      </header>

      {!playlists || playlists.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          Todavía no hay playlists arquidiocesanas.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {playlists.map((p) => {
            const songsRel = p.playlist_songs as
              | { count: number }
              | { count: number }[]
              | null;
            const songsCount = Array.isArray(songsRel)
              ? songsRel[0]?.count ?? 0
              : songsRel?.count ?? 0;
            const subtitleParts: string[] = [];
            if (p.event_date) subtitleParts.push(formatearFecha(p.event_date as string));
            if (p.visibility === "public") subtitleParts.push("Pública");
            if (p.visibility === "unlisted") subtitleParts.push("No listada");
            if (p.visibility === "private") subtitleParts.push("Privada");
            subtitleParts.push(
              songsCount === 1 ? "1 canción" : `${songsCount} canciones`
            );
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-sidebar sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base text-primary">
                    {p.name}
                  </span>
                  {subtitleParts.length > 0 && (
                    <span className="truncate text-xs normal-case text-muted-foreground">
                      {subtitleParts.join(" · ")}
                    </span>
                  )}
                </div>
                <div className="flex justify-end sm:justify-start">
                  <PlaylistRowActions
                    id={p.id as string}
                    name={p.name as string}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
