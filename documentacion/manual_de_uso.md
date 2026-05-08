# Manual de uso — Cancionero Arquidiocesano Digital

Este documento explica, para quien usa la aplicación, qué hace cada elemento de la interfaz: botones, íconos, atajos y descripciones. Está pensado tanto como ayuda al usuario como referencia para diseñar tooltips y mensajes consistentes.

> **Convención:** lo que aparece **entre comillas** es el texto literal que se muestra al usuario (label o tooltip).

---

## 1. Header (parte superior, todas las páginas)

A la izquierda: el logo **Cancionero · Arquidiócesis de Rosario**. Hace clic y vuelve al inicio.

A la derecha, tres botones circulares con tooltip al pasar el cursor:

| Ícono | Tooltip       | Qué hace                                                                 |
| ----- | ------------- | ------------------------------------------------------------------------ |
| 🔍    | "Buscar"      | Abre el diálogo de búsqueda global. Atajo: **Ctrl/Cmd + K**.             |
| ❤     | "Mis favoritos" | Abre el popup con tus favoritos guardados. Si no hay, te invita a marcar. |
| 👤    | "Mi cuenta"   | Abre el menú de usuario.                                                 |

### 1.1. Diálogo de búsqueda (lupa)

- Escribí cualquier término. Se busca en paralelo en **canciones** (título, letra), **playlists** y **parroquias**.
- Los resultados aparecen agrupados por tipo. Al hacer clic en cualquiera, se navega al detalle.
- Cerrar: **ESC**, click fuera, o el botón "✕" arriba a la derecha del diálogo.

### 1.2. Popup de Mis favoritos (corazón)

- Muestra los favoritos ordenados por **agregados recientemente**, agrupados en **Canciones / Playlists / Parroquias**.
- Tocar el ❤ junto a cualquier ítem lo quita de favoritos.
- Si todavía no marcaste favoritos, muestra: *"Todavía no marcaste favoritos. Tocá el ❤ de una canción, playlist o parroquia para guardarla acá."*
- **Hoy los favoritos se guardan en el navegador** (localStorage). Cada dispositivo tiene su propia lista hasta que entre el login con Google.

### 1.3. Menú "Mi cuenta" (silueta de usuario)

| Ítem            | Acción                                                              |
| --------------- | ------------------------------------------------------------------- |
| Perfil          | Abre `/perfil`. Si no hay sesión, muestra modo "Invitado".          |
| Modo Oscuro / Modo Claro | Alterna el tema. Default: claro. Persiste en el navegador. |
| Playlists       | Va a `/playlists`.                                                  |
| Parroquias      | Va a `/parroquias`.                                                 |
| Cerrar Sesión   | Visible siempre, funcional cuando entre el login.                   |

---

## 2. Página de inicio (`/`)

- **Hero**: título de la app y un buscador que envía a `/canciones?q=...`.
- **Festividad de hoy**: sección con el evento litúrgico del día.
  - Si hay un evento cargado en la base (tabla `liturgical_events`), aparece su nombre, descripción y un botón **"Ver playlist sugerida"** que abre la playlist asociada.
  - Si no, el sistema calcula la festividad o el tiempo litúrgico (Adviento, Cuaresma, etc.) usando el calendario católico romano para Argentina.
  - Si es feria, muestra el tiempo litúrgico vigente.
- **Novedades**: tarjetas con `featured_content` activos (ventana de fecha vigente).
- **Accesos rápidos**: tres tarjetas grandes — Canciones / Playlists / Parroquias.

---

## 3. Catálogo de canciones (`/canciones`)

