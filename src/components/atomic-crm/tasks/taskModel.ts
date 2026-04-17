import type { LucideIcon } from "lucide-react";
import type { Identifier } from "ra-core";
import type { UseFormSetValue } from "react-hook-form";

import type { TaskType } from "../types";
import { formatMinutesToHHMM } from "./calendar/calendarUtils";
import { getTaskTypeIcon } from "./TaskTypeIconBar";

/**
 * Returns the default record values for creating a new task.
 */
export function getTaskCreateDefaults(
  salesId: Identifier,
  contactId?: Identifier,
): {
  type: string;
  contact_id: Identifier | undefined;
  due_date: string;
  end_date: string;
  sales_id: Identifier;
} {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: "call",
    contact_id: contactId,
    due_date: today,
    end_date: today,
    sales_id: salesId,
  };
}

/**
 * Formats a time range from start_time and end_time.
 * Returns null if neither is provided.
 */
export function formatTimeRange(
  startTime?: string | null,
  endTime?: string | null,
): string | null {
  if (!startTime && !endTime) return null;
  return [startTime, endTime].filter(Boolean).join(" - ");
}

/**
 * Resolves the TaskType config and its icon for a given task type value.
 */
export function getTaskTypeWithIcon(
  taskTypes: TaskType[],
  taskTypeValue: string,
): { taskType: TaskType | undefined; Icon: LucideIcon } {
  const taskType = taskTypes.find((t) => t.value === taskTypeValue);
  const Icon = getTaskTypeIcon(taskType?.icon);
  return { taskType, Icon };
}

/**
 * Applies a calendar slot click to the task form. Updates due_date/end_date to the navigated
 * day and start_time/end_time to the clicked slot (+ default duration). Used by DailyAgenda
 * so navigating the agenda and clicking actually reschedules the task being edited/created.
 */
export function applySlotSelection(
  setValue: UseFormSetValue<Record<string, any>>,
  agendaDateISO: string,
  slotMinutes: number,
  defaultDurationMin: number,
): void {
  const endMinutes = Math.min(24 * 60 - 1, slotMinutes + defaultDurationMin);
  setValue("due_date", agendaDateISO, { shouldDirty: true });
  setValue("end_date", agendaDateISO, { shouldDirty: true });
  setValue("start_time", formatMinutesToHHMM(slotMinutes), {
    shouldDirty: true,
  });
  setValue("end_time", formatMinutesToHHMM(endMinutes), { shouldDirty: true });
}
