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




Your privacy policy URL 

https://console.cloud.google.com/auth/branding?project=cancionero-arquidiocesano


    Para armarla bien necesito unos datos. Respondeme estos puntos y la creo:

Responsable: ¿quién figura como responsable del tratamiento? (¿la Arquidiócesis? ¿vos personalmente? ¿nombre + email de contacto?)
Email de contacto para consultas de privacidad.
País / jurisdicción (Argentina supongo, para mencionar la ley aplicable — Ley 25.326 de Protección de Datos Personales).
Datos que guardás — confirmame cuáles aplican:
Email y nombre de Google
Foto de perfil de Google
Parroquia vinculada
Favoritos
Playlists creadas
Preferencias (sugerir acordes, etc.)
¿algo más?
¿Usás analytics? (Google Analytics, Vercel Analytics, etc.)
¿Compartís datos con terceros? Supongo que sí: Supabase (hosting de datos), Google (auth), Vercel (hosting). ¿Algún otro?
¿Hay menores de edad como usuarios esperables?
Con eso te genero app/privacidad/page.tsx con el texto adaptado y un link en el footer si querés.