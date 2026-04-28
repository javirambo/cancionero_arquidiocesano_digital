"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./theme";
import { SearchDialog } from "./search-dialog";
import { FavoritesDialog } from "./favorites-dialog";
import { useFavorites } from "./favorites";
import { usePreferences } from "./preferences";
import { useUserRoles } from "./user-roles";
import { ChordsIcon, HeartIcon, SearchIcon, UserIcon } from "./icons";

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

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();
  const { favorites } = useFavorites();
  const { suggestChords, setPreference, isAuthenticated: prefsAuth } = usePreferences();
  const { isAdmin, isEditor } = useUserRoles();

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
    <header className="border-b border-border bg-sidebar">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-wide text-primary">
            Cancionero
          </span>
          <span className="hidden text-sm normal-case tracking-normal text-muted-foreground sm:inline">
            Arquidiócesis de Rosario
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <CircleButton
            label="Buscar"
            onClick={() => setSearchOpen(true)}
            icon={<SearchIcon />}
          />
          <CircleButton
            label="Mis favoritos"
            onClick={() => setFavOpen(true)}
            icon={
              <span className={favorites.length > 0 ? "text-primary" : undefined}>
                <HeartIcon filled={favorites.length > 0} />
              </span>
            }
          />

          <div ref={menuRef} className="relative">
            <CircleButton
              label="Mi cuenta"
              onClick={() => setMenuOpen((v) => !v)}
              icon={<UserIcon />}
              ariaHaspopup="menu"
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
                    <MenuToggleItem
                      icon={<ChordsIcon />}
                      label="Sugerir acordes"
                      checked={suggestChords}
                      disabled={!prefsAuth}
                      tooltip={
                        prefsAuth
                          ? undefined
                          : "Iniciá sesión para guardar tus preferencias"
                      }
                      onChange={() =>
                        setPreference("suggestChords", !suggestChords)
                      }
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {icon}
    </button>
  );
}
