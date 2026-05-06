import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EntitySchedule, ScheduleEntityType } from "@/lib/schedule";

export async function loadSchedules(
  entityType: ScheduleEntityType,
  entityIds: string[]
): Promise<Map<string, EntitySchedule[]>> {
  const map = new Map<string, EntitySchedule[]>();
  if (entityIds.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_schedules")
    .select(
      "id, entity_type, entity_id, date_mode, weekdays, start_date, end_date, time_mode, start_time, end_time"
    )
    .eq("entity_type", entityType)
    .in("entity_id", entityIds);
  if (error) throw error;
  for (const row of (data ?? []) as EntitySchedule[]) {
    const list = map.get(row.entity_id) ?? [];
    list.push(row);
    map.set(row.entity_id, list);
  }
  return map;
}

export async function loadSchedulesForEntity(
  entityType: ScheduleEntityType,
  entityId: string
): Promise<EntitySchedule[]> {
  const map = await loadSchedules(entityType, [entityId]);
  return map.get(entityId) ?? [];
}
