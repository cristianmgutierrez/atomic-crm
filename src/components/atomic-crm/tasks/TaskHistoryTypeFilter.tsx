import { useTranslate } from "ra-core";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { getTaskTypeIcon } from "./TaskTypeIconBar";

export const TaskHistoryTypeFilter = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { taskTypes } = useConfigurationContext();
  const translate = useTranslate();

  const types = [
    {
      value: "all",
      label: translate("crm.common.all", { _: "Todos" }),
      icon: undefined,
    },
    ...taskTypes.filter((t) => t.value !== "none"),
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b pb-3 mb-3">
      {types.map((taskType) => {
        const Icon = taskType.icon ? getTaskTypeIcon(taskType.icon) : null;
        const isActive = value === taskType.value;
        return (
          <button
            key={taskType.value}
            onClick={() => onChange(taskType.value)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {taskType.label}
          </button>
        );
      })}
    </div>
  );
};
