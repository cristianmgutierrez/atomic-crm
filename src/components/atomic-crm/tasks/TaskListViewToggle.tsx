import { CalendarDays, List as ListIcon } from "lucide-react";
import { useTranslate } from "ra-core";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type TaskViewMode = "list" | "calendar";

export interface TaskListViewToggleProps {
  value: TaskViewMode;
  onChange: (value: TaskViewMode) => void;
}

/**
 * Two-option toggle (list vs calendar) for the Tasks page header.
 */
export const TaskListViewToggle = ({
  value,
  onChange,
}: TaskListViewToggleProps) => {
  const translate = useTranslate();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => {
        if (v === "list" || v === "calendar") onChange(v);
      }}
    >
      <ToggleGroupItem
        value="list"
        aria-label={translate("resources.tasks.view.list")}
      >
        <ListIcon className="size-4 mr-1" />
        <span className="hidden sm:inline">
          {translate("resources.tasks.view.list")}
        </span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="calendar"
        aria-label={translate("resources.tasks.view.calendar")}
      >
        <CalendarDays className="size-4 mr-1" />
        <span className="hidden sm:inline">
          {translate("resources.tasks.view.calendar")}
        </span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
