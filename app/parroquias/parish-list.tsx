"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParishCard, type AnimState, type Parish } from "./parish-card";

type Props = {
  parishes: Parish[];
  initialMemberIds: string[];
  initialPrimaryId: string | null;
  userId: string | null;
};

const ANIM_MS = 300;

export function ParishList({
  parishes,
  initialMemberIds,
  initialPrimaryId,
  userId,
}: Props) {
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () => new Set(initialMemberIds)
  );
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId);
  const [anim, setAnim] = useState<Map<string, AnimState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Si las props del server cambian (p. ej. tras navegación), resincronizo.
  useEffect(() => setMemberIds(new Set(initialMemberIds)), [initialMemberIds]);
  useEffect(() => setPrimaryId(initialPrimaryId), [initialPrimaryId]);

  // Set de ids "visibles como mías": memberIds + los que están saliendo
  // (siguen mostrándose mientras dura la animación).
  const displayMembers = new Set(memberIds);
  for (const [id, state] of anim) {
    if (state === "leaving") displayMembers.add(id);
  }

  const sortByName = (a: Parish, b: Parish) =>
    a.name.localeCompare(b.name, "es");

  const mine = parishes
    .filter((p) => displayMembers.has(p.id))
    .sort((a, b) => {
      const aPrim = a.id === primaryId ? 0 : 1;
      const bPrim = b.id === primaryId ? 0 : 1;
      if (aPrim !== bPrim) return aPrim - bPrim;
      return sortByName(a, b);
    });
  const others = parishes
    .filter((p) => !displayMembers.has(p.id))
    .sort(sortByName);

  async function handleAdd(parishId: string) {
    if (!userId) return;
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase
      .from("parish_members")
      .insert({ user_id: userId, parish_id: parishId, role: "member" });
    if (e) {
      setError(e.message);
      return;
    }
    setMemberIds((prev) => new Set(prev).add(parishId));
    setAnim((prev) => new Map(prev).set(parishId, "entering"));
    // Doble RAF para asegurar que el browser pinte el estado inicial
    // colapsado antes de transicionar al estado final.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnim((prev) => {
          const next = new Map(prev);
          next.delete(parishId);
          return next;
        });
      });
    });
  }

  async function handleRemove(parishId: string) {
    if (!userId) return;
    setError(null);
    const supabase = createClient();
    if (primaryId === parishId) {
      await supabase
        .from("users")
        .update({ parish_id: null })
        .eq("id", userId);
      setPrimaryId(null);
    }
    const { error: e } = await supabase
      .from("parish_members")
      .delete()
      .eq("user_id", userId)
      .eq("parish_id", parishId);
    if (e) {
      setError(e.message);
      return;
    }
    setAnim((prev) => new Map(prev).set(parishId, "leaving"));
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(parishId);
      return next;
    });
    setTimeout(() => {
      setAnim((prev) => {
        const next = new Map(prev);
        next.delete(parishId);
        return next;
      });
    }, ANIM_MS);
  }

  async function handleTogglePrimary(parishId: string) {
    if (!userId) return;
    setError(null);
    const next = primaryId === parishId ? null : parishId;
    const supabase = createClient();
    const { error: e } = await supabase
      .from("users")
      .update({ parish_id: next })
      .eq("id", userId);
    if (e) {
      setError(e.message);
      return;
    }
    setPrimaryId(next);
  }

  const isLogged = Boolean(userId);

  return (
    <>
      {error && (
        <p className="text-sm normal-case text-destructive">{error}</p>
      )}

      {isLogged && mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
            Mis parroquias
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {mine.map((p) => (
              <ParishCard
                key={p.id}
                parish={p}
                isLogged={true}
                isMember={memberIds.has(p.id)}
                isPrimary={primaryId === p.id}
                animState={anim.get(p.id)}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onTogglePrimary={handleTogglePrimary}
              />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          {isLogged && mine.length > 0 && (
            <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
              Otras parroquias
            </h2>
          )}
          <ul className="grid gap-4 sm:grid-cols-2">
            {others.map((p) => (
              <ParishCard
                key={p.id}
                parish={p}
                isLogged={isLogged}
                isMember={false}
                isPrimary={false}
                animState={anim.get(p.id)}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onTogglePrimary={handleTogglePrimary}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
