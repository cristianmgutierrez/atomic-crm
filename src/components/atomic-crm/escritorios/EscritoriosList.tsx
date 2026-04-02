import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";

import { TopToolbar } from "../layout/TopToolbar";

const EscritoriosListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export function EscritoriosList() {
  return (
    <List
      actions={<EscritoriosListActions />}
      sort={{ field: "name", order: "ASC" }}
    >
      <DataTable rowClick="edit">
        <DataTable.Col source="name" label="Nome" />
        <DataTable.Col source="created_at" label="Criado em" />
      </DataTable>
    </List>
  );
}
