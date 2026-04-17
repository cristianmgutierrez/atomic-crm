import { useGetIdentity, useGetList, type Identifier } from "ra-core";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Sale } from "../types";

export interface SalesUserPickerProps {
  value: Identifier | undefined;
  onChange: (value: Identifier) => void;
}

/**
 * Dropdown of sales/assessores scoped to the gestor's office. Returns null for non-gestores
 * (default behavior: each assessor only sees their own tasks). Default selected value is
 * the logged-in sale's id — passed in via `value`.
 */
export const SalesUserPicker = ({ value, onChange }: SalesUserPickerProps) => {
  const { identity } = useGetIdentity();
  const isGestor = identity?.papel === "gestor";

  const { data: sales = [] } = useGetList<Sale>(
    "sales",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "first_name", order: "ASC" },
      filter: identity?.escritorio_id
        ? { escritorio_id: identity.escritorio_id }
        : {},
    },
    { enabled: isGestor && !!identity?.escritorio_id },
  );

  if (!isGestor) return null;

  return (
    <Select
      value={value != null ? String(value) : ""}
      onValueChange={(v) => {
        const n = Number(v);
        onChange(Number.isNaN(n) ? v : n);
      }}
    >
      <SelectTrigger size="sm" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sales.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.first_name} {s.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
