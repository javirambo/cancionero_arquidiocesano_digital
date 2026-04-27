# CASOS DE USO — Cancionero Arquidiocesano Digital

Este documento detalla los casos de uso del sistema, derivados de los requerimientos funcionales (RF) descriptos en [`especificacion_tecnica.md`](especificacion_tecnica.md) §5.1.

Cada caso indica la fase del roadmap a la que pertenece (§14–§15):

- **Fase 1** → MVP funcional al 7 de octubre.
- **Fase 2** → Evolución hacia el 24 de diciembre.

---

## Índice

| ID    | Nombre                                      | Fase | RF             |
| ----- | ------------------------------------------- | ---- | -------------- |
| CU-01 | Buscar canción                              | 1    | RF4            |
| CU-02 | Ver canción con letra y acordes             | 1    | RF5            |
| CU-03 | Transponer tonalidad                        | 1    | RF6            |
| CU-04 | Reproducir referencia de YouTube            | 1    | RF8            |
| CU-05 | Ver playlist de parroquia                   | 1    | RF3, RF12      |
| CU-06 | Acceder a parroquia por URL                 | 1    | RF11           |
| CU-07 | Visualizar novedades / festividad del día   | 1    | —              |
| CU-08 | Silenciar dispositivo y mantener pantalla   | 1    | RF20           |
| CU-09 | Descargar partitura                         | 2    | RF7            |
| CU-10 | Descargar canción para imprimir             | 2    | RF14           |
| CU-11 | Descargar playlist como cancionero          | 2    | RF15           |
| CU-12 | Descargar QR de la página actual            | 2    | RF13           |
| CU-13 | Login con Google                            | 2    | RF16           |
| CU-14 | Vincular usuario a parroquia                | 2    | RF17           |
| CU-15 | Marcar favoritos                            | 2    | RF18           |
| CU-16 | ABM de canción                              | 2    | RF1            |
| CU-17 | ABM de playlist                             | 2    | RF2            |
| CU-18 | ABM de usuario                              | 2    | RF9            |
| CU-19 | ABM de parroquia                            | 2    | RF10           |
| CU-20 | Gestionar permisos                          | 2    | RF21           |
| CU-21 | Gestionar anuncios programados              | 2    | RF19           |

---

## Actores

- **Visitante:** usuario anónimo (asamblea, fiel cualquiera).
- **Músico/Corista:** usuario que utiliza la app para ejecutar repertorio.
- **Coordinador parroquial:** usuario autenticado, gestiona playlists y datos de su parroquia.
- **Editor de contenido:** usuario autenticado con permisos para ABM de canciones (Comisión Litúrgico-Musical).
- **Administrador:** usuario con permisos plenos (parroquias, usuarios, permisos, anuncios).

---

# FASE 1 — MVP (7 de octubre)

## CU-01: Buscar cualquier cosa (parroquia, cancion, playlist)

- **Fase:** 1
- **RF:** RF4
- **Actor primario:** Visitante / Músico
- **Precondiciones:** Catálogo de canciones cargado.
- **Disparador:** El usuario escribe en el campo de búsqueda.
- **Flujo principal:**
  1. El usuario ingresa un término (título, fragmento de letra, número, playlist, categoría, parroquia).
  2. El sistema consulta el catálogo y devuelve resultados ordenados por relevancia.
  3. El usuario selecciona una canción.
  4. El sistema navega a la vista de canción (CU-02).
  5. Si es una playlist, se muestra la playlist en lugar de la cancion (CU-05).
  6. Si es una parroquia, se muestra la parroquia (CU-06.2)
- **Flujos alternativos:**
  - 2a. Sin resultados: el sistema muestra mensaje "No se encontraron canciones" y sugerencias de categorías.
  - 2b. Búsqueda vacía: el sistema muestra el catálogo completo paginado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.1: Ver canción con letra

- **Fase:** 1
- **RF:** RF5
- **Actor primario:** Visitante
- **Precondiciones:** La canción existe en el catálogo.
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categoría, letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra sin acordes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.2: Ver canción con letra y acordes

- **Fase:** 1
- **RF:** RF5
- **Actor primario:** Músico
- **Precondiciones:** La canción existe en el catálogo.
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categoría, letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra con acordes alineados sobre las sílabas correspondientes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-03: Transponer tonalidad

