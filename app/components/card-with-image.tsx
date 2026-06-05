import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon, ExternalLinkIcon } from "./icons";
import { getPublicImageUrl } from "@/lib/supabase/storage";

type Props = {
  imagePath: string | null;
  href: string | null;
  external?: boolean;
  showIndicator?: boolean;
  children: ReactNode;
};

export function CardWithImage({
  imagePath,
  href,
  external = false,
  showIndicator = true,
  children,
}: Props) {
  const imageUrl = getPublicImageUrl(imagePath);

  const cardClass =
    "relative flex h-full w-full items-center overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary";
  const staticCardClass =
    "relative flex h-full w-full items-center overflow-hidden rounded-xl border border-border bg-card";

  const imageBlock = imageUrl ? (
    <div className="absolute inset-y-0 left-0 w-[75px] bg-sidebar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-cover object-center"
      />
    </div>
  ) : null;

  const indicator =
    href && showIndicator ? (
      <span
        className="absolute bottom-3 right-3 text-muted-foreground"
        aria-hidden="true"
      >
        {external ? <ExternalLinkIcon /> : <ChevronRightIcon />}
      </span>
    ) : null;

  const inner = (
    <>
      {imageBlock}
      <div
        className={`flex min-w-0 flex-1 flex-col p-5 pr-10 ${imageUrl ? "ml-[75px]" : ""}`}
      >
        {children}
      </div>
      {indicator}
    </>
  );

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }
  return <div className={staticCardClass}>{inner}</div>;
}
