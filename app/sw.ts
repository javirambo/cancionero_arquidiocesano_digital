import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

const isSupabaseStorage = (url: URL) =>
  SUPABASE_HOST !== "" &&
  url.host === SUPABASE_HOST &&
  url.pathname.startsWith("/storage/v1/object/");

const isExcludedAttachment = (url: URL) =>
  isSupabaseStorage(url) &&
  (url.pathname.includes("/partituras/") ||
    url.pathname.includes("/audios/"));

const isImageBucket = (url: URL) =>
  isSupabaseStorage(url) && url.pathname.includes("/images/");

const isSupabaseApi = (url: URL) =>
  SUPABASE_HOST !== "" &&
  url.host === SUPABASE_HOST &&
  (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/rest/"));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Adjuntos (PDFs partituras, audios) → nunca cachear.
    {
      matcher: ({ url }) => isExcludedAttachment(url),
      handler: new NetworkOnly(),
    },

    // 2. Auth y mutaciones de Supabase → nunca cachear.
    {
      matcher: ({ url, request }) =>
        isSupabaseApi(url) && request.method !== "GET",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        SUPABASE_HOST !== "" &&
        url.host === SUPABASE_HOST &&
        url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },

    // 3. Lecturas REST de Supabase (canciones, listas, etc.) → SWR corto.
    {
      matcher: ({ url, request }) =>
        isSupabaseApi(url) && request.method === "GET",
      handler: new StaleWhileRevalidate({
        cacheName: "supabase-rest",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 600,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
          }),
        ],
      }),
    },

    // 4. Imágenes públicas del bucket images → CacheFirst.
    {
      matcher: ({ url }) => isImageBucket(url),
      handler: new CacheFirst({
        cacheName: "supabase-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
          }),
        ],
      }),
    },

    // 5. Fuentes de Google → CacheFirst largo.
    {
      matcher: ({ url }) =>
        url.host === "fonts.googleapis.com" ||
        url.host === "fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },

    // 6. Estáticos de Next con hash → CacheFirst largo.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },

    // 7. Imágenes optimizadas por Next.
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        (url.pathname.startsWith("/_next/image") ||
          request.destination === "image"),
      handler: new StaleWhileRevalidate({
        cacheName: "next-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },

    // 8. APIs internas (búsqueda, etc.) → NetworkFirst con timeout.
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        url.pathname.startsWith("/api/") &&
        request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "api-internal",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },

    // 9. Navegaciones (HTML de páginas) → NetworkFirst con fallback a cache.
    //    Esto es lo que cumple "A": cachear lo que ya visitaste.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 600,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
