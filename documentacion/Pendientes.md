# Lista de pendientes:

[ ] las policies todavía no contemplan Storage (buckets partituras, audios, parishes). Esas reglas viven en storage.objects y se configuran aparte — conviene una migración 0003_storage_policies.sql cuando arme la lógica de upload de archivos (CU-09, CU-16).

[ ] Crear un usuario de prueba y asignarle rol admin para tener al menos uno operativo: insert into user_roles (user_id, role_id) select '<uuid-del-user>', id from roles where name='admin';

[ ] Probar las policies con la anon key + un usuario autenticado, idealmente con tests automatizados o al menos un script manual.

