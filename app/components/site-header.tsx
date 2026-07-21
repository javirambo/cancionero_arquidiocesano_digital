"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./theme";
import { SearchDialog } from "./search-dialog";
import { FavoritesDialog } from "./favorites-dialog";
import { useFavorites } from "./favorites";
import { useUserRoles } from "./user-roles";
import { useWakeLock } from "./wake-lock";
import { useHomeTitle } from "./home-title-context";
import { BibleIcon, HeartIcon, SearchIcon, ShareIcon, UserIcon } from "./icons";
import { QrDialog } from "./qr-button";
import { ParishSwitcher } from "./parish-switcher";
import pkg from "@/package.json";

type MenuItemProps = {
  href?: string;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  prominent?: boolean;
};

function MenuItem({ href, icon, label, onSelect, destructive, prominent }: MenuItemProps) {
  const className = `flex w-full items-center gap-3 px-4 py-2 text-left normal-case transition-colors hover:bg-sidebar ${
    destructive ? "text-destructive" : "text-foreground"
  } ${prominent ? "text-lg font-bold" : ""}`;

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

export const ListasIcon = () => (
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

const AdminIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const CancionesIcon = () => (
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

const IngresarIcon = () => (
  <svg {...iconProps}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M14 8l4 4-4 4" />
    <path d="M18 12H8" />
  </svg>
);

const InstallIcon = () => (
  <svg {...iconProps}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

const AboutIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

// Debe coincidir con la transición de .app-shell en globals.css.
const MENU_ANIM_MS = 300;

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRender, setMenuRender] = useState(false);
  const [menuShown, setMenuShown] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const showQr = true;
  const { theme, toggle } = useTheme();
  const { favorites } = useFavorites();
  const { active: wakeLockActive, supported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();
  const { isAdmin, isEditor } = useUserRoles();
  const { title, brand } = useHomeTitle();
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

  // Mantiene el panel montado mientras corre la animación de cierre.
  // menuShown se activa un frame después del montaje para que el panel llegue a
  // pintarse fuera de pantalla y la entrada se anime en vez de aparecer de golpe.
  useEffect(() => {
    if (menuOpen) {
      setMenuRender(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setMenuShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setMenuShown(false);
    if (!menuRender) return;
    const t = setTimeout(() => setMenuRender(false), MENU_ANIM_MS);
    return () => clearTimeout(t);
  }, [menuOpen, menuRender]);

  // Desplaza toda la pantalla; el panel usa el mismo estado para ir pegado.
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuShown);
    return () => document.documentElement.classList.remove("menu-open");
  }, [menuShown]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // El panel vive en un portal fuera de menuRef, hay que contemplarlo aparte.
      if (menuRef.current?.contains(target) || drawerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
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
    <header
      style={{ backgroundColor: "rgba(56, 90, 150, 0.85)" }}
      className={`${/^\/canciones\/[^/]+/.test(pathname ?? "") ? "" : "sticky top-0"} z-30 border-b border-border backdrop-blur-md`}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-2 py-1">
        <CircleButton
          label="Buscar"
          onClick={() => setSearchOpen(true)}
          icon={<SearchIcon />}
        />

        <ParishSwitcher brand={brand} />

        <div className="flex items-center gap-1">
          <div ref={menuRef} className="relative">
            <AccountButton
              user={user}
              onClick={() => setMenuOpen((v) => !v)}
              ariaExpanded={menuOpen}
            />

            {menuRender && createPortal(
              <div
                ref={drawerRef}
                role="menu"
                aria-label="Menú de usuario"
                className="app-drawer fixed inset-y-0 right-0 z-50 flex w-[var(--drawer-w)] flex-col overflow-y-auto overflow-x-hidden border-l border-border"
              >
                <ProfileSummary
                  user={user}
                  onClose={closeMenu}
                  onSignIn={() => {
                    closeMenu();
                    handleSignIn();
                  }}
                />
                <ul className="py-1 text-sm">
                  <li>
                    <MenuItem
                      href="/canciones"
                      icon={<CancionesIcon />}
                      label="Cantos"
                      onSelect={closeMenu}
                      prominent
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/playlists"
                      icon={<ListasIcon />}
                      label="Mis listas"
                      onSelect={closeMenu}
                      prominent
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/parroquias"
                      icon={<ParroquiasIcon />}
                      label="Parroquias"
                      onSelect={closeMenu}
                      prominent
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/orientaciones-liturgicas"
                      icon={<BibleIcon />}
                      label="Orientaciones litúrgicas"
                      onSelect={closeMenu}
                      prominent
                    />
                  </li>
                  <li role="separator" aria-hidden="true" className="my-3 border-t border-border" />
                  <li>
                    <MenuItem
                      icon={<HeartIcon filled={favorites.length > 0} />}
                      label="Mis favoritos"
                      onSelect={() => {
                        closeMenu();
                        setFavOpen(true);
                      }}
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
                  {showQr && (
                    <li>
                      <MenuItem
                        icon={<ShareIcon />}
                        label="Compartir..."
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
                  <li>
                    <MenuItem
                      href="/install"
                      icon={<InstallIcon />}
                      label="Instalar cancionero"
                      onSelect={closeMenu}
                    />
                  </li>
                </ul>
                <div className="mt-2 border-t border-border pb-1 pt-3 text-sm">
                  {user && (
                    <MenuItem
                      icon={<CerrarSesionIcon />}
                      label="Cerrar Sesión"
                      onSelect={handleSignOut}
                      destructive
                    />
                  )}
                  <MenuItem
                    href="/about"
                    icon={<AboutIcon />}
                    label="¿Quiénes somos?"
                    onSelect={closeMenu}
                  />
                </div>
                <div className="mt-auto border-t border-border px-4 pb-4 pt-3 text-center text-xs normal-case text-muted-foreground">
                  <p>Arquidiócesis de Rosario · Comisión Litúrgico-Musical</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Link
                      href="/creditos"
                      onClick={closeMenu}
                      className="text-shortcut hover:text-primary"
                    >
                      Créditos
                    </Link>
                    <span aria-hidden="true">-</span>
                    <Link
                      href="/privacidad"
                      onClick={closeMenu}
                      className="text-shortcut hover:text-primary"
                    >
                      Privacidad
                    </Link>
                  </div>
                  <p className="mt-2">Versión {pkg.version}</p>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Oscurece la pantalla desplazada para despegarla del panel, y de paso
       * evita que un click sobre ella active lo que haya debajo. */}
      {menuRender && createPortal(
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
            menuShown ? "opacity-100" : "opacity-0"
          }`}
        />,
        document.body
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FavoritesDialog open={favOpen} onClose={() => setFavOpen(false)} />
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </header>
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
      className="flex h-12 w-9 items-center justify-center text-white transition-opacity hover:opacity-80 [&_svg]:h-6 [&_svg]:w-6"
    >
      {icon}
    </button>
  );
}

function ProfileSummary({
  user,
  onSignIn,
  onClose,
}: {
  user: User | null;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 normal-case">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm text-foreground">Invitado</p>
          <button
            type="button"
            onClick={onSignIn}
            className="flex items-center gap-1 self-start text-left text-sm text-foreground hover:underline"
          >
            <span aria-hidden="true">
              <IngresarIcon />
            </span>
            Iniciá sesión
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-muted-foreground"
        >
          <UserIcon />
        </button>
      </div>
    );
  }

  const meta = user.user_metadata as
    | { avatar_url?: string; picture?: string; full_name?: string; name?: string }
    | undefined;
  const avatarUrl = meta?.avatar_url ?? meta?.picture ?? null;
  const displayName = meta?.full_name ?? meta?.name ?? user.email ?? "Usuario";
  const showImg = avatarUrl && !imgFailed;

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 normal-case">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm text-foreground">{displayName}</p>
        {user.email && (
          <p className="truncate text-xs lowercase text-muted-foreground">
            {user.email}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar menú"
        className="shrink-0"
      >
        {showImg ? (
          <span className="block h-16 w-16 overflow-hidden rounded-full border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-sidebar text-2xl text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>
    </div>
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
  const [imgFailed, setImgFailed] = useState(false);
  const meta = user?.user_metadata as
    | { avatar_url?: string; picture?: string }
    | undefined;
  const avatarUrl = meta?.avatar_url ?? meta?.picture ?? null;
  const showImg = avatarUrl && !imgFailed;

  return (
    <CircleButton
      label="Menú"
      onClick={onClick}
      icon={
        showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="header-user-avatar h-7 w-7 rounded-full border border-white/40 object-cover"
          />
        ) : (
          <span className="header-user-avatar">
            <UserIcon />
          </span>
        )
      }
      ariaHaspopup="menu"
      ariaExpanded={ariaExpanded}
    />
  );
}
