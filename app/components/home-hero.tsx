"use client";

import { useEffect, useRef, useState } from "react";
import { useHomeTitle } from "./home-title-context";

const SHOW_DELAY_MS = 2000;
const ANIM_MS = 600;

type HeroWindow = Window & { __homeHeroConsumed?: boolean };

function stripParroquia(name: string): string {
  return name.replace(/^parroquia\s+/i, "").trim();
}

function shouldAnimate(): boolean {
  if (typeof window === "undefined") return false;
  return !(window as HeroWindow).__homeHeroConsumed;
}

function markConsumed() {
  (window as HeroWindow).__homeHeroConsumed = true;
}

export function HomeHero({ parishName }: { parishName: string | null }) {
  const { setTitle } = useHomeTitle();
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving" | "gone">("hidden");
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    if (!shouldAnimate()) {
      setPhase("gone");
      if (parishName) setTitle(stripParroquia(parishName));
      return;
    }
    setPhase("visible");
    const t = setTimeout(() => setPhase("leaving"), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [parishName, setTitle]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => {
      setPhase("gone");
      markConsumed();
      if (parishName) setTitle(stripParroquia(parishName));
    }, ANIM_MS);
    return () => clearTimeout(t);
  }, [phase, parishName, setTitle]);

  if (phase === "gone") return null;

  const collapsing = phase === "leaving";

  return (
    <section
      aria-hidden={collapsing}
      className={`grid transition-[grid-template-rows,opacity,transform] duration-[600ms] ease-in-out ${
        collapsing
          ? "grid-rows-[0fr] opacity-0 -translate-y-4"
          : "grid-rows-[1fr] opacity-100 translate-y-0"
      }`}
    >
      <div className="overflow-hidden">
        <HeroContent parishName={parishName} />
      </div>
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
