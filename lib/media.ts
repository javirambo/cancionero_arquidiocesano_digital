// Links de video/audio externos de una canción (`songs.youtube_url`).
//
// Módulo puro: lo usan el servidor (para armar el embed) y el formulario de
// admin (para avisar si el link no va a reproducir), así que no puede
// depender de `next/headers` como lib/songs.ts.

export type MediaProvider = "youtube" | "spotify";

const SPOTIFY_EMBED_PREFIX = "https://open.spotify.com/embed/";

/**
 * Compara el host contra un dominio, aceptando subdominios.
 *
 * No se usa `includes()` porque aceptaría `youtube.com.sitio-falso.tld`.
 */
function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

// IDs de video y de lista de YouTube. Sirve además para descartar basura
// como `youtu.be/ID/algo`, que antes producía un embed roto.
const YT_ID_RE = /^[A-Za-z0-9_-]+$/;

// Rutas de YouTube que llevan el id en el path en vez de en `?v=`.
const YT_PATH_KINDS = ["shorts", "live", "embed", "v"];

function spotifyEmbed(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  const kinds = ["track", "episode", "album", "playlist", "show"];
  // `findIndex` y no `parts[0]` para tolerar el prefijo de idioma que mete
  // Spotify al compartir (`/intl-es/track/ID`).
  const i = parts.findIndex((p) => kinds.includes(p));
  if (i >= 0 && parts[i + 1]) {
    return `${SPOTIFY_EMBED_PREFIX}${parts[i]}/${parts[i + 1]}`;
  }
  return null;
}

function youtubeEmbed(u: URL, host: string): string | null {
  const parts = u.pathname.split("/").filter(Boolean);

  let id: string | null = null;
  if (hostIs(host, "youtu.be")) {
    id = parts[0] ?? null;
  } else {
    id = u.searchParams.get("v");
    if (!id && parts.length >= 2 && YT_PATH_KINDS.includes(parts[0])) {
      id = parts[1];
    }
  }

  const list = u.searchParams.get("list");
  const validList = list && YT_ID_RE.test(list) ? list : null;

  if (id && YT_ID_RE.test(id)) {
    return validList
      ? `https://www.youtube.com/embed/${id}?list=${validList}`
      : `https://www.youtube.com/embed/${id}`;
  }
  // Lista sin video puntual: YouTube la reproduce con el id `videoseries`.
  if (validList) {
    return `https://www.youtube.com/embed/videoseries?list=${validList}`;
  }
  return null;
}

/**
 * Convierte el link cargado en la canción a una URL embebible.
 *
 * Devuelve null si no se reconoce, y en ese caso la canción no ofrece la
 * acción de reproducir. Reconoce:
 *   - YouTube: watch?v=, youtu.be/, /shorts/, /live/, /embed/, /v/,
 *     playlist?list=, y music.youtube.com (que embebe como YouTube normal).
 *   - Spotify: track, episode, album, playlist y show.
 */
export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  if (hostIs(host, "spotify.com")) return spotifyEmbed(u);
  if (
    hostIs(host, "youtube.com") ||
    hostIs(host, "youtu.be") ||
    hostIs(host, "youtube-nocookie.com")
  ) {
    return youtubeEmbed(u, host);
  }
  return null;
}

/** Proveedor de un embed ya construido por `youtubeEmbedUrl`. */
export function embedProvider(embedUrl: string): MediaProvider {
  return embedUrl.startsWith(SPOTIFY_EMBED_PREFIX) ? "spotify" : "youtube";
}

/** Nombre del proveedor para mostrarle al usuario. */
export function embedProviderLabel(embedUrl: string): string {
  return embedProvider(embedUrl) === "spotify" ? "Spotify" : "YouTube";
}
