import { useGetIdentity, useGetList, useListContext } from "ra-core";
import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Sale } from "../types";
import { FilterCategory } from "./FilterCategory";

const ALL = "__all__";

interface SalesFilterSelectProps {
  source?: string;
  label?: string;
}

/**
 * Dropdown de assessores para filtrar listas por responsável.
 * Visível apenas para gestores — assessores sempre veem só os próprios registros.
 * Reutilizável em qualquer recurso que tenha campo `sales_id`.
 */
export const SalesFilterSelect = ({
  source = "sales_id",
  label = "resources.contacts.fields.sales_id",
}: SalesFilterSelectProps) => {
  const { identity } = useGetIdentity();
  const { filterValues, setFilters } = useListContext();

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

  const current =
    filterValues?.[source] != null ? String(filterValues[source]) : ALL;

  const handleChange = (v: string) => {
    const next = { ...filterValues };
    if (v === ALL) {
      delete next[source];
    } else {
      const n = Number(v);
      next[source] = Number.isNaN(n) ? v : n;
    }
    setFilters(next, {});
  };

  return (
    <FilterCategory icon={<Users />} label={label}>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {sales.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.first_name} {s.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterCategory>
  );
};