- **Fase:** 1
- **RF:** RF6
- **Actor primario:** Músico
- **Precondiciones:** Estar en la vista de canción con acordes (CU-02).
- **Disparador:** El usuario hace clic en + / − del selector de tono.
- **Flujo principal:**
  1. El usuario solicita subir o bajar un semitono (o seleccionar un tono específico).
  2. El sistema recalcula todos los acordes manteniendo la relación armónica.
  3. El sistema renderiza los acordes en la nueva tonalidad y muestra el delta respecto del original.
  4. El usuario puede restablecer al tono original.
- **Flujos alternativos:**
  - 2a. Acorde no estándar: el sistema preserva el acorde tal cual y registra advertencia (no bloqueante).
- **Postcondiciones:** El tono elegido se persiste en `localStorage` por canción para esa sesión.

---

## CU-04: Reproducir referencia de YouTube

- **Fase:** 1
- **RF:** RF8
- **Actor primario:** Músico / Visitante
- **Precondiciones:** La canción tiene un link de YouTube asociado.
- **Disparador:** El usuario hace clic en "Reproducir".
- **Flujo principal:**
  1. El sistema embebe el reproductor de YouTube en la vista de canción.
  2. El usuario puede reproducir, pausar, ajustar volumen.
- **Flujos alternativos:**
  - 1a. Canción sin link: el botón no aparece.
  - 1b. Video no disponible: YouTube muestra su error nativo.
- **Postcondiciones:** Ninguna.

---

## CU-05: Ver playlist de parroquia

- **Fase:** 1
- **RF:** RF3, RF12
- **Actor primario:** Visitante / Músico
- **Precondiciones:** La playlist existe y es pública.
- **Disparador:** El usuario navega a `/playlist/{id}` (o desde la parroquia).
- **Flujo principal:**
  1. El sistema carga la playlist: nombre, parroquia, fecha, lista ordenada de canciones.
  2. El usuario puede entrar a cada canción (CU-02) sin perder el orden de la playlist.
  3. El sistema ofrece navegación "anterior / siguiente" dentro de la playlist.
- **Flujos alternativos:**
  - 1a. Playlist inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---

## CU-06.1: Buscar parroquia

- **Fase:** 1
- **RF:** RF11
- **Actor primario:** Visitante
- **Precondiciones:** La parroquia existe.
- **Disparador:** El usuario escribe en el campo de búsqueda.
- **Flujo principal:**
  1. El sistema carga la página de la parroquia con sus playlists públicas y novedades propias.
  2. El usuario navega a una playlist (CU-05) o a una canción (CU-02).
- **Flujos alternativos:**
  - 1a. Slug inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---
## CU-06.2: Acceder a parroquia por URL

- **Fase:** 1
- **RF:** RF11
- **Actor primario:** Visitante
- **Precondiciones:** La parroquia existe.
- **Disparador:** El usuario abre `/parroquia/{slug}` (típicamente desde un QR físico en la parroquia).
- **Flujo principal:**
  1. El sistema carga la página de la parroquia con sus playlists públicas y novedades propias.
  2. El usuario navega a una playlist (CU-05) o a una canción (CU-02).
- **Flujos alternativos:**
  - 1a. Slug inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---

## CU-07: Visualizar novedades / festividad del día

- **Fase:** 1
- **RF:** —
- **Actor primario:** Visitante
- **Precondiciones:** Existe contenido marcado como "novedad" o "festividad" para la fecha actual.
- **Disparador:** El usuario abre la home `/`.
- **Flujo principal:**
  1. El sistema calcula la festividad litúrgica del día (si aplica).
  2. El sistema muestra la playlist asociada y novedades destacadas.
  3. El usuario navega al contenido de su interés.
  4. El usuario puede cerrar la novedad.
- **Flujos alternativos:**
  - 1a. Sin festividad ni novedades: la home muestra acceso al buscador y al catálogo.
- **Postcondiciones:** Ninguna persistente.

---

## CU-08: Silenciar dispositivo y mantener pantalla activa

- **Fase:** 1
- **RF:** RF20
- **Actor primario:** Músico / Corista
- **Precondiciones:** El usuario está en una vista de canción o playlist en un dispositivo móvil.
- **Disparador:** El usuario activa el modo "Modo coro" (toggle).
- **Flujo principal:**
  1. El sistema solicita el `Wake Lock` para impedir que la pantalla se apague.
  2. El sistema silencia notificaciones / sonidos del navegador donde sea posible.
  3. La pantalla permanece activa mientras el modo esté encendido.
  4. El usuario desactiva el modo y se libera el `Wake Lock`.
- **Flujos alternativos:**
  - 1a. Navegador no soporta Wake Lock API: se muestra advertencia indicando ajustar manualmente la configuración de pantalla.
  - 2a. El navegador no permite silenciar a nivel SO: el sistema solo silencia su propio audio embebido.
