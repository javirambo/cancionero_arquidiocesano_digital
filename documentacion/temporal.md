
# Modificar UI y comportamiento:

## Inicio como invitado o logueado (/) o home
- CAMBIAR -> el / debe ser el home de la parroquia actual (y por defecto cada usuario tiene una). Si es invitado no hay parroquia y seran solo anuncios de arquidiocesis.
- Este home debe tener: 
    * Header con menus: buscar, mis favoritos, perfil. (agregar toostips)
    * NOMBRE DE LA PARROQUIA (si es invitado no mostrar)
    * Evangelizar a través de la música
    * Cancionero Arquidiocesano Digital
    * Una herramienta común para coros, ministerios de música y asambleas de toda la Arquidiócesis. Buscá una canción, abrí el repertorio de tu parroquia o seguí la festividad del día.
    (quitar el buscar completo)
    * Tarjeta de eventos liturgicos automaticos. OJO! -> la hora de los anuncios esta en UTC y se muestran con la hora local (a las 10 de la noche mostró anuncio del día siguiente!) ARREGLAR! Y quitar los botones del anuncio -> Ver parroquias - Ir al catálogo.
    * Tarjetas de novedades. (ver hora UTC vs local) 
    * Accesos rapidos: Canciones, playlists, parroquias.
    * Si no esta logueado colocar una tarjeta mas: "Inicia sesión para asociarte a parroquias, guardar tus favoritos en la nube, crear tus propias playlists..."
    * Privacidad y Version al pie (colocar que en cada build cambie la version con package.json -> "version")

## Menu perfil
    Nombre de usuario/invitado
    Perfil -> /perfil
    Canciones -> /canciones
    Playlists -> /playlists
    Parroquias -> /parroquias
    Sugerir acordes (con invitado no mostrar)
    Modo Oscuro
    Administración (solo perfil admin)
    Descargar QR (genera QR de seccion actual, pero si esta en perfil no mostrar)
    Iniciar con Google/Cerrar sesión

## Login (Iniciar con Google)
- luego de loguearme con Google lleva a /perfil

## Mi Perfil (/perfil)
- Mostrar esto en la pagina Perfil:
    * Mis Favoritos:
    ---lista de mis favoritos---
    * MIS PARROQUIAS:
    ---lista de mis parroquias (primera la que tiene estrella)
    * Mis playlists:
    ---solo indicar cuantas hay, y un link a /playlists---

## Canciones (/canciones)
    * Canciones
    * Catálogo completo del cancionero.
    * Buscador por letra, titulo....solo filtrar y buscar en canciones
    * agregar selector de categorias, y al elegir una, filtrar.
    ---listado de canciones---
    * en el menu "..." de cada cancion:
        "Agregar a una playlist >" aca aparece un submenu que muestra esto [*1]
        "Ver cancion"
        "Compartir"
        "Agregar/Quitar de Mis favoritos"
    
    [*1] submenu de "Agregar a una playlist >":
        Buscar playlist (filtra la lista debajo)
        +Nueva playlist
        ---------------
        ---lista de mis playlists---
    Una vez seleccionada la playlist, se agrega la canción ahi. (ojo ver nuevo comportamiento segun roles, explicado debajo)

## Playlists (/playlists)
- colocar esto en la pagina:
    * "Mis playlists"
    * "Playlists creadas por ti que puedes compartir."
    ---lista de playlists creadas por mi---

    * "Playlists compartidas"
    * "Repertorios de las playlists de las parroquias en las que participás."
    ---lista de playlists de las parroquias, ordenadas por parroquia, colocar cada una debajo del titulo de laparroquia, colocar en cada item un icono corazón para agregar/quitar a mis favoritos---
    (quitar el enlace Ver Todas)
-el comportamiento de las playlists debe cambiar:
1. rol `member`: cada playlist creada por un usuario se guardan sin parroquia porque son de él, y si quiere las puede compartir.
2. rol `coordinator`: las playlists creadas quedan asignadas a esa parroquia y pueden compartirse.
3. rol `admin`: las playlists creadas quedan asignadas a la parroquia virtual arquidiocesis, y todas las parroquias la ven.

## Parroquias (/parroquias)
- mostrar asi la pagina:
    * Parroquias
    * Comunidades de la Arquidiócesis con sus repertorios. Asociate con [+] y marcá tu principal con la estrella.

    * Mis parroquias
    --Mostrar estas tarjetas con color de fondo distinto, son todas las parroquias asociadas, primero la que tiene estrella--
    * Otras parroquias
    --Mostrar listado del resto de las parroquias con color normal, y agregar [+] para asociar--
-el comportamiento cambia:
1. rol `member`: agregar boton "[+]Agregar parroquia" y colocar boton buscar cercanas (con GPS). La parroquia agregada se envia a revision por la Comision o Administrador, y si esta repetida la quitará.  Podría enviar un mail.
2. rol `admin` o `coordinator`: agregar boton "[+]Agregar parroquia" y colocar boton buscar cercanas (con GPS). Guardar la parroquia agregada.

## Administración (solo perfil admin) (/admin)
- mostrar las tarjetas de acciones: 
    * Parroquias -> /admin/parroquias
    * anuncios -> /admin/anuncios
    * playlists -> /admin/playlists

## Admin de parroquias (/admin/parroquias)
- Titulo PARROQUIAS GENERALES
- Subtitulo "Estas parroquias se comparten a todos los fieles/usuarios esten logueados o no"
- boton "+ Nueva Parroquia"
- mostrar el de todas las parroquias
- cada item tendrá un boton Eliminar y Modificar

## Admin de anuncios (/admin/anuncios)
- dejar como esta

## Admin de playlists (/admin/playlists)
- Titulo PLAYLISTS GENERALES
- Subtitulo "Estas playlists se comparten a todas las parroquias"
- Colocar boton "+ Nueva Playlist"
- mostrar el listado de playlists de la arquidiocesis
- cada item tendrá un boton Eliminar y Modificar
