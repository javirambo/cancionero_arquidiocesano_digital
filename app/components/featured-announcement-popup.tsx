"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Featured } from "@/lib/songs";
import { SimpleMarkdown } from "./simple-markdown";
import { getPublicImageUrl } from "@/lib/supabase/storage";

const KIND_LABEL: Record<string, string> = {
  solemnidad: "Solemnidad",
  fiesta: "Fiesta",
  memoria: "Memoria",
  tiempo: "Tiempo litúrgico",
  indicaciones: "Indicaciones",
};

const CTA_LABEL: Record<string, string> = {
  song: "Ir al canto",
  playlist: "Ir a la lista",
  parish: "Ir a la parroquia",
  external: "Abrir enlace",
  document: "Abrir indicaciones",
};

export function FeaturedAnnouncementPopup({ item }: { item: Featured }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const kindLabel = item.kind ? KIND_LABEL[item.kind] ?? item.kind : null;
  const imgUrl = getPublicImageUrl(item.image_path);
  const isExternal = item.target_kind === "external" && Boolean(item.href);
  const ctaLabel = item.href ? CTA_LABEL[item.target_kind] ?? null : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-2 z-50 sm:inset-3"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-black/60"
        onClick={() => setOpen(false)}
      />
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex-1 overflow-y-auto">
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt=""
              className="block h-[25vh] w-full object-cover object-top"
            />
          )}

          <div className="flex flex-col gap-3 p-6 sm:p-8">
            {kindLabel && (
              <span className="text-xs uppercase tracking-wide text-secondary">
                {kindLabel}
              </span>
            )}
            <h2 className="text-2xl text-primary sm:text-3xl">{item.title}</h2>
            {item.body && (
              <SimpleMarkdown
                text={item.body}
                className="text-base normal-case leading-7 text-foreground"
              />
            )}
          </div>
        </div>

        {item.href && ctaLabel && (
          <div className="flex justify-center border-t border-border bg-sidebar px-6 py-4">
            {isExternal ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-primary bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-md hover:opacity-90"
              >
                {ctaLabel}
              </a>
            ) : (
              <Link
                href={item.href}
                className="rounded-full border border-primary bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-md hover:opacity-90"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setOpen(false)}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-lg font-semibold text-foreground shadow-md backdrop-blur hover:border-primary hover:text-primary"
      >
        ✕
      </button>
    </div>
  );
}
