import * as React from "react";
import { Clock, X } from "lucide-react";
import type { InputProps } from "ra-core";
import { useInput, FieldTitle, useResourceContext } from "ra-core";

import { FormError, FormField, FormLabel } from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Generate time slots from 00:00 to 23:45 in 15-minute intervals
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
    );
  }
}

export const TimePickerSelect = (props: TimePickerSelectProps) => {
  const {
    className,
    defaultValue,
    label,
    source,
    helperText,
    validate,
    disabled,
    readOnly,
    placeholder = "HH:mm",
    clearable = true,
    ...rest
  } = props;

  const resource = useResourceContext(props);

  const { field, id, isRequired } = useInput({
    defaultValue,
    source,
    validate,
    disabled,
    readOnly,
    ...rest,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    field.onChange("");
  };

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
      <div className="relative">
        <Select
          value={field.value || ""}
          onValueChange={(value) => field.onChange(value)}
          disabled={disabled || readOnly}
        >
          <SelectTrigger
            className={cn(
              "w-full",
              !field.value && "text-muted-foreground",
              clearable && field.value && "pr-8",
            )}
          >
            <Clock className="mr-1 h-4 w-4 shrink-0" />
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {TIME_SLOTS.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clearable && field.value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 cursor-pointer"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <InputHelperText helperText={helperText} />
      <FormError />
    </FormField>
  );
};

export type TimePickerSelectProps = InputProps & {
  placeholder?: string;
  clearable?: boolean;
};
