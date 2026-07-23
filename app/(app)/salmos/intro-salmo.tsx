"use client";

import { useState } from "react";

const SHORT =
  "El salmo responsorial forma parte de la Liturgia de la Palabra. Es respuesta orante a la " +
  "Palabra proclamada y se canta según el Leccionario, ayudando a la asamblea a meditar y acoger " +
  "lo que Dios dice a su pueblo.";

const LONG = [
  "El salmo responsorial forma parte de la Liturgia de la Palabra. Después de la primera lectura, " +
    "la asamblea responde a Dios con las mismas palabras de la Sagrada Escritura, haciendo del " +
    "salmo una oración cantada.",
  "Por eso, el salmo no es simplemente un canto bíblico ni un momento de meditación libre. Tiene " +
    "un lugar propio dentro de la celebración y se elige en relación con las lecturas indicadas " +
    "por el Leccionario para cada domingo, fiesta, solemnidad o celebración ritual.",
  "Cantar el salmo ayuda a que la Palabra proclamada sea recibida, meditada y rezada por toda la " +
    "comunidad. La forma responsorial —antífona y estrofas— favorece la participación de la " +
    "asamblea y expresa que la Iglesia responde a Dios con su propia Palabra.",
];

export function IntroSalmo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="-mt-3 mb-3 flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-foreground normal-case">
        {SHORT}{" "}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Ver menos" : "Ver más"}
          title={open ? "Ver menos" : "Ver más"}
          className="inline-flex align-middle text-primary hover:opacity-70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </p>

      {open && (
        <div className="flex flex-col gap-3">
          {LONG.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground normal-case">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
