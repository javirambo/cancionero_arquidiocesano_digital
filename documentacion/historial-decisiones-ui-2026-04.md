# Modificar UI y comportamiento

Plan de cambios paso a paso. Cada paso es una unidad de trabajo independiente, ordenada de menor a mayor riesgo. Migraciones requieren OK explícito antes de aplicarse.

---

## Estado actual (lo que YA funciona — no tocar)

- **Header:** modo oscuro, toggle "sugerir acordes", favoritos con corazón dinámico, búsqueda Cmd+K, login/logout (Google), entrada "Administración" visible solo para admin/editor.
- **Versión al pie del home:** leída desde `package.json` en build.
- **Canciones:** compartir, QR (componente `QrButton`), favoritos, transposición.
- **Playlists:** listado agrupado por parroquia, suscripciones (`playlist_parish_subscriptions`), edición en `/playlists/[id]/editar`.
- **Parroquias:** separación "Mis parroquias" / "Otras", botón [+] para asociar, estrella para parroquia principal, GPS en formulario de **admin** de parroquias.
- **Admin:** tarjetas Parroquias y Anuncios funcionando.
- **Modelo de datos:** tabla `playlists` ya sin `slug` (URL canónica `/playlists/{id}`).

---

## Decisiones tomadas

- **Header:** colocar tooltips:
  - boton buscar: "Buscar canción, playlist o parroquia."
  - boton favoritos: "Mis favoritos"
  - boton perfil: pone lo que te parezca...
- **Home `/`:** muestra parroquia **principal** (la de la estrella). Al asignar la primera parroquia queda automáticamente con la estrella. Invitado no ve parroquia.
- **Login en menú perfil:** "Cerrar sesión" cuando hay sesión, "Iniciar con Google" cuando es invitado.
- **Sugerir acordes:** ya funciona como toggle global; se mantiene tal cual.
- **Playlists por rol:**
  - `member`: `parish_id = NULL` (playlist personal). Puede compartirla.
  - `coordinator`: si tiene una sola parroquia, se asigna directo; si tiene varias, se pide cuál (selector).
  - `admin` o `editor`: se asigna a la parroquia virtual `arquidiocesis`.
- **Compartir playlist:** quien tenga la URL con el id de la playlist puede verla (independiente de `visibility`). 
- **Agregar parroquia (rol `member`):** crea → estado `en revisión` → mientras tanto el usuario ve un mensaje "parroquia en revisión, puede desaparecer si el admin la rechaza". Admin/coordinator agregan directo (estado `active`).
- **Asociarse a parroquia:** botón [+] en cada tarjeta — ya funciona.
- **Admin de playlists:** "Modificar" reutiliza `/playlists/[id]/editar`.
- **Timezone eventos/anuncios:** la BD guarda UTC; al renderizar se convierte a hora local de Argentina (`America/Argentina/Cordoba`).
- **Versionado:** se actualiza en cada build desde `package.json.version`.
- **GPS buscar cercanas:** ya implementado en admin; replicar en `/parroquias` para usuario.
- **Tooltips:** redactarlos según uso de cada botón.
- **/canciones:** filtro por **una sola** categoría a la vez.
- **Submenu "Agregar a playlist":** muestra playlists según rol (member ve las propias; coordinator las propias + las de sus parroquias; admin además las arquidiocesanas).
- **Compartir / QR / Favoritos / Sugerir acordes:** ya funcionan, no tocar.
- **Mis Favoritos en /perfil:** lista agrupada por tipo (canción / playlist / parroquia).

---

## Cambios paso a paso

> Convención de **Estado:** ⏳ pendiente · 🚧 en curso · ✅ hecho

### Paso 1 — Home: nombre de parroquia principal + tarjeta invitado
- **Qué:** mostrar el nombre de la parroquia principal (la de la estrella) como título en el home cuando hay sesión. Si es invitado, no mostrar nombre y agregar una tarjeta "Iniciá sesión para asociarte a parroquias, guardar tus favoritos en la nube, crear tus propias playlists…" con CTA al login con Google.
- **Dónde:** [app/page.tsx](app/page.tsx)
- **Detalle:**
  - Resolver la parroquia principal del usuario logueado (member con estrella en `parish_members`).
  - Si no hay parroquia asociada todavía: no mostrar nombre.
  - Tarjeta de invitado solo si no hay sesión.
  - Quitar los botones "Ver parroquias" / "Ir al catálogo" del anuncio de festividad.
