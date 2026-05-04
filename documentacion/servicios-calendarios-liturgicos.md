# Servicios de Calendario Litúrgico (alternativas en español)

Investigación de proveedores de APIs / feeds para avisos litúrgicos, santoral y fiestas litúrgicas en español, como alternativa al proveedor actual.

Fecha de relevamiento: 2026-05-03

---

## ✅ Solución implementada

**Stack actual:** [`romcal@3.0.0-dev.125`](https://github.com/romcal/romcal) + plugin [`@romcal/calendar.argentina@3.0.0-dev.125`](https://www.npmjs.com/package/@romcal/calendar.argentina).

**Por qué:**
- Devuelve nombres ya traducidos al español ("5º domingo de Pascua", "Lunes de la 5ª semana de Pascua").
- Incluye santoral argentino: Nuestra Señora de Luján, Beato Ceferino Namuncurá, etc.
- Sin dependencia HTTP — todo se calcula en el server.
- Cobertura: cualquier año (calcula fiestas móviles).
- Open source (MIT).

**Detalle técnico:** ver sección "Implementación" más abajo.

---

## 🔍 Alternativas evaluadas

### 1. Liturgical Calendar API (litcal — John Romano D'Orazio)

- **URL:** https://litcal.johnromanodorazio.com/
- **Repo:** https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI
- **Tipo:** REST API, open source, gratuita.
- **Formatos:** JSON, XML, YAML, ICS.
- **Cobertura:** años 1970–9999, calcula fiestas móviles, solemnidades, fiestas y memorias según el Calendario Romano General.
- **JSON muy rico:** 547 eventos por año, lecturas del leccionario, color litúrgico, ciclo, semana del salterio, vigilias.
- **Endpoints principales:**
  - `/api/v5/calendar?year=YYYY&locale=XX` — calendario general
  - `/api/v5/calendar/nation/{NATION}` — calendario nacional
  - `/api/v5/calendar/diocese/{DIOCESE}` — calendario diocesano
  - `/api/v5/easter` — cálculo de fechas de Pascua

**❌ Por qué no se usa hoy:**

1. **Locale español está roto en el servidor.** Probado contra el endpoint real:
   ```bash
   curl "https://litcal.johnromanodorazio.com/api/v5/calendar?year=2026&locale=es"
   # → HTTP 503: "File ../jsondata/sourcedata/lectionary/sanctorum/es.json does not exist"
   ```
   Mismo error con `es_AR`, `es_MX`, `es_ES`. Solo `en` funciona (HTTP 200, ~480 KB).

2. **Sin calendario nacional argentino.** Solo VA, IT, US, CA, NL.

3. **Bus factor:** un único mantenedor.

**📌 Pendiente para revisar a futuro:** seguir su progreso. El soporte de español está planeado en su roadmap (los locales `es_AR`, `es_MX`, etc. ya están en la metadata, falta el archivo de leccionario). Cuando lo arreglen, vale la pena re-evaluar.

### 2. Catholic Readings API

- **URL:** https://cpbjr.github.io/catholic-readings-api/
- **Tipo:** REST gratis (GitHub Pages), open source.
- **Contenido:** lecturas diarias de Misa + santoral + calendario litúrgico.
- **Estado:** no probado en profundidad. Cobertura de español dudosa.

### 3. Church Calendar API (inadiutorium)

- **URL:** http://calapi.inadiutorium.cz/api-doc
- REST JSON, principalmente en inglés/checo. Sin español.

---

## ❌ Descartados

### Dominicos.org / Ciudad Redonda / ACI Prensa
Solo HTML, sin API. Útiles como fuente humana, no programática.

### vercalendario.info — Santoral Católico
App móvil de pago (USD 8/mes). Sin feed gratis.

### EWTN Español
Solo web, sin API pública.

### romcal v1.3 (versión anterior del proyecto)
- Era el stack original.
- Solo soporta locales `en`, `fr`, `it`, `pl`, `cs`, `sk`. **No tiene español.**
- Reemplazado por v3 (ver abajo).

---

## Implementación

### Stack y versiones

```json
{
  "dependencies": {
    "romcal": "3.0.0-dev.125",
    "@romcal/calendar.argentina": "3.0.0-dev.125"
  }
}
```

**⚠️ Versiones pinneadas exactas (sin caret).** El tag `dev` de romcal v3 se actualiza periódicamente y puede tener breaking changes entre dev.X. Cuando el proyecto upstream publique 3.0.0 estable definitivo, conviene re-pinnear.

### Uso

```ts
import { Romcal } from "romcal";
import { Argentina_Es } from "@romcal/calendar.argentina";

const romcal = new Romcal({
  localizedCalendar: Argentina_Es,
  scope: "gregorian",
});

const cal = await romcal.generateCalendar(2026);
const day = cal["2026-05-03"][0];
// day.name        → "5º domingo de Pascua"
// day.rank        → "SUNDAY"
// day.rankName    → "Domingo"
// day.seasonNames → ["Pascua"]
```

### API

`generateCalendar(year)` devuelve `Record<"YYYY-MM-DD", LiturgicalDay[]>`. Cada día puede tener múltiples entradas (memoria opcional + feria). El primero del array es el de mayor precedencia.

**Campos relevantes de cada `LiturgicalDay`:**
- `date`: fecha ISO `YYYY-MM-DD`.
- `name`: nombre completo en español.
- `rank`: `SOLEMNITY | SUNDAY | FEAST | MEMORIAL | OPTIONAL_MEMORIAL | WEEKDAY`.
- `rankName`: nombre del rango en español (`Domingo`, `Memoria`, etc.).
- `precedence`: granularidad fina de precedencia litúrgica (`PRIVILEGED_SUNDAY_2`, `PROPER_OF_TIME_SOLEMNITY_2`, etc.).
- `seasons`: claves canónicas del tiempo litúrgico (`EASTER_TIME`, `ORDINARY_TIME`, `ADVENT`, `LENT`, `CHRISTMAS_TIME`).
- `seasonNames`: nombres de los tiempos en español (`Pascua`, `Tiempo Ordinario`, `Adviento`, `Cuaresma`, `Navidad`, `Triduo Pascual`).
- `colors` / `colorNames`: color litúrgico canónico y traducido.
- `cycles`: ciclo dominical (`YEAR_A`/`B`/`C`), ciclo ferial (`YEAR_1`/`2`), semana del salterio.
- `martyrology`: array con datos del santo (cuando aplica).

### Mapeo de `rank` a número (interno del proyecto)

```ts
const TYPE_RANK = {
  SOLEMNITY: 1,
  SUNDAY: 2,
  FEAST: 3,
  MEMORIAL: 4,
  OPTIONAL_MEMORIAL: 5,
  WEEKDAY: 6,
};
```

Esto permite ordenar y comparar con un único número.

### Cache

`lib/liturgical.ts` cachea el calendario completo del año en memoria (`Map<year, calendar>`). En SSR se reutiliza entre requests. Si el server vive mucho tiempo, considerar invalidar al cambio de año (no implementado por ahora — un reinicio del proceso lo limpia).

### Ejemplos verificados (2026, calendario argentino, locale es)

| Fecha | rank | name |
|---|---|---|
| 2026-05-03 | SUNDAY | 5º domingo de Pascua |
| 2026-05-04 | WEEKDAY | Lunes de la 5ª semana de Pascua |
| 2026-05-08 | SOLEMNITY | Nuestra Señora de Luján, Patrona de Argentina |
| 2026-08-15 | SOLEMNITY | La Asunción de la Santísima Virgen María |
| 2026-08-26 | OPTIONAL_MEMORIAL | Beato Ceferino Namuncurá (junto a Miércoles de la 21ª semana del T. Ordinario) |
| 2026-12-08 | SOLEMNITY | Inmaculada Concepción de María |
| 2026-12-25 | SOLEMNITY | Navidad |
| 2026-04-05 | SOLEMNITY | Domingo de Pascua |

### Override por DB (CU-26)

La tabla `liturgical_events` tiene **prioridad** sobre lo que devuelve romcal cuando coincide la fecha. Ver `app/page.tsx` y CU-26 en `casos_de_uso.md`. Esto permite a admins cargar manualmente celebraciones locales (parroquiales o arquidiocesanas argentinas no cubiertas por el plugin).

---

## Pendientes / a revisar a futuro

1. **Fijar versión estable.** Cuando salga `romcal@3.0.0` definitivo (no `-dev.x`), actualizar y dejar caret (`^3.0.0`).
2. **Re-evaluar litcal** cuando arreglen el archivo de leccionario en español. Es la API más completa conceptualmente.
3. **Carga manual en `liturgical_events`** (CU-26) para fiestas pastorales argentinas no cubiertas: aniversarios diocesanos, fiestas patronales locales, etc.
