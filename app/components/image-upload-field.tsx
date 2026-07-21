"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, getPublicImageUrl } from "@/lib/supabase/storage";
import { TrashIcon } from "./icons";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  label?: string;
  value: string | null;
  onChange: (path: string | null) => void;
  /** Prefijo para el nombre del archivo dentro del bucket. */
  pathPrefix: string;
};

export function ImageUploadField({
  label = "Imagen",
  value,
  onChange,
  pathPrefix,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = getPublicImageUrl(value);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Formato no soportado. Usá JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo supera los 2 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKETS.images)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    if (value) {
      await supabase.storage.from(STORAGE_BUCKETS.images).remove([value]);
    }
    onChange(path);
  }

  async function handleRemove() {
    if (!value) return;
    const supabase = createClient();
    await supabase.storage.from(STORAGE_BUCKETS.images).remove([value]);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <label className="flex flex-col gap-1 normal-case sm:col-span-2">
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl && (
          <div className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-sidebar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {value ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Quitar imagen"
            title="Quitar imagen"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-destructive text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <TrashIcon />
          </button>
        )}
      </div>
      {uploading && (
        <span className="text-xs text-muted-foreground">Subiendo…</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
      <span className="text-xs text-muted-foreground">
        JPG/PNG/WEBP, hasta 2 MB. La imagen se centra horizontalmente y se
        recorta a los lados si es necesario.
      </span>
    </label>
  );
}
