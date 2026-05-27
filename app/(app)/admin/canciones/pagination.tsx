import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

const ARROW_ENABLED =
  "flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground";
const ARROW_DISABLED =
  "flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary opacity-40 pointer-events-none";

export function Pagination({
  page,
  pageSize,
  total,
  q,
  estado,
  orden,
}: {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  estado: string;
  orden: string;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "todas") params.set("estado", estado);
    if (orden !== "modificacion") params.set("orden", orden);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/canciones${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="text-xs normal-case text-muted-foreground">
        Cantos {from}–{to} de {total}
      </span>
      {hasPrev ? (
        <Link
          href={hrefForPage(page - 1)}
          aria-label="Anterior"
          className={ARROW_ENABLED}
          prefetch={false}
        >
          <span className="scale-150">
            <ChevronLeftIcon />
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className={ARROW_DISABLED}>
          <span className="scale-150">
            <ChevronLeftIcon />
          </span>
        </span>
      )}
      {hasNext ? (
        <Link
          href={hrefForPage(page + 1)}
          aria-label="Siguiente"
          className={ARROW_ENABLED}
          prefetch={false}
        >
          <span className="scale-150">
            <ChevronRightIcon />
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className={ARROW_DISABLED}>
          <span className="scale-150">
            <ChevronRightIcon />
          </span>
        </span>
      )}
    </div>
  );
}
