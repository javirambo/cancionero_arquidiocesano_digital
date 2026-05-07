import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio · Cancionero Arquidiocesano",
  description:
    "Términos de Servicio del Cancionero Arquidiocesano que regulan el uso del Sitio por parte del Usuario.",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Información legal
        </p>
        <h1 className="text-3xl leading-tight">Términos de Servicio</h1>
        <p className="text-sm text-muted-foreground normal-case">
          Última actualización: 30 de abril de 2026
        </p>
      </header>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Aceptación</h2>
        <p className="text-base leading-7 text-foreground">
          Al acceder y utilizar el Cancionero Arquidiocesano Digital (en
          adelante, el «Sitio»), el Usuario acepta los presentes Términos de
          Servicio. Si no está de acuerdo con ellos, deberá abstenerse de
          utilizar el Sitio.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Uso del Sitio</h2>
        <p className="text-base leading-7 text-foreground">
          El Sitio se ofrece con fines pastorales y litúrgicos, para facilitar
          el acceso a cantos y recursos de uso comunitario. El Usuario se
          compromete a utilizarlo de manera respetuosa, conforme a la moral
          cristiana y a la legislación vigente.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Cuenta del Usuario</h2>
        <p className="text-base leading-7 text-foreground">
          El acceso a determinadas funciones del Sitio requiere iniciar sesión
          con una cuenta de Google. El Usuario es responsable de la
          confidencialidad y del uso adecuado de su cuenta.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Contenido</h2>
        <p className="text-base leading-7 text-foreground">
          Los cantos, letras y demás materiales publicados en el Sitio se
          ofrecen exclusivamente para uso litúrgico y pastoral. Queda prohibida
          su reproducción con fines comerciales sin autorización del titular de
          los derechos.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Modificaciones</h2>
        <p className="text-base leading-7 text-foreground">
          El Arzobispado de Rosario podrá modificar los presentes Términos en
          cualquier momento. Las modificaciones tendrán efecto desde su
          publicación en el Sitio.
        </p>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-xl text-primary">Contacto</h2>
        <p className="text-base leading-7 text-foreground">
          Para cualquier consulta relativa a los presentes Términos, el Usuario
          podrá escribir a{" "}
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
