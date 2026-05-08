import type { SongStatus } from "@/lib/songs-admin";

const STYLE: Record<SongStatus, { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "border-border text-muted-foreground",
  },
  review: {
    label: "En revisión",
    className: "border-secondary text-secondary",
  },
  published: {
    label: "Publicado",
    className: "border-success text-success",
  },
  rejected: {
    label: "Rechazado",
    className: "border-destructive text-destructive",
  },
  archived: {
    label: "Archivado",
    className: "border-border text-muted-foreground opacity-70",
  },
};

const SIZE: Record<"sm" | "md", string> = {
  sm: "px-1.5 py-0 text-[10px]",
  md: "px-2 py-0.5 text-xs",
};

export function SongStatusBadge({
  status,
  size = "md",
}: {
  status: SongStatus;
  size?: "sm" | "md";
}) {
  const { label, className } = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${SIZE[size]} ${className}`}
    >
      {label}
    </span>
  );
}
