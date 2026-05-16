"use client";

import { useFavorites } from "@/app/components/favorites";
import { HeartIcon } from "@/app/components/icons";
import { CardWithImage } from "@/app/components/card-with-image";

export type PlaylistCardData = {
  id: string;
  name: string;
  description: string | null;
  image_path?: string | null;
  parish: { id: string; name: string; slug: string } | null;
};

type Props = {
  playlist: PlaylistCardData;
  /**
   * Texto pequeño debajo del nombre, opcional. Por ejemplo "Compartida por X"
   * o "De la Arquidiócesis".
   */
  badge?: string | null;
};

export function PlaylistCard({ playlist, badge }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite("playlist", playlist.id);

  return (
    <li className="relative">
      <CardWithImage
        imagePath={playlist.image_path ?? null}
        href={`/playlists/${playlist.id}`}
      >
        <span className="text-base text-song-title pr-10">{playlist.name}</span>
        {playlist.parish && !badge && (
          <span className="text-sm normal-case text-secondary">
            {playlist.parish.name}
          </span>
        )}
        {badge && (
          <span className="text-xs uppercase tracking-wide text-secondary">
            {badge}
          </span>
        )}
        {playlist.description && (
          <span className="text-sm normal-case text-muted-foreground">
            {playlist.description}
          </span>
        )}
      </CardWithImage>
      <button
        type="button"
        aria-label={fav ? "Quitar de Mis favoritos" : "Agregar a Mis favoritos"}
        title={fav ? "Quitar de Mis favoritos" : "Agregar a Mis favoritos"}
        onClick={(e) => {
          e.preventDefault();
          toggle("playlist", playlist.id, {
            title: playlist.name,
            href: `/playlists/${playlist.id}`,
            subtitle: playlist.parish?.name,
          });
        }}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border ${
          fav ? "text-song-title" : "text-muted-foreground hover:text-song-title"
        }`}
      >
        <HeartIcon filled={fav} />
      </button>
    </li>
  );
}
