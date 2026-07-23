# Lista de pendientes

[ ] CU-11 - Descargar playlist como cancionero 


# -----------------------------------------------
# presentacion del cancionero: 1 agosto
- diego hace un power point
- armar una lista para "Misa Nuestra Señora del Rosario"
- Categorias -> Salmo responsorial esta vacio !
- Preparar un aviso parroquial DEMO
# -----------------------------------------------


# [ ] playlists
- hay 2 pagina iguales:
--http://localhost:4000/playlists
--http://localhost:4000/parroquias/maria_auxiliadora_rosario/playlists

se puede sacar una? mejor no, readecuar la de la parroquia para que solo vea sus cosas y el admin parroquial.

# [ ] login
-dejar el login para casos de edicion o para compartir opciones entre varios dispositivos.
-el member puede crear listas, favoritos, seleccionar parroquia, tener su favorita (con estrella) todo se graba en local storage.
- hacer todo para que se use sin login, el login quedara para administrar cosas.
- por ejemplo, en parroquias tiene que haber alguien que publique listas (y avisos)

# [ ] anuncios
- mostrar las imagenes en la edicion de anuncios
http://localhost:4000/parroquias/maria_auxiliadora_rosario/anuncios


# [ ] legal
- legalmente aclarar que los que se loguean con google (coordinadores de parroquia) estan de acuerdo con mostrar el nombre y el mail a la comunidad.
- los miembros logueados comunes no comparten nada.

# [x] salmos
- http://localhost:4000/admin/lecturas/2026-07-01
- edicion de salmos, si le das play que se pauseen los otros.
- el boton desvincular o cambiar deben escribir en rojo, debajo de los botones, que se ha cambiaso y se modificara al grabar (y que no se olviden de guardar, sino chau edicion)
- ojo con la botonera inferior que caga todo 
- el ojo para ver la partitura debe tener la simple y la otra (2 ojos)
- coloca un texto chico gris debajo de los botones CAMBIAR DESVINCULAR que diga "(Para agregar nuevos cantos y partiruras de salmos, ir a admin/salmos)" cuando se coloca un texto rojo se quita este

# [X] /salmos
- en http://localhost:4000/salmos cambiar el boton enorme escuchar canto , y coloca solo "Escuchar canto" + (play icon) + linea de tiempo del audio (todo inline) y mas chico por favor!