- **Postcondiciones:** El modo se restablece al cerrar la pestaña.

---

# FASE 2 — Evolución (24 de diciembre)

## CU-09: Descargar partitura

- **Fase:** 2
- **RF:** RF7
- **Actor primario:** Músico
- **Precondiciones:** La canción tiene una partitura asociada en Supabase Storage.
- **Disparador:** El usuario hace clic en "Descargar partitura".
- **Flujo principal:**
  1. El sistema solicita una URL firmada al bucket `partituras`.
  2. El navegador descarga el PDF.
- **Flujos alternativos:**
  - 1a. Sin partitura: el botón no aparece.
  - 1b. Falla la firma: se muestra mensaje de error con opción de reintentar.
- **Postcondiciones:** Ninguna persistente.

---

## CU-10: Descargar canción para imprimir

- **Fase:** 2
- **RF:** RF14
- **Actor primario:** Músico
- **Precondiciones:** Estar en la vista de canción.
- **Disparador:** El usuario elige "Descargar para imprimir" y selecciona "con acordes" / "sin acordes".
- **Flujo principal:**
  1. El sistema genera un PDF (server-side) con el formato impreso (A4, tipografía Cardo, títulos en mayúscula rojo).
  2. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 1a. Falla la generación: se muestra mensaje de error.
- **Postcondiciones:** Ninguna persistente.

---

## CU-11: Descargar playlist como cancionero

- **Fase:** 2
- **RF:** RF15
- **Actor primario:** Coordinador parroquial / Músico
- **Precondiciones:** La playlist tiene al menos una canción.
- **Disparador:** El usuario elige "Descargar cancionero" desde la vista de playlist.
- **Flujo principal:**
  1. El usuario elige opciones (con/sin acordes, tamaño A4, índice sí/no).
  2. El sistema arma un PDF concatenando cada canción con portada (nombre de parroquia) e índice.
  3. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 2a. Una canción no se puede renderizar: se omite y se reporta en el índice como faltante.
- **Postcondiciones:** Ninguna persistente.

---

## CU-12: Descargar QR de la página actual

- **Fase:** 2
- **RF:** RF13
- **Actor primario:** Coordinador parroquial / Visitante
- **Precondiciones:** Estar en una página con URL pública (canción, playlist, parroquia).
- **Disparador:** El usuario elige "Descargar QR".
- **Flujo principal:**
  1. El sistema genera un QR con la URL canónica de la página actual.
  2. El usuario descarga la imagen (PNG/SVG).
- **Flujos alternativos:** Ninguno.
- **Postcondiciones:** Ninguna persistente.

---

## CU-13: Login con Google

- **Fase:** 2
- **RF:** RF16
- **Actor primario:** Visitante
- **Precondiciones:** Supabase Auth con provider Google habilitado.
- **Disparador:** El usuario hace clic en "Ingresar con Google".
- **Flujo principal:**
  1. El sistema redirige al flujo OAuth de Google.
  2. Tras consentimiento, Supabase emite la sesión y la cookie es seteada por el Proxy.
  3. El usuario queda autenticado y se redirige a la página origen.
- **Flujos alternativos:**
  - 2a. El usuario cancela: vuelve a la página origen sin sesión.
  - 2b. Error de OAuth: se muestra mensaje y opción de reintentar.
- **Postcondiciones:** Sesión activa. Si es la primera vez, se crea el registro en `users`.

---

## CU-14: Vincular usuario a parroquia

- **Fase:** 2
- **RF:** RF17
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa (CU-13).
- **Disparador:** El usuario abre su perfil y selecciona "Mi parroquia".
- **Flujo principal:**
  1. El usuario busca y selecciona su parroquia.
  2. El sistema crea o actualiza la relación `usuario ↔ parroquia`.
  3. La home pasa a destacar contenido de esa parroquia.
- **Flujos alternativos:**
  - 1a. Parroquia inexistente: se ofrece solicitar su alta al administrador.
- **Postcondiciones:** Relación persistida.

---

## CU-15: Marcar favoritos

- **Fase:** 2
- **RF:** RF18
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa.
- **Disparador:** El usuario marca el ícono de "favorito" en una canción, playlist o parroquia.
- **Flujo principal:**
  1. El sistema registra el like del usuario sobre el recurso.
  2. El recurso aparece en la sección "Mis favoritos" del perfil.
  3. El usuario puede quitar el favorito.
