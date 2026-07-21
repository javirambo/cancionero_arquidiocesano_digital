"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "./session";
import type { HeaderBrand } from "./home-title-context";

// Duración de la animación de bajada/subida del dropdown. Debe coincidir con la
// clase duration-* del panel.
const DROPDOWN_MS = 300;

type UserParish = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

const chevronProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    {...chevronProps}
    aria-hidden="true"
    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const AddIcon = () => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

// Círculo con la imagen de la parroquia, o su inicial si no tiene logo.
function ParishAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;

  if (showImg) {
    return (
      <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-sm text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

async function loadUserParishes(userId: string): Promise<UserParish[]> {
  const supabase = createClient();
  const [membersRes, profileRes] = await Promise.all([
    supabase
      .from("parish_members")
      .select("joined_at, parishes(id, slug, name, logo_url)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false }),
    supabase.from("users").select("parish_id").eq("id", userId).maybeSingle(),
  ]);
  const data = membersRes.data;
  if (!data) return [];
  const seen = new Set<string>();
  const parishes: UserParish[] = [];
  for (const row of data) {
    const rel = row.parishes as UserParish | UserParish[] | null;
    const p = Array.isArray(rel) ? rel[0] : rel;
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    parishes.push(p);
  }
  // La parroquia principal (la de la estrella, guardada en users.parish_id) va
  // primero; el resto conserva su orden por joined_at desc.
  const primaryId = (profileRes.data?.parish_id as string | null) ?? null;
  if (!primaryId) return parishes;
  const primary = parishes.filter((p) => p.id === primaryId);
  const others = parishes.filter((p) => p.id !== primaryId);
  return [...primary, ...others];
}

export function ParishSwitcher({ brand }: { brand: HeaderBrand | null }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [parishes, setParishes] = useState<UserParish[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Se recarga al montar, al cambiar de usuario y cada vez que se abre el
  // dropdown: así refleja altas/bajas de parroquias hechas en otras vistas
  // (p. ej. /parroquias) sin necesidad de recargar la página.
  useEffect(() => {
    if (!user) {
      setParishes([]);
      return;
    }
    let active = true;
    loadUserParishes(user.id).then((list) => {
      if (active) setParishes(list);
    });
    return () => {
      active = false;
    };
  }, [user, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Cierra al cambiar de ruta (red de seguridad por si la navegación llega con
  // el menú abierto sin haber pasado por un ítem).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Persiana: baja al abrir, sube al cerrar.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    if (!mounted) return;
    setShown(false);
    const t = setTimeout(() => setMounted(false), DROPDOWN_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Al elegir un ítem: el Link dispara la navegación y además cerramos con la
  // animación de persiana, para que el click se note.
  const selectItem = () => {
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative flex min-w-0 justify-center ${
        brand ? "max-w-[50%] sm:max-w-none" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={brand ? brand.name : "Arquidiócesis"}
        className="flex min-w-0 items-center gap-2 text-white"
      >
        {brand ? (
          <>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 shrink-0 rounded-full border border-white/40 object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-lg text-white"
              >
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="line-clamp-2 min-w-0 break-words text-xs font-semibold leading-tight text-white sm:text-sm">
              {brand.name}
            </span>
          </>
        ) : (
          <>
            <Image
              src="/logo-comis-cordero.png"
              alt=""
              width={90}
              height={90}
              priority
              className="h-10 w-auto"
            />
            <Image
              src="/logo-comis-liturgia.png"
              alt="Comisión de Liturgia"
              width={300}
              height={100}
              priority
              className="h-8 w-auto"
            />
          </>
        )}
        <ChevronDownIcon open={open} />
      </button>

      {mounted && (
        <div
          role="menu"
          aria-label="Cambiar de parroquia"
          className={`absolute left-1/2 top-full z-40 mt-2 grid w-[min(18rem,80vw)] -translate-x-1/2 rounded-xl shadow-lg transition-[grid-template-rows] duration-300 ease-out ${
            shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background text-foreground">
          <ul className="py-1 text-sm">
            <li>
              <Link
                href="/"
                role="menuitem"
                onClick={selectItem}
                className="flex items-center gap-3 px-4 py-2.5 normal-case transition-colors hover:bg-sidebar"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                  <Image
                    src="/logo-comis-cordero.png"
                    alt=""
                    width={32}
                    height={32}
                    className="h-6 w-auto"
                  />
                </span>
                <span className="min-w-0 truncate">Arquidiócesis</span>
              </Link>
            </li>
            {parishes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/parroquias/${p.slug}`}
                  role="menuitem"
                  onClick={selectItem}
                  className="flex items-center gap-3 px-4 py-2.5 normal-case transition-colors hover:bg-sidebar"
                >
                  <ParishAvatar name={p.name} logoUrl={p.logo_url} />
                  <span className="min-w-0 truncate">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border py-1 text-sm">
            <Link
              href="/parroquias"
              role="menuitem"
              onClick={selectItem}
              className="flex items-center gap-3 px-4 py-2.5 normal-case transition-colors hover:bg-sidebar"
            >
              <span aria-hidden="true" className="text-muted-foreground">
                <AddIcon />
              </span>
              <span className="min-w-0 truncate">Agregar parroquia</span>
            </Link>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
