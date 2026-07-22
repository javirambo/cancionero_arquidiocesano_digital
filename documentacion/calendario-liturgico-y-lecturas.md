# Calendario litúrgico y lecturas

Documento único de referencia para el calendario litúrgico (nombre del día, tiempo,
color, rango, ciclo) y el **leccionario** (texto de las lecturas de la Misa) del proyecto.

Reemplaza a los antiguos `servicios-calendarios-liturgicos.md` y
`analisis-curas-calendario-liturgico.md`.

---

## 1. Propósito y arquitectura de 3 capas

El calendario litúrgico se resuelve combinando tres fuentes, con **precedencia**:

```
edición manual (fila locked)  >  curas.com.ar (fila importada)  >  romcal (base calculada)
```

- **romcal** — capa **base**: calcula el calendario completo de cualquier año (nombre,
  tiempo litúrgico, rango, ciclo A/B/C, color). Nunca tiene huecos. Es la fuente de los
  campos que curas no da estructurados (rango como enum, ciclo) y de los días que curas
  no publica (ver §6).
- **curas.com.ar** — capa de **lecturas**: aporta el **texto** del leccionario (primera
  lectura, salmo, segunda lectura, aleluya, evangelio) en español, que romcal **no** provee,
  más la celebración/color/tiempo del día. Se materializa en la tabla `liturgical_readings`
  vía un script de ingesta anual.
- **edición manual** — capa de **corrección**: un CRUD de admin permite corregir o dar de
  alta filas de `liturgical_readings` (p.ej. los días especiales que curas no cubre). Esas
  filas se marcan `locked=true` para que la re-ingesta anual **no las pise**.

> Nota de storage: "manual" y "curas" viven en la **misma** fila de `liturgical_readings`
> (una por `(event_date, reading_set)`); editar a mano modifica esa fila y le pone `locked`.
> O sea, en la práctica hay 2 capas de datos: `liturgical_readings` (importada o editada) y
> romcal (calculada). El merge por `event_date` las une.

**Estado de implementación:**
- ✅ romcal ([lib/liturgical.ts](../lib/liturgical.ts)) + tabla `liturgical_readings` (mig. `0056`, poblada con 2026).
- ✅ API de merge ([lib/calendario.ts](../lib/calendario.ts): `getDiaLiturgico`, `getMesLiturgico`).
- ✅ CRUD de admin en `/admin/lecturas` (edición manual con flag `locked`); el script de ingesta respeta `locked`.
- ⚠️ La columna `locked` la crea la migración `0057`: **aplicarla** para habilitar el bloqueo (hasta entonces el CRUD falla al guardar y la ingesta avisa que no puede leer `locked`).

---

## 2. Capa base — romcal

Calendario católico-romano, locale español, con santoral argentino.

