import type { Featured } from "@/lib/songs";
import { CardWithImage } from "./card-with-image";

const KIND_LABEL: Record<string, string> = {
  solemnidad: "Solemnidad",
  fiesta: "Fiesta",
  memoria: "Memoria",
  tiempo: "Tiempo litúrgico",
};

export function AnnouncementCard({ item }: { item: Featured }) {
  const kindLabel = item.kind ? KIND_LABEL[item.kind] ?? item.kind : null;
  const isExternal = item.target_kind === "external" && Boolean(item.href);

  return (
    <CardWithImage
      imagePath={item.image_path}
      href={item.href}
      external={isExternal}
    >
      {kindLabel && (
        <span className="text-xs uppercase tracking-wide text-secondary">
          {kindLabel}
        </span>
      )}
      <p className="text-base text-primary">{item.title}</p>
      {item.body && (
        <p className="mt-1 whitespace-pre-line text-sm normal-case leading-6 text-muted-foreground">
          {item.body}
        </p>
      )}
    </CardWithImage>
  );
}
