"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CloseIcon, LinkIcon, QrIcon } from "./icons";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  // Path relativo (ej: "/canciones/001-abba-padre"). Si se omite, se usa
  // window.location.href en el momento de abrir el diálogo.
  path?: string;
  // Título sugerido para el menú nativo de compartir.
  title?: string;
  // Sugerencia para el filename de la descarga. Si falta, se deriva del
  // último segmento de la URL (el slug).
  filename?: string;
};

// Deriva un nombre de archivo legible del último segmento de una URL.
function slugFromUrl(rawUrl: string): string {
  try {
    const { pathname } = new URL(rawUrl);
    const last = pathname.split("/").filter(Boolean).pop();
    const clean = (last ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
    return clean || "inicio";
  } catch {
    return "qr";
  }
}

// Diálogo de QR reutilizable: muestra la URL, un botón "Compartir enlace"
// (Web Share API con fallback a portapapeles), el QR y la descarga PNG.
export function QrDialog({
  open,
  onClose,
  path,
  title,
  filename,
}: DialogProps) {
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [autoName, setAutoName] = useState("qr");

  useEffect(() => {
    if (!open) return;
    const target =
      path !== undefined
        ? new URL(path, window.location.origin).toString()
        : window.location.href;
    setUrl(target);
    setAutoName(slugFromUrl(target));

    let cancelled = false;
    QRCode.toDataURL(target, { width: 512, margin: 2 })
      .then((png) => {
        if (!cancelled) setPngDataUrl(png);
      })
      .catch(() => {
        if (!cancelled) setPngDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, path]);

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function shareLink() {
    if (!url) return;
    const navAny = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (navAny.share) {
      try {
        await navAny.share({ title, url });
        return;
      } catch {
        // si el usuario cancela, caemos al copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado");
    } catch {
      window.prompt("Copiá este enlace:", url);
    }
  }

  function downloadPng() {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = `${filename ?? autoName}.png`;
    a.click();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartir"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg">Compartir</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex flex-col items-center gap-4 px-6 py-6">
          {url && (
            <p className="break-all text-center text-xs normal-case text-muted-foreground">
              {url}
            </p>
          )}

          <button
            type="button"
            onClick={shareLink}
            disabled={!url}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <span aria-hidden="true">
              <LinkIcon />
            </span>
            Compartir enlace
          </button>

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

          <button
            type="button"
            onClick={downloadPng}
            disabled={!pngDataUrl}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <span aria-hidden="true">
              <QrIcon />
            </span>
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
}

type ButtonProps = {
  path?: string;
  filename?: string;
  title?: string;
  label?: string;
};

export function QrButton({
  path,
  filename,
  title,
  label = "Compartir...",
}: ButtonProps) {
  const [open, setOpen] = useState(false);

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

      <QrDialog
        open={open}
        onClose={() => setOpen(false)}
        path={path}
        title={title}
        filename={filename}
      />
    </>
  );
}
