"use client";

import { useFavorites } from "@/app/components/favorites";
import { HeartIcon } from "@/app/components/icons";

export function FavoriteHeartInline({ songId }: { songId: string }) {
  const { isFavorite } = useFavorites();
  if (!isFavorite("song", songId)) return null;
  return (
    <span
      title="En tus favoritos"
      className="absolute -top-1 left-full ml-1 text-song-title [&_svg]:h-3 [&_svg]:w-3"
    >
      <HeartIcon filled />
    </span>
  );
}
