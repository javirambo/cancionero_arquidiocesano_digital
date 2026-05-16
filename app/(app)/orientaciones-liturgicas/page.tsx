import { listAnnouncementsByKind } from "@/lib/songs";
import { AnnouncementCard } from "@/app/components/announcement-card";

export const metadata = {
  title: "Orientaciones litúrgicas · Cancionero Arquidiocesano",
};

export default async function OrientacionesLiturgicasPage() {
  const { items } = await listAnnouncementsByKind("indicaciones");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-page-title">Orientaciones litúrgicas</h1>
        <p className="text-base normal-case text-muted-foreground">
          Recurso diocesano destinado a ofrecer criterios para la selección de
          cantos y para la preparación musical de las celebraciones.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
          No hay orientaciones disponibles por el momento.
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item, i) => (
            <li key={i}>
              <AnnouncementCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
