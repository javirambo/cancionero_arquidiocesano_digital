"use client";

import { useState } from "react";

// Datos de la parroquia bajo el título. La dirección y la descripción
// (horarios de misas) se ven siempre; el resto (Sede, Correo, Tel, sitio
// web) queda colapsado y se despliega al hacer click en la dirección.
export function ParishDetails({
  address,
  city,
  description,
  parentName,
  email,
  phone,
  url,
}: {
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
  const hasExtra = Boolean(parentName || email || phone || url);

  return (
    <dl className="flex flex-col gap-1 text-sm normal-case text-muted-foreground">
      {(location || hasExtra) && (
        <div>
          {hasExtra ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
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

      {description && (
        <div className="max-w-2xl whitespace-pre-line border-l-2 border-destructive pl-3 text-base italic">
          {description}
        </div>
      )}

      {expanded && (
        <>
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
        </>
      )}
    </dl>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