- **Estado:** ✅

### Paso 2 — Header: integrar botón "Descargar QR"
- **Qué:** agregar `QrButton` al header (no está integrado todavía). Codifica la URL actual del browser. No mostrarlo cuando se está en `/perfil`.
- **Dónde:** componente `site-header` y `QrButton` ya existente.
- **Estado:** ✅

### Paso 3 — Bug timezone en eventos litúrgicos y anuncios
- **Qué:** las fechas vienen en UTC desde Supabase; al render se muestran corridas (ej: a las 22 hs muestra el día siguiente). Convertir explícitamente a `America/Argentina/Cordoba` al renderizar.
- **Dónde:** home (festividad de hoy + novedades) y donde sea que se rendericen `liturgical_events.event_date` y `featured_content.starts_at/ends_at`.
- **Detalle:** definir un helper único (ej: `formatLocalDate`) y reemplazar usos de `toLocaleDateString` plano.
- **Estado:** ✅

### Paso 4 — /perfil: secciones Mis Favoritos y Mis Playlists
- **Qué:** agregar a [app/perfil/page.tsx](app/perfil/page.tsx):
  - **Mis Favoritos:** listado agrupado por tipo (canción / playlist / parroquia). Reutilizar lógica de favoritos ya existente.
  - **Mis Playlists:** solo el conteo y un link a `/playlists`.
  - **Mis Parroquias:** lista con la principal (estrella) primera. (Si no está ya, ajustar.)
- **Estado:** ✅

### Paso 5 — /canciones: filtro por categoría
- **Qué:** agregar selector de categoría única arriba del listado. Al elegir filtra; combina con el buscador (AND).
- **Dónde:** [app/canciones/page.tsx](app/canciones/page.tsx) y server side correspondiente en `lib/songs.ts`.
- **Estado:** ✅

### Paso 6 — /canciones: activar "Agregar a una playlist" con submenú
- **Qué:** habilitar la opción del menú "..." de cada canción (hoy `disabled: true`). Submenú con:
  - Buscar playlist (filtra la lista).
  - "+ Nueva playlist" (crea con la canción adentro).
  - Listado de playlists del usuario según rol (ver decisiones).
- **Dónde:** `song-row.tsx` y handlers asociados.
- **Estado:** ⏳

### Paso 7 — /playlists: separación visual + sacar "Ver todas" + corazón
- **Qué:**
  - Sección "Mis playlists" (propias del usuario, incluyendo `parish_id IS NULL`).
  - Sección "Playlists compartidas" agrupadas por parroquia, cada item con corazón para favorito.
  - Quitar el enlace "Ver todas" (residual).
  - Agregar un boton "+ Nueva Playlist"
- **Dónde:** [app/playlists/page.tsx](app/playlists/page.tsx), [lib/playlists.ts](lib/playlists.ts).
- **Estado:** ⏳

### Paso 8 — /parroquias: botones "Buscar cercanas (GPS)" y "Agregar parroquia"
- **Qué:** replicar el flujo GPS que ya existe en admin para usuarios comunes. Agregar el botón "Agregar parroquia" (la lógica de estado se hace en el paso 10).
- **Dónde:** [app/parroquias/page.tsx](app/parroquias/page.tsx), reutilizar lógica de geolocalización del form admin.
- **Estado:** ⏳

### Paso 9 — Migración: `parishes.status` (`active` | `pending`)
- **Qué:** agregar columna `status` a `parishes` con default `'active'` y CHECK. La tabla actualmente tiene `is_active` (revisar si conviene reusar o agregar `status`).
- **Acción previa:** revisar migraciones existentes y proponer el archivo nuevo.
- **⚠️ NO APLICAR sin OK explícito.**
- **Estado:** ⏳

### Paso 10 — Flujo "parroquia en revisión"
- **Qué:**
  - `member` agrega parroquia → se inserta con `status='pending'`. UI muestra mensaje "parroquia en revisión, puede desaparecer si el admin la rechaza".
  - `admin`/`coordinator` agregan parroquia → `status='active'` directo.
  - Admin ve las pendientes en `/admin/parroquias` con acción aprobar / rechazar.
  - (Opcional) email al admin cuando entra una pendiente.