- Buscador en la cabecera: filtra por título o fragmento de letra. Submit recarga la página con `?q=...`.
- Lista de canciones con número, título, autor (en pantallas grandes) y al final:
  - **Badges** de capacidades (solo aparecen los que aplican, con tooltip):
    - 🎵 *"Tiene acordes"* — la canción incluye marcadores de acordes.
    - ▶ *"Tiene video de YouTube"* — hay un link de referencia.
    - 📄 *"Tiene partitura o archivos"* — hay archivos asociados publicados.
    - ❤ *"En tus favoritos"* — solo si ya la marcaste.
  - **Botón "⋯"** *("Más acciones")* que abre el menú contextual de la fila.

### 3.1. Menú "⋯" de cada canción

| Ítem                         | Acción                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Agregar a playlist           | *(deshabilitado por ahora)* — disponible cuando entre login. Tooltip: "Iniciá sesión…".        |
| Ver canción                  | Abre `/canciones/[slug]`.                                                                    |
| Compartir                    | Usa el share nativo del SO si está disponible; si no, copia el enlace al portapapeles.       |
| Agregar / Quitar de Mis favoritos | Toggle del corazón. Persiste en el navegador.                                           |
| Quitar de esta playlist      | Solo aparece si estás dentro de una playlist y tenés permisos sobre ella.                    |

---

## 4. Vista de canción (`/canciones/[slug]`)

- **Cabecera**: número, título, autor y **chips de categorías litúrgicas** (puede haber una o varias: Entrada, Comunión, Mariana, etc.).
- **Botón "Descargar QR"** (arriba a la derecha): genera un código QR con la URL de esta canción. Se descarga como PNG o SVG.
- **Toolbar** con los controles de canto (orden de izquierda a derecha):

| Control                                      | Tooltip                                                       | Qué hace                                                                |
| -------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| "Mostrar acordes" / "Ocultar acordes"        | (label visible)                                               | Alterna acordes sobre la letra. Deshabilitado si la canción no tiene.  |
| Selector de tono ( **−** … **+** )           | "Bajar un semitono" / "Subir un semitono"                     | Transpone los acordes en tiempo real.                                    |
| "Restablecer"                                | (label visible)                                               | Vuelve al tono original. Aparece solo si transpusiste.                   |
| Modo coro                                    | "Mantiene la pantalla encendida durante la celebración"       | Solicita Wake Lock para que el dispositivo no se apague.                |
| "Reproducir"                                 | (label visible)                                               | Reproduce YouTube o un audio (mp3/ogg). Si hay solo una opción la inicia directo; si hay varias abre un menú para elegir. Solo aparece si la canción tiene al menos una. |
| "Descargar archivos"                          | (label visible)                                               | Lista partituras y otros adjuntos descargables, e incluye "Imprimir con acordes #" / "Imprimir sin acordes" (CU-10). La opción "con acordes" solo aparece si la canción tiene acordes y estás autenticado. La impresión respeta la transposición y el sistema de cifrado actuales. |

- **Letra**: se muestra centrada con tipografía Cardo. Si los acordes están activados, aparecen alineados sobre la palabra correspondiente.
- **Persistencia del tono**: el tono elegido se guarda por canción en el navegador (anónimo). Cuando entre el login, las preferencias se sincronizarán con la cuenta.
- **Navegación dentro de playlist**: si entraste desde una playlist (URL con `?pl=...&parroquia=...`), abajo aparecen botones **"← Anterior"** y **"Siguiente →"** con la canción adyacente.

---

## 5. Listado de playlists (`/playlists`)

- Tarjetas con nombre, parroquia, fecha (si aplica) y descripción.
- Click en cualquier tarjeta abre `/playlists/[parroquia]/[playlist]`.

## 6. Vista de playlist (`/playlists/[parroquia]/[playlist]`)

- Breadcrumb: **← Playlists · [Parroquia]**.
- Cabecera: nombre, fecha, descripción.
- **Botón "Descargar QR"** arriba a la derecha.
- **Toolbar de la playlist**:

