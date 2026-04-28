-- =====================================================================
-- Seed de canciones de prueba (1..20) — REEMPLAZA al seed anterior
-- Migración: 0003_seed_test_songs
-- Fuente: canciones.temp/backup-turso-2026-03-02.sql
-- Status: published — visibles sin login para QA
-- Letra convertida desde JSON {c,l} a ChordPro [acorde]letra
-- =====================================================================

-- Limpieza: borrar seed previo de las canciones 1..20 (idempotente)
delete from public.song_versions where song_id in (select id from public.songs where number between 1 and 20);
delete from public.songs where number between 1 and 20;

-- Categorías (idempotente)
insert into public.categories (name, slug, sort_order) values ('Entrada', 'entrada', 10) on conflict (slug) do nothing;

-- Autores (idempotente)
insert into public.authors (name) values ('C. Gabaraín') on conflict (name) do nothing;
insert into public.authors (name) values ('Reigada') on conflict (name) do nothing;
insert into public.authors (name) values ('J. C. Labaké') on conflict (name) do nothing;
insert into public.authors (name) values ('E. Mateu') on conflict (name) do nothing;
insert into public.authors (name) values ('Daniel Poli') on conflict (name) do nothing;

-- Canciones 1..20

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 1, 'Abba Padre', '001-abba-padre',
       'El Señor, el Señor ya está aquí
derramando su amor sobre ti
y cantemos para Él,
y entonemos a una voz,
y cantemos para Él,
y entonemos a una voz.

*Abba Padre, venga tu Reino*
*Abba Padre, venga tu Reino*

Deja toda tristeza y dolor,
y levanta tus brazos a Dios,
y cantemos para él,
y entonemos a una voz,
y cantemos para él,
y entonemos a una voz.

*Abba Padre, venga tu Reino*
*Abba Padre, venga tu Reino*

Alabemos con el corazón,
y que reine por siempre su amor,
y cantemos para él,
y entonemos a una voz,
y cantemos para él,
y entonemos a una voz.

*Abba Padre, venga tu Reino*
*Abba Padre, venga tu Reino*',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       'https://www.youtube.com/watch?v=XEaOHUgBba4&list=RDXEaOHUgBba4',
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '001-abba-padre';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 2, 'Vienen con alegría', '002-vienen-con-alegria',
       '[Re]Vienen con alegría señor,
cantando vienen con alegría señor.

[Sol]Los que caminan por la v[Re]ida señor
semb[Mi7]rando tu paz y am[La7]or.
[Re]Vienen trayendo la esperanza
a un [La7]mundo cargado de an[Re]siedad
a un mundo que busca y que no alc[La7]anza,
caminos de amor y de amis[Re]tad.

[Re]Vienen trayendo entre sus manos
Esf[La7]uerzos de hermanos por la pa[Re]z
Deseos de un mundo más hu[La7]mano
Que nacen del bien y la verd[Re]ad.

Cuando el odio y la violencia
aniden en nuestro corazón
el mundo sabrá que por herencia
le guardan tristezas y dolor...',
       'published',
       (select id from public.categories where slug = 'entrada'),
       (select id from public.authors where name = 'C. Gabaraín'),
       'https://www.youtube.com/watch?v=E1Gw1vtmLnE',
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '002-vienen-con-alegria';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 3, 'Qué lindo llegar cantando', '003-que-lindo-llegar-cantando',
       'Qué lindo llegar cantando
a tu casa Padre Dios,
y hermanados en el canto
comenzar nuestra oración.
Darte gracias y alabanzas,
pedirte ayuda y perdón.
Qué lindo llegar cantando
a tu casa Padre Dios.

Qué lindo traer la vida
a nuestra celebración,
contarle a nuestros hermanos
y que se vuelva oración,
sudor, lágrima, esperanza,
trabajo, rezo y amor.
Qué lindo rezar cantando
la vida que se nos dio.

Qué lindo encontrar hermanos
que viven la misma fe,
y amando son serviciales
y esperando saben ver
que el Reino de Dios avanza
sencillamente y de a pie.
Qué lindo rezar cantando
el misterio de la fe.

Qué lindo saber que somos
una Iglesia comunión,
que nace con el bautismo
y crece con la misión
de unir entre sí a los hombres
y a la humanidad con Dios.
Qué lindo rezar cantando
y sentir la comunión.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '003-que-lindo-llegar-cantando';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 4, 'En el nombre de Dios', '004-en-el-nombre-de-dios',
       'Aquí estamos Señor, en tu casa otra vez
