import type { LucideIcon } from "lucide-react";
import type { Identifier } from "ra-core";

import type { TaskType } from "../types";
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
