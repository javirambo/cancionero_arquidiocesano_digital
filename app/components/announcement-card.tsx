import type { Featured } from "@/lib/songs";
import { CardWithImage } from "./card-with-image";
import { ExpandableText } from "./expandable-text";
import { SimpleMarkdown, simpleMarkdownToPlainText } from "./simple-markdown";

const KIND_LABEL: Record<string, string> = {
  solemnidad: "Solemnidad",
  fiesta: "Fiesta",
  memoria: "Memoria",
  tiempo: "Tiempo litúrgico",
  indicaciones: "Indicaciones",
};

export function AnnouncementCard({
  item,
  compact = false,
}: {
  item: Featured;
  /**
   * Versión para carousels de altura fija: muestra el comienzo del título y
   * del cuerpo, recortados con "…". No lleva "Ver más...", que quedaría fuera
   * de la altura de la tarjeta; el aviso completo se lee al abrirlo.
   */
  compact?: boolean;
}) {
  const kindLabel = item.kind ? KIND_LABEL[item.kind] ?? item.kind : null;
  const isExternal = item.target_kind === "external" && Boolean(item.href);

  return (
    <CardWithImage
      imagePath={item.image_path}
      href={item.href}
      external={isExternal}
      compact={compact}
    >
      {kindLabel && (
        <span className="text-xs uppercase tracking-wide text-secondary">
          {kindLabel}
        </span>
      )}
      <p className={`text-base text-page-title ${compact ? "line-clamp-2" : ""}`}>
        {item.title}
      </p>
      {item.body &&
        (compact ? (
          <span className="line-clamp-3 text-sm normal-case leading-5 text-muted-foreground">
            {simpleMarkdownToPlainText(item.body)}
          </span>
        ) : (
          <ExpandableText
            className="mt-1 text-sm normal-case leading-6 text-muted-foreground"
            maxLines={4}
          >
            <SimpleMarkdown text={item.body} />
          </ExpandableText>
        ))}
    </CardWithImage>
  );
}
