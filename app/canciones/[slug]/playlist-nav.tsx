"use client";

import Link from "next/link";
import { useLetterScale } from "@/app/components/letter-scale";

type Props = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  plQuery: string;
};

export function PlaylistNav({ prev, next, plQuery }: Props) {
  const { scale } = useLetterScale();
  const fontSize = `${scale}rem`;

  return (
    <nav
      aria-label="Navegación dentro de la playlist"
      className="mt-4 flex items-stretch justify-between gap-3 border-t border-border pt-4"
    >
      {prev ? (
        <Link
          href={`/canciones/${prev.slug}${plQuery}`}
          className="flex flex-1 flex-col rounded-xl border border-border bg-background px-4 py-3 normal-case transition-colors hover:border-primary"
        >
          <span
            className="uppercase tracking-wide text-muted-foreground"
            style={{ fontSize: `calc(${fontSize} * 0.75)` }}
          >
            ← Anterior
          </span>
          <span className="text-primary" style={{ fontSize }}>
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/canciones/${next.slug}${plQuery}`}
          className="flex flex-1 flex-col items-end rounded-xl border border-border bg-background px-4 py-3 normal-case transition-colors hover:border-primary"
        >
          <span
            className="uppercase tracking-wide text-muted-foreground"
            style={{ fontSize: `calc(${fontSize} * 0.75)` }}
          >
            Siguiente →
          </span>
          <span className="text-primary" style={{ fontSize }}>
            {next.title}
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
