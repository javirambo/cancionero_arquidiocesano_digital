"use client";

import Link from "next/link";
import { useState } from "react";
import { EditIcon } from "@/app/components/icons";

// Encabezado de la parroquia: nombre (en dorado) + ubicación, y debajo un panel
// desplegable con el resto de los datos (descripción con horarios de misas,
// Sede, Correo, Tel y sitio web).
//
// Tanto el nombre como la ubicación son disparadores del mismo estado, así que
// tocar cualquiera de los dos abre o cierra el panel y gira la flechita.
export function ParishDetails({
  name,
  editHref,
  address,
  city,
  description,
  parentName,
  email,
  phone,
  url,
}: {
  name: string;
  editHref: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  parentName: string | null;
  email: string | null;
  phone: string | null;
  url: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const location = [address, city].filter(Boolean).join(", ");
  const hasExtra = Boolean(description || parentName || email || phone || url);
  const toggle = () => setExpanded((v) => !v);

  const titleClass =
    "min-w-0 break-words text-xl leading-tight text-secondary sm:text-2xl";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className={titleClass} style={{ textTransform: "none" }}>
            {hasExtra ? (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls="parish-extra"
                className="text-left hover:text-primary"
              >
                {name}
              </button>
            ) : (
              name
            )}
          </h1>
          {editHref && (
            <Link
              href={editHref}
              title="Editar"
              aria-label="Editar"
              className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-primary [&_svg]:h-5 [&_svg]:w-5"
            >
              <EditIcon />
            </Link>
          )}
        </div>

        {(location || hasExtra) && (
          <div className="text-sm normal-case text-muted-foreground">
            {hasExtra ? (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls="parish-extra"
                className="inline-flex items-center gap-1 text-left hover:text-primary"
              >
                <span>{location || "Más datos"}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ) : (
              <span>{location}</span>
            )}
          </div>
        )}
      </div>

      {/* Fuera de la columna del título: el panel usa todo el ancho disponible
          en vez de quedar indentado bajo el logo. */}
      {expanded && (
        <div
          id="parish-extra"
          className="flex w-full flex-col gap-1 text-sm normal-case text-muted-foreground"
        >
          {description && (
            <div className="whitespace-pre-line border-l-2 border-destructive pl-3 text-base italic">
              {description}
            </div>
          )}
          {parentName && <div>Sede: {parentName}</div>}
          {(email || phone) && (
            <div className="flex flex-wrap items-center gap-x-2">
              {email && (
                <span>
                  Correo:{" "}
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-primary hover:underline"
                  >
                    {email}
                  </a>
                </span>
              )}
              {email && phone && <span aria-hidden="true">·</span>}
              {phone && (
                <span>
                  Tel:{" "}
                  <a
                    href={`tel:${phone}`}
                    className="hover:text-primary hover:underline"
                  >
                    {phone}
                  </a>
                </span>
              )}
            </div>
          )}
          {url && (
            <div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary hover:underline"
              >
                <span>{prettyHost(url)}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