| Botón     | Tooltip cuando está deshabilitado                  | Qué hace                                                            |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Agregar   | "Disponible al iniciar sesión como coordinador"    | *(pendiente)* — abrirá un buscador para sumar canciones.             |
| Editar    | "Disponible al iniciar sesión como coordinador"    | *(pendiente)* — abrirá un diálogo para reordenar y eliminar canciones. |
| Ordenar   | "Orden actual: [opción]"                           | Abre menú con opciones: **Orden personalizado**, **Número**, **Título**, **Categoría**, **Autor**, **Agregado recientemente**. La elección se guarda por playlist en el navegador. |
| Nombre    | "Disponible al iniciar sesión como coordinador"    | *(pendiente)* — permitirá renombrar la playlist.                     |

- **Lista de canciones**: numeradas según la posición de la playlist. Cada fila tiene los mismos badges y menú "⋯" que el catálogo (ver §3). En contexto de playlist, el menú incluirá "Quitar de esta playlist" cuando el usuario tenga permisos.

---

## 7. Listado de parroquias (`/parroquias`)

- Tarjetas con nombre, dirección, ciudad y descripción.
- Click → `/parroquias/[slug]`.

## 8. Vista de parroquia (`/parroquias/[slug]`)

- Cabecera con nombre, dirección, descripción.
- **Botón "Descargar QR"** arriba a la derecha — útil para imprimir y pegar en la entrada de la iglesia.
- **Sección "Playlists"** con todas las playlists públicas de la parroquia.

---

## 9. Perfil (`/perfil`)

- **Modo Invitado** (sin sesión, hoy siempre):
  - Saludo "Invitado", explicación de qué se desbloquea al iniciar sesión.
  - Botón "Ingresar con Google" *(deshabilitado hasta que se habilite el login)*.
  - Atajos a Canciones y Playlists.
- **Modo Autenticado** (cuando entre login):
  - Avatar, nombre, email.
  - Sección "Mi parroquia" con la parroquia vinculada o el aviso de que no la vinculaste.

---

## 10. Diálogo de QR

Aparece al hacer clic en cualquier botón **"Descargar QR"**.

- Muestra el código QR generado para la URL actual.
- Debajo del QR, la URL en texto.
- Dos botones: **"Descargar PNG"** y **"Descargar SVG"**.
- Cerrar: **ESC**, click fuera, o el "✕".

---

## 11. Atajos de teclado

| Atajo                | Acción                                |
| -------------------- | ------------------------------------- |
| **Ctrl/Cmd + K**     | Abrir el diálogo de búsqueda global.   |
| **ESC**              | Cerrar diálogos/menús abiertos.        |

---

## 12. Glosario rápido

- **Cancionero**: el catálogo completo de canciones publicadas.
- **Playlist**: una selección ordenada de canciones, asociada a una parroquia. Tiene URL pública compartible y se puede generar QR.
- **Parroquia**: una comunidad parroquial con sus playlists.
- **Festividad**: evento del calendario litúrgico (solemnidad, fiesta, memoria) que se muestra en la home con su playlist sugerida cuando aplica.
- **Tiempo litúrgico**: período del año litúrgico (Adviento, Navidad, Cuaresma, Pascua, Tiempo Ordinario). Se calcula automáticamente.
- **Modo coro**: bloquea la pantalla del dispositivo para que no se apague durante la celebración.
- **Tono / Transposición**: cambiar la tonalidad de los acordes manteniendo la relación armónica. ± semitono por clic.
- **Acorde**: en la letra, los acordes se marcan como `[Acorde]`. Por ejemplo: `[Re]Vienen con alegría` significa que sobre la sílaba "Vie" entra el acorde Re. Soporta cifrado latino (Do, Re, Mi…) e inglés (C, D, E…).
- **Favoritos**: cualquier canción, playlist o parroquia que marcaste con el ❤. Hoy se guardan en el navegador; en el futuro, en tu cuenta.
- **QR**: código que apunta a la URL canónica de la página. Útil para pegar en boletines, en la iglesia, o compartir en pantalla.
