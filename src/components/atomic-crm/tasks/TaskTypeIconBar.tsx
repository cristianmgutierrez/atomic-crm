import {
  Phone,
  Users,
  Mail,
  Clock,
  UtensilsCrossed,
  Monitor,
  Heart,
  Package,
  CircleOff,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import { useInput, FieldTitle, useResourceContext } from "ra-core";
import type { InputProps } from "ra-core";

import { FormError, FormField, FormLabel } from "@/components/admin/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useConfigurationContext } from "../root/ConfigurationContext";

const ICON_MAP: Record<string, LucideIcon> = {
  Phone,
  Users,
  Mail,
  Clock,
  UtensilsCrossed,
  Monitor,
  Heart,
  Package,
  CircleOff,
  CircleDot,
};

export const getTaskTypeIcon = (iconName?: string): LucideIcon => {
  if (!iconName) return CircleDot;
  return ICON_MAP[iconName] ?? CircleDot;
};

export const TaskTypeIconBar = (props: TaskTypeIconBarProps) => {
  const {
    className,
    defaultValue = "none",
    label,
    source,
    helperText: _helperText,
    validate,
    disabled,
    readOnly,
    ...rest
  } = props;

  const resource = useResourceContext(props);
  const { taskTypes } = useConfigurationContext();

  const { field, id, isRequired } = useInput({
    defaultValue,
    source,
    validate,
    disabled,
    readOnly,
    ...rest,
  });

  return (
    <FormField id={id} className={className} name={field.name}>
      {label !== false && (
        <FormLabel>
          <FieldTitle
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FormLabel>
      )}
      <ToggleGroup
        type="single"
        value={field.value || ""}
        onValueChange={(value) => {
          if (value) field.onChange(value);
        }}
        className={cn(
          "flex flex-wrap gap-1 w-full justify-start overflow-x-auto",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        {taskTypes.map((taskType) => {
          const Icon = getTaskTypeIcon(taskType.icon);
          return (
            <Tooltip key={taskType.value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={taskType.value}
                  aria-label={taskType.label}
                  className={cn(
                    "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 min-w-[3rem] cursor-pointer",
                    field.value === taskType.value &&
                      "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] leading-tight truncate max-w-[3.5rem]">
                    {taskType.label}
                  </span>
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{taskType.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
      <FormError />
    </FormField>
  );
};

export type TaskTypeIconBarProps = InputProps;
