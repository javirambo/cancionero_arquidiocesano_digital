# Análisis técnico: extracción del calendario litúrgico de curas.com.ar

Fecha de relevamiento: 2026-07-21

Investigación derivada del experimento planteado en [temporal.md](temporal.md): entender cómo
funciona el sitio **curas.com.ar** para poder obtener el calendario litúrgico completo del año
(con sus **lecturas**) y llevarlo a una tabla en la base de datos.

> **Nota de contexto.** El proyecto ya calcula el *calendario* (nombre del día, tiempo litúrgico,
> color, rango, ciclo) con `romcal` — ver [servicios-calendarios-liturgicos.md](servicios-calendarios-liturgicos.md).
> Lo que romcal **no** provee y sí ofrece curas.com.ar es el **texto de las lecturas** (leccionario:
> primera lectura, salmo, segunda lectura, aleluya y evangelio) en español. Ese es el valor real de
> esta fuente para el proyecto.

---

## 1. Conclusión ejecutiva

- **Sí es posible** obtener todos los días del año de forma programática, y **sí existe una regla
  general** clara.
- El sitio **no tiene API**: es HTML estático + JavaScript del lado del cliente. Los datos "vivos"
  del calendario están dentro de archivos **`.js` (uno por mes)**, y las lecturas dentro de archivos
  **`.htm` (uno por celebración)**.
- La estrategia recomendada es un **scraper en dos capas**:
  1. Parsear los 12 `ordo_{mes}_2026.js` → obtener, por cada día, la celebración, el color y las
     **URLs de los `.htm`** de lecturas.
  2. Descargar y parsear cada `.htm` de leccionario → obtener el texto de las lecturas.
- **Advertencia importante:** los nombres de los `.htm` **no siguen una fórmula 100% derivable** de
  la fecha (mezclan abreviaturas del santoral, ferias, dominicales, etc.). La forma robusta es
  **extraer los links del propio `.js`**, no intentar construirlos por fórmula.

---

## 2. Arquitectura del sitio

### 2.1 Página principal y frame

- `https://curas.com.ar/wp/` es un WordPress (portada institucional).
- El "Ordo" (calendario) se sirve aparte, como HTML clásico con **frames**. La página del mes es:

  ```
  https://www.curas.com.ar/Calendario/ordo_7_2026.html      (7 = julio)
  ```

- El HTML del mes es un cascarón mínimo; su contenido lo genera un `<script>`:

  ```html
  <base target="Principal">
  <link href="../Estilos_ordo.css" rel="stylesheet" type="text/css">
  ...
  <script src="ordo_7_2026.js"></script>
  ```

- La **redirección "al día actual"** que menciona `temporal.md` es un ancla, no una API: el script
  emite un `<a name="N">` por cada día del mes, de modo que una URL como
  `ordo_7_2026.html#21` salta al **día 21**. La lógica que abre el mes/día corriente vive en el
  frameset contenedor; para la extracción **no es relevante**.

### 2.2 Un archivo `.js` por mes (verificado)

Existe un `.js` (y su `.html`) por cada mes de 2026. Verificado con HTTP 200 para los 12:

```
ordo_1_2026.js … ordo_12_2026.js   → todos HTTP 200
```

Patrón de URL general:

```
https://www.curas.com.ar/Calendario/ordo_{MES}_{AÑO}.js     MES = 1..12
```

---

## 3. Estructura interna del `.js` del mes (el corazón del calendario)

Ejemplo real: `ordo_7_2026.js` (julio 2026, 1007 líneas). Tiene tres bloques:

### 3.1 Configuración de cabecera

```js
let nroMes = 7;
let anio = 2026;
let anio_corto = anio - 2000;               // 26
var fecha = new Date('July 1, 2026 ...');    // day-of-week del 1° del mes
var dia_inicial = fecha.getDay();            // 0=domingo … 6=sábado
```

### 3.2 Array `ordo2` — una entrada por día del mes

Cada elemento del array es **un día**, con un esquema fijo de 10 posiciones (documentado en el
propio archivo):

| Índice | Contenido |
|---|---|
| `[0]` | **Celebración** (incluye el **color** entre paréntesis: `(Verde)`, `(Rojo)`, `(Blanco)`, `(Morado)`) |
| `[1]` | Biografía 1 (santo) + link |
| `[2]` | Biografía 2 |
| `[3]` | Misa a elección / del Propio del tiempo (+ link al misal) |
| `[4]` | Misa de la memoria (+ link) |
| `[5]` | **Leccionario de la memoria** (+ link `.htm`) |
| `[6]` | **Leccionario del Propio / del tiempo / feria** (+ link `.htm`) |
| `[7]` | Breviario / Liturgia de las Horas |
| `[8]` | Vísperas |
| `[9]` | Texto aclaratorio |

Ejemplo de una feria:

```js
[
  "Feria (Verde)",
  null, null,
  `...<font color="#FF0000">Misa: </font>` + " a elección".link("../Misal3/Misas3/Mdda3.htm#13"),
  null, null,
  `<font color="#FF0000">Lecturas: </font>` + "de la feria".link("../Leccionarios/Ferial/Top/L13mcstop.htm"),
  null, null
],
```

> **Clave para la extracción:** las lecturas de cada día están en `[5]` y/o `[6]` como
> `"texto".link("../Leccionarios/.../Xxxx.htm")`. El método `String.prototype.link()` genera un
> `<a href="...">`. Basta con capturar esas URLs con una regex sobre `.link("...")`.

### 3.3 Overrides del santoral (fiestas móviles / precedencia)

Después del array hay un bloque de **banderas** por santo. Cada santo del mes se activa o desactiva
según si su fecha cae en domingo (o Cuaresma), y si aplica **sobreescribe** la entrada del día:

```js
let diaSantiagoApostol = 25;
if (aux_fecha == 0) { sanSantiagoApostol = "No"; } else { sanSantiagoApostol = "Si"; }
...
if (sanSantiagoApostol == "Si") {
  ordo2[diaSantiagoApostol-1][0] = "Fiesta (Rojo)";
  ordo2[diaSantiagoApostol-1][1] = "Santiago".link(".../Biografias07.htm#25") + ", apóstol";
  ordo2[diaSantiagoApostol-1][6] = `...Lecturas: ` + "del Propio".link("../Leccionarios/Santoral/07julio/Lsgoap.htm");
}
```

Esto implica que el `.js` **ya resuelve la precedencia litúrgica** del año: no hace falta reimplementar
las reglas, el resultado final está en el `ordo2` **después** de aplicar todos los `if`.

### 3.4 Loop de render

Al final, un `for` recorre `ordo2` y escribe, por día:

- el ancla `<a name="{nro_dia}">`,
- el **día de la semana** (calculado con `dia % 7` a partir de `dia_inicial`),
- la **fecha** `d.m.aa`,
- y todos los campos no nulos de la entrada.

También agrega la regla especial "**Santa María en sábado**": si un día es "Feria (Verde)" y cae
sábado, muta la celebración y agrega la misa votiva de la Virgen.

---

## 4. Estructura del `.htm` de leccionario (las lecturas)

Ejemplo real: `.../Leccionarios/Tiempos/Navidad/L3112.htm`. Es HTML plano, sin CSS de datos, con
patrón muy regular y parseable:

```html
<title>Lecturas misa día VII octava de Navidad</title>
...
<p align="center"><b>TIEMPO DE NAVIDAD<br>
<font color="#FF0000">Día 31 de diciembre</font><br><br>
DIA VII DENTRO DE LA OCTAVA<br>DE NAVIDAD</b></p>

<!-- Antífona de entrada -->
<p align="right"><font ... color="#FF0000"><i>Recibieron la unción...</i></font></p>

<!-- Primera lectura -->
<b>Lectura de la primera carta de san Juan</b> <font color="#FF0000">2, 18-21</font><br>
... texto ...
<b>Palabra de Dios.</b>

<!-- Salmo -->
<b>SALMO</b> <font color="#FF0000">Sal 95, 1-2. 11-13</font><br>
<font color="#FF0000">R.</font> <i>Alégrese el cielo...</i>
... estrofas con R. ...

<!-- Aclamación -->
<b>ALELUIA</b> <font color="#FF0000">Jn 1, 14a. 12a</font><br> ...

<!-- Evangelio -->
<b>EVANGELIO</b>
<b><font color="#FF0000">+</font> Evangelio de nuestro Señor Jesucristo según san Juan</b>
<font color="#FF0000">1, 1-18</font><br> ... texto ...
```

