# Lista de pendientes

## Casos operativos

[ ] Definir datos de contacto (mails)
    - creditos y privacidad

[ ] **Backfill `parishes.latitude`/`longitude`.** Script Python (one-shot) que recorra las parroquias con `latitude IS NULL`, consulte Nominatim por nombre+ciudad+dirección y persista las coords. Documentar cómo correrlo. (Migración 0010 ya creó las columnas.)
Para eso usamos un documento con  las parroquias totales.

[ ] el corazon en el titulo de la cancion se ve horrible.

[ ] ver si Mi perfil es una pantalla de configuracion:
    [] Soy musico (muestra primero las playlists, etc)
    [] Mostrar siempre acordes
    [] No mostrar anuncios
    [] No apagar la pantalla miestra estoy activa
    [] etc...
    
## Reunion Padre Facundo - 13 de mayo 2026

[ ] Poner el logo del arzobispo,
    Logo de comision.

[X] Hacer Anuncios Popups (destacados con mas fuerza)
    Que aparezcan siempre luego de un F5
    Encima de toda pantalla
    Que tengan un X para cerrar
    Para listas, anuncios, indicaciones (nuevo)

[X] Nuevo: anuncios pero con Indicaciones
    Es un anuncio pero direcciona a una pagina o documento enriquecido.
    Se comporta igual que un anuncio.
- PREGUNTA: los invitados tambien ven la indicacion? o solo los admin parroquiales?

[X] Que se vean todas las listas y anuncios de todas las parroquias para los invitados.

[ ] Como ver /parroquias?
    - mostrar todas ordenadas por cercania (son 300)
    - y poner un buscador arriba.

[ ] Como ver /parroquias/una_parroquia?
    - invitados: poner contactos de Coordinador parroquiales.
    - Coordinador parroquiales: poner contactos de editor o admin.
    OJO: "Esta parroquia todavía no tiene un administrador parroquial asignado. Puede contactarse con javierrambaldo@gmail.com para solicitarlo."
    ->>> cambiar administrador por Coordinador


[ ] el Coordinador parroquial ya no puede crear canciones en draft, solo el editor o admin.

[ ] las parroquias solo las crea el admin, sacar estados.

[ ] Agregar salmos responsoriales (ver antifonas)
    Agregar ordinario de la misa
    (pueden ser playlists)

[ ] Orden en Home:
    - Cantoral (ver si lista completa o buscador + link a listado completo)
    - Salmos responsoriales
    - Ordinario de la misa
    - Avisos parroquiales.