¡Qué alegría volverte a encontrar!
Vamos a compartir y expresar nuestra fe
como hermanos en torno al altar.

En el Nombre de Dios vamos a celebrar
el misterio de la Salvación.
El Señor nos dará su Palabra y su pan,
es la Fiesta del Pueblo de Dios.

Partiremos tu pan, signo de comunión,
beberemos tu vino de amor.
Y a la vez sellarás con nosotros Señor
una Alianza que viene de Dios.

Nos amaste Señor como nadie jamás,
nos da fuerzas tu fidelidad.
En la mesa de Dios, hoy nos transformarás
en fermento de comunidad',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '004-en-el-nombre-de-dios';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 5, 'Juntos como hermanos', '005-juntos-como-hermanos',
       'Juntos como hermanos,
miembros de una iglesia,
vamos caminando,
al encuentro del señor.

Es largo el caminar,
por el desierto bajo el sol
no podemos avanzar
sin la ayuda del Señor.

Unidos al orar,
unidos en una canción,
viviremos nuestra fe
con la ayuda del Señor.

La Iglesia en marcha está
a un mundo nuevo vamos ya,
donde reinará el amor,
donde reinará la paz.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '005-juntos-como-hermanos';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 6, 'Hoy tu Espíritu, Señor', '006-hoy-tu-espiritu-senor',
       'Hoy tu Espíritu Señor
nos congrega en la unidad,
nos da fuerza para andar
renovados en tu amor.

Santo Espíritu de Dios,
de la paz y de la Luz,
que nos das a conocer
el misterio de Jesús.
Ven, al fin, a saciar
nuestra sed de paz.

Este mundo y su dolor
clama ardiente de ansiedad.
Que tu Espíritu de amor
lo conduzca a la verdad.
Ven, al fin, a reinar,
cambia al mundo ya.

Ni la carga de la Cruz
nuestras fuerzas redirá.
La alegría que Tú das
nadie no la ha de quitar.
Ven, al fin, a cantar
en mi voz: Amén.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       (select id from public.authors where name = 'Reigada'),
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '006-hoy-tu-espiritu-senor';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 7, 'La Virgen María nos reúne', '007-la-virgen-maria-nos-reune',
       'La Virgen María nos reúne
en nombre del Señor,
del Señor Jesús,Dios nuestro Señor.

Venimos a buscar el pan de la Palabra,
Palabra del Señor que reconforta el alma.

Venimos a comer el Pan sacramentado,
el Cuerpo del Señor, Jesús resucitado.

Venimos a llevar el pan de la alegría,
mensaje que nos dio el Hijo de María.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '007-la-virgen-maria-nos-reune';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 8, 'Qué alegría cuando me dijeron', '008-que-alegria-cuando-me-dijeron',
       '¡Qué alegría cuando me dijeron:
“vamos a la casa del señor”!
ya están pisando nuestros pies
tus umbrales, Jerusalén.

Jerusalén está fundada
como ciudad bien compacta.
Allá suben las tribus,
las tribus del Señor.

Según la costumbre de Israel:
a celebrar el nombre del Señor;
en ella están los tribunales de Justicia,
en el palacio de David.

Desead la paz a Jerusalén:
“Vivan seguros los que te aman,
haya paz dentro de tus muros,
en tus palacios seguridad”.

Por mis hermanos y compañeros
voy a decir la paz contigo
por la casa del señor nuestro Dios
te deseo todo bien.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '008-que-alegria-cuando-me-dijeron';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 9, 'Canten todos', '009-canten-todos',
       'Canten todos la alegría
de vivir en Dios.

La buena noticia de Cristo Jesús,
la entienden los pobres y es fuerza y es luz.
Si estamos abiertos cuando hablas Señor
nos da tu Palabra la paz interior.

El hambre y la sed de justicia nos dan
la ardiente pasión de guardar tu verdad.

Al hombre sediento de vida y verdad
tan sólo Tú, Cristo, lo puedes colmar.

Creer es mirar con tus ojos, Señor,
y darle a la vida todo su valor.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       (select id from public.authors where name = 'J. C. Labaké'),
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '009-canten-todos';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 10, 'Somos un pueblo que camina', '010-somos-un-pueblo-que-camina',
       'Somos un pueblo que camina
y juntos caminando podremos alcanzar,
otra ciudad que no se acaba,
sin penas ni tristezas,
ciudad de eternidad.

Somos un pueblo que camina,
que marcha por el mundo,
buscando otra ciudad.
Somos errantes peregrinos
en busca de un destino,
destino de unidad.

