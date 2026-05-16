export const metadata = {
  title: "Orientaciones litúrgicas · Cancionero Arquidiocesano",
};

export default function OrientacionesLiturgicasPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-page-title">Orientaciones litúrgicas</h1>
        <p className="text-base normal-case text-muted-foreground">
          Recurso diocesano destinado a ofrecer criterios para la selección de
          cantos y para la preparación musical de las celebraciones.
        </p>
      </header>
    </main>
  );
}