- **Flujos alternativos:** Ninguno.
- **Postcondiciones:** Like persistido o eliminado.

---

## CU-16: ABM de canción

- **Fase:** 2
- **RF:** RF1
- **Actor primario:** Editor de contenido
- **Precondiciones:** Sesión con permiso de edición de canciones.
- **Disparador:** El editor accede a `/admin/canciones`.
- **Flujo principal:**
  1. El editor crea/edita una canción: título, autor, categoría, letra, acordes, link YT, partitura, audio.
  2. El sistema valida formato de acordes y campos obligatorios.
  3. El sistema sube los archivos a Supabase Storage (`partituras`, `audios`) y persiste los metadatos.
  4. El editor confirma y la canción queda publicada (o en borrador, si aplica un flujo de aprobación).
- **Flujos alternativos:**
  - 2a. Acordes mal formados: se muestra error inline.
  - 4a. Baja: se confirma con doble paso; las playlists que la contenían marcan la canción como "no disponible".
- **Postcondiciones:** Canción persistida; archivos en Storage.

---

## CU-17: ABM de playlist

- **Fase:** 2
- **RF:** RF2
- **Actor primario:** Coordinador parroquial
- **Precondiciones:** Sesión vinculada a una parroquia (CU-14).
- **Disparador:** El usuario accede a "Mis playlists" en su parroquia.
- **Flujo principal:**
  1. El usuario crea una playlist (nombre, fecha, descripción, visibilidad).
  2. El usuario agrega/quita/reordena canciones.
  3. El sistema persiste cada cambio.
- **Flujos alternativos:**
  - 1a. Sin permisos sobre la parroquia: el sistema rechaza la operación.
- **Postcondiciones:** Playlist persistida.

---

## CU-18: ABM de usuario

- **Fase:** 2
- **RF:** RF9
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/usuarios`.
- **Flujo principal:**
  1. El admin lista, crea, edita o desactiva usuarios.
  2. Asigna roles y parroquia.
  3. El sistema persiste los cambios.
- **Flujos alternativos:**
  - 1a. Desactivar al propio usuario: se rechaza.
- **Postcondiciones:** Usuarios actualizados.

---

## CU-19: ABM de parroquia

- **Fase:** 2
- **RF:** RF10
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/parroquias`.
- **Flujo principal:**
  1. El admin crea/edita/baja parroquias (nombre, dirección, slug, contacto).
  2. El sistema valida unicidad del slug.
  3. Persiste los cambios.
- **Flujos alternativos:**
  - 2a. Slug duplicado: el sistema sugiere uno alternativo.
- **Postcondiciones:** Parroquia persistida.

---

## CU-20: Gestionar permisos

- **Fase:** 2
- **RF:** RF21
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/permisos`.
- **Flujo principal:**
  1. El admin define roles (editor, coordinador, admin) y sus permisos.
  2. Asigna roles a usuarios.
  3. El sistema persiste y los cambios aplican en la siguiente request (RLS de Supabase).
- **Flujos alternativos:**
  - 1a. Quitar el último admin: se rechaza.
- **Postcondiciones:** Roles y permisos actualizados.

---

## CU-21: Gestionar anuncios programados

- **Fase:** 2
- **RF:** RF19
- **Actor primario:** Administrador / Coordinador parroquial (según alcance del anuncio)
- **Precondiciones:** Sesión con permiso para anuncios.
- **Disparador:** Acceso a `/admin/anuncios`.
- **Flujo principal:**
  1. El usuario crea un anuncio: título, cuerpo, fecha de inicio/fin, alcance (global / parroquia), prioridad.
  2. El sistema valida fechas y alcance.
  3. En la home, durante la ventana de vigencia, el anuncio aparece en un banner cerrable.
  4. Al cerrarlo, no vuelve a aparecer al mismo dispositivo (cookie/localStorage).
- **Flujos alternativos:**
  - 1a. Fecha fin anterior a inicio: error de validación.
- **Postcondiciones:** Anuncio persistido.

---

## CU-22 Gestionar "Mis favoritos" 

- **Fase:** 2
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa
- **Disparador:** Acceso a `/favoritos`.
- **Flujo principal:**
  1. El usuario accede a Mis Favoritos
  2. El sistema muestra la lista de favoritos, ordenado por: canciones, playlists, parroquias.
  3. El usuario desmarca un item de favorito.
  4. El item se quita de favorito (se quita el corazón).
  5. Al cerrarlo, no vuelve a aparecer ese favorito.
- **Flujos alternativos:**
  - 1a. No existen favoritos: lista vacía.

---