Siempre seremos caminantes,
pues solo caminando podremos alcanzar
otra ciudad que no se acaba,
sin penas ni tristezas,
ciudad de eternidad.
Danos valor siempre constante
valor en las tristezas, valor en nuestro afán.
Danos la luz de tu Palabra
que guíe nuestros pasos en este caminar.

Marcha, Señor, junto a nosotros
Pues solo en tu presencia podremos alcanzar
otra ciudad que no se acaba,
sin penas ni tristezas ciudad de eternidad.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       (select id from public.authors where name = 'E. Mateu'),
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '010-somos-un-pueblo-que-camina';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 11, 'Vine a alabar a Dios', '011-vine-a-alabar-a-dios',
       'Vine a alabar a Dios,
Vine a alabar a Dios,
Vine a alabar su Nombre.
Vine a alabar a Dios.

Él llegó a mi vida en un día muy especial,
cambió mi corazón por un nuevo corazón
y esa es la razón por la que digo que
vine a alabar a Dios.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '011-vine-a-alabar-a-dios';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 12, 'Cristo Joven', '012-cristo-joven',
       'Ven hermano y cántale a Cristo
a ese Cristo joven que un día nos redimió,
haz de tu amor una plegaria,
un simple canto alegre que el Señor escuchará.

Ven aquí, canta ya,
no te olvides tú de Cristo.
Piensa que en la cruz
por nosotros Él se dio, por amor.

No te alejes del camino marcado,
que Cristo ha señalado para acercarnos a Él,
devuélvele con fe inquebrantable
el amor incuestionable que nos ha ofrecido El.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '012-cristo-joven';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 13, 'En siete días', '013-en-siete-dias',
       'En siete días creó Dios al mundo
Adán pecó y perdió el cielo
Jesús vino para redimirnos
murió en la cruz y nos salvó.

Den al Señor sus Alabanzas
Denle poder, honor y Gloria
A una voz, cántenle un Himno al Señor

A Moisés Dios dijo \"haz mi pueblo libre
Yo seré tu guía, siempre sígueme,
Salieron ya de Egipto y el mar pasaron,
Cantaron y bailaron, se llenaron de júbilo.

Jesús dijo a Pedro \"ven te llamo
el camino es duro, mas iré contigo\"
Pedro respondió \"Soy un pecador\"
tiro su red y hacia el Señor corrió.
Entrégate hermano al Señor Jesús,
Él te ama aunque seas pecador,
El pago el precio de tu salvación
y ahora eres una nueva creación.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '013-en-siete-dias';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 14, 'Bendeciré al Señor', '014-bendecire-al-senor',
       'Bendeciré al Señor en todo tiempo
y mi boca no cesará de alabarlo.
Mi alma se enorgullece en el Señor
que lo oigan los humildes y se alegren.

Prueben que bueno es el señor,
hagan la prueba y véanlo,
dichoso aquel que busca en Él refugio.

Engrandezcan conmigo al Señor,
ensalcemos todos su nombre.
Busqué al Señor y me dio una respuesta
me libró de todos mis temores.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '014-bendecire-al-senor';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 15, 'Iglesia Peregrina', '015-iglesia-peregrina',
       'Todos unidos formando un solo cuerpo,
un cuerpo que en la Pascua nació;
miembros de Cristo en sangre redimidos,
Iglesia peregrina de Dios.

Vive en nosotros la fuerza del Espíritu
que el Hijo desde el Padre envió,
El nos conduce, nos guía y alimenta,
Iglesia peregrina de Dios.

Somos en la tierra
semilla de otro reino,
somos testimonio de amor.
Paz para las guerras
y luz entre las sombras
Iglesia peregrina de Dios.

Rugen tormentas y a veces nuestra barca
parece que ha perdido el timón.
Miras con miedo, no tienes confianza,
Iglesia peregrina de Dios.
Una esperanza nos llena de alegría;
presencia que el Señor prometió.
Vamos cantando, El viene con nosotros,
Iglesia peregrina de Dios.

Todos nacidos en un solo bautismo,
unidos en la misma comunión.
Todos viviendo en una misma casa,
Iglesia peregrina de Dios.
Todos prendidos en una misma suerte,
ligados a la misma salvación
somos un cuerpo y Cristo es la Cabeza
Iglesia peregrina de Dios.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '015-iglesia-peregrina';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 16, 'Aleluya por esa gente', '016-aleluya-por-esa-gente',
       'Los que tienen y nunca se olvidan
que a otros les falta.
Los que nunca usaron la fuerza
sino la razón.
Los que dan una mano y ayudan
a los que han caído
esa gente es feliz porque vive
muy cerca de Dios.

