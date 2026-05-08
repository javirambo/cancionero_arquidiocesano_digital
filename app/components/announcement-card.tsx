import Link from "next/link";
import type { Featured } from "@/lib/songs";
import { ChevronRightIcon, ExternalLinkIcon } from "./icons";

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
    "flex items-center gap-3 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary";

  const text = (
    <div className="flex min-w-0 flex-1 flex-col">
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
    </div>
  );

  const indicator = isExternal ? (
    <span className="shrink-0 text-muted-foreground" aria-hidden="true">
      <ExternalLinkIcon />
    </span>
  ) : (
    <span className="shrink-0 text-muted-foreground" aria-hidden="true">
      <ChevronRightIcon />
    </span>
  );

  if (item.href && isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {text}
        {indicator}
      </a>
    );
  }
  if (item.href) {
    return (
      <Link href={item.href} className={cardClass}>
        {text}
        {indicator}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      {text}
    </div>
  );
}
