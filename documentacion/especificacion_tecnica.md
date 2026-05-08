

# DESARROLLO

## 1. Información General

* Nombre: **Cancionero Arquidiocesano Digital**  
* Institución responsable: Arquidiócesis de Rosario  
* Versión del documento: 1.0  
* Fecha: Abril 2026  
* Responsables técnicos y funcionales: Javier Rambaldo, Diego Bianchi, Nicolás Huergo, Nicolás Glaser,   
* Estado: borrador



## 2. Objetivo del Documento

Definir arquitectura, decisiones tecnológicas y de diseño, lineamientos de implementación y evolución del sistema.



## 3. Alcance del Sistema

### **3.1 Alcance funcional (qué incluye)**

* Repositorio de canciones litúrgicas  
  Canciones con sus letras, autor, acordes, partituras, audio (o enlace a youtube), clasificación según su tipo.   
* Visualización de letras y acordes  
  Mostrar o no los acordes y posibilidad de cambio de tono.  
* Partituras descargables  
  Ver si son pdf…  
* Integración con audio/video (ej: YouTube)  
* Buscador avanzado  
  Permite buscar una canción por su título, parte de la letra, número de canción, clase, etc  
* Visualización de playlist de festividades y novedades  
  Al inicio muestra novedades, por ejemplo una festividad del día con su playlist armada.  
* Gestión de usuarios/parroquias  
  Permite ingresar con un usuario para gestionar canciones o crear accesos a parroquias.  
* Gestion de playlist para parroquias.  
  Cada parroquia arma sus propias playlists.  
* Gestión de anuncios programados  
  Permite crear, editar y mostrar mensajes informativos visibles en fechas y condiciones específicas.  
* Permitir silenciar el dispositivo para no interrumpir el canto.

### **3.2 Fuera de alcance (qué NO incluye)**

* 



## 4. Stakeholders

* Comisión episcopal de liturgia  
* Comisión Litúrgico-Musical (revisión y aprobación de repertorio)  
* Coordinación pastoral parroquial  
* Ministerios de música y coros parroquiales  
* Equipo técnico (desarrolladores, DevOps)  
* Comunidad



## 5. Requerimientos

### **5.1 Requerimientos funcionales**

* RF1: Alta/baja/modificación de canciones
* RF2: ABM de playlists (listas de canciones)
* RF3: Visualización y búsqueda de playlists
* RF4: Visualización y búsqueda de canciones
* RF5: Visualización de canciones con acordes
* RF6: Transposición de acordes
* RF7: Descarga de partituras  
* RF8: Reproducción de links de referencia (YouTube)
* RF9: ABM de usuarios  
* RF10: ABM de parroquias  
* RF11: Acceso directo a una parroquia mediante URL  
* RF12: Acceso directo a una playlist mediante URL  
* RF13: Descarga de QR de pagina actual  
* RF14: Descarga de canciones con y sin acordes (formato para imprimir) 
* RF15: Descarga de canciones de una playlist (como nuevo cancionero)  
* RF16: Login con google
* RF17: Linkear uruaios con parroquias
* RF18: Permitir que un usuario tenga links propios de canciones, listas, parroquias, etc a través de likes.
* RF19: Gestionar anuncios (gestionados por admin) con ventana de fechas. Aparecen en la home durante su vigencia y desaparecen al vencer; el usuario no puede cerrarlos. Pueden tener destino global o a una/varias parroquias.
* RF20: Permitir silenciar el dispositivo y que no se apague la pantalla.
* RF21: Gestion de permisos
* RF22: Categorías litúrgicas (Entrada, Comunión, Ofertorio, Salida, Mariana, etc.) — vocabulario controlado en `categories` con asignación N:M a canciones vía `song_categories` (mig. 0021). Una canción puede pertenecer a varias categorías. ABM del catálogo se gestiona por SQL (no hay pantalla; ver CU-25).
* RF23: Festividades litúrgicas (calendario) — ABM y carga automática desde fuente externa (Conferencia Episcopal Argentina / Vaticano / iCal). Se usan en la home (CU-07) y como sugerencia de playlists para fechas específicas.