### Reglas de parsing del `.htm`

- **Tiempo litúrgico y día:** primer bloque `<p align="center">` (ej. `TIEMPO DE NAVIDAD`,
  `Día 31 de diciembre`, y el nombre de la celebración).
- **Secciones:** delimitadas por los `<b>` en mayúsculas: `SALMO`, `ALELUIA`/`ALELUYA`, `EVANGELIO`,
  y por los encabezados en minúscula/mixto de la primera/segunda lectura
  (`Lectura de…`, `Lectura del…`).
- **Cita bíblica:** el `<font color="#FF0000">…</font>` que sigue inmediatamente a cada encabezado.
- **Cuerpo del texto:** líneas separadas por `<br>`; los `<br><br>` marcan párrafos.
- **Estribillo del salmo:** el `<i>…</i>` que sigue a la primera `R.`; las repeticiones se marcan
  con `<font color="#FF0000">R.</font>`.
- **El color litúrgico NO está en el `.htm`** — viene del `.js` (campo `[0]`, entre paréntesis).

Los `.htm` referencian `../../../../Font/Tamanio_letra2.js` (solo control de tamaño de fuente) — se
ignora.

---

## 5. Convención de nombres de los `.htm` (¿hay fórmula?)

Hay **familias de carpetas**, cada una con su convención de abreviaturas:

| Carpeta | Uso | Ejemplo | Lectura del nombre |
|---|---|---|---|
| `/Leccionarios/Tiempos/{Tiempo}/` | Ferias de tiempos fuertes | `Tiempos/Navidad/L3112.htm` | `L` + `31` (día) + `12` (mes) |
| `/Leccionarios/Tiempos/Adviento/` | Adviento | `Adviento/Ladv2312.htm` | `Ladv` + `23` + `12` |
| `/Leccionarios/Ferial/Top/` | Ferias del Tiempo Ordinario par (T.O.p) | `L15mtstop.htm` | `L` + `15`(semana) + `mts`(martes) + `top` |
| `/Leccionarios/Dominical/` | Domingos | `L14dgotoA.htm` | semana 14, domingo, T.O., ciclo A |
| `/Leccionarios/Santoral/{MM mes}/` | Santos | `Santoral/07julio/Lsgoap.htm` | `Ls` + abreviatura del santo (`goap`=Santiago apóstol) |

Abreviaturas de día observadas en Ferial: `lns`(lunes), `mts`(martes), `mcs`(miércoles),
`jvs`(jueves), `vs`(viernes), `sab`(sábado). Sufijo `top`/`toi` = Tiempo Ordinario par/impar.

> **Veredicto:** las ferias de Tiempo Ordinario **sí** son derivables por fórmula
> (`L{semana}{diaAbrev}{top|toi}.htm`), pero **el santoral usa abreviaturas ad-hoc del nombre del
> santo** que **no** se pueden derivar de la fecha. Por eso la vía confiable es **leer los links del
> `.js`**, que ya trae la URL exacta resuelta para cada día. Intentar reconstruir nombres por fórmula
> generaría muchos 404.

---

## 6. Estrategia de extracción recomendada

Pipeline sugerido (script de ingesta, corre 1 vez al año o al cambiar el año):

1. **Descargar** los 12 `ordo_{1..12}_2026.js`.
2. **Ejecutar/parsear** cada `.js` para materializar el array `ordo2` **ya con los overrides
   aplicados**. Dos opciones:
   - **(a) Ejecución sandbox (recomendada):** correr el `.js` en un contexto Node con `document.write`
     y `String.prototype.link` *mockeados* para capturar el HTML final por día. Reproduce exactamente
     la precedencia del santoral sin reimplementarla.
   - **(b) Parseo estático:** regex sobre el texto. Más frágil ante los `if(...) ordo2[i][j]=...`.
