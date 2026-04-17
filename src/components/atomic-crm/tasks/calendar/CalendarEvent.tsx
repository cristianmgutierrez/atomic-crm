import type { MouseEvent as ReactMouseEvent } from "react";
import { useUpdate } from "ra-core";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../../root/ConfigurationContext";
import type { Task } from "../../types";
import { getTaskTypeWithIcon } from "../taskModel";
import type { EventGeometry } from "./calendarUtils";

export interface CalendarEventProps {
  task: Pick<
    Task,
    "id" | "type" | "text" | "start_time" | "end_time" | "done_date"
  >;
  geometry: EventGeometry;
  lane?: number;
  lanesCount?: number;
  variant?: "default" | "ghost";
  onClick?: () => void;
  className?: string;
}

const GUTTER_PX = 2;

/**
 * Absolutely positioned event card inside a CalendarGrid. Position comes from `geometry`;
 * horizontal placement comes from `lane`/`lanesCount` (see groupOverlaps). Clicking the
 * checkbox toggles `done_date` via the same mechanism as Task.tsx (single source of truth
 * for completion). Use `variant="ghost"` for a non-persistent preview (form state).
 */
export const CalendarEvent = ({
  task,
  geometry,
  lane = 0,
  lanesCount = 1,
  variant = "default",
  onClick,
  className,
}: CalendarEventProps) => {
  const { taskTypes } = useConfigurationContext();
  const [update, { isPending }] = useUpdate();
  const { Icon } = getTaskTypeWithIcon(taskTypes, task.type);

  const isGhost = variant === "ghost";
  const isDone = !!task.done_date;
  const widthPct = 100 / lanesCount;
  const leftPct = lane * widthPct;

  const handleCheck = (checked: boolean | "indeterminate") => {
    if (isGhost || task.id == null) return;
    update("tasks", {
      id: task.id,
      data: { done_date: checked ? new Date().toISOString() : null },
      previousData: task,
    });
  };

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isGhost) return;
    onClick?.();
  };

  const showMeta = geometry.heightPx >= 40;

  return (
    <div
      role={isGhost ? undefined : "button"}
      tabIndex={isGhost ? undefined : 0}
      onClick={handleClick}
      className={cn(
        "absolute rounded-md border px-2 py-1 text-xs shadow-sm overflow-hidden",
        "transition-colors",
        isGhost
          ? "border-primary/60 bg-primary/10 pointer-events-none"
          : "border-primary/40 bg-primary/20 hover:bg-primary/30 cursor-pointer",
        isDone && "opacity-60 line-through",
        className,
      )}
      style={{
        top: geometry.topPx,
        height: geometry.heightPx,
        left: `calc(${leftPct}% + ${GUTTER_PX}px)`,
        width: `calc(${widthPct}% - ${GUTTER_PX * 2}px)`,
      }}
    >
      <div className="flex items-start gap-1.5 h-full">
        {!isGhost && (
          <Checkbox
            checked={isDone}
            onCheckedChange={handleCheck}
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 size-3.5 shrink-0"
            aria-label="Marcar como feito"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {task.type && task.type !== "none" && (
              <Icon className="size-3 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-medium">{task.text}</span>
          </div>
          {showMeta && (task.start_time || task.end_time) && (
            <div className="text-[10px] text-muted-foreground truncate">
              {[task.start_time, task.end_time].filter(Boolean).join(" → ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