### **5.2 Requerimientos no funcionales**

* Disponibilidad (uptime 24x7)  
* Performance (tiempo de carga)  
* Aplicación para Android  
* Aplicación para iOS  
* Escalabilidad  
* Seguridad  
* Usabilidad (UX simple para parroquias)

### **5.3 Requerimientos de diseño** 

* *Tipografía*  
  Fuente principal: *Cardo* (Google fonts)  
  Escala tipográfica basada en las utilidades de Tailwind CSS y sigue una progresión consistente, ejemplo:  


    | Clase Tailwind | Tamaño | Line Height | Uso Principal | Ejemplos|
    |----------------|---------------------|-------------------|-------------------------------------------------------------------------------|---------------------------------------------------------------|
    | text-xs        | 12px (0.75rem)      | 16px (1rem)       | Badges, metadata, autores, etiquetas muy pequeñas| Status badges, metadata de tablas, autores|
    | text-sm        | 14px (0.875rem)     | 20px (1.25rem)    | TAMAÑO MÁS COMÚN – Botones, labels, tablas, tooltips, contenido general       | Todos los botones, form labels, celdas de tabla, navegación  |
    | text-base      | 16px (1rem)         | 24px (1.5rem)     | Texto por defecto, descripciones, inputs | Texto de párrafo, form inputs|
    | text-lg        | 18px (1.125rem)     | 28px (1.75rem)    | Títulos de diálogos, headers de alertas  | Títulos de modales, alert dialogs|
    | text-xl        | 20px (1.25rem)      | 28px (1.75rem)    | Subtítulos prominentes                   | Subtítulos de sección |
    | text-2xl       | 24px (1.5rem)       | 32px (2rem)       | headers de sección | títulos de página|
    | text-3xl       | 30px (1.875rem)     | 36px (2.25rem)    | Títulos principales de páginas, hero text| Headers de página, banners de bienvenida|


- *Colores*  
  - Primary:  
  - Primary hover:  
  - Secondary:  
  - Brand dark:  
  - Success:  
  - Warning:  
  - Destructive:  
  
  Tema Dark:  
  - background:  
  - foreground:  
  - sidebar:  
  - border:  
  - muted-foreground:  
  
  Tema Light:  
  - background:  
  - foreground:  
  - sidebar:  
  - border:  
  - muted-foreground:

(falta definir badges, headers, tablas, forms, dialogos, botones) 



- *Componentes*

- *Ejemplos*

- *Implementación*



## 6. Arquitectura del Sistema

* Tipo: Web App (futura APP para mobiles)  
* Cliente – Servidor – Storage

### 6.1 Canciones

Usamos formato ChordPro:

