# Lista de pendientes

## Casos operativos

[ ] Backfill parishes.latitude/longitude

[ ] el corazon en el titulo de la cancion se ve horrible.

[ ] ver si Mi perfil es una pantalla de configuracion:
    [] Soy musico (muestra primero las playlists, etc)
    [] Mostrar siempre acordes
    [] No mostrar anuncios
    [] No apagar la pantalla miestra estoy activa
    [] etc...
    
## Reunion Padre Facundo - 13 de mayo 2026

[ ] Poner el logo del arzobispo,
    Logo de comision.

[X] Hacer Anuncios Popups (destacados con mas fuerza)
    Que aparezcan siempre luego de un F5
    Encima de toda pantalla
    Que tengan un X para cerrar
    Para listas, anuncios, indicaciones (nuevo)

[X] Nuevo: anuncios pero con Indicaciones
    Es un anuncio pero direcciona a una pagina o documento enriquecido.
    Se comporta igual que un anuncio.
- PREGUNTA: los invitados tambien ven la indicacion? o solo los admin parroquiales?

[X] Que se vean todas las listas y anuncios de todas las parroquias para los invitados.

[X] Como ver /parroquias?
    - invitado: mostrar todas ordenadas por cercania (son 300)
        Buscar 🔍    
        ...lista de parroquias...
    - member: en grupos de Mis parroquias y Otras parroquias con > y acordeon para achicar. 
        Mis parroquias 🔍     >
        ...lista de parroquias...
        Otras parroquias 🔍   >
        ...lista de parroquias...
        Y una lupa al lado para buscar o filtrar

[x] Como ver /parroquias/una_parroquia?
    - invitados: poner contactos de Coordinador parroquiales.
    - member: ve contactos de coordinador
    - Coordinador parroquiales: poner contactos de editor o admin.
    - admin: no ve contactos

[X] el Coordinador parroquial ya no puede crear canciones en draft, solo el editor o admin.
    - mig 0037_restrict_songs_to_editors (drop policies coordinator + RPCs solo editor/admin)
    - review-actions.tsx: limpieza de rama coordinador
    - CU-16 actualizado

[ ] CU-11 - Descargar playlist como cancionero 

[ ] cambiar vista de cancion
    Nº 2
    Vienen con alegría
    Autor: C. Gabarain
    (Entrada)

    por esto:

    Nº 2 (Entrada)
    Vienen con alegría
    Autor: C. Gabarain

    
---

## Refactor de roles 2026-05-15

Nueva matriz de permisos definitiva (reemplaza descripciones previas en CU-Actores).
Acordado con Javier el 2026-05-15.

### Matriz

**invitado:**
- Puede: ver canciones, acordes y trasponer, ver listas, parroquias y anuncios de la home y de /parroquias. Puede ver favoritear y se persiste en local storage. Las notas al trasponer no se guardan.
  En `/parroquias/xxx` ve todas las parroquias, las listas y anuncios + mails de
  coordinator parroquial. En home: playlists y anuncios globales. En `/playlists`:
  globales. En `/anuncios`: globales.
- NO puede: crear/editar nada, ni asociarse a parroquias.

**member** (idem invitado +):
- persiste todo en BD , y si viene de invitado migra localStorage a BD.
- Puede: vincularse a parroquias, crear playlists personales. Home: anuncios y playlists de su parroquia. En `/anuncios` y `/playlists`: también de su parroquia. En `/parroquias/xxx`: mails de coordinator.
- NO puede: crear canciones, crear playlists de parroquia, crear anuncios, crear
  parroquias.

**coordinator** (idem member +):
- Puede: crear playlists de su parroquia, crear anuncios de su parroquia. En
  `/parroquias/xxx`: mails de editor + admin.
- NO puede: crear canciones, crear parroquias, crear anuncios globales.

**editor** (idem coordinator +):
- Puede: crear/editar/borrar canciones (todo el flujo editorial), crear/editar/borrar
  parroquias, crear anuncios globales. En `/parroquias/xxx`: mails de admin.
- NO puede: administrar usuarios.
- **Caso especial:** el editor es siempre coordinator de la parroquia virtual
  `arquidiocesis`. Solo él puede marcar playlists con `is_archdiocesan = true`
  (visibles por defecto en todas las parroquias).

**admin:** puede todo. Cuando crea cosas que requieren parroquia, se le pregunta cuál.
  Único que puede reasignar `parish_id` de una playlist.

---

### Etapa 0 — Documentación (sin código)

[X] Reescribir sección "Actores del sistema" en `casos_de_uso.md` con la nueva matriz.
[X] Reescribir CU-19 (parroquias): solo admin+editor crean/editan/borran; eliminar
    concepto de estado `pending` y de aprobación por editor.
