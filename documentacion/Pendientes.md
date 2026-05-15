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

[X] Como ver /parroquias?
    - invitado: mostrar todas ordenadas por cercania (son 300)
        Buscar 🔍    
        ...lista de parroquias...
    - member: en grupos de Mis parroquias y Otras parroquias con > y acordeon para achicar. 
        Mis parroquias 🔍     >
        ...lista de parroquias...
        Otras parroquias 🔍   >
        ...lista de parroquias...
        Y una lupa al lado para buscar o filtrar

[x] Como ver /parroquias/una_parroquia?
    - invitados: poner contactos de Coordinador parroquiales.
    - member: ve contactos de coordinador
    - Coordinador parroquiales: poner contactos de editor o admin.
    - admin: no ve contactos

[ ] el Coordinador parroquial ya no puede crear canciones en draft, solo el editor o admin.

[ ] las parroquias solo las crea el admin, sacar estados.
    - sacar agregar de http://localhost:4000/parroquias
    - sacar EDITAR de http://localhost:4000/parroquias/parroquia-maria-auxiliadora

[ ] Agregar salmos responsoriales (ver antifonas)
    Agregar ordinario de la misa
    (pueden ser playlists)

[ ] Orden en Home:
    - Cantoral (ver si lista completa o buscador + link a listado completo)
    - Salmos responsoriales
    - Ordinario de la misa
    - Avisos parroquiales.

[ ] quitar No apagar pantalla, y hacer que todo usuario la tenga activa.
    luego vemos como activar/desactivar

[ ] quitar modo oscuro del menu solamente (luego vemos como activarlo)
