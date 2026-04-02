import { email, required, useGetIdentity, useRecordContext } from "ra-core";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import type { Sale } from "../types";

const papelChoices = [
  { id: "gestor", name: "Gestor" },
  { id: "assessor", name: "Assessor" },
];

export function SalesInputs() {
  const { identity } = useGetIdentity();
  const record = useRecordContext<Sale>();
  return (
    <div className="space-y-4 w-full">
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
      <TextInput
        source="email"
        validate={[required(), email()]}
        helperText={false}
      />
      <ReferenceInput source="escritorio_id" reference="escritorios">
        <SelectInput optionText="name" label="Escritório" helperText={false} />
      </ReferenceInput>
      <SelectInput
        source="papel"
        label="Papel"
        choices={papelChoices}
        helperText={false}
      />
      <BooleanInput
        source="administrator"
        readOnly={record?.id === identity?.id}
        helperText={false}
      />
      <BooleanInput
        source="disabled"
        readOnly={record?.id === identity?.id}
        helperText={false}
      />
    </div>
  );
}
