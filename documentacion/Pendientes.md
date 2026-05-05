# Lista de pendientes

## Casos operativos

[ ] Definir datos de contacto para la privacidad y el terminos y condiciones.
    Ejemplo: Responsable y Direccion (ahora el Arzobispado !!)
    Email, (ahora yo.azimo@gmail.com !!)

[ ] **Backfill `parishes.latitude`/`longitude`.** Script Python (one-shot) que recorra las parroquias con `latitude IS NULL`, consulte Nominatim por nombre+ciudad+dirección y persista las coords. Documentar cómo correrlo. (Migración 0010 ya creó las columnas.)

[ ] paseo general:
- login como member fiel simple


- ~~permitir marcar BOLD los estribillos~~ ✅ Implementado con directivas ChordPro `{start_of_chorus}…{end_of_chorus}` (alias `{soc}/{eoc}`). Render con borde lateral + itálica.

- en admin colocar 
    [] mostrar playlists arquidiocesanas primero, luego las parroquiales.
    [] mostrar avisos arquidiocesanos primero, luego los parroquiales.

- en coordinador colocar:
    [] mostrar aviso primero (en la edicion de avisos)
    [] mostrar playlist primero (en la edicion de playlist)
    - quitar Nº en la lista de canciones para editar:
        "Nº 7 · La Virgen María nos reúne"

- ~~mostrar iconos en edicion de canciones +insertar acorde | previsualizar~~ ✅ Implementado: en móvil solo iconos, en desktop icono + texto. Botones: insertar acorde, estribillo, previsualizar/editar, ayuda.

- quitar el sugerir acordes y dejar la guitarra siempre visible en las canciones a la izq, A+A- a la der. Al pulsar la guitarra aparecen los tonos + -  para cambiar.

- el corazon en el titulo de la cancion se ve horrible.

- cambiar categoria para poder aceptar varias categorias por cancion. o usar los tags.

- las categorias podrian tener en descripcion un tiempo liturgico

