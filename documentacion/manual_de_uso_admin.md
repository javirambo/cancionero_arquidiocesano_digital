# Manual de uso — Panel de administración

Este documento explica cómo usar el panel `/admin` del Cancionero Arquidiocesano. Está pensado para **coordinadores de parroquia, editores de la Comisión Litúrgico-Musical y administradores**. Para el manual del usuario común (fiel/músico), ver [`manual_de_uso.md`](manual_de_uso.md).

> **Convención:** lo que aparece **entre comillas** es el texto literal que se muestra en pantalla.

---

## 1. Roles y accesos

El panel admin está protegido. Cada rol ve solo lo que le corresponde.

| Rol             | Cómo se asigna                                  | Qué ve en `/admin`                                                  |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| **admin**       | Rol global — solo otro admin lo asigna.         | Todo: Parroquias, Usuarios, Canciones, Playlists, Anuncios.         |
| **editor**      | Rol global — el admin lo asigna.                | Canciones (con poder de aprobar/rechazar), Playlists, Anuncios.     |
| **coordinator** | Rol por parroquia — el admin lo asigna.         | Anuncios de sus parroquias.                                          |
| Otros           | (member, anónimo)                               | No tienen acceso al panel; entran a `/admin` y los manda al inicio. |

Si entrás sin sesión, te lleva a `/perfil` para iniciar.

---

## 2. Cómo entrar

1. Iniciá sesión con Google desde el menú **Mi cuenta → Ingresar con Google**.
2. Andá a `/admin`. Vas a ver tarjetas grandes con cada sección a la que tenés acceso. Tocá una para entrar.

---

## 3. Canciones (`/admin/canciones`)

Listado completo del catálogo con filtros por estado.

### 3.1. Listado

- **Tabs** arriba para filtrar por estado: **Todas · Borradores · En revisión · Publicadas · Rechazadas · Archivadas**.
- **Buscador** "Buscar por título o número…". Si escribís solo dígitos (ej: `42`), busca canciones con ese número exacto **o** con `42` en el título; si escribís texto, busca solo por título.
- Cada fila muestra: número (si tiene), título, categoría, íconos de capacidades (🎵 acordes, ▶ video, 📄 archivos), fecha de modificación y un **badge chico** con el estado (Borrador / En revisión / Publicada / Rechazada / Archivada).
- Botón **"Editar"** a la derecha de cada fila → abre el editor.
- Arriba a la derecha del listado, botón **"+ Nueva canción"**.

### 3.2. Crear una canción

Tocás **"+ Nueva canción"** y se crea automáticamente una canción vacía con título "Nueva canción" en estado Borrador. Te lleva directo al editor para que la completes.

### 3.3. Editor de canción (`/admin/canciones/[id]/editar`)

Arriba aparece la **barra de estado** con el badge de la canción. Si la canción está **publicada**, a la derecha hay un **icono de tacho rojo** para despublicarla (ver §4 más abajo).

Si la canción está **rechazada**, debajo del estado aparece un banner rojo con las **"Notas del editor"** que el editor escribió al rechazarla.

El editor está organizado en **tres acordeones**:

#### a) Metadatos *(abierto por defecto)*

- **Título** *(obligatorio)*
- **Número en cancionero**
- **Tonalidad original** (ej: `G`, `Em`, `F#m`)
- **Autor** (lista; "— Sin autor —" si no hay)
- **Categoría litúrgica** (lista; "— Sin categoría —")
- **Tempo (BPM)**
- **Link de YouTube**
- **Etiquetas** (separadas por coma)

#### b) Letra y acordes *(abierto por defecto)*

- Editor con sintaxis ChordPro: los acordes se escriben **entre corchetes**, por ejemplo `[Do]Vienen con alegría`.
- Resaltado de sintaxis para acordes.
- Botón **"+ Insertar acorde"**: abre un mini-diálogo para elegir nota (Do/Re/Mi… o C/D/E…) + sufijo (Mayor, m, 7, m7, maj7, sus4) y lo inserta donde está el cursor.
- Botón **"Vista previa"**: muestra la canción formateada con acordes encima de las sílabas.

#### c) Archivos *(cerrado por defecto)*

- Adjuntar **partituras (PDF)** y **audios (MP3 / OGG)**.
- Cada archivo lleva una etiqueta opcional.
- El sistema detecta el tipo automáticamente por la extensión.
- Lista de archivos cargados con: etiqueta, tipo, tamaño, estado (Publicado / Borrador) y botón para eliminar (con confirmación).

