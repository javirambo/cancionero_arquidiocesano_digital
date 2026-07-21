"use client";

import Link from "next/link";
import { useFavorites } from "@/app/components/favorites";
import { HeartIcon, EditIcon, ChevronRightIcon } from "@/app/components/icons";
import { getPublicImageUrl } from "@/lib/supabase/storage";

export type PlaylistListCardData = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  parish: { id: string; name: string; slug: string } | null;
};

// Tarjeta de lista para /playlists: foto a la izquierda, contenido en el medio
// (título + descripción + chip "No activa hoy") y una columna vertical de
// acciones a la derecha: lápiz de editar (solo si corresponde), corazón rojo
// (solo si ya es favorita, para quitarla) y el chevron que indica que la
// tarjeta es clickeable. Toda la tarjeta linkea a la lista.
export function PlaylistListCard({
  playlist,
  inactive = false,
  editable = false,
}: {
  playlist: PlaylistListCardData;
  inactive?: boolean;
  editable?: boolean;
}) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite("playlist", playlist.id);
  const imageUrl = getPublicImageUrl(playlist.image_path);

  return (
    <li className="h-full">
      <div className="relative flex h-[90px] overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary">
        {imageUrl && (
          <div className="h-full w-[65px] shrink-0 bg-sidebar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
          <Link
            href={`/playlists/${playlist.id}`}
            className="text-base text-page-title after:absolute after:inset-0 after:content-['']"
          >
            {playlist.name}
          </Link>
          {playlist.description && (
            <p className="line-clamp-2 text-sm normal-case text-muted-foreground">
              {playlist.description}
            </p>
          )}
          {inactive && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              No activa hoy
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 py-3 pr-2">
          {editable && (
            <Link
              href={`/playlists/${playlist.id}/editar`}
              aria-label={`Editar ${playlist.name}`}
              title="Editar lista"
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
            >
              <EditIcon />
            </Link>
          )}
          {fav && (
            <button
              type="button"
              aria-label="Quitar de Mis favoritos"
              title="Quitar de Mis favoritos"
              onClick={(e) => {
                e.preventDefault();
                toggle("playlist", playlist.id, {
                  title: playlist.name,
                  href: `/playlists/${playlist.id}`,
                  subtitle: playlist.parish?.name,
                });
              }}
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-song-title transition-colors"
            >
              <HeartIcon filled />
            </button>
          )}
          <span aria-hidden="true" className="text-muted-foreground">
            <ChevronRightIcon />
          </span>
        </div>
      </div>
    </li>
  );
}
