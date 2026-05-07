"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./theme";
import { SearchDialog } from "./search-dialog";
import { FavoritesDialog } from "./favorites-dialog";
import { useFavorites } from "./favorites";
import { useUserRoles } from "./user-roles";
import { useWakeLock } from "./wake-lock";
import { useHomeTitle } from "./home-title-context";
import { CloseIcon, HeartIcon, SearchIcon, UserIcon } from "./icons";

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

function MenuToggleItem({
  icon,
  label,
  checked,
  onChange,
  disabled,
  tooltip,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      title={tooltip}
      onClick={onChange}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left normal-case transition-colors ${
        disabled
          ? "text-muted-foreground cursor-not-allowed"
          : "text-foreground hover:bg-sidebar"
      }`}
    >
      <span aria-hidden="true" className="text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
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

const ListasIcon = () => (
  <svg {...iconProps}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
);

const ParroquiasIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l4 3v4h4v11H4V10h4V6z" />
    <path d="M12 3v3" />
    <path d="M11 6h2" />
    <path d="M10 21v-5h4v5" />
  </svg>
);

const CerrarSesionIcon = () => (
  <svg {...iconProps}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h12" />
  </svg>
);

const IngresarIcon = () => (
  <svg {...iconProps}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M14 8l4 4-4 4" />
    <path d="M18 12H8" />
  </svg>
);

const AdminIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const QrIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" />
  </svg>
);

const HomeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

const CancionesIcon = () => (
  <svg {...iconProps}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

const ModoCoroIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const NovedadesIcon = () => (
  <svg {...iconProps}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const showQr = pathname !== "/perfil";
  const { theme, toggle } = useTheme();
  const { favorites } = useFavorites();
  const { active: wakeLockActive, supported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();
  const { isAdmin, isEditor } = useUserRoles();
  const { title } = useHomeTitle();
  const [displayTitle, setDisplayTitle] = useState(title);
  const [titleVisible, setTitleVisible] = useState(true);

  useEffect(() => {
    if (title === displayTitle) return;
    setTitleVisible(false);
    const t = setTimeout(() => {
      setDisplayTitle(title);
      setTitleVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [title, displayTitle]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Fuerza a Google a mostrar el selector de cuentas en lugar de
        // usar la sesión activa. Acepta valores compuestos separados
        // por espacio (p. ej. "consent select_account").
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.reload();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Atajo Cmd/Ctrl+K abre la búsqueda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-sidebar">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-1">
        <Link href="/" className="flex items-baseline gap-3">
          <span
            className={`text-xl font-bold tracking-wide text-primary transition-opacity duration-300 ease-in-out ${
              titleVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {displayTitle}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <CircleButton
            label="Inicio"
            onClick={() => router.push("/")}
            icon={<HomeIcon />}
          />
          <CircleButton
            label="Buscar"
            onClick={() => setSearchOpen(true)}
            icon={<SearchIcon />}
          />
          <CircleButton
            label="Favoritos"
            onClick={() => setFavOpen(true)}
            icon={
              <span className={favorites.length > 0 ? "text-primary" : undefined}>
                <HeartIcon filled={favorites.length > 0} />
              </span>
            }
          />

          <div ref={menuRef} className="relative">
            <AccountButton
              user={user}
              onClick={() => setMenuOpen((v) => !v)}
              ariaExpanded={menuOpen}
            />

            {menuOpen && (
              <div
                role="menu"
                aria-label="Menú de usuario"
                className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
              >
                <div className="border-b border-border px-4 py-3 normal-case">
                  {user ? (
                    <>
                      <p className="text-sm text-foreground">
                        {user.user_metadata?.full_name ??
                          user.user_metadata?.name ??
                          user.email ??
                          "Usuario"}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-foreground">Invitado</p>
                      <p className="text-xs text-muted-foreground">
                        Iniciá sesión para acceder a tu perfil
                      </p>
                    </>
                  )}
                </div>
                <ul className="py-1 text-sm">
                  <li>
                    <MenuItem
                      href="/perfil"
                      icon={<PerfilIcon />}
                      label="Perfil"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      icon={theme === "dark" ? <ModoClaroIcon /> : <ModoOscuroIcon />}
                      label={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                      onSelect={() => {
                        toggle();
                        closeMenu();
                      }}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/canciones"
                      icon={<CancionesIcon />}
                      label="Canciones"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/playlists"
                      icon={<ListasIcon />}
                      label="Playlists"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/parroquias"
                      icon={<ParroquiasIcon />}
                      label="Parroquias"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/novedades"
                      icon={<NovedadesIcon />}
                      label="Novedades"
                      onSelect={closeMenu}
                    />
                  </li>
                  {wakeLockSupported !== false && (
                    <li>
                      <MenuToggleItem
                        icon={<ModoCoroIcon />}
                        label="No apagar pantalla"
                        checked={wakeLockActive}
                        disabled={wakeLockSupported === null}
                        tooltip="Mantiene la pantalla encendida durante la celebración"
                        onChange={() => {
                          toggleWakeLock();
                        }}
                      />
                    </li>
                  )}
                  {showQr && (
                    <li>
                      <MenuItem
                        icon={<QrIcon />}
                        label="Descargar QR"
                        onSelect={() => {
                          closeMenu();
                          setQrOpen(true);
                        }}
                      />
                    </li>
                  )}
                  {(isAdmin || isEditor) && (
                    <li>
                      <MenuItem
                        href="/admin"
                        icon={<AdminIcon />}
                        label="Administración"
                        onSelect={closeMenu}
                      />
                    </li>
                  )}
                </ul>
                <div className="border-t border-border py-1 text-sm">
                  {user ? (
                    <MenuItem
                      icon={<CerrarSesionIcon />}
                      label="Cerrar Sesión"
                      onSelect={handleSignOut}
                      destructive
                    />
                  ) : (
                    <MenuItem
                      icon={<IngresarIcon />}
                      label="Ingresar con Google"
                      onSelect={() => {
                        closeMenu();
                        handleSignIn();
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FavoritesDialog open={favOpen} onClose={() => setFavOpen(false)} />
      <HeaderQrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </header>
  );
}

function HeaderQrDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const target = window.location.href;
    setUrl(target);
    let cancelled = false;
    Promise.all([
      QRCode.toDataURL(target, { width: 512, margin: 2 }),
      QRCode.toString(target, { type: "svg", margin: 2 }),
    ])
      .then(([png, svg]) => {
        if (!cancelled) {
          setPngDataUrl(png);
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPngDataUrl(null);
          setSvgMarkup(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function downloadPng() {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = "qr.png";
    a.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "qr.svg";
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Código QR"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg">Código QR</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex flex-col items-center gap-4 px-6 py-6">
          {pngDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pngDataUrl}
              alt="Código QR de la página actual"
              className="h-64 w-64 rounded-md border border-border bg-white"
            />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-md border border-border bg-sidebar" />
          )}
          {url && (
            <p className="break-all text-center text-xs normal-case text-muted-foreground">
              {url}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadPng}
              disabled={!pngDataUrl}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Descargar PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              disabled={!svgMarkup}
              className="rounded-full border border-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
            >
              Descargar SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CircleButton({
  label,
  onClick,
  icon,
  ariaHaspopup,
  ariaExpanded,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  ariaHaspopup?: "menu" | "dialog";
  ariaExpanded?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className="group flex flex-col items-center gap-0.5 text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition-colors group-hover:border-primary">
        {icon}
      </span>
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}

function AccountButton({
  user,
  onClick,
  ariaExpanded,
}: {
  user: User | null;
  onClick: () => void;
  ariaExpanded: boolean;
}) {
  const meta = user?.user_metadata as
    | { avatar_url?: string; picture?: string }
    | undefined;
  const avatarUrl = meta?.avatar_url ?? meta?.picture ?? null;
  const [imgFailed, setImgFailed] = useState(false);

  if (!avatarUrl || imgFailed) {
    return (
      <CircleButton
        label="Menú"
        onClick={onClick}
        icon={<UserIcon />}
        ariaHaspopup="menu"
        ariaExpanded={ariaExpanded}
      />
    );
  }

  return (
    <button
      type="button"
      title="Menú"
      aria-label="Menú"
      aria-haspopup="menu"
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className="group flex flex-col items-center gap-0.5 text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="block h-10 w-10 overflow-hidden rounded-full border border-border bg-background transition-colors group-hover:border-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="text-[10px] leading-none">Menú</span>
    </button>
  );
}