> **Importante:** los archivos siguen el mismo flujo editorial que la canción. Mientras la canción esté en Borrador o En revisión, sus archivos también lo están y **no se ven públicamente**. Cuando la canción se publica, los archivos también.

#### Botonera al pie

- **"Guardar"** (rojo, primario): persiste los cambios.
- **"Cancelar"**: vuelve al listado sin guardar.

---

## 4. Flujo editorial de canciones (CU-16)

El catálogo público solo muestra canciones **publicadas**. Para llegar ahí, una canción pasa por un flujo de revisión:

```
Borrador → En revisión → Publicada
              ↓
           Rechazada → (volver a editar) → En revisión → ...
```

### 4.1. Quién hace qué

| Estado actual          | Acción                                  | Quién lo hace        | Qué pasa                                                                                      |
| ---------------------- | --------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| Borrador / Rechazada   | **"Enviar a revisión"** (botón dorado)  | Coordinador          | Pasa a En revisión. Queda bloqueada para edición del coordinator hasta que el editor decida. |
| En revisión            | **"Retirar de revisión"**               | Coordinador          | Vuelve a Borrador para seguir editándola.                                                     |
| En revisión            | **"Aprobar y publicar"** (botón verde)  | Editor / Admin       | Pasa a Publicada. Se ve en el catálogo público. Queda guardada una versión histórica.         |
| En revisión            | **"Rechazar"** (botón con borde rojo)   | Editor / Admin       | Abre un diálogo donde **es obligatorio escribir notas** explicando qué corregir.              |
| En revisión            | **"Devolver a borrador"**               | Editor / Admin       | Equivalente a "Retirar" pero hecho por el editor.                                              |
| Publicada              | **🗑️ icono de tacho** (a la derecha del estado) | Editor / Admin       | Despublica la canción y la vuelve a Borrador. Útil si se detecta un error después de publicar. |

### 4.2. Editar una canción ya publicada

Las canciones publicadas las **edita directamente el Editor (o Admin)** sin volver a pasar por el flujo de revisión. El coordinator no puede editarlas.

Si el coordinator necesita corregir algo en una canción publicada, debe pedirle al editor que la **despublique** (icono tacho), y entonces vuelve a Borrador y el coordinator puede editarla y reenviarla a revisión.

### 4.3. Diálogo de rechazo

- Aparece al tocar **"Rechazar"** en una canción En revisión.
- Tiene un campo de notas **obligatorio** ("Faltan los acordes del estribillo, revisar la tonalidad, etc.").
- Botones: **"Cancelar"** y **"Confirmar rechazo"**.
- Cierre: **ESC**, click fuera o "Cancelar".
- Si la red falla al enviar, las notas se conservan para que no las pierdas.
- La canción rechazada le aparece al coordinator con el banner rojo de notas para que sepa qué corregir.

---

## 5. Playlists generales (`/admin/playlists`)

> Esta pantalla solo gestiona las **playlists arquidiocesanas** (las que se ven por defecto en todas las parroquias). Las playlists de cada parroquia se editan desde la página pública de la parroquia.

- Lista de playlists con `is_archdiocesan = true`, ordenadas por fecha del evento.
- Cada fila muestra: nombre, fecha del evento, visibilidad (Pública / No listada / Privada) y cantidad de canciones.
- Acciones por fila: **"Ver"** (página pública), **"Editar"** (va a la edición pública en `/playlists/[id]/editar`), **"Eliminar"** (con confirmación).
- Botón **"+ Nueva playlist pública"** arriba.

---

## 6. Parroquias (`/admin/parroquias`)

Solo accesible para **admin**.

### 6.1. Listado

Dos secciones:

1. **Pendientes de revisión** — parroquias creadas por coordinadores que el admin debe aprobar. Cada fila tiene:
   - **"Aprobar"** → pasa a Activa.
   - **"Rechazar"** → pasa a Inactiva (con confirmación).
2. **Todas** — parroquias activas o inactivas. Click en cualquier fila → editar.

Botón **"+ Nueva parroquia"** arriba.

### 6.2. Crear parroquia

Al crear, el formulario ofrece dos modos para autocompletar desde **OpenStreetMap**:

- **"Cerca mío (GPS)"** → usa tu ubicación actual y trae candidatos cercanos.
- **Buscador de texto** + botón **"Buscar"** → busca por nombre o dirección.

Click en cualquier candidato prellena nombre, dirección y ciudad. Después podés editar todo manualmente.

### 6.3. Campos del formulario