[X] CU-21 (anuncios): aclarar que anuncios globales los crean editor + admin;
    coordinator solo dirigidos a su(s) parroquia(s).
[X] CU-17 (playlists): aclarar que `is_archdiocesan` solo lo marca el editor (que es
    siempre coordinator de `arquidiocesis`).
[X] Revisar CU-18, CU-20, CU-25, CU-26 por consistencia.

### Etapa 1 — Parroquias (sin estados, editor puede crear/borrar)

[X] Decisión: parroquias pending/inactive → todas a `active` en la migración.
[X] Migración 0038: status degradado a 'active'|'inactive' (CHECK simplificado);
    drop policy parishes_insert_self_pending; nueva policy parishes_editor_write
    (INSERT/UPDATE/DELETE para is_editor()/is_admin()); search_global ajustado.
[X] UI `/parroquias`: botón "+ Agregar" visible solo para editor+admin (siempre va
    a /admin/parroquias/nueva).
[X] UI `/parroquias/{slug}`: botón "Editar" visible solo para editor+admin.
[X] Borrada ruta pública `/parroquias/nueva` (ya no existe alta de parroquia
    desde fuera del admin).
[X] Eliminada sección "Pendientes de revisión" en /admin/parroquias y
    componente pending-row.tsx.
[X] Form de parroquia: select de estado sin opción "Pendiente" (active/inactive).
[X] /admin/parroquias, /admin/parroquias/[id], /admin/parroquias/nueva:
    permiten admin + editor (antes solo admin).
[X] scoped-parishes (anuncios): filtra `status <> 'inactive'` en lugar de
    `= 'active'`.
[X] Eliminado setting huérfano `admin_contact_emails` (form + query + setting):
    nadie lo consumía y el texto era incorrecto. Migración 0039 hace DELETE.
[X] **PENDIENTE: aplicar migraciones 0038 y 0039 a la base** (no aplicadas aún).

### Etapa 2 — Editor ↔ parroquia virtual `arquidiocesis`

[X] Decisión 2026-05-16: NO usar trigger sobre user_roles; resolver con RLS
    directa. Más simple, sin filas auto-managed en parish_members.
[X] Verificada la parroquia `arquidiocesis`: ya existe (mig. 0006_playlists_v2:137).
[X] Migración 0040: RLS playlists INSERT/UPDATE/DELETE incluye rama
    `(is_editor() AND parish_id = id_arquidiocesis)`. Editor puede operar
    sobre playlists de arquidiocesis sin estar en parish_members.
[X] Migración 0040: trigger BEFORE INSERT/UPDATE valida is_archdiocesan
    (requiere is_editor() Y parish_id = arquidiocesis). RAISE EXCEPTION
    con mensaje claro si no se cumple.
[X] UI [id]/editar: canEdit incluye `isEditor && isArchdiocesisPlaylist`.
    También corregido query parishes (`neq inactive` en vez de `eq active`).
[X] **PENDIENTE: aplicar migración 0040 a la base** (no aplicada aún).

### Etapa 3 — Anuncios globales

[X] RLS ya estaba OK: `announcements_editor_all` y `announcement_parishes_editor_all`
    (mig. 0013) permiten al editor todo. Coordinator queda restringido por
    `is_coordinator_of_announcement()` (no aplica a anuncios sin parroquias).
[X] UI `/admin/anuncios/nuevo` y `/admin/anuncios/[id]/editar`: `allowGlobal`
    ya era `isAdmin || isEditor`. No requiere cambios.
[X] UI `/admin/anuncios`: listado ya distingue admin/editor (ven todo) de
    coordinator (filtra por sus parroquias).
[X] `scoped-parishes.ts`: editor ahora ve TODAS las parroquias (antes solo
    veía las de `parish_members`). Permite dirigir anuncios a cualquier
    parroquia, no solo a las propias.
[X] Sin migración nueva — todo el cambio fue en TS.

### Etapa 4 — Limpiezas y verificación

[X] Verificado: "Coordinador pastoral" ya no aparece en docs ni código. Solo
    queda subsumido en `editor` (que es coordinator de `arquidiocesis`).
[X] Auditadas cards de `/admin`:
    - Cantos → admin+editor ✓
    - Listas generales → admin+editor ✓
    - Parroquias → admin+editor (**corregido**: antes solo admin)
    - Anuncios → admin+editor+coordinator ✓
    - Usuarios → admin ✓
[X] Verificado: coordinator NO puede crear anuncios globales.
    - UI: `allowGlobal = isAdmin || isEditor` en nuevo/page.tsx:11 y [id]/editar/page.tsx:106.
    - RPC/RLS: `is_coordinator_of_announcement(id)` retorna false si el anuncio no
      tiene filas en `announcement_parishes`, así que la policy coordinator no aplica
      a anuncios globales.
[X] (Mig 0037) coordinator no crea/edita canciones.
