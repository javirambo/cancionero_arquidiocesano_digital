"use client";

import { useFavorites } from "@/app/components/favorites";
import { HeartIcon } from "@/app/components/icons";

type Props = {
  songId: string;
  songTitle: string;
  songSlug: string;
  subtitle?: string;
};

export function FavoriteHeartInline({
  songId,
  songTitle,
  songSlug,
  subtitle,
}: Props) {
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite("song", songId);
  return (
    <button
      type="button"
      onClick={() =>
        void toggle("song", songId, {
          title: songTitle,
          href: `/canciones/${songSlug}`,
          subtitle,
        })
      }
      aria-pressed={favorited}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-sidebar ${
        favorited ? "text-song-title" : "text-muted-foreground"
      }`}
    >
      <HeartIcon filled={favorited} />
    </button>
  );
}
