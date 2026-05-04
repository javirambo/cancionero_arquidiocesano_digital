# Lista de pendientes

## Casos operativos

[ ] Definir datos de contacto para la privacidad y el terminos y condiciones.
    Ejemplo: Responsable y Direccion (ahora el Arzobispado !!)
    Email, (ahora yo.azimo@gmail.com !!)

[ ] **Backfill `parishes.latitude`/`longitude`.** Script Python (one-shot) que recorra las parroquias con `latitude IS NULL`, consulte Nominatim por nombre+ciudad+dirección y persista las coords. Documentar cómo correrlo. (Migración 0010 ya creó las columnas.)

[ ] falta la version al pie, que se incremente sola.

[ ] paseo general:
- invitado:
  - falta en menu perfil canciones y playlists (ver )
  - lista de canciones:
    - la busqueda de canciones que sea en el momento el filtrado, como la lupa.
    - formato de item de cancion como el diseño.
    - menu contextual con iconos.
  - cancion:
    - sacar el <- canciones de arriba.
    - sacar descargar QR (ya esta en menu perfil)
    - modo coro ponerlo en menu perfil (si se activa un aviso que diga "Se desactivo el apagado de pantalla")
    - el "REPRODUCIR" debe ser un icono de play o youtube.
    - al lado del titulo un corazon (pequeño) si es favorito.
    - colocar un a-A para agrandar la letra de la cancion (o en el menu perfil)
  - playlists:
    - tienen que verse las diocesanas (poner como subtitulo 
    "Estás navegando como invitado. Iniciá sesión para guardar tus favoritos en la nube, vincular tu parroquia y acceder a tus listas.")
    - sacar el ORDENAR
  - parroquias:
    - sacar el boton de QR

