"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast";
import { ChevronRightIcon } from "@/app/components/icons";
import { HelpHint } from "@/app/components/help-hint";
import type {
  AdminUser,
  GlobalRole,
  Membership,
  ParishRole,
} from "./lib";

type Parish = { id: string; slug: string; name: string };

type Props = {
  initialUsers: AdminUser[];
  parishes: Parish[];
  adminRoleId: string;
  editorRoleId: string;
  currentUserId: string | null;
};

export function UsersTable({
  initialUsers,
  parishes,
  adminRoleId,
  editorRoleId,
  currentUserId,
}: Props) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [filter, setFilter] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        (u.display_name ?? "").toLowerCase().includes(term)
    );
  }, [users, filter]);

  const adminCount = useMemo(
    () => users.filter((u) => u.global_roles.includes("admin")).length,
    [users]
  );

  function updateUser(userId: string, patch: Partial<AdminUser>) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );
  }

  async function toggleGlobalRole(user: AdminUser, role: GlobalRole) {
    if (busyUserId) return;
    const has = user.global_roles.includes(role);
    if (has && role === "admin" && user.id === currentUserId) {
      showToast(
        "No te podés quitar admin a vos mismo. Pedile a otro admin que lo haga.",
        "error"
      );
      return;
    }
    if (has && role === "admin" && adminCount <= 1) {
      showToast("No se puede quitar el último administrador.", "error");
      return;
    }
    setBusyUserId(user.id);
    const supabase = createClient();
    const roleId = role === "admin" ? adminRoleId : editorRoleId;
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role_id", roleId);
      if (error) {
        showToast(`No se pudo quitar: ${error.message}`, "error");
        setBusyUserId(null);
        return;
      }
      updateUser(user.id, {
        global_roles: user.global_roles.filter((r) => r !== role),
      });
      showToast(`Rol "${role}" quitado a ${user.display_name ?? user.email}.`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role_id: roleId });
      if (error) {
        showToast(`No se pudo asignar: ${error.message}`, "error");
        setBusyUserId(null);
        return;
      }
      updateUser(user.id, {
        global_roles: [...user.global_roles, role],
      });
      showToast(`Rol "${role}" asignado a ${user.display_name ?? user.email}.`);
    }
    setBusyUserId(null);
  }

  async function changeParishRole(
    user: AdminUser,
    parishId: string,
    nextRole: ParishRole
  ) {
    if (busyUserId) return;
    setBusyUserId(user.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("parish_members")
      .update({ role: nextRole })
      .eq("user_id", user.id)
      .eq("parish_id", parishId);
    if (error) {
      showToast(`No se pudo actualizar: ${error.message}`, "error");
      setBusyUserId(null);
      return;
    }
    updateUser(user.id, {
      memberships: user.memberships.map((m) =>
        m.parish_id === parishId ? { ...m, role: nextRole } : m
      ),
    });
    showToast(`Rol actualizado a "${nextRole}".`);
    setBusyUserId(null);
  }

  async function removeMembership(user: AdminUser, parishId: string) {
    if (busyUserId) return;
    const m = user.memberships.find((x) => x.parish_id === parishId);
    if (!m) return;
    const ok = window.confirm(
      `¿Desvincular a ${user.display_name ?? user.email} de "${m.parish_name}"?`
    );
    if (!ok) return;
    setBusyUserId(user.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("parish_members")
      .delete()
      .eq("user_id", user.id)
      .eq("parish_id", parishId);
    if (error) {
      showToast(`No se pudo quitar: ${error.message}`, "error");
      setBusyUserId(null);
      return;
    }
    // Si la parroquia que se quita era la principal del usuario, limpiarla.
    await supabase
      .from("users")
      .update({ parish_id: null })
      .eq("id", user.id)
      .eq("parish_id", parishId);
    updateUser(user.id, {
      memberships: user.memberships.filter((x) => x.parish_id !== parishId),
    });
    showToast(`Desvinculado de "${m.parish_name}".`);
    setBusyUserId(null);
  }

  async function addMembership(user: AdminUser, parishId: string) {
    if (busyUserId || !parishId) return;
    if (user.memberships.some((m) => m.parish_id === parishId)) {
      showToast("Ya es miembro de esa parroquia.", "error");
      return;
    }
    const parish = parishes.find((p) => p.id === parishId);
    if (!parish) return;
    setBusyUserId(user.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("parish_members")
      .insert({ user_id: user.id, parish_id: parishId, role: "member" });
    if (error) {
      showToast(`No se pudo agregar: ${error.message}`, "error");
      setBusyUserId(null);
      return;
    }
    const newMembership: Membership = {
      parish_id: parish.id,
      parish_slug: parish.slug,
      parish_name: parish.name,
      role: "member",
    };
    updateUser(user.id, {
      memberships: [...user.memberships, newMembership].sort((a, b) =>
        a.parish_name.localeCompare(b.parish_name, "es")
      ),
    });
    showToast(`Vinculado a "${parish.name}".`);
    setBusyUserId(null);
  }

  async function unbindUser(user: AdminUser) {
    if (busyUserId) return;
    if (user.id === currentUserId) {
      showToast(
        "No te podés desvincular a vos mismo. Pedile a otro admin que lo haga.",
        "error"
      );
      return;
    }
    if (
      user.global_roles.includes("admin") &&
      adminCount <= 1
    ) {
      showToast(
        "No se puede desvincular al último administrador.",
        "error"
      );
      return;
    }
    const ok = window.confirm(
      `¿Desvincular a "${user.display_name ?? user.email}"? Se le quitarán todos los roles globales y se lo desvinculará de todas sus parroquias. Sus playlists personales se conservan.`
    );
    if (!ok) return;
    setBusyUserId(user.id);
    const supabase = createClient();
    const [rolesRes, membersRes] = await Promise.all([
      supabase.from("user_roles").delete().eq("user_id", user.id),
      supabase.from("parish_members").delete().eq("user_id", user.id),
    ]);
    if (rolesRes.error || membersRes.error) {
      const msg = rolesRes.error?.message ?? membersRes.error?.message ?? "";
      showToast(`No se pudo desvincular: ${msg}`, "error");
      setBusyUserId(null);
      return;
    }
    updateUser(user.id, { global_roles: [], memberships: [] });
    showToast(
      `${user.display_name ?? user.email} fue desvinculado.`
    );
    setBusyUserId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar por nombre o email…"
        className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
      />

      {filtered.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          No hay usuarios que coincidan.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              parishes={parishes}
              busy={busyUserId === u.id}
              onToggleGlobalRole={(role) => toggleGlobalRole(u, role)}
              onChangeParishRole={(parishId, role) =>
                changeParishRole(u, parishId, role)
              }
              onRemoveMembership={(parishId) =>
                removeMembership(u, parishId)
              }
              onAddMembership={(parishId) => addMembership(u, parishId)}
              onUnbind={() => unbindUser(u)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UserRow({
  user,
  parishes,
  busy,
  onToggleGlobalRole,
  onChangeParishRole,
  onRemoveMembership,
  onAddMembership,
  onUnbind,
}: {
  user: AdminUser;
  parishes: Parish[];
  busy: boolean;
  onToggleGlobalRole: (role: GlobalRole) => void;
  onChangeParishRole: (parishId: string, role: ParishRole) => void;
  onRemoveMembership: (parishId: string) => void;
  onAddMembership: (parishId: string) => void;
  onUnbind: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingParishId, setAddingParishId] = useState("");
  const availableParishes = parishes.filter(
    (p) => !user.memberships.some((m) => m.parish_id === p.id)
  );

  const coordinatorCount = user.memberships.filter(
    (m) => m.role === "coordinator"
  ).length;
  const memberCount = user.memberships.filter((m) => m.role === "member").length;
  const globalRolesText =
    user.global_roles.length > 0 ? user.global_roles.join(", ") : null;

  const summaryParts: string[] = [];
  if (globalRolesText) summaryParts.push(globalRolesText);
  if (coordinatorCount > 0)
    summaryParts.push(
      `${coordinatorCount} coordinator${coordinatorCount !== 1 ? "s" : ""}`
    );
  if (memberCount > 0)
    summaryParts.push(`${memberCount} member${memberCount !== 1 ? "s" : ""}`);
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : "Sin roles ni parroquias";

  return (
    <li className="flex flex-col rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar"
      >
        <span
          aria-hidden="true"
          className={`text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          <ChevronRightIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base text-primary">
            {user.display_name ?? user.email}
          </span>
          {user.display_name && (
            <span className="truncate text-xs normal-case text-muted-foreground">
              {user.email}
            </span>
          )}
          <span className="truncate text-xs normal-case text-muted-foreground">
            {summary}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-secondary">
              Roles globales:
            </span>
            <HelpHint label="Qué hace cada rol global">
              <p>
                <strong>admin:</strong> permisos plenos sobre todo el sistema
                (parroquias, usuarios, anuncios, playlists).
              </p>
              <p className="mt-2">
                <strong>editor:</strong> Comisión Litúrgico-Musical, aprueba
                canciones y administra el repertorio arquidiocesano.
              </p>
            </HelpHint>
            <RoleChip
              label="admin"
              active={user.global_roles.includes("admin")}
              disabled={busy}
              onToggle={() => onToggleGlobalRole("admin")}
            />
            <RoleChip
              label="editor"
              active={user.global_roles.includes("editor")}
              disabled={busy}
              onToggle={() => onToggleGlobalRole("editor")}
            />
          </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-secondary">
            Parroquias
          </span>
          <HelpHint label="Qué hace cada rol por parroquia">
            <p>
              <strong>member:</strong> usuario asociado a la parroquia (acceso
              a sus playlists y favoritos).
            </p>
            <p className="mt-2">
              <strong>coordinator:</strong> gestiona playlists, anuncios y
              borradores de canciones de esa parroquia.
            </p>
          </HelpHint>
        </div>
        {user.memberships.length === 0 ? (
          <p className="text-sm normal-case text-muted-foreground">
            Sin parroquias asociadas.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {user.memberships.map((m) => (
              <MembershipRow
                key={m.parish_id}
                membership={m}
                busy={busy}
                onChangeRole={(role) => onChangeParishRole(m.parish_id, role)}
                onRemove={() => onRemoveMembership(m.parish_id)}
              />
            ))}
          </ul>
        )}

        {availableParishes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={addingParishId}
              onChange={(e) => setAddingParishId(e.target.value)}
              disabled={busy}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm normal-case"
            >
              <option value="">Vincular a parroquia…</option>
              {availableParishes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !addingParishId}
              onClick={() => {
                onAddMembership(addingParishId);
                setAddingParishId("");
              }}
              className="rounded-full border border-primary px-3 py-1 text-xs uppercase tracking-wide text-primary hover:bg-primary hover:text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        )}
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <button
              type="button"
              onClick={onUnbind}
              disabled={busy}
              className="rounded-full border border-destructive px-3 py-1 text-xs uppercase tracking-wide text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"
            >
              Desvincular
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function RoleChip({
  label,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide disabled:opacity-50 ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function MembershipRow({
  membership,
  busy,
  onChangeRole,
  onRemove,
}: {
  membership: Membership;
  busy: boolean;
  onChangeRole: (role: ParishRole) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex-1 text-sm normal-case text-foreground">
        {membership.parish_name}
      </span>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <select
          value={membership.role}
          onChange={(e) => onChangeRole(e.target.value as ParishRole)}
          disabled={busy}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs normal-case"
        >
          <option value="member">member</option>
          <option value="coordinator">coordinator</option>
        </select>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          title="Quitar de la parroquia"
          className="rounded-full border border-destructive px-3 py-1 text-xs uppercase tracking-wide text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
    </li>
  );
}
