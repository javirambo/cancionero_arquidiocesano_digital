"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CloseIcon } from "./icons";

type Props = {
  // Path relativo (ej: "/canciones/001-abba-padre"). Si se omite, se usa
  // window.location.href en el momento de abrir el diálogo.
  path?: string;
  // Sugerencia para el filename de la descarga; si falta usa "qr".
  filename?: string;
  label?: string;
};

export function QrButton({ path, filename = "qr", label = "Descargar QR" }: Props) {
  const [open, setOpen] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const target =
      path !== undefined
        ? new URL(path, window.location.origin).toString()
        : window.location.href;
    setUrl(target);

    let cancelled = false;
    Promise.all([
      QRCode.toDataURL(target, { width: 512, margin: 2 }),
      QRCode.toString(target, { type: "svg", margin: 2 }),
    ])
      .then(([png, svg]) => {
        if (!cancelled) {
          setPngDataUrl(png);
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPngDataUrl(null);
          setSvgMarkup(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, path]);

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function downloadPng() {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = `${filename}.png`;
    a.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <>
      <button
        type="button"
        title={label}
        onClick={() => setOpen(true)}
        className="rounded-full border border-primary px-4 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Código QR"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
          onClick={() => setOpen(false)}
        >
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-lg">Código QR</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="flex flex-col items-center gap-4 px-6 py-6">
              {pngDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pngDataUrl}
                  alt="Código QR de la página actual"
                  className="h-64 w-64 rounded-md border border-border bg-white"
                />
              ) : (
                <div className="h-64 w-64 animate-pulse rounded-md border border-border bg-sidebar" />
              )}
              {url && (
                <p className="break-all text-center text-xs normal-case text-muted-foreground">
                  {url}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={!pngDataUrl}
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Descargar PNG
                </button>
                <button
                  type="button"
                  onClick={downloadSvg}
                  disabled={!svgMarkup}
                  className="rounded-full border border-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  Descargar SVG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
