# Lista de pendientes:

[ ] las policies todavía no contemplan Storage (buckets partituras, audios, parishes). Esas reglas viven en storage.objects y se configuran aparte — conviene una migración 0003_storage_policies.sql cuando arme la lógica de upload de archivos (CU-09, CU-16).

[ ] Crear un usuario de prueba y asignarle rol admin para tener al menos uno operativo: insert into user_roles (user_id, role_id) select '<uuid-del-user>', id from roles where name='admin';

[ ] Probar las policies con la anon key + un usuario autenticado, idealmente con tests automatizados o al menos un script manual.

[ ] verificar que mis favoritos no esten el local storage (dene estar en la base)

[ ] verificar que las preferencias del usuario no sean en local storage, sino en base de datos. (como sugerir acordes)

[ ] necesitamos un : Provide users a link to your public terms of service
    y un Provide users a link to your public privacy policy. (google login)

[ ] colocar una sugerencia popup por primera vez en el dispositivo que diga
    "Esta app funciona mejor si usa el mail como login registrarse como usuario
    Si esta logueado puede acceder a sus favoritos y guardar playlists, etc, etc"