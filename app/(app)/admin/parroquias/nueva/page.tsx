import Link from "next/link";
import { ParroquiaForm } from "../parroquia-form";

export default function NuevaParroquiaPage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/parroquias"
          className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Parroquias
        </Link>
        <h1 className="text-2xl">Nueva parroquia</h1>
      </header>
      <ParroquiaForm mode="create" />
    </main>
  );
}
