import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad · Cancionero Arquidiocesano",
  description:
    "Política de Privacidad del Cancionero Arquidiocesano relativa al tratamiento de los datos personales del Usuario.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Información legal
        </p>
        <h1 className="text-3xl leading-tight">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground normal-case">
          Última actualización: 29 de abril de 2026
        </p>
      </header>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Responsable</h2>
        <p className="text-base leading-7 text-foreground">
          El responsable del tratamiento de los datos personales recogidos a
          través del Sitio es el Arzobispado de Rosario, con domicilio
          legal en Córdoba 1677, S2000 Rosario, Provincia de Santa Fe,
          Argentina. Las consultas relativas a la presente Política podrán
          dirigirse a la dirección{" "}
          <a
            href="mailto:yo.azimo@gmail.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            yo.azimo@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Datos recopilados</h2>
        <p className="text-base leading-7 text-foreground">
          Cuando el Usuario inicia sesión mediante su cuenta de Google, el Sitio
          recopila y almacena exclusivamente los siguientes datos:
        </p>
        <ul className="list-disc pl-6 text-base leading-7 text-foreground">
          <li>Dirección de correo electrónico asociada a la cuenta de Google.</li>
          <li>Nombre del Usuario según figura en su cuenta de Google.</li>
          <li>Dirección URL de la fotografía de perfil de la cuenta de Google.</li>
        </ul>
        <p className="text-base leading-7 text-foreground">
          El Sitio no solicita ni almacena contraseñas, ni utiliza herramientas
          de analítica web o de seguimiento del comportamiento del Usuario.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Finalidad del tratamiento</h2>
        <p className="text-base leading-7 text-foreground">
          Los datos del Usuario se utilizan únicamente para identificarlo dentro
          del Sitio y permitirle el acceso a sus contenidos personales, tales
          como playlists y favoritos. Los datos no son objeto de cesión ni de
          comercialización con fines publicitarios.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Terceros</h2>
        <p className="text-base leading-7 text-foreground">
          Para la prestación del servicio, el Sitio se apoya en los siguientes
          proveedores tecnológicos:
        </p>
        <ul className="list-disc pl-6 text-base leading-7 text-foreground">
          <li>
            <span className="font-semibold">Google</span> — autenticación del
            Usuario mediante Google Sign-In.
          </li>
          <li>
            <span className="font-semibold">Supabase</span> — almacenamiento de
            la dirección de correo electrónico, nombre y URL de fotografía del
            Usuario.
          </li>
          <li>
            <span className="font-semibold">Vercel</span> — alojamiento
            (hosting) de la aplicación.
          </li>
        </ul>
        <p className="text-base leading-7 text-foreground">
          El Sitio no comparte datos personales con ningún otro tercero.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Menores de edad</h2>
        <p className="text-base leading-7 text-foreground">
          El Sitio puede ser utilizado por menores de edad en contexto pastoral.
          En caso de que un menor inicie sesión con su cuenta de Google, se
          almacenarán los mismos datos descriptos en la sección anterior. El
          Sitio no solicita ni recopila información adicional respecto de los
          menores.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Derechos del Usuario</h2>
        <p className="text-base leading-7 text-foreground">
          De conformidad con la Ley argentina N.° 25.326 de Protección de los
          Datos Personales, el Usuario tiene derecho a acceder a sus datos, a
          solicitar su rectificación o su supresión. Para ejercer estos
          derechos, deberá remitir su solicitud a la dirección{" "}
          <a
            href="mailto:yo.azimo@gmail.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            yo.azimo@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
