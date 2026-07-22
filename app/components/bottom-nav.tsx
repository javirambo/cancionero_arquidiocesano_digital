"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useHomeTitle } from "./home-title-context";
import { useUnsavedChanges } from "./unsaved-changes-context";
import { BibleIcon, HomeIcon } from "./icons";
import { CancionesIcon, ListasIcon } from "./site-header";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Barra de navegación inferior: píldora flotante translúcida, siempre visible
// (fija, el scroll no la mueve), con el resto transparente. Solo se monta en el
// layout (app), así que no aparece en la vista de canción a pantalla completa.
export function BottomNav() {
  const pathname = usePathname() ?? "";
  const { brand } = useHomeTitle();
  const { dirty } = useUnsavedChanges();

  // Si hay una edición sin guardar (editor de lecturas / salmos), confirmar
  // antes de que la botonera navegue y se pierdan los cambios.
  function guard(e: MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm("Tenés cambios sin guardar. Si salís se pierden. ¿Salir igual?")) {
      e.preventDefault();
    }
  }

  // Solo Inicio sigue el brand seleccionado: diocesano (null) → home de la
  // Arquidiócesis; una parroquia → home de esa parroquia. Listas va siempre a
  // /playlists.
  const homeHref = brand ? brand.href : "/";

  // Reusa los mismos íconos del menú principal (drawer): Cantos, Listas y
  // Orientaciones litúrgicas. Inicio usa el HomeIcon del catálogo.
  const items: NavItem[] = [
    { href: homeHref, label: "Inicio", icon: <HomeIcon /> },
    { href: "/canciones", label: "Cantos", icon: <CancionesIcon /> },
    { href: "/playlists", label: "Listas", icon: <ListasIcon /> },
    { href: "/orientaciones-liturgicas", label: "Liturgia", icon: <BibleIcon /> },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
    >
      <div
        className="pointer-events-auto mx-auto mb-4 flex h-[60px] w-[calc(100%-1.5rem)] max-w-lg items-stretch justify-around gap-1 rounded-full px-2 text-white shadow-lg backdrop-blur-md [&_svg]:h-6 [&_svg]:w-6"
        style={{ backgroundColor: "rgba(56, 90, 150, 0.85)" }}
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={guard}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 normal-case"
            >
              <span
                aria-hidden="true"
                className={`flex items-center justify-center rounded-full px-4 py-1 transition-colors ${
                  active ? "bg-white/15" : ""
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
