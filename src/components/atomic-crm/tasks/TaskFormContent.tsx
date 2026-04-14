import { useCallback, useEffect, useRef, useState } from "react";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { DatePickerInput } from "@/components/admin/date-picker-input";
import { TimePickerSelect } from "@/components/admin/time-picker-select";
import { RichTextInput } from "@/components/admin/rich-text-input";
import { required, useGetOne, useTranslate } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";

import { contactOptionText } from "../misc/ContactOption";
import { TaskTypeIconBar } from "./TaskTypeIconBar";
import type { Deal } from "../types";

/** Adds 60 minutes to a HH:MM string. Returns null if result overflows midnight. */
function addSixtyMinutes(time: string): string | null {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + 60;
  if (totalMinutes >= 24 * 60) return null;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export const TaskFormContent = () => {
  const translate = useTranslate();
  const { setValue, getValues } = useFormContext();
  const dealId = useWatch({ name: "deal_id" });
  const dueDate = useWatch({ name: "due_date" });
  const endDate = useWatch({ name: "end_date" });
  const startTime = useWatch({ name: "start_time" });
  const endTime = useWatch({ name: "end_time" });
  const userSelectedContact = useRef(false);

  // Local error state — for display only (below the grid)
  const [dateTimeError, setDateTimeError] = useState<string | null>(null);

  // Validation functions that integrate with react-hook-form to block submit
  const validateEndDate = useCallback(
    (value: string) => {
      if (!value) return undefined;
      const dd = getValues("due_date");
      if (dd && value < dd) {
        return translate("resources.tasks.validation.end_date_before_start");
      }
      return undefined;
    },
    [getValues, translate],
  );

  const validateEndTime = useCallback(
    (value: string) => {
      if (!value) return undefined;
      const st = getValues("start_time");
      const dd = getValues("due_date");
      const ed = getValues("end_date");
      if (st && dd && ed && dd === ed && value <= st) {
        return translate("resources.tasks.validation.end_time_before_start");
      }
      return undefined;
    },
    [getValues, translate],
  );

  const { data: deal } = useGetOne<Deal>(
    "deals",
    { id: dealId! },
    { enabled: !!dealId },
  );

  // Auto-fill contact when deal changes
  useEffect(() => {
    if (deal?.contact_ids?.length && !userSelectedContact.current) {
      setValue("contact_id", deal.contact_ids[0]);
    }
  }, [deal?.id, deal?.contact_ids, setValue]);

  // Sync end_date with due_date when due_date changes
  useEffect(() => {
    if (dueDate) {
      setValue("end_date", dueDate);
    }
  }, [dueDate, setValue]);

  // Auto-suggest end_time = start_time + 60min (only if end_time is empty)
  useEffect(() => {
    if (!startTime) return;
    const currentEndTime = getValues("end_time");
    if (currentEndTime) return;
    const suggested = addSixtyMinutes(startTime);
    if (suggested) {
      setValue("end_time", suggested);
    }
  }, [startTime, setValue, getValues]);

  // Local validation: compute error message from watched values
  useEffect(() => {
    if (endDate && dueDate && endDate < dueDate) {
      setDateTimeError(
        translate("resources.tasks.validation.end_date_before_start"),
      );
    } else if (
      endTime &&
      startTime &&
      dueDate &&
      endDate &&
      dueDate === endDate &&
      endTime <= startTime
    ) {
      setDateTimeError(
        translate("resources.tasks.validation.end_time_before_start"),
      );
    } else {
      setDateTimeError(null);
    }
  }, [endDate, dueDate, endTime, startTime]);

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        autoFocus
        source="text"
        label={translate("resources.tasks.inputs.text")}
        validate={required()}
        className="m-0"
        helperText={false}
      />

      <TaskTypeIconBar
        source="type"
        label={translate("resources.tasks.inputs.type")}
        validate={required()}
        defaultValue="call"
      />

      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-2 items-end">
          <DatePickerInput
            source="due_date"
            label={translate("resources.tasks.inputs.due_date")}
            helperText={false}
            validate={required()}
          />
          <TimePickerSelect
            source="start_time"
            label={false}
            helperText={false}
            placeholder={translate("resources.tasks.inputs.start_time")}
            clearable
          />
          <TimePickerSelect
            source="end_time"
            label={false}
            helperText={false}
            placeholder={translate("resources.tasks.inputs.end_time")}
            clearable
            validate={validateEndTime}
            className="[&_[data-slot=form-message]]:hidden"
          />
          <DatePickerInput
            source="end_date"
            label={translate("resources.tasks.inputs.end_date")}
            helperText={false}
            validate={validateEndDate}
            className="[&_[data-slot=form-message]]:hidden"
          />
        </div>
        {dateTimeError && (
          <p className="text-destructive text-sm">{dateTimeError}</p>
        )}
      </div>

      <RichTextInput
        source="notes"
        label={translate("resources.tasks.inputs.notes")}
        helperText={false}
        placeholder={translate("resources.tasks.inputs.notes_placeholder")}
      />

      <ReferenceInput source="deal_id" reference="deals">
        <AutocompleteInput
          label={translate("resources.tasks.inputs.deal_id")}
          optionText="name"
          helperText={false}
        />
      </ReferenceInput>

      <ReferenceInput source="contact_id" reference="contacts_summary">
        <AutocompleteInput
          label={translate("resources.tasks.inputs.contact_id")}
          optionText={contactOptionText}
          helperText={false}
          validate={required()}
          onChange={() => {
            userSelectedContact.current = true;
          }}
        />
      </ReferenceInput>
    </div>
  );
};
