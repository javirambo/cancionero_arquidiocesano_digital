import Link from "next/link";
import type { Featured } from "@/lib/songs";

const KIND_LABEL: Record<string, string> = {
  solemnidad: "Solemnidad",
  fiesta: "Fiesta",
  memoria: "Memoria",
  tiempo: "Tiempo litúrgico",
};

export function AnnouncementCard({ item }: { item: Featured }) {
  const kindLabel = item.kind ? KIND_LABEL[item.kind] ?? item.kind : null;
  const isExternal = item.target_kind === "external" && item.href;
  const cardClass =
    "block rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary";

  const content = (
    <>
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
    </>
  );

  if (item.href && isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {content}
      </a>
    );
  }
  if (item.href) {
    return (
      <Link href={item.href} className={cardClass}>
        {content}
      </Link>
    );
  }
  return <div className="rounded-xl border border-border bg-background p-5">{content}</div>;
}