3. Por cada día, extraer: **fecha**, **celebración** (`[0]`), **color** (paréntesis de `[0]`), y las
   **URLs de lecturas** (`.link("…")` en `[5]`/`[6]`).
4. **Descargar cada `.htm`** de lecturas (deduplicando: muchos días comparten el mismo `.htm`).
5. **Parsear el `.htm`** según la sección 4 → estructura normalizada de lecturas.
6. **Persistir en DB** (ver sección 7), guardando la URL de origen para trazabilidad/re-scrape.

Buenas prácticas: cachear/deduplicar `.htm`, respetar `Content-Type: utf-8`, agregar
`User-Agent` y throttling suave (el sitio es un servidor chico), y guardar un hash del `.htm` para
detectar cambios.

---

## 7. Encaje con el modelo de datos del proyecto

- El **calendario** (nombre del día, tiempo, color, rango) ya lo da **romcal** en el server, y hay
  override manual vía `liturgical_events` (CU-26). Ver
  [servicios-calendarios-liturgicos.md](servicios-calendarios-liturgicos.md).
- Lo que aportaría curas.com.ar es una **tabla nueva de lecturas** (leccionario), enlazada por
  **fecha** (o por clave litúrgica). Esquema tentativo a discutir:

  ```
  liturgical_readings
    date            (date)            -- clave de join con el calendario romcal
    liturgical_time (text)            -- "TIEMPO DE NAVIDAD" (del .htm/.js)
    celebration     (text)            -- ordo2[0] sin el color
    color           (text)            -- Verde/Rojo/Blanco/Morado (paréntesis de ordo2[0])
    first_reading   (jsonb/text)      -- {ref, heading, body}
    psalm           (jsonb/text)      -- {ref, response, stanzas[]}
    second_reading  (jsonb/text)      -- nullable (solo domingos/solemnidades)
    gospel_accl     (jsonb/text)      -- aleluya {ref, body}
    gospel          (jsonb/text)      -- {ref, heading, body}
    source_url      (text)            -- .htm de origen (trazabilidad)
    source_hash     (text)            -- detectar cambios
  ```

> ⚠️ **No crear la migración todavía.** Este documento es solo el análisis. Cualquier tabla nueva
> debe pasar por revisión del modelo y por tu aprobación explícita antes de generar migración
> (regla del proyecto).

---

## 8. Riesgos y consideraciones

1. **Por año:** los `.js` están hardcodeados para 2026 (`new Date('July 1, 2026')`, `anio=2026`).
   Habrá `ordo_{mes}_2027.js` distintos cada año; el scraper debe parametrizar el año y re-correr.
2. **Fragilidad del scraping:** cualquier cambio de maquetación del sitio rompe el parser. Guardar
   `source_hash` y alertar ante cambios.
3. **Nombres no derivables** (santoral): confiar en los links del `.js`, no en fórmulas.
4. **Licencia / permisos de uso.** El contenido (textos bíblicos y del leccionario) **tiene derechos
   de autor** y no es de libre reproducción. Ver la sección 9 completa antes de republicar nada.
5. **Alternativa a considerar:** litcal (ver doc de servicios) planea leccionario en español; si lo
   liberan, evita el scraping. Hoy está roto para `es`.

---

## 9. Derechos de autor y permisos (IMPORTANTE)

> ⚖️ **No soy abogado; esto es orientación práctica.** Para reproducir el texto de las lecturas dentro
> de la app conviene una **autorización escrita** del titular. Resumen del relevamiento (2026-07-21):

### 9.1 El mito "es del pueblo / lo hace el Vaticano, entonces es libre"

La liturgia es de la Iglesia y para el pueblo, pero **eso no la vuelve dominio público**. El derecho
de autor no protege "la idea" ni la Biblia en abstracto, sino la **traducción concreta** a un idioma,
que es una **obra derivada con autor y titular de derechos**.

- El **Vaticano** (*Libreria Editrice Vaticana*) tiene copyright sobre la *editio typica* latina.
- Cada **traducción vernácula** requiere aprobación de Roma (*recognitio/confirmatio*), pero **los
  derechos de esa traducción quedan en la Conferencia Episcopal del país** (o en la editorial a la que
  se los cedan). **No son libres.**

