import { useEffect, useRef } from "react";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { DatePickerInput } from "@/components/admin/date-picker-input";
import { TimePickerSelect } from "@/components/admin/time-picker-select";
import { RichTextInput } from "@/components/admin/rich-text-input";
import { required, useGetOne } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";

import { contactOptionText } from "../misc/ContactOption";
import { TaskTypeIconBar } from "./TaskTypeIconBar";
import type { Deal } from "../types";

export const TaskFormContent = () => {
  const { setValue } = useFormContext();
  const dealId = useWatch({ name: "deal_id" });
  const dueDate = useWatch({ name: "due_date" });
  const userSelectedContact = useRef(false);

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

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        autoFocus
        source="text"
        label="Descricao"
        validate={required()}
        multiline
        className="m-0"
        helperText={false}
      />

      <TaskTypeIconBar
        source="type"
        label="Tipo"
        validate={required()}
        defaultValue="call"
      />

      <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-2 items-end">
        <DatePickerInput
          source="due_date"
          label="Data inicio"
          helperText={false}
          validate={required()}
        />
        <TimePickerSelect
          source="start_time"
          label={false}
          helperText={false}
          placeholder="Inicio"
          clearable
        />
        <TimePickerSelect
          source="end_time"
          label={false}
          helperText={false}
          placeholder="Fim"
          clearable
        />
        <DatePickerInput
          source="end_date"
          label="Data fim"
          helperText={false}
        />
      </div>

      <RichTextInput
        source="notes"
        label="Anotacao"
        helperText={false}
        placeholder="Adicionar anotacao..."
      />

      <ReferenceInput source="deal_id" reference="deals">
        <AutocompleteInput
          label="Negocio"
          optionText="name"
          helperText={false}
          modal
        />
      </ReferenceInput>

      <ReferenceInput source="contact_id" reference="contacts_summary">
        <AutocompleteInput
          label="Contato"
          optionText={contactOptionText}
          helperText={false}
          validate={required()}
          modal
          onChange={() => {
            userSelectedContact.current = true;
          }}
        />
      </ReferenceInput>
    </div>
  );
};