- **Nombre** *(obligatorio)*
- **Atajo** *(obligatorio)* — aparece en la URL pública (`/parroquias/[atajo]`). Se autogenera del nombre. Si ya existe uno igual, te avisa.
- **Dirección**, **Ciudad**, **Teléfono**, **Email**
- **Descripción** (textarea)
- **Estado**: Activa | Pendiente de revisión | Inactiva

Cambiar a **Inactiva** en una parroquia existente pide confirmación.

---

## 7. Anuncios (`/admin/anuncios`)

Pueden gestionarlo **admin, editor** (todos los anuncios) y **coordinator** (solo los anuncios de sus parroquias).

### 7.1. Listado

Tres secciones:

1. **Vigentes** — `inicio ≤ ahora ≤ fin`.
2. **Programados** — futuros (`ahora < inicio`).
3. **Vencidos** — pasados, mostrados al 60% de opacidad.

Cada fila muestra: título, ventana de fechas, prioridad (si no es 0), tipo de atajo (si tiene) y destinatarios (lista de parroquias o "Todas").

Botón **"+ Nuevo anuncio"** arriba.

### 7.2. Formulario de anuncio

- **Título** *(obligatorio)*
- **Cuerpo** (textarea, opcional)
- **Inicio** y **Fin** *(obligatorios, datetime)*. El sistema valida que **fin > inicio**.
- **Prioridad** (número, default `0`). A mayor número, aparece más arriba en la home.

#### Destinatarios

- Si sos admin/editor: elegís **"Todas las parroquias"** (anuncio global) o **"Parroquias específicas"** (selector con casillas).
- Si sos coordinator: el sistema te fuerza a "específicas" y solo te deja elegir tus parroquias. No podés crear anuncios globales.
- Si elegís "específicas", debés marcar al menos una parroquia.

#### Atajo (opcional)

El anuncio puede tener un link clickeable a un recurso. Tipo:

- **Ninguno** — anuncio solo informativo.
- **Canción / Playlist / Parroquia** — buscador con autocompletado, elegís el recurso.
- **Link externo** — pegás una URL.

#### Botones

- **"Crear"** (al crear) o **"Guardar"** (al editar).
- **"Cancelar"**.
- **"Eliminar"** (solo al editar, con confirmación). Borra el anuncio aunque esté vigente.

---

## 8. Usuarios (`/admin/usuarios`)

Solo accesible para **admin**.

- Buscador en vivo: filtra por email o nombre.
- Cada usuario aparece como fila colapsable. Al expandir:

### 8.1. Roles globales

Toggle chips para **admin** y **editor**. Reglas:

- No podés sacarte el rol **admin** a vos mismo.
- No podés sacarle **admin** al último admin del sistema.

### 8.2. Parroquias

Lista de parroquias en las que el usuario es miembro, con su rol (**member** o **coordinator**) y botón **"Quitar"**.

Selector + botón **"Agregar"** para vincularlo a una parroquia nueva.

### 8.3. Desvincular usuario

Botón al pie. Le quita todos los roles globales y todas las membresías de parroquia. **Las playlists personales se conservan.** Reglas iguales que para roles: no podés desvincularte a vos mismo ni desvincular al último admin.

---

## 9. Glosario admin

- **Borrador (`draft`)** — canción recién creada o editada por el coordinator. No se ve públicamente. El coordinator puede seguir editándola.
- **En revisión (`review`)** — el coordinator la envió al editor. Queda bloqueada para edición del coordinator hasta que el editor decida.
- **Publicada (`published`)** — aprobada por el editor. Se ve en el catálogo público y en las playlists.
- **Rechazada (`rejected`)** — el editor la rechazó con notas. Vuelve al coordinator para corregir y reenviar.
- **Archivada (`archived`)** — fuera de circulación. No se ve públicamente. Hoy no hay UI para archivar; queda como estado disponible en BD.
- **Versión** — cada vez que el editor aprueba una canción, queda registrada una "versión" histórica del contenido. Se preservan al despublicar.
- **`is_archdiocesan`** — flag de playlists creadas por la parroquia virtual "arquidiócesis". Aparecen por defecto en todas las parroquias sin necesidad de suscribirse.
- **Parroquia "pendiente"** — parroquia creada por un coordinator pero todavía no aprobada por un admin. No aparece en listados públicos.
- **Anuncio global** — sin parroquias destinatarias. Lo ven todos (anónimos incluidos). Solo lo crean admin/editor.
- **Anuncio dirigido** — con parroquias destinatarias. Solo lo ven los miembros (autenticados) de esas parroquias.