O sea: los textos son "del pueblo" en sentido pastoral (para rezar/celebrar), pero **jurídicamente son
obras protegidas**.

### 9.2 Quién tiene los derechos en el caso argentino (los textos de curas.com.ar)

Las lecturas de curas.com.ar usan la traducción **"El Libro del Pueblo de Dios"** (Levoratti–Trusso),
la Biblia reconocida como oficial por la Conferencia Episcopal Argentina. Hay **dos titulares
superpuestos**:

| Qué | Titular | Dónde |
|---|---|---|
| **La traducción bíblica** (el texto de las lecturas) | **Fundación Palabra de Vida** + **Editorial Verbo Divino** (los autores les cedieron los derechos; ed. revisada 2015) | https://verbodivino.org/ |
| **El Leccionario** (selección/ordenamiento litúrgico) y el **Ordo/Calendario** | **Comisión Episcopal de Liturgia – Conferencia Episcopal Argentina (CEA)** — se edita y **se vende** comercialmente | https://www.liturgiacea.org/portal/ · https://episcopado.org/ |

Que el Leccionario se venda en librerías (incluso MercadoLibre) confirma que **no es de libre
reproducción**.

⚠️ **curas.com.ar tampoco es dueño de esos textos.** Su pie de página dice solo
`Copyright © 2026 Curas.com.ar`; son un **re-publicador** (probablemente con permiso o tolerancia para
uso pastoral). Por eso **pedirles permiso solo a ellos no alcanza**: no pueden autorizar lo que no les
pertenece.

### 9.3 Dónde preguntar (contactos)

1. **curas.com.ar** — para saber bajo qué permiso publican y que te orienten: **info@curas.com.ar**
   (link "Contacto" en su web).
2. **Comisión Episcopal de Liturgia (CEA)** — titular del Leccionario/Ordo: https://www.liturgiacea.org/portal/
   y la Conferencia Episcopal Argentina https://episcopado.org/ (contacto institucional).
3. **Editorial Verbo Divino / Fundación Palabra de Vida** — titulares de la traducción bíblica en sí:
   https://verbodivino.org/

### 9.4 Recomendación práctica

- **Uso interno/litúrgico en una parroquia** (mostrar la lectura del día a los fieles) suele estar
  tolerado. **Republicar el corpus completo dentro de una app** —y más si tiene cualquier arista
  comercial o de distribución masiva— es lo que conviene **consultar por escrito antes**.
- **Camino más limpio para evitar el problema de derechos:** la app ya calcula el calendario con
  `romcal` (libre, MIT). Para las **lecturas**, o bien se pide **permiso formal** a la CEA / Verbo
  Divino, o bien se muestra solo la **referencia** (ej. "Jn 1, 1-18") con link a la fuente, **sin
  copiar el texto**.

### 9.5 Fuentes del relevamiento

- Libro del Pueblo de Dios (traducción y titulares): https://www.bibleget.io/versiones-de-la-biblia/blpd/
- Comisión Episcopal de Liturgia CEA: https://www.liturgiacea.org/portal/
- Conferencia Episcopal Argentina: https://episcopado.org/
- Editorial Verbo Divino: https://verbodivino.org/

---

## 10. Recuadro: ¿responde a las preguntas de `temporal.md`?

- **¿Cómo prepara los `.htm` para cada fecha?** → No los genera por fecha: son archivos estáticos
  pre-escritos por celebración, referenciados desde el `.js` del mes (campos `[5]`/`[6]`).
- **¿Se pueden obtener todos los días del año?** → **Sí**, parseando los 12 `.js` + los `.htm`
  enlazados.
- **¿Existe una regla general?** → **Sí para el flujo** (`.js` por mes → links → `.htm`). **Parcial
  para los nombres de archivo** (ferias sí, santoral no). La regla robusta es *seguir los links del
  `.js`*, no construir nombres.
- El ejemplo de `L3112.htm` que citaste se descompone así: `L` (Lecturas) + `31` (día) + `12` (mes);
  el `<title>`/encabezado confirma "TIEMPO DE NAVIDAD / Día 31 de diciembre / DÍA VII DENTRO DE LA
  OCTAVA DE NAVIDAD".
