import Link from "next/link";
import { version } from "@/package.json";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1 px-6 py-6 text-center text-xs normal-case text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <span>Arquidiócesis de Rosario · Comisión Litúrgico-Musical</span>
        <span className="flex items-center gap-3">
          <Link href="/creditos" className="hover:text-primary">
            Créditos
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacidad" className="hover:text-primary">
            Privacidad
          </Link>
          <span aria-hidden="true">·</span>
          <span>Versión {version}</span>
        </span>
      </div>
    </footer>
  );
}