- **Dónde:** server actions de creación de parroquia, [app/parroquias/page.tsx](app/parroquias/page.tsx), [app/admin/parroquias/page.tsx](app/admin/parroquias/page.tsx).
- **Depende de:** Paso 9.
- **Estado:** ⏳

### Paso 11 — Migración: `playlists.parish_id` nullable
- **Qué:** hacer `parish_id` nullable para soportar playlists personales de `member`.
- **⚠️ NO APLICAR sin OK explícito.**
- **Estado:** ✅ (aplicada como `migrations/0009_playlists_personales.sql`)

### Paso 12 — Crear playlist según rol
- **Qué:**
  - `member`: crea sin parroquia (`parish_id = NULL`).
  - `coordinator` con una parroquia: se asigna directo. Con varias: selector obligatorio.
  - `admin`: se asigna a `arquidiocesis` (ya funciona).
- **Dónde:** [app/parroquias/[slug]/playlists/nueva/page.tsx](app/parroquias/[slug]/playlists/nueva/page.tsx) y/o nueva ruta `/playlists/nueva` para member; [lib/playlists.ts](lib/playlists.ts).
- **Depende de:** Paso 11.
- **Estado:** ✅

### Paso 13 — /admin/playlists
- **Qué:** nueva sección de admin.
  - Título "PLAYLISTS GENERALES".
  - Subtítulo "Estas playlists se comparten a todas las parroquias".
  - Botón "+ Nueva Playlist" (crea como arquidiocesana).
  - Listado de playlists arquidiocesanas con Eliminar y Modificar.
  - "Modificar" → `/playlists/[id]/editar` (reutiliza).
- **Dónde:** crear `app/admin/playlists/page.tsx`. Agregar tarjeta en [app/admin/page.tsx](app/admin/page.tsx).
- **Estado:** ⏳

---

## Detalles de UI heredados (referencia rápida)

### Home `/`
- Header con menús: buscar, mis favoritos, perfil (con tooltips). ✅ ya
- Nombre de la parroquia principal (si logueado). ⏳ Paso 1
- Texto: "Evangelizar a través de la música" / "Cancionero Arquidiocesano Digital" / descripción. ✅ ya
- Tarjeta de eventos litúrgicos automáticos (sin botones "Ver parroquias"/"Ir al catálogo"). 🔧 Paso 1 (limpiar botones) + Paso 3 (timezone)
- Tarjetas de novedades. ✅ ya (timezone en Paso 3)
- Accesos rápidos: Canciones, playlists, parroquias. ✅ ya
- Tarjeta "Iniciá sesión..." si invitado. ⏳ Paso 1
- Privacidad y versión al pie. ✅ ya

### Menú perfil
Nombre de usuario / invitado · Perfil (`/perfil`) · Canciones (`/canciones`) · Playlists (`/playlists`) · Parroquias (`/parroquias`) · Sugerir acordes (oculto si invitado) · Modo Oscuro · Administración (solo admin) · Descargar QR (oculto en `/perfil`) · Cerrar sesión / Iniciar con Google.

### /admin/parroquias
- Título "PARROQUIAS GENERALES".
- Subtítulo "Estas parroquias se comparten a todos los fieles/usuarios estén logueados o no".
- Botón "+ Nueva Parroquia". ✅ ya
- Listado con Eliminar y Modificar por item. ✅ ya
- Sumar gestión de pendientes (Paso 10).

### /admin/anuncios
- Sin cambios.

---

## Nota (2026-05-08): eliminación de `/perfil`

Se eliminó la pantalla `/perfil` y todos sus componentes. Los datos de perfil (avatar, nombre, email) ahora viven en el encabezado del menú del header como bloque read-only. El menú quedó así:

Encabezado (avatar + nombre + email, o "Invitado" + botón "Iniciá sesión") · Cantos · Listas · Parroquias · Novedades · (separador) · No apagar pantalla · Modo Oscuro/Claro · Descargar QR · Administración (solo admin/editor) · Instalar app · Cerrar Sesión.

- El botón "Descargar favoritos para offline" se reubicó a `/install`.
- Los redirects de seguridad (admin, playlists/nueva, parroquias/nueva, etc.) ahora van a `/` en lugar de `/perfil`.
- En el menú "..." de cada canción, "Iniciá sesión para usar playlists" dispara OAuth directo (sin pantalla intermedia).
