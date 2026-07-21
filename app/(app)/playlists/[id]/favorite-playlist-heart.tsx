"use client";

import { useFavorites } from "@/app/components/favorites";
import { HeartIcon } from "@/app/components/icons";

type Props = {
  playlistId: string;
  playlistName: string;
  subtitle?: string;
};

export function FavoritePlaylistHeart({
  playlistId,
  playlistName,
  subtitle,
}: Props) {
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite("playlist", playlistId);
  return (
    <button
      type="button"
      onClick={() =>
        void toggle("playlist", playlistId, {
          title: playlistName,
          href: `/playlists/${playlistId}`,
          subtitle,
        })
      }
      aria-pressed={favorited}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border [&>svg]:h-6 [&>svg]:w-6 ${
        favorited ? "text-song-title" : "text-muted-foreground hover:text-primary"
      }`}
    >
      <HeartIcon filled={favorited} />
    </button>
  );
}
