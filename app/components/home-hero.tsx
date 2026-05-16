"use client";

export function HomeHero() {
  return (
    <section>
      <HeroContent />
    </section>
  );
}

export function HeroContent() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
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