**Stack:** [`romcal@3.0.0-dev.125`](https://github.com/romcal/romcal) +
[`@romcal/calendar.argentina@3.0.0-dev.125`](https://www.npmjs.com/package/@romcal/calendar.argentina).

**Por qué:**
- Nombres ya traducidos al español ("5º domingo de Pascua", "Lunes de la 5ª semana de Pascua").
- Santoral argentino: Nuestra Señora de Luján, Beato Ceferino Namuncurá, etc.
- Sin dependencia HTTP — todo se calcula en el server.
- Cobertura de cualquier año (calcula fiestas móviles).
- Open source (MIT).

> **⚠️ Versiones pinneadas exactas (sin caret).** El tag `dev` de romcal v3 se actualiza y
> puede traer breaking changes entre `dev.X`. Cuando salga `3.0.0` estable, re-pinnear y
> pasar a caret (`^3.0.0`).

### Uso

```ts
import { Romcal } from "romcal";
import { Argentina_Es } from "@romcal/calendar.argentina";

const romcal = new Romcal({ localizedCalendar: Argentina_Es, scope: "gregorian" });
const cal = await romcal.generateCalendar(2026);
const day = cal["2026-05-03"][0];
// day.name → "5º domingo de Pascua" · day.rank → "SUNDAY" · day.seasonNames → ["Pascua"]
```

### API

`generateCalendar(year)` devuelve `Record<"YYYY-MM-DD", LiturgicalDay[]>`. Cada día puede
tener varias entradas (memoria opcional + feria); la primera es la de mayor precedencia.

Campos relevantes de cada `LiturgicalDay`: `date`, `name`, `rank`
(`SOLEMNITY | SUNDAY | FEAST | MEMORIAL | OPTIONAL_MEMORIAL | WEEKDAY`), `rankName`,
`precedence`, `seasons` (claves canónicas), `seasonNames` (en español), `colors`/`colorNames`,
`cycles` (ciclo dominical A/B/C, ferial 1/2, semana del salterio), `martyrology`.

### Mapeo de `rank` a número (interno)

```ts
const TYPE_RANK = { SOLEMNITY: 1, SUNDAY: 2, FEAST: 3, MEMORIAL: 4, OPTIONAL_MEMORIAL: 5, WEEKDAY: 6 };
```

### Cache

[lib/liturgical.ts](../lib/liturgical.ts) cachea el calendario completo del año en memoria
(`Map<year, calendar>`), reutilizado entre requests en SSR.

### Ejemplos verificados (2026, calendario argentino, locale es)

| Fecha | rank | name |
|---|---|---|
| 2026-05-03 | SUNDAY | 5º domingo de Pascua |
| 2026-05-08 | SOLEMNITY | Nuestra Señora de Luján, Patrona de Argentina |
| 2026-08-15 | SOLEMNITY | La Asunción de la Santísima Virgen María |
| 2026-08-26 | OPTIONAL_MEMORIAL | Beato Ceferino Namuncurá |
| 2026-12-08 | SOLEMNITY | Inmaculada Concepción de María |
| 2026-12-25 | SOLEMNITY | Navidad |

---

## 3. Capa de lecturas — curas.com.ar

romcal no provee el **texto** del leccionario en español. curas.com.ar sí, y se obtiene por
scraping (script de ingesta anual). Fecha de relevamiento del sitio: 2026-07-21.

### 3.1 Conclusión

- Se pueden obtener todos los días del año de forma programática; hay una regla general clara.
- El sitio **no tiene API**: es HTML estático + JS del lado del cliente. Los datos del
  calendario están en archivos **`.js` (uno por mes)** y las lecturas en **`.htm` (uno por
  celebración)**.
- Estrategia: **scraper en dos capas**:
  1. Parsear los 12 `ordo_{mes}_{año}.js` → por cada día: celebración, color y las **URLs de
     los `.htm`** de lecturas.
  2. Descargar y parsear cada `.htm` de leccionario → el texto de las lecturas.
- **Los nombres de los `.htm` no son 100% derivables** de la fecha (mezclan abreviaturas del
  santoral, ferias, dominicales). La forma robusta es **extraer los links del propio `.js`**.

### 3.2 Arquitectura del sitio

- `https://curas.com.ar/wp/` es un WordPress (portada). El "Ordo" (calendario) se sirve aparte
  como HTML clásico con **frames**. La página del mes:
  `https://www.curas.com.ar/Calendario/ordo_7_2026.html` (7 = julio). Su contenido lo genera
  un `<script src="ordo_7_2026.js">`.
- Patrón de URL: `https://www.curas.com.ar/Calendario/ordo_{MES}_{AÑO}.js` (MES = 1..12).

### 3.3 Estructura del `.js` del mes

Tres bloques:

1. **Cabecera**: `let nroMes`, `let anio`, `var fecha = new Date('July 1, 2026 ...')`,
   `var dia_inicial = fecha.getDay()`. **Ojo:** `ordo2` se declara con `let`, así que en un
   sandbox `vm` **no** queda colgado del global — hay que leerlo evaluando la expresión
   `ordo2` en el mismo contexto (el script de ingesta ya lo maneja).
2. **Array `ordo2`** — una entrada por día, con 10 posiciones fijas:

   | Índice | Contenido |
   |---|---|
   | `[0]` | **Celebración** (incluye el **color** entre paréntesis: `(Verde)`, `(Rojo)`, `(Blanco)`, `(Morado)`, a veces `(Morado o Rosado)`) |
   | `[1]`/`[2]` | Biografías del santo (+ link) |
   | `[3]`/`[4]` | Misa (a elección / de la memoria) (+ link al **Misal**) |
   | `[5]` | **Leccionario de la memoria** (+ link `.htm`) |
   | `[6]` | **Leccionario del Propio / tiempo / feria** (+ link `.htm`) |
   | `[7]`/`[8]`/`[9]` | Breviario / Vísperas / texto aclaratorio |

   Las lecturas de cada día están en `[5]` (memoria) y/o `[6]` (principal) como
   `"texto".link("../Leccionarios/.../Xxxx.htm")`.

3. **Overrides del santoral**: bloque de `if` que sobreescribe entradas de `ordo2` según la
   precedencia litúrgica (fiestas móviles, si un santo cae en domingo, etc.). **El `.js` ya
   resuelve la precedencia**: el resultado final está en `ordo2` después de aplicar todos los
   `if`. Por eso la ingesta **ejecuta** el `.js` (no lo parsea con regex).

### 3.4 Estructura del `.htm` de leccionario

HTML plano y regular. Reglas de parsing (implementadas en el script):

- **Tiempo litúrgico y día**: primer bloque `<p align="center">`. El tiempo va en un
  `<font color="#FF0000">` (santoral/solemnidades, ej. "OCTAVA DE LA NATIVIDAD DEL SEÑOR")
  o, en ferias, como primera línea en `<b>` (ej. "TIEMPO DE NAVIDAD", con la fecha
  "DÍA 2 DE ENERO" aparte).
- **Secciones**: la 1ª/2ª lectura traen su `<b>Lectura de… / Principio de… / Comienzo de…</b>`;
  `SALMO`, `ALELUIA`/`ALELUYA` y `EVANGELIO` se detectan por su etiqueta (que puede venir en
  mayúsculas o como `Salmo</b>` / `Evangelio</b>`). **Ojo:** en Cuaresma no hay "Aleluia".
- **Cita bíblica**: el `<font color="#FF0000">` que sigue al encabezado (ignorando las
  antífonas, que son rojas **e itálicas**).
- **Cuerpo**: líneas separadas por `<br>`; `<br><br>` marca párrafo. Los saltos de línea del
  HTML fuente (`\r\n`) son *soft-wrap* → se colapsan a espacio.
- **Salmo**: `{ref, response, stanzas[]}` — la respuesta es el `<i>` tras la primera `R.`.
- **El color litúrgico NO está en el `.htm`** — viene del `.js` (`ordo2[0]`).

### 3.5 Convención de nombres de los `.htm`

| Carpeta | Uso | Ejemplo |
|---|---|---|
| `/Leccionarios/Tiempos/{Tiempo}/` | Ferias de tiempos fuertes | `Tiempos/Navidad/L3112.htm` |
| `/Leccionarios/Ferial/Top/` | Ferias del T.O. par | `L15mtstop.htm` |
| `/Leccionarios/Dominical/` | Domingos | `L14dgotoA.htm` |
| `/Leccionarios/Santoral/{MM mes}/` | Santos | `Santoral/07julio/Lsgoap.htm` |

> **Veredicto:** las ferias del Tiempo Ordinario son derivables por fórmula, pero **el santoral
> usa abreviaturas ad-hoc** que no se derivan de la fecha. Por eso la vía confiable es **leer
> los links del `.js`**, no reconstruir nombres (generaría 404).

### 3.6 Pipeline de extracción (script de ingesta anual)

Implementado en [scripts/import-lecturas.ts](../scripts/import-lecturas.ts):

1. Descargar los 12 `ordo_{1..12}_{año}.js`.
2. **Ejecutar cada `.js` en un sandbox `vm`** con `document.write` y `String.prototype.link`
   mockeados → materializar `ordo2` **ya con los overrides aplicados** (no reimplementa la
   precedencia litúrgica).
3. Por día extraer: fecha, celebración (`[0]`), color (paréntesis de `[0]`) y las URLs de
   lecturas (`[5]`/`[6]`). **Solo se aceptan links a `/Leccionarios/`** (algunos días especiales
   traen link a Misal o a Normas → se descartan).
4. Descargar y **deduplicar** cada `.htm`.
5. Parsear el `.htm` (§3.4) → los jsonb.
6. `upsert` idempotente en `liturgical_readings` por `(event_date, reading_set)`, guardando
   `source_url` + `source_hash`.

Buenas prácticas: throttling suave (`User-Agent`, ~400 ms entre requests — el servidor es
chico), dedup de `.htm`, hash para detectar cambios.

---

## 4. Modelo de datos y merge

### Tabla `liturgical_readings` (migración `0056`)

Ver la definición completa en [modelo_de_datos.md](modelo_de_datos.md#liturgical_readings).
Resumen: una fila por `(event_date, reading_set)` con `reading_set ∈ ('principal','memoria')`;
`celebration`, `color`, `liturgical_time`, `day_label`; las 5 secciones en jsonb
(`first_reading`, `psalm`, `second_reading`, `gospel_accl`, `gospel`); y `source_url` +
`source_hash` para trazabilidad y re-ingesta idempotente.

> **Columna `locked` (migración `0057`):** `locked boolean not null default false`. Las filas
> editadas a mano se marcan `locked=true` y el script de ingesta **las excluye** del upsert (no las
> pisa). El admin puede des-bloquearla para que la próxima ingesta la retome desde la fuente.

### Merge por `event_date`

La API de calendario ([lib/calendario.ts](../lib/calendario.ts): `getDiaLiturgico(fecha)` y
`getMesLiturgico(año, mes)`) une romcal + `liturgical_readings` por fecha, con precedencia por campo:
- `nombre/tiempo/color`: de la fila `liturgical_readings` si existe; si no, de romcal.
- `rango/ciclo`: siempre de romcal (curas no los da estructurados).
- `lecturas`: de la fila (null si el día no tiene fila — p.ej. los 6 especiales de §6).
- `fuente`: `'manual'` (fila locked), `'curas'` (importada) o `'romcal'` (sin fila).

---

## 5. Edición manual (CRUD) y actualización anual

**CRUD de admin** (`/admin/lecturas`): lista el mes con el calendario de romcal y el estado de cada
día (con lecturas / sin lecturas / bloqueada), y permite editar o dar de alta las lecturas de una
fecha —incluidos los 6 días que curas no cubre (§6)— vía `/admin/lecturas/[fecha]`. Al guardar, la
fila queda `locked` (editable con un toggle) para que la re-ingesta no la pise. La página nueva se
alcanza desde la tarjeta "Lecturas Litúrgicas" en `/admin`. RLS: lectura pública, escritura solo
`is_editor()` / `is_admin()`.

**Actualización anual del leccionario (la corre un admin, no hay botón):**

```bash
npx tsx scripts/import-lecturas.ts --year=2027 --apply
```

- Requiere en `.env.local`: `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`) y
  `SUPABASE_SERVICE_ROLE_KEY`.
- Sin `--apply` corre en **dry-run** (baja y parsea, no escribe).
- Es **idempotente** (`upsert` por `(event_date, reading_set)`), tarda ~3-4 min, y **respeta
  las filas `locked`** (no pisa las ediciones manuales).
- Flags útiles para probar: `--month=N`, `--limit=N`.

---

## 6. Cobertura conocida y huecos (ingesta 2026)

Resultado de la ingesta 2026: **373 filas** (359 `principal` + 14 `memoria`), todas con primera
lectura, salmo y evangelio; segunda lectura solo en domingos/solemnidades. Huecos, por límites
de la **fuente** (no del parser):

- **6 días especiales sin fila** porque curas.com.ar no publica su leccionario en el slot
  estándar `[5]`/`[6]` (linkean a Misal/Normas): **Miércoles de Ceniza** (18/2), **Triduo
  Pascual** (Jueves/Viernes/Sábado Santo, 2-4/4), **Domingo de Pascua** (5/4) y **1º de
  Adviento** (29/11). Para esos días **romcal igual da el calendario**; las lecturas, si se
  quieren, se cargan por el CRUD.
- **~42 días de Cuaresma sin `gospel_accl`**: en Cuaresma no se canta "Aleluia" (se reemplaza
  por otra aclamación que el script hoy no captura). El resto de las secciones sí está.

---

## 7. Riesgos y consideraciones

1. **Por año**: los `.js` están hardcodeados por año (`new Date('July 1, 2026')`, `anio=2026`).
   Cada año hay `ordo_{mes}_{año}.js` distintos; el script parametriza `--year` y se re-corre.
2. **Fragilidad del scraping**: cualquier cambio de maquetación del sitio rompe el parser.
   `source_hash` permite detectar cambios en un `.htm`.
3. **Nombres no derivables** (santoral): confiar en los links del `.js`, no en fórmulas.
4. **Licencia**: el contenido tiene derechos de autor (ver §8).
5. **Alternativa a futuro**: litcal (§9) planea leccionario en español; si lo liberan, evita el
   scraping. Hoy está roto para `es`.

---

## 8. Derechos de autor y permisos (IMPORTANTE)

> ⚖️ **No es asesoría legal; es orientación práctica.** Para reproducir el texto de las lecturas
> dentro de la app conviene una **autorización escrita** del titular.

### 8.1 El mito "es del pueblo / lo hace el Vaticano, entonces es libre"

La liturgia es de la Iglesia y para el pueblo, pero **eso no la vuelve dominio público**. El
derecho de autor no protege "la idea" ni la Biblia en abstracto, sino la **traducción concreta**
a un idioma, que es una **obra derivada con autor y titular de derechos**. El Vaticano
(*Libreria Editrice Vaticana*) tiene copyright sobre la *editio typica* latina; cada
**traducción vernácula** requiere aprobación de Roma, pero **los derechos quedan en la
Conferencia Episcopal del país** (o en la editorial a la que se los cedan). **No son libres.**

### 8.2 Quién tiene los derechos en el caso argentino (los textos de curas.com.ar)

Las lecturas usan la traducción **"El Libro del Pueblo de Dios"** (Levoratti–Trusso), oficial de
la Conferencia Episcopal Argentina. Hay **dos titulares superpuestos**:

| Qué | Titular | Dónde |
|---|---|---|
| **La traducción bíblica** (texto de las lecturas) | **Fundación Palabra de Vida** + **Editorial Verbo Divino** (ed. revisada 2015) | https://verbodivino.org/ |
| **El Leccionario** (selección/ordenamiento) y el **Ordo/Calendario** | **Comisión Episcopal de Liturgia – CEA** (se edita y **se vende**) | https://www.liturgiacea.org/portal/ · https://episcopado.org/ |

Que el Leccionario se venda confirma que **no es de libre reproducción**.

⚠️ **curas.com.ar tampoco es dueño de esos textos** (su pie dice solo `Copyright © Curas.com.ar`);
son un **re-publicador**. Por eso **pedirles permiso solo a ellos no alcanza**.

### 8.3 Dónde preguntar

1. **curas.com.ar** — bajo qué permiso publican: **info@curas.com.ar**.
2. **Comisión Episcopal de Liturgia (CEA)** — titular del Leccionario/Ordo:
   https://www.liturgiacea.org/portal/ · https://episcopado.org/
3. **Editorial Verbo Divino / Fundación Palabra de Vida** — titulares de la traducción:
   https://verbodivino.org/

### 8.4 Recomendación práctica

- **Uso interno/litúrgico en una parroquia** suele estar tolerado. **Republicar el corpus
  completo dentro de una app** —y más con arista comercial o distribución masiva— conviene
  **consultarlo por escrito antes**.
- **Camino más limpio**: el calendario ya lo da romcal (libre, MIT). Para las **lecturas**, o se
  pide **permiso formal** a la CEA / Verbo Divino, o se muestra solo la **referencia** (ej.
  "Jn 1, 1-18") con link a la fuente, **sin copiar el texto**.

### 8.5 Fuentes del relevamiento

- Libro del Pueblo de Dios: https://www.bibleget.io/versiones-de-la-biblia/blpd/
- Comisión Episcopal de Liturgia CEA: https://www.liturgiacea.org/portal/
- Conferencia Episcopal Argentina: https://episcopado.org/
- Editorial Verbo Divino: https://verbodivino.org/

---

## 9. Apéndice — alternativas evaluadas (para el calendario)

- **litcal** (John Romano D'Orazio) — REST, open source. **Locale `es` roto** en el servidor
  (HTTP 503: falta el archivo de leccionario) y **sin calendario nacional argentino**. A
  re-evaluar cuando arreglen el español (es la más completa conceptualmente). Repo:
  https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI
- **Catholic Readings API** — GitHub Pages, cobertura de español dudosa (no probado a fondo).
- **Church Calendar API (inadiutorium)** — inglés/checo, sin español.
- **Descartados**: Dominicos.org / Ciudad Redonda / ACI Prensa (solo HTML, sin API);
  vercalendario.info (app de pago); EWTN (solo web); romcal v1.3 (sin español — reemplazado
  por v3).
