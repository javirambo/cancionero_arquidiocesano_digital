"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

const AdminIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7l8-4z" />
    <path d="M9 12l2 2 4-4" />
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

const HamburgerIcon = () => (
  <svg {...iconProps}>
    <path d="M4 7h16M4 12h16M4 17h16" />
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
    <header
      style={{ backgroundColor: "#436bb0" }}
      className={`${/^\/canciones\/[^/]+/.test(pathname ?? "") ? "" : "sticky top-0"} z-30 border-b border-border`}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-1 pl-6 pr-2">
        {brand ? (
          <Link
            href={brand.href}
            className="flex min-w-0 items-center gap-3"
            aria-label={brand.name}
          >
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
            <span className="min-w-0 truncate text-sm font-semibold text-white">
              {brand.name}
            </span>
          </Link>
        ) : (
          <Link href="/" className="-ml-3.5 flex items-center gap-3" aria-label={displayTitle}>
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
          </Link>
        )}

        <div className="flex items-center gap-1">
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
            icon={<HeartIcon filled={favorites.length > 0} />}
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
                <ProfileSummary
                  user={user}
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
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/playlists"
                      icon={<ListasIcon />}
                      label="Mis listas"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/parroquias"
                      icon={<ParroquiasIcon />}
                      label="Mi parroquia"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li>
                    <MenuItem
                      href="/orientaciones-liturgicas"
                      icon={<BibleIcon />}
                      label="Orientaciones litúrgicas"
                      onSelect={closeMenu}
                    />
                  </li>
                  <li role="separator" aria-hidden="true" className="my-1 border-t border-border" />
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
                </ul>
                <div className="border-t border-border py-1 text-sm">
                  <MenuItem
                    href="/install"
                    icon={<InstallIcon />}
                    label="Instalar app"
                    onSelect={closeMenu}
                  />
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
              </div>
            )}
          </div>
        </div>
      </div>

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
}: {
  user: User | null;
  onSignIn: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 normal-case">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-muted-foreground">
          <UserIcon />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
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
      {showImg ? (
        <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-background">
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
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-2xl text-muted-foreground">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm text-foreground">{displayName}</p>
        {user.email && (
          <p className="truncate text-xs lowercase text-muted-foreground">
            {user.email}
          </p>
        )}
      </div>
    </div>
  );
}

function AccountButton({
  onClick,
  ariaExpanded,
}: {
  user: User | null;
  onClick: () => void;
  ariaExpanded: boolean;
}) {
  return (
    <CircleButton
      label="Menú"
      onClick={onClick}
      icon={<HamburgerIcon />}
      ariaHaspopup="menu"
      ariaExpanded={ariaExpanded}
    />
  );
}