Aleluya, Aleluya
Por esa gente que vive y que siente
En su vida el amor
Aleluya, Aleluya
Por esa gente que vive y que siente
En su vida el amor

Los que ponen en todas las cosas
amor y justicia.
Los que nunca sembraron el odio
tampoco el dolor
los que dan y no piensan jamás
en su recompensa
Esa gente es feliz porque vive
muy cerca de Dios.

Los que son generosos y dan
de su pan un pedazo.
Los que siempre trabajan pensando
en un mundo mejor
Los que están liberados de todas
sus ambiciones
Esa gente es feliz porque vive
muy cerca de Dios.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '016-aleluya-por-esa-gente';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 17, 'Dios trino', '017-dios-trino',
       'En nombre del Padre,
en nombre del hijo,
en nombre del Santo Espíritu,
estamos aquí.

Para alabar y agradecer,
bendecir y adorar,
estamos aquí, a tu disposición.
Para alabar y agradecer,
bendecir y adorar,
estamos aquí, Señor
Dios trino de amor.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '017-dios-trino';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 18, 'Mensajero de la paz', '018-mensajero-de-la-paz',
       'Es hermoso ver bajar de la montaña
los pies del mensajero de la paz...

El Señor envió a sus discípulos,
los mando de dos en dos...

Los mando a las ciudades,
y lugares donde iba a ir él.

La cosecha es abundante,
les dijo el Señor al partir...

Pídanle al dueño del campo,
que envíe más obreros a la mies.

Al entrar en una casa,
saluden anunciando la paz.

El Reino de Dios está cerca,
a todos anunciarán.

Los que a ustedes los reciban,
me habrán recibido a Mí.

Quien recibe mi Palabra,
recibe al que me envió.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '018-mensajero-de-la-paz';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 19, 'Dios de la vida', '019-dios-de-la-vida',
       'Somos un nuevo pueblo,
Gestando un mundo distinto,
Los que en el amor creemos,
Los que en el amor vivimos.
Llevamos este tesoro,
En vasijas de barro,
Es un mensaje del cielo
Y nadie podrá callarnos.

Y proclamamos un nuevo día,
Porque la muerte ha sido vencida.
Y anunciamos esta buena noticia,
Hemos sido salvados,
por el Dios de la Vida.

En el medio de la noche,
Encendemos una luz,
En el nombre de Jesús.

Sembradores del desierto,
Buenas nuevas anunciamos,
Extranjeros en un mundo
Que no entiende nuestro canto.
Y aunque a veces nos cansamos,
Nunca nos desanimamos,
Porque somos peregrinos
y es el amor nuestro camino.

Y renunciamos a la mentira,
Vamos trabajando por la justicia.
Y rechazamos toda idolatría,
Porque está entre nosotros,
el Dios de la vida.

En el medio de la noche,
Encendemos una luz,
En el nombre de Jesús.

Que nuestro mensaje llegue,
Más allá de las fronteras,
Y resuene en todo el mundo
Y será una nueva tierra.
Es un canto de victoria,
A pesar de las heridas,
Alzaremos nuestras voces,
Por el triunfo de la vida.

Y cantaremos con alegría,
Corazones abiertos,
Nuestras manos unidas.
Y celebraremos con alegría
Porque está entre nosotros
El Dios de la vida.

En el medio de la noche,
Encendemos una luz,
En el nombre de Jesús.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       (select id from public.authors where name = 'Daniel Poli'),
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '019-dios-de-la-vida';

insert into public.songs (number, title, slug, body, status, category_id, author_id, youtube_url, published_at, current_version)
select 20, 'Alabaré', '020-alabare',
       'Alabare, alabare, alabare, alabare,
alabare a mi Señor

Juan vio el número de los elegidos
y todos alababan al Señor,
unos rezaban otros cantaban
y todos alababan al Señor.

Somos tus hijos, Dios Padre eterno,
tu nos has creado por amor,
te alabamos, te bendecimos
y todos cantamos en tu honor.

Todos unidos, juntos cantemos
glorias y alabanzas al señor
gloria al Padre, Gloria al Hijo
y Gloria al Espíritu de Amor.',
       'published',
       (select id from public.categories where slug = 'entrada'),
       NULL,
       NULL,
       now(), 1
;
insert into public.song_versions (song_id, version, title, body, category_id, author_id, youtube_url, published_at)
select s.id, 1, s.title, s.body, s.category_id, s.author_id, s.youtube_url, coalesce(s.published_at, now())
from public.songs s where s.slug = '020-alabare';
