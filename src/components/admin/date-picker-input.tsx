import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { InputProps } from "ra-core";
import { useInput, FieldTitle, useResourceContext } from "ra-core";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import { FormError, FormField, FormLabel } from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date picker input with calendar popover for editing date values in "YYYY-MM-DD" format.
 * Shows a calendar with month navigation and year dropdown selector.
 */
export const DatePickerInput = (props: DatePickerInputProps) => {
  const {
    className,
    defaultValue,
    label,
    source,
    helperText,
    validate,
    disabled,
    readOnly,
    fromYear = 2010,
    toYear = 2040,
    ...rest
  } = props;

  const resource = useResourceContext(props);
  const [open, setOpen] = React.useState(false);

  const { field, id, isRequired } = useInput({
    defaultValue,
    source,
    validate,
    disabled,
    readOnly,
    ...rest,
  });

  // Normalize ISO timestamps from DB (timestamptz) to YYYY-MM-DD on mount
  React.useEffect(() => {
    if (
      field.value &&
      typeof field.value === "string" &&
      field.value.includes("T")
    ) {
      field.onChange(field.value.slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse the YYYY-MM-DD string from form state to a Date object
  const selectedDate = React.useMemo(() => {
    if (!field.value) return undefined;
    // Normalize ISO timestamps to YYYY-MM-DD before parsing
    const dateStr =
      typeof field.value === "string" && field.value.includes("T")
        ? field.value.slice(0, 10)
        : field.value;
    const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [field.value]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      field.onChange(format(date, "yyyy-MM-dd"));
    } else {
      field.onChange("");
    }
    setOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground",
            )}
            disabled={disabled || readOnly}
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
              : "DD/MM/YYYY"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            defaultMonth={selectedDate ?? new Date()}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      <InputHelperText helperText={helperText} />
      <FormError />
    </FormField>
  );
};

export type DatePickerInputProps = InputProps & {
  fromYear?: number;
  toYear?: number;
} & Omit<React.ComponentProps<"button">, "label" | "defaultValue">;