- ver [ChordPro](https://www.chordpro.org/chordpro/chordpro-introduction/)

### 6.2 Estructura de rutas (App Router)

Dos route groups en `app/`:

- `(app)/` — todas las rutas con header, footer y diálogos globales. Contiene `canciones/`, `playlists/`, `parroquias/`, `admin/`, `install/`, etc. Su layout monta `SiteHeader`, `SiteFooter` y `MergeFavoritesDialog`.
- `(print)/` — vistas standalone sin chrome del sitio. Hoy solo `canciones/[slug]/imprimir`. Su layout sólo renderiza `{children}`. Útil para CU-10 (canción imprimible) y a futuro CU-11 (cancionero de playlist).

El `app/layout.tsx` raíz contiene únicamente los providers globales (theme, sesión, roles, preferencias, favoritos, toast, wake-lock). No agrega UI visible: cada route group decide qué chrome mostrar.

### 6.3 Sesión y cliente Supabase del browser

- **Cliente singleton**: `lib/supabase/client.ts` cachea una sola instancia de `createBrowserClient`. Crear múltiples instancias provoca contención del lock interno de `gotrue-js` (varias instancias compitiendo por el mismo lock con nombre fijo en `localStorage` → `AbortError: Lock broken` y estado de auth corrupto).
- **`SessionProvider`** (en `app/components/session.tsx`) es la única fuente de la sesión: llama a `supabase.auth.getUser()` y `onAuthStateChange` una sola vez y expone `{ user, loading }` por contexto. Los demás providers (`UserRolesProvider`, `PreferencesProvider`, `FavoritesProvider`) consumen `useSession()` en lugar de hablar con Supabase directamente, para evitar llamadas concurrentes a `auth`.



## 7. Stack Tecnológico

* Frontend: Next.js  
* Plataforma de despliegue: Vercel  
* Base de datos: Supabase  
* Hosting: vercel por ahora hasta definir
* Storage (audio, PDFs): supabase



## 8. Diseño de Datos

### **8.1 Entidades principales**

* Canción (id, titulo, letra+acordes en ChordPro, tonalidad original, tempo, link YT, autor; relación N:M con categorías vía `song_categories`)
* Autor (id, nombre)
* Categoría litúrgica (id, nombre, slug, sort_order) — vocabulario controlado, multi-asignable
* Archivo (audio / partitura)  
* Usuarios (id, nombre, mail, parro)  
* Parroquias (id, nombre, direccion)  
* Playlists (id, nombre, parroquia, usuario)  
* Configuraciones (clave, valor)



## 9. API (Definición Inicial)

* GET /songs  
* GET /songs/{id}  
* POST /songs  
* PUT /songs/{id}  
* DELETE /songs/{id}



## 10. UX/UI y Diseño Gráfico

### **10.1 Lineamientos**

* Minimalista  
* Legible en contexto litúrgico (baja luz, móviles)  
* Tipografía similar a libros litúrgicos, donde se prioriza la legibilidad, solemnidad y tradición, utilizando comúnmente fuentes serif clásicas.  
  Nos sugieren *Cambria* pero es de *Microsoft*.   
  Otras fonts similares: *Sabon, Baskerville, Palatino o Cardo*.   
* Colores: títulos en mayúscula color rojo, el resto negro.

### **10.2 Componentes clave**

* Vista canción (letra \+ acordes)  
* Selector de tonalidad  
* Player embebido  
* Buscador  
* Descarga de canción y partitura para imprimir. 



## 11. Dominio y URLs

* Dominio principal (ej: cancionero.arquidiocesisrosario.org)  
* Subdominios: ?  
* Certificados SSL: ?



## 12. Seguridad

* HTTPS obligatorio ?  
* Autenticación para editores.  
* Control de acceso (roles)



## 13. Deployment

### **13.1 Pipeline**

* CI/CD (GitHub Actions, Vercel)

### **13.2 Ambientes**

* Desarrollo  
* Producción



## 14. Alcance del producto

Incluye:

* Catálogo de canciones
* Visualización letra \+ acordes
* Embebido de YouTube
* Búsqueda
* Parroquias y playlists públicas
* Sistema de usuarios y roles (coros / coordinadores / editores / admin)
* Editor de canciones web con versionado y aprobaciones
* Descargas (partituras, canciones para imprimir, cancioneros, QR)
* Favoritos y "Mis favoritos"
* Anuncios programados

A futuro (sin compromiso de fecha):

* App móvil (PWA o nativa)
* Descarga offline
* Métricas de uso
* IA para sugerencia de repertorio (alineado al calendario litúrgico)
* IA para agregar canciones y partituras



## 15. Riesgos y Consideraciones

* Derechos de autor:  
  Considerar derechos de autor.  
* Calidad del contenido:  
  La comisión episcopal de liturgia junto con Pablo de la diócesis de Lanus (Avellaneda) nos aportan las canciones.  
* Adopción por parroquias:  
  A cargo del episcopado  
* Mantenimiento a largo plazo:  
  Asignar un grupo de colaboradores.
