# PWA / Funcionamiento offline

El cancionero es una **Progressive Web App** instalable en celular y desktop, con soporte offline para canciones ya visitadas o pre-descargadas explícitamente.

## Stack

- `@serwist/next` (v9) + `serwist` — generación del service worker.
- Bundler: **webpack** (Serwist no soporta Turbopack todavía). Por eso `npm run dev` y `npm run build` usan el flag `--webpack`.
- Service worker desactivado en `NODE_ENV === "development"`.

## Archivos clave

- `next.config.ts` — wrap con `withSerwistInit`.
- `app/sw.ts` — entry del service worker. Define todas las estrategias de cache.
- `tsconfig.serwist.json` — tsconfig específico para el SW (lib `webworker`).
- `app/manifest.ts` — manifest PWA (`name`, `icons`, `theme_color`, etc.).
- `app/apple-icon.tsx` — ícono para iOS (180×180).
- `app/icon-192/route.tsx`, `app/icon-512/route.tsx`, `app/icon-maskable/route.tsx` — íconos PWA dinámicos generados con `ImageResponse`.
- `app/components/sw-register.tsx` — registra el SW en el cliente. Montado en `app/layout.tsx`.
- `app/components/install-pwa-prompt.tsx` — botón "Instalar ahora" mínimo, solo aparece si el browser ofrece prompt nativo. Usado en `/install`.
- `app/components/install-pwa-button.tsx` — variante con card y texto, queda como componente reusable (no montado actualmente).
- `app/components/offline-indicator.tsx` — badge fijo cuando no hay red.
- `app/components/precache-button.tsx` — botón reusable "Descargar para offline" (usado en `/playlists/[id]` y `/install`).
- `app/(app)/install/page.tsx` — página `/install` con instrucciones por plataforma (iPhone/Android/Desktop).
- `app/api/playlists/[id]/song-slugs/route.ts` — endpoint GET liviano que devuelve `{ songs: [{ id, slug }] }` de una playlist. Usado por el botón "Descargar favoritos" para resolver las canciones de las playlists favoriteadas.

## Estrategias de cache (definidas en `app/sw.ts`)

| Tipo de request | Estrategia | TTL |
|---|---|---|
| Adjuntos: bucket `partituras` y `audios` de Supabase Storage | **NetworkOnly** (excluidos) | — |
| Auth de Supabase y mutaciones (POST/PATCH/DELETE) | NetworkOnly | — |
| Lecturas REST de Supabase (`/rest/v1/...` GET) | StaleWhileRevalidate | 7 días |
| Bucket `images` de Supabase Storage | CacheFirst | 30 días |
| Google Fonts | CacheFirst | 365 días |
| `/_next/static/*` (JS, CSS con hash) | CacheFirst | 365 días |
| `/_next/image` y otras imágenes locales | StaleWhileRevalidate | 30 días |
| `/api/*` GET internas | NetworkFirst (timeout 5s) | 7 días |
| Navegaciones HTML (páginas) | NetworkFirst (timeout 5s) | 30 días, hasta 600 entradas |

**Por qué NetworkFirst para HTML:** garantiza que con red ves la última versión, y sin red ves la última que visitaste (cumple el modo "A" — cachear lo navegado).

## Pre-cache forzado (modo "C")

Hay tres lugares donde el usuario puede forzar la descarga de canciones para offline:

### 1. `<PrecacheButton />` — playlists individuales y favoritos en `/install`

- En `/playlists/[id]` → botón "Descargar para usar sin conexión" (descarga las canciones de esa lista).
- En `/install` → botón "Descargar favoritos para offline" al final de la página (solo canciones favoriteadas, sin tocar playlists). Solo se muestra para usuarios logueados con favoritos.

Internamente hace `fetch("/canciones/<slug>", { cache: "no-store" })` por cada slug, lo que fuerza al SW a cachear cada página HTML. Muestra progreso ("Descargando 12 / 30…") y al finalizar cambia a "✓ Disponible offline · Actualizar". El estado se persiste en `localStorage` con clave `pwa-precache:<storageKey>`.

### 2. Botón "Descargar / Actualizar favoritos" en el dialog de Mis Favoritos

Al final del `<FavoritesDialog />` (icono ❤ en el header) hay un botón que descarga **todo el contenido favoriteado** del usuario:

- Todas las **canciones** marcadas como favoritas.
- Todas las **canciones de cada playlist** favoriteada (resueltas vía `GET /api/playlists/<id>/song-slugs`).
- **Dedupea por slug** (una canción que esté suelta y dentro de una playlist se descarga una sola vez).
- Las **parroquias** favoriteadas se ignoran.

Estados del botón:
- **"Descargar favoritos"** la primera vez (no hay registro previo en localStorage).
- **"Descargando 12 / 30…"** mientras corre.
- **"Actualizar favoritos"** una vez que ya hay descarga previa, con texto chico debajo "Última descarga: …".
- **"Descarga parcial · Reintentar"** / **"Error al descargar · Reintentar"** según el resultado.

Solo se muestra si el SW está activo (`navigator.serviceWorker.getRegistration()` devuelve uno) y hay al menos una canción o playlist en favoritos. Clave de persistencia: `pwa-precache:favorites-bundle`.

## Página `/install` y acceso desde el menú

- **Página `/install`** ([app/(app)/install/page.tsx](../app/(app)/install/page.tsx)) — explica cómo instalar la PWA en iPhone/iPad, Android y Computadora con tarjetas separadas. Arriba muestra `<InstallPwaPrompt />`: si el browser ofrece prompt nativo aparece "Instalar ahora", si la app ya está instalada muestra "✓ La app ya está instalada en este dispositivo", y si no hay nada que ofrecer no se muestra.
- **Item en el menú** del header (`app/components/site-header.tsx`) — entrada "Instalar app" en el bloque inferior. Visible siempre (no se oculta aunque la app esté instalada, porque el usuario puede consultar las instrucciones para mostrarle a otro).

## Indicador offline

`<OfflineIndicator />` se monta en el root layout y muestra un badge fijo "Sin conexión · usando contenido descargado" cuando `navigator.onLine === false`.

## Adjuntos NO cacheados

Por decisión de producto, los archivos de los buckets `partituras` (PDFs) y `audios` (mp3/ogg) **nunca se cachean** — son pesados y se descargan/abren con su propio flujo. Si el usuario está sin red e intenta abrir un PDF/audio, fallará la descarga.

## Cómo testear

1. `npm run build && npm start`.
2. Chrome → DevTools → Application:
   - **Manifest**: deben verse los íconos y el nombre.
   - **Service Workers**: debe aparecer `sw.js` activo.
   - **Cache Storage**: ver las caches creadas (`pages`, `next-static`, `supabase-rest`, etc.).
3. Para probar offline: marcar "Offline" en DevTools → Network y navegar.
4. En móvil: abrir la URL de prod y aceptar el prompt de instalación (Android) o usar "Agregar a pantalla de inicio" (iOS).

## Versionado / actualizaciones

Cada `next build` regenera `public/sw.js` con un nuevo hash de precache. Serwist usa `skipWaiting: true` y `clientsClaim: true`, así que la nueva versión del SW se activa al primer reload después de detectarla. `reloadOnOnline: true` en `next.config.ts` recarga la app cuando vuelve la conexión.
