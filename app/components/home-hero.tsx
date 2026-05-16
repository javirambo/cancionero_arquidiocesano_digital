"use client";

export function HomeHero({ parishName }: { parishName: string | null }) {
  return (
    <section>
      <HeroContent parishName={parishName} />
    </section>
  );
}

export function HeroContent({ parishName }: { parishName: string | null }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {parishName && (
        <p className="text-2xl text-secondary">{parishName}</p>
      )}
      <p className="text-sm uppercase tracking-[0.2em] text-secondary">
        Evangelizar a través de la música
      </p>
      <h1 className="text-4xl leading-tight text-primary sm:text-5xl">
        Cancionero Arquidiocesano
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-muted-foreground normal-case">
        Una herramienta común para coros, ministerios de música y asambleas
        de toda la Arquidiócesis.
      </p>
    </div>
  );
}
