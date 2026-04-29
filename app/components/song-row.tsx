"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChordsIcon,
  PlayIcon,
  FilesIcon,
  HeartIcon,
  MoreIcon,
} from "./icons";
import { useFavorites } from "./favorites";

export type SongRowItem = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  author: string | null;
  hasChords: boolean;
  hasYoutube: boolean;
  hasFiles: boolean;
};

type Props = {
  index?: number; // 1-based; si está, se muestra en lugar del número de catálogo
  song: SongRowItem;
  // Si la lista es una playlist, se exponen estos extras para CU-17.2.
  playlistContext?: {
    playlistId: string;
    canManage?: boolean; // false: "Quitar de esta playlist" deshabilitado
  };
};

export function SongRow({ index, song, playlistContext }: Props) {
  const href = playlistContext
    ? `/canciones/${song.slug}?pl=${playlistContext.playlistId}`
    : `/canciones/${song.slug}`;

  const showCatNumber = index === undefined;
  const numberDisplay = showCatNumber
    ? song.number !== null
      ? String(song.number).padStart(3, "0")
      : "—"
    : `${index}.`;

  const { isFavorite, toggle: toggleFavorite, isAuthenticated } = useFavorites();
  const fav = isFavorite("song", song.id);
  const subtitle =
    song.author ??
    (song.number !== null ? `N° ${song.number}` : undefined);

  return (
    <li className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar">
      <Link
        href={href}
        title={`Ver canción ${song.title}`}
        className="flex min-w-0 flex-1 items-center gap-4"
        prefetch={false}
      >
        <span className="relative flex h-6 w-10 shrink-0 items-center justify-start text-sm normal-case text-muted-foreground">
          <span aria-hidden="true" className="sm:group-hover:invisible">
            {numberDisplay}
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-0 hidden items-center justify-start text-primary sm:group-hover:flex"
          >
            <PlayIcon />
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-lg text-primary">{song.title}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {song.author && (
              <span className="truncate text-xs normal-case">
                {song.author}
              </span>
            )}
            <span className="flex shrink-0 items-center gap-2">
              {song.hasChords && (
                <span title="Tiene acordes">
                  <ChordsIcon />
                </span>
              )}
              {song.hasYoutube && (
                <span title="Tiene video de YouTube">
                  <PlayIcon />
                </span>
              )}
              {song.hasFiles && (
                <span title="Tiene partitura o archivos">
                  <FilesIcon />
                </span>
              )}
              {fav && (
                <span title="En tus favoritos" className="text-primary">
                  <HeartIcon filled />
                </span>
              )}
            </span>
          </span>
        </span>
      </Link>

      <RowMenu
        href={href}
        title={song.title}
        favorited={fav}
        isAuthenticated={isAuthenticated}
        onToggleFavorite={() =>
          toggleFavorite("song", song.id, {
            title: song.title,
            href: `/canciones/${song.slug}`,
            subtitle,
          })
        }
        canRemoveFromPlaylist={Boolean(playlistContext)}
        canManagePlaylist={playlistContext?.canManage ?? false}
      />
    </li>
  );
}

function RowMenu({
  href,
  title,
  favorited,
  isAuthenticated,
  onToggleFavorite,
  canRemoveFromPlaylist,
  canManagePlaylist,
}: {
  href: string;
  title: string;
  favorited: boolean;
  isAuthenticated: boolean;
  onToggleFavorite: () => void;
  canRemoveFromPlaylist: boolean;
  canManagePlaylist: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  async function share() {
    close();
    const url = typeof window !== "undefined" ? window.location.origin + href : href;
    const data = { title, url };
    const navAny = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (navAny.share) {
      try {
        await navAny.share(data);
        return;
      } catch {
        // si el usuario cancela, caemos al copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado");
    } catch {
      // último recurso: prompt
      window.prompt("Copiá este enlace:", url);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={`Más opciones para ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Más opciones para ${title}`}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-primary"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-30 w-60 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <ul className="py-1 text-sm">
            {isAuthenticated ? (
              <>
                <MenuButton
                  label="Agregar a playlist"
                  disabled
                  onClick={close}
                />
                <MenuLink label="Ver canción" href={href} onClick={close} />
                <MenuButton label="Compartir" onClick={share} />
                <MenuButton
                  label={favorited ? "Quitar de Mis favoritos" : "Agregar a Mis favoritos"}
                  onClick={() => {
                    onToggleFavorite();
                    close();
                  }}
                />
                {canRemoveFromPlaylist && (
                  <MenuButton
                    label="Quitar de esta playlist"
                    disabled={!canManagePlaylist}
                    tooltip={
                      canManagePlaylist
                        ? undefined
                        : "Necesitás permisos sobre esta playlist"
                    }
                    onClick={close}
                    destructive
                  />
                )}
              </>
            ) : (
              <>
                <MenuLink label="Ver canción" href={href} onClick={close} />
                <MenuLink
                  label="Iniciá sesión para más opciones…"
                  href="/perfil"
                  onClick={close}
                />
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function menuItemClass(
  disabled?: boolean,
  destructive?: boolean
): string {
  const base =
    "flex w-full items-center px-4 py-2 text-left normal-case transition-colors";
  if (disabled) return `${base} text-muted-foreground cursor-not-allowed`;
  if (destructive)
    return `${base} text-destructive hover:bg-sidebar`;
  return `${base} text-foreground hover:bg-sidebar`;
}

function MenuButton({
  label,
  onClick,
  disabled,
  tooltip,
  destructive,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  destructive?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        title={tooltip}
        disabled={disabled}
        onClick={onClick}
        className={menuItemClass(disabled, destructive)}
      >
        {label}
      </button>
    </li>
  );
}

function MenuLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        onClick={onClick}
        className={menuItemClass()}
      >
        {label}
      </Link>
    </li>
  );
}
