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

# [x] /salmos
- en http://localhost:4000/salmos cambiar el boton enorme escuchar canto , y coloca solo "Escuchar canto" + (play icon) + linea de tiempo del audio (todo inline) y mas chico por favor!

# [ ] /salmos
-[ ] reacomodar los salmos con el script, porque ahora podemos tener mas de 1 salmo por dia. Hacer el link en tabla liturgical_readings.
-[ ] faltaria agregar a mano un audio y una partitura cuando no existe en coro san clemente
-[ ] y editar notas para guitarra-
-[ ] reacomodemos la edicion del salmo en http://localhost:4000/admin/lecturas/2026-07-03
-un solo recuadro SALMO (sacar SALMO TEXTO y Salmo (audio / partitura) )
-dentro del recuadro unico colocar los campos del viejo cuadro Salmo (audio / partitura) y debajo agregar :
    >"AUDIO / PARTITURA" + (icono para contraer/mostrar) (este seria un titulo del bloque completo que viene debajo)(por defecto contraido) 
    >salmo usado
    >"AUDIO:" + Audio + (icono play) (todo a la izq)
    >Imagenes de partituras (directamente mostrar aca,primero la simple luego las otras) 
    >botones CAMBIAR DESVINCULAR (etc)
    >textos informativos...

# [ ] cancion
- colocar un margen inferior a cada cancion para que la botonera no tape la ultima parte de los textos.

# [ ] SERVICIOS DE LITURGIAS Y TEXTOS BIBLICOS PARA REVISAR
- https://romcal.js.org/#/calendar/es/argentina/2026/7
- https://evangelizo.org
- https://evangeliodeldia.org/SP/gospel/2026-07-01
- https://www.vatican.va/content/bibbia/es.html
- https://www.bibleget.io/como-funciona/desarrolladores/  ·  https://github.com/BibleGet-I-O/endpoint

# [ ] esta faltaria MANUAL:
Lecturas a cargar/revisar a mano (vigilias/solemnidades con lecturas múltiples que el scraper no cubre bien): Pascua 5/4, Pentecostés 24/5, Vigilia S. Juan Bautista 23/6, Natividad S. Juan Bautista 24/6, S. Pedro y S. Pablo 29/6, Asunción 15/8. En Pascua, ojo que /salmos puede mostrar el salmo de la Vigilia hasta que se cure.


- [ ] ver donde usar Se canta Gloria, o Se canta Aleluia. 
    Ya existe una funcion global documentada. lib/rubricas.ts

