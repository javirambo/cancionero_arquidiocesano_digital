"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "./theme";

type MenuItemProps = {
  href?: string;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

function MenuItem({ href, icon, label, onSelect, destructive }: MenuItemProps) {
  const className = `flex w-full items-center gap-3 px-4 py-2 text-left normal-case transition-colors hover:bg-sidebar ${
    destructive ? "text-destructive" : "text-foreground"
  }`;

  if (href) {
    return (
      <Link href={href} role="menuitem" onClick={onSelect} className={className}>
        <span aria-hidden="true" className="text-muted-foreground">
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onSelect} className={className}>
      <span aria-hidden="true" className="text-muted-foreground">
        {icon}
      </span>
      {label}
    </button>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PerfilIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
  </svg>
);

const ModoOscuroIcon = () => (
  <svg {...iconProps}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </svg>
);

const ModoClaroIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
  </svg>
);

const FavoritosIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  </svg>
);

const ListasIcon = () => (
  <svg {...iconProps}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
);

const CerrarSesionIcon = () => (
  <svg {...iconProps}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h12" />
  </svg>
);

const UsuarioTriggerIcon = () => (
  <svg {...iconProps} width={20} height={20}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
  </svg>
);

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  const close = () => setOpen(false);

  return (
    <header className="border-b border-border bg-sidebar">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-wide text-primary">
            Cancionero
          </span>
          <span className="text-sm normal-case tracking-normal text-muted-foreground">
            Arquidiócesis de Rosario
          </span>
        </Link>

        <div ref={containerRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Abrir menú de usuario"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <UsuarioTriggerIcon />
          </button>

          {open && (
            <div
              role="menu"
              aria-label="Menú de usuario"
              className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
            >
              <div className="border-b border-border px-4 py-3 normal-case">
                <p className="text-sm text-foreground">Invitado</p>
                <p className="text-xs text-muted-foreground">
                  Iniciá sesión para acceder a tu perfil
                </p>
              </div>
              <ul className="py-1 text-sm">
                <li>
                  <MenuItem
                    href="/perfil"
                    icon={<PerfilIcon />}
                    label="Perfil"
                    onSelect={close}
                  />
                </li>
                <li>
                  <MenuItem
                    icon={theme === "dark" ? <ModoClaroIcon /> : <ModoOscuroIcon />}
                    label={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                    onSelect={() => {
                      toggle();
                      close();
                    }}
                  />
                </li>
                <li>
                  <MenuItem
                    href="/mis-favoritos"
                    icon={<FavoritosIcon />}
                    label="Mis favoritos"
                    onSelect={close}
                  />
                </li>
                <li>
                  <MenuItem
                    href="/listas"
                    icon={<ListasIcon />}
                    label="Listas"
                    onSelect={close}
                  />
                </li>
              </ul>
              <div className="border-t border-border py-1 text-sm">
                <MenuItem
                  icon={<CerrarSesionIcon />}
                  label="Cerrar Sesión"
                  onSelect={close}
                  destructive
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
