# Lista de pendientes

## Casos operativos

[ ] Definir datos de contacto para la privacidad y el terminos y condiciones.
    Ejemplo: Responsable y Direccion (ahora el Arzobispado !!)
    Email, (ahora yo.azimo@gmail.com !!)

[ ] **Backfill `parishes.latitude`/`longitude`.** Script Python (one-shot) que recorra las parroquias con `latitude IS NULL`, consulte Nominatim por nombre+ciudad+dirección y persista las coords. Documentar cómo correrlo. (Migración 0010 ya creó las columnas.)

[ ] paseo general:
- login como member fiel simple


- permitir marcar BOLD los estribillos: poder marcar un parrafo (parrafo completo seleccionando texto) o el inicio y fin del parrafo [parrafo-start] [parrafo-end] y marcar como párrafo para que se vea con letra bold.

- en admin colocar 
    [] mostrar playlists arquidiocesanas primero, luego las parroquiales.
    [] mostrar avisos arquidiocesanos primero, luego los parroquiales.

- en coordinador colocar:
    [] mostrar aviso primero (en la edicion de avisos)
    [] mostrar playlist primero (en la edicion de playlist)
    - quitar Nº en la lista de canciones para editar:
        "Nº 7 · La Virgen María nos reúne"

- mostrar iconos en edicion de canciones +insertar acorde | previsualizar

- 