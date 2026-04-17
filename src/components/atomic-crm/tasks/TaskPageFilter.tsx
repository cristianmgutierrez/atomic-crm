import {
  endOfDay,
  endOfWeek,
  startOfDay,
  startOfTomorrow,
  endOfTomorrow,
  startOfWeek,
} from "date-fns";
import { CheckSquare, Clock, Tag } from "lucide-react";
import { useTranslate } from "ra-core";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";

import { FilterCategory } from "../filters/FilterCategory";
import { ResponsiveFilters } from "../misc/ResponsiveFilters";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTaskTypeIcon } from "./taskTypeUtils";

export const TaskPageFilter = () => {
  const { taskTypes } = useConfigurationContext();
  const isMobile = useIsMobile();
  const translate = useTranslate();

  return (
    <ResponsiveFilters
      searchInput={{
        placeholder: translate("resources.tasks.filters.search"),
        source: "text@ilike",
      }}
    >
      {/* Status */}
      <FilterCategory
        label="resources.tasks.filters.status"
        icon={<CheckSquare />}
      >
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.pending"
          value={{ "done_date@is": "null" }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.done"
          value={{ "done_date@not.is": "null" }}
          size={isMobile ? "lg" : undefined}
        />
      </FilterCategory>

      {/* Due date */}
      <FilterCategory label="resources.tasks.fields.due_date" icon={<Clock />}>
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.overdue"
          value={{
            "due_date@lt": startOfDay(new Date()).toISOString(),
            "done_date@is": "null",
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.today"
          value={{
            "due_date@gte": startOfDay(new Date()).toISOString(),
            "due_date@lte": endOfDay(new Date()).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.tomorrow"
          value={{
            "due_date@gte": startOfTomorrow().toISOString(),
            "due_date@lte": endOfTomorrow().toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.this_week"
          value={{
            "due_date@gte": startOfWeek(new Date()).toISOString(),
            "due_date@lte": endOfWeek(new Date()).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
        <ToggleFilterButton
          className="w-auto md:w-full justify-between h-10 md:h-8"
          label="resources.tasks.filters.later"
          value={{
            "due_date@gt": endOfWeek(new Date()).toISOString(),
          }}
          size={isMobile ? "lg" : undefined}
        />
      </FilterCategory>

      {/* Type */}
      <FilterCategory label="resources.tasks.fields.type" icon={<Tag />}>
        {taskTypes.map((taskType) => {
          const Icon = getTaskTypeIcon(taskType.icon);
          return (
            <ToggleFilterButton
              key={taskType.value}
              className="w-auto md:w-full justify-between h-10 md:h-8"
              label={
                <span className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  {taskType.label}
                </span>
              }
              value={{ type: taskType.value }}
              size={isMobile ? "lg" : undefined}
            />
          );
        })}
      </FilterCategory>
    </ResponsiveFilters>
  );
};
