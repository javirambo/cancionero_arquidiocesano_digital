"use client";

import Link from "next/link";
import { useFavorites } from "@/app/components/favorites";
import { HeartIcon } from "@/app/components/icons";

export type PlaylistCardData = {
  id: string;
  name: string;
  description: string | null;
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
      <Link
        href={`/playlists/${playlist.id}`}
        className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-4 pr-12 transition-colors hover:border-primary"
      >
        <span className="text-base text-primary">{playlist.name}</span>
        {playlist.parish && (
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
      </Link>
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
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border ${
          fav ? "text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        <HeartIcon filled={fav} />
      </button>
    </li>
  );
}
