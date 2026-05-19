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
        La música al servicio del Evangelio
      </p>
      <h1 className="text-4xl leading-tight text-primary sm:text-5xl">
        CANCIONERO ARQUIDIOCESANO
      </h1>
      <p className="max-w-2xl text-lg italic leading-8 text-muted-foreground normal-case">
        «Cantando y celebrando al Señor de todo corazón» Ef 5,19
      </p>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground normal-case">
        Un recurso común para coros, músicos y fieles de toda la Arquidiócesis,
        al servicio de la celebración litúrgica y la oración.
      </p>
    </div>
  );
}
