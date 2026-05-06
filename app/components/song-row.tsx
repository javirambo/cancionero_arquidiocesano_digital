"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  ChordsIcon,
  PlayIcon,
  FilesIcon,
  HeartIcon,
  MoreIcon,
  ChevronRightIcon,
  PlaylistIcon,
  ShareIcon,
  MinusIcon,
  DownloadIcon,
} from "./icons";
import { useFavorites } from "./favorites";
import { AddToPlaylistMenu } from "./add-to-playlist-menu";
import { DownloadFilesPanel } from "./download-files-menu";

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
  const numberValue = showCatNumber ? song.number : index;
  const titleLine =
    numberValue !== null && numberValue !== undefined
      ? `${numberValue} · ${song.title}`
      : song.title;

  const { isFavorite, toggle: toggleFavorite, isAuthenticated } = useFavorites();
  const fav = isFavorite("song", song.id);
  const subtitle =
    song.author ??
    (song.number !== null ? `N° ${song.number}` : undefined);

  return (
    <li className="group flex items-center gap-3 py-3 pl-3 pr-5 transition-colors hover:bg-sidebar">
      <Link
        href={href}
        title={`Ver canción ${song.title}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
        prefetch={false}
      >
        <span className="truncate text-lg text-primary">{titleLine}</span>
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
      </Link>

      <RowMenu
        songId={song.id}
        slug={song.slug}
        hasChords={song.hasChords}
        href={href}
        title={song.title}
        favorited={fav}
        isAuthenticated={isAuthenticated}
        hasFiles={song.hasFiles}
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
  songId,
  slug,
  hasChords,
  href,
  title,
  favorited,
  isAuthenticated,
  hasFiles,
  onToggleFavorite,
  canRemoveFromPlaylist,
  canManagePlaylist,
}: {
  songId: string;
  slug: string;
  hasChords: boolean;
  href: string;
  title: string;
  favorited: boolean;
  isAuthenticated: boolean;
  hasFiles: boolean;
  onToggleFavorite: () => void;
  canRemoveFromPlaylist: boolean;
  canManagePlaylist: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "addToPlaylist" | "download">("main");
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

  const close = () => {
    setOpen(false);
    setView("main");
  };

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
          className="absolute right-0 top-10 z-30 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          {view === "addToPlaylist" ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="text-xs uppercase tracking-[0.15em] text-secondary hover:underline"
                >
                  ← Volver
                </button>
                <span className="text-xs uppercase tracking-[0.15em] text-secondary">
                  Agregar a playlist
                </span>
              </div>
              <AddToPlaylistMenu
                songId={songId}
                songTitle={title}
                onClose={close}
              />
            </div>
          ) : view === "download" ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="text-xs uppercase tracking-[0.15em] text-secondary hover:underline"
                >
                  ← Volver
                </button>
                <span className="text-xs uppercase tracking-[0.15em] text-secondary">
                  Descargar archivos
                </span>
              </div>
              <DownloadFilesPanel
                songId={songId}
                songTitle={title}
                print={{
                  slug,
                  canPrintWithChords: hasChords && isAuthenticated,
                }}
                onAfter={close}
              />
            </div>
          ) : (
            <ul className="py-1 text-sm">
              {isAuthenticated ? (
                <MenuButton
                  icon={<PlaylistIcon />}
                  label="Agregar a playlist"
                  hasSubmenu
                  onClick={() => setView("addToPlaylist")}
                />
              ) : (
                <MenuLink
                  icon={<PlaylistIcon />}
                  label="Iniciá sesión para usar playlists"
                  href="/perfil"
                  onClick={close}
                />
              )}
              <MenuLink
                icon={<ChordsIcon />}
                label="Ver canción"
                href={href}
                onClick={close}
              />
              <MenuButton
                icon={<ShareIcon />}
                label="Compartir"
                onClick={share}
              />
              <MenuButton
                icon={<HeartIcon filled={favorited} />}
                label={favorited ? "Quitar de Mis favoritos" : "Agregar a Mis favoritos"}
                onClick={() => {
                  onToggleFavorite();
                  close();
                }}
              />
              {hasFiles && (
                <MenuButton
                  icon={<DownloadIcon />}
                  label="Descargar archivos"
                  hasSubmenu
                  onClick={() => setView("download")}
                />
              )}
              {canRemoveFromPlaylist && canManagePlaylist && (
                <MenuButton
                  icon={<MinusIcon />}
                  label="Quitar de esta playlist"
                  onClick={close}
                  destructive
                />
              )}
            </ul>
          )}
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
    "flex w-full items-center gap-3 px-4 py-2 text-left normal-case transition-colors";
  if (disabled) return `${base} text-muted-foreground cursor-not-allowed`;
  if (destructive)
    return `${base} text-destructive hover:bg-sidebar`;
  return `${base} text-foreground hover:bg-sidebar`;
}

function MenuButton({
  icon,
  label,
  onClick,
  disabled,
  tooltip,
  destructive,
  hasSubmenu,
}: {
  icon?: ReactElement;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  destructive?: boolean;
  hasSubmenu?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        title={tooltip}
        disabled={disabled}
        onClick={onClick}
        aria-haspopup={hasSubmenu ? "menu" : undefined}
        className={menuItemClass(disabled, destructive)}
      >
        {icon && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="flex-1">{label}</span>
        {hasSubmenu && (
          <span className="ml-2 text-muted-foreground">
            <ChevronRightIcon />
          </span>
        )}
      </button>
    </li>
  );
}

function MenuLink({
  icon,
  label,
  href,
  onClick,
}: {
  icon?: ReactElement;
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
        {icon && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
}
