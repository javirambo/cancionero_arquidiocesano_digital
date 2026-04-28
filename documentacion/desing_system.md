# Design System — Cancionero Arquidiocesano Digital

## Este documento invalida la sección de diseño gráfico de `especificacion_tecnica.md` (5.3 Requerimientos de diseño y 10. UX/UI y Diseño Gráfico), y asigna los lineamientos generales a la sección de diseño gráfico a usar en el proyecto.

## Tipografía 

**Fuente principal:** *Cardo* (Google Fonts).

La escala tipográfica está basada en las utilidades de Tailwind CSS y sigue una progresión consistente:

| Clase Tailwind | Tamaño            | Line Height       | Uso principal                                                                  | Ejemplos                                                       |
|----------------|-------------------|-------------------|--------------------------------------------------------------------------------|----------------------------------------------------------------|
| `text-xs`      | 12px (0.75rem)    | 16px (1rem)       | Badges, metadata, autores, etiquetas muy pequeñas                              | Status badges, metadata de tablas, autores                     |
| `text-sm`      | 14px (0.875rem)   | 20px (1.25rem)    | TAMAÑO MÁS COMÚN — botones, labels, tablas, tooltips, contenido general        | Todos los botones, form labels, celdas de tabla, navegación   |
| `text-base`    | 16px (1rem)       | 24px (1.5rem)     | Texto por defecto, descripciones, inputs                                       | Texto de párrafo, form inputs                                  |
| `text-lg`      | 18px (1.125rem)   | 28px (1.75rem)    | Títulos de diálogos, headers de alertas                                        | Títulos de modales, alert dialogs                              |
| `text-xl`      | 20px (1.25rem)    | 28px (1.75rem)    | Subtítulos prominentes                                                         | Subtítulos de sección                                          |
| `text-2xl`     | 24px (1.5rem)     | 32px (2rem)       | Headers de sección                                                             | Títulos de página                                              |
| `text-3xl`     | 30px (1.875rem)   | 36px (2.25rem)    | Títulos principales de páginas, hero text                                      | Headers de página, banners de bienvenida                       |


## Paleta de colores

Valores actuales tomados de [`app/globals.css`](../app/globals.css). Tentativos hasta que la Comisión apruebe la paleta final.

### Colores semánticos

| Token              | Hex       | Muestra                                                            | Uso                                                  |
|--------------------|-----------|--------------------------------------------------------------------|------------------------------------------------------|
| `primary`          | `#8b1a1a` | ![#8b1a1a](https://placehold.co/16x16/8b1a1a/8b1a1a.png)           | Rojo litúrgico — títulos en mayúscula, acción principal |
| `primary-hover`    | `#6f1414` | ![#6f1414](https://placehold.co/16x16/6f1414/6f1414.png)           | Estado hover de la acción principal                  |
| `secondary`        | `#c9a227` | ![#c9a227](https://placehold.co/16x16/c9a227/c9a227.png)           | Dorado litúrgico (tentativo)                         |
| `brand-dark`       | `#2a0a0a` | ![#2a0a0a](https://placehold.co/16x16/2a0a0a/2a0a0a.png)           | Variante oscura de marca                             |
| `success`          | `#2f7d3a` | ![#2f7d3a](https://placehold.co/16x16/2f7d3a/2f7d3a.png)           | Confirmaciones / estados positivos                   |
| `warning`          | `#c08a00` | ![#c08a00](https://placehold.co/16x16/c08a00/c08a00.png)           | Advertencias                                         |
| `destructive`      | `#b00020` | ![#b00020](https://placehold.co/16x16/b00020/b00020.png)           | Borrado / errores críticos                           |

### Tema Light (por defecto)

| Token              | Hex       | Muestra                                                            | Uso                                  |
|--------------------|-----------|--------------------------------------------------------------------|--------------------------------------|
| `background`       | `#fafaf7` | ![#fafaf7](https://placehold.co/16x16/fafaf7/fafaf7.png)           | Fondo de página (casi blanco, cálido) |
| `foreground`       | `#111111` | ![#111111](https://placehold.co/16x16/111111/111111.png)           | Texto principal                       |
| `sidebar`          | `#f1ede5` | ![#f1ede5](https://placehold.co/16x16/f1ede5/f1ede5.png)           | Header, footer y paneles laterales    |
| `border`           | `#e2dccd` | ![#e2dccd](https://placehold.co/16x16/e2dccd/e2dccd.png)           | Bordes de tarjetas, separadores       |
| `muted-foreground` | `#5b5b5b` | ![#5b5b5b](https://placehold.co/16x16/5b5b5b/5b5b5b.png)           | Texto secundario, metadata            |

### Tema Dark (`prefers-color-scheme: dark`)

| Token              | Hex       | Muestra                                                            | Uso                                  |
|--------------------|-----------|--------------------------------------------------------------------|--------------------------------------|
| `background`       | `#0e0c0a` | ![#0e0c0a](https://placehold.co/16x16/0e0c0a/0e0c0a.png)           | Fondo de página                       |
| `foreground`       | `#f4efe6` | ![#f4efe6](https://placehold.co/16x16/f4efe6/f4efe6.png)           | Texto principal                       |
| `sidebar`          | `#181513` | ![#181513](https://placehold.co/16x16/181513/181513.png)           | Header, footer y paneles laterales    |
| `border`           | `#2b2722` | ![#2b2722](https://placehold.co/16x16/2b2722/2b2722.png)           | Bordes de tarjetas, separadores       |
| `muted-foreground` | `#a39b8b` | ![#a39b8b](https://placehold.co/16x16/a39b8b/a39b8b.png)           | Texto secundario, metadata            |


## Componentes

- badges:
- headers:
- tablas:
- forms:
- diálogos:
- botones:
