# Lista de pendientes:


[ ] Definir datos de contacto para la privacidad y el terminos y condiciones.
    Ejemplo: Responsable y Direccion (ahora el Arzobispado !!)
    Email, (ahora yo.azimo@gmail.com !!)

[ ] cambiar funcionamiento en invitado -> los favoritos se guardan en local storage, y si se loguea -por primera vez- se transfiere a la base. Si ya estuvo logueado se traen los favoritos de la base. Si se pisan porque son distintos preguntar que hacer.

[ ] **Backfill `parishes.latitude`/`longitude`.** Script Python (one-shot) que recorra las parroquias con `latitude IS NULL`, consulte Nominatim por nombre+ciudad+dirección y persista las coords. Documentar cómo correrlo. (Migración 0010 ya creó las columnas.)

---

## Pendientes derivados de casos de uso (⏳ en `casos_de_uso.md`)

Orden sugerido para evitar dependencias cruzadas. Cada uno enlaza al CU correspondiente.

[x] **CU-23 — Habilitar "Agregar a playlist" en menú "..." de canción.** Submenú con búsqueda, "+ Nueva playlist" y listado de playlists del usuario según rol. (Antes: paso 6 del plan viejo.)

[x] **CU-17 — /playlists: separación visual.** Sección "Mis playlists" (incluye personales `parish_id IS NULL`) + sección "Playlists compartidas" agrupadas por parroquia con corazón para favorito. Quitar enlace "Ver todas" residual. (Antes: paso 7.)

[x] **CU-19.1 — /parroquias: GPS para usuario.** Listado ordenado por cercanía (Haversine sobre `parishes.latitude`/`longitude`). Subtítulo distinto para invitado. Botón "+ Agregar parroquia" para admin → `/admin/parroquias/nueva`. (Migración 0010 + backfill quedan como tareas separadas.) (Antes: paso 8.)

[x] **CU-19 — Migración `parishes.status` (`active` | `pending` | `inactive`).** Reemplaza `is_active` por `status` (text + check). Migración 0011 lista; admin form ahora usa select de 3 estados. ⚠️ Aplicar 0011 antes de probar. (Antes: paso 9.)

[x] **CU-19 — Flujo "parroquia en revisión".** Usuarios autenticados (member/coordinator/editor) crean en `/parroquias/nueva` → queda `pending`. Admin sigue creando en `/admin/parroquias/nueva` → `active` directo. `/admin/parroquias` muestra sección "Pendientes de revisión" con Aprobar/Rechazar (rechazar = `inactive`). Migración 0012 abre INSERT a authenticated con check `status='pending'`. (Antes: paso 10.)

[x] **CU-17 — /admin/playlists.** Sección admin "PLAYLISTS GENERALES" con listado de arquidiocesanas + crear/eliminar/modificar (modificar reusa `/playlists/[id]/editar`). Tarjeta en `/admin`. (Antes: paso 13.)

[x] **CU-17 — Admin reasigna dueño de playlist.** Cambiar `parish_id` (incluso personal ↔ parroquia). UI desde `/playlists/[id]/editar` solo para admin. Confirmación si la playlist era arquidiocesana y se mueve fuera.

[x] **CU-18 — /admin/usuarios.** ABM de usuarios + asignación de roles globales (admin/editor) y `parish_members.role` (member/coordinator). Sin alta manual (sigue por OAuth). Bloquea quitar el último admin. "Desvincular usuario" elimina roles globales + membresías; las playlists personales del usuario se conservan.

[x] ***arreglar vista celular de edicion de playlist (admin)***
    http://localhost:3000/admin/playlists
    se ven feos los items!

[ ] **CU-03 — Ocultar transposición al invitado.** La UI de + / − de tono debe esconderse cuando no hay sesión.

[ ] **CU-15 + CU-13 — Favoritos de invitado en localStorage.** Persistir en local cuando no hay sesión; al loguear primera vez transferir a `favorites` de BD (ver el ítem ya existente arriba con el detalle de "qué hacer si se pisan").

[ ] **CU-21 — Anuncios con alcance parroquial.** Hoy solo admin gestiona globales. Coordinator debería poder crear/editar anuncios para sus parroquia(s) (`announcement_parishes`).

[ ] **CU-16 — Flujo `draft → review → published` para canciones.** UI de coordinator (crear/editar borradores, enviar a revisión) + UI de editor (cola de revisión, aprobar/rechazar canciones y `song_files`).

[ ] **CU-25 — Crear categorías litúrgicas.** ABM de `categories` para coordinator/editor.

[ ] **CU-26 — ABM de festividades litúrgicas.** Carga manual año a año (`liturgical_events`).

[ ] **CU-09 — Descargar partitura.** PDF desde Storage cuando `song_files.kind = 'score_pdf'` está `published`.

[ ] **CU-10 — Descargar canción para imprimir.** Render imprimible de letra/acordes.

[ ] **CU-11 — Descargar playlist como cancionero.** PDF/print de todas las canciones de la playlist.

[ ] **CU-20 — Gestionar permisos.** Solo si necesitamos granularidad por permiso atómico; hoy los permisos están hardcodeados en RLS por rol y puede ser suficiente.
