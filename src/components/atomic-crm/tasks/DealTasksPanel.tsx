import { useRecordContext } from "ra-core";

import type { Deal } from "../types";
import { TasksPanel } from "./TasksPanel";

export const DealTasksPanel = () => {
  const record = useRecordContext<Deal>();
  if (!record) return null;

  const firstContactId = record.contact_ids?.[0];

  return (
    <TasksPanel
      filter={{ deal_id: record.id }}
      quickCreateDefaults={{
        deal_id: record.id,
        contact_id: firstContactId,
      }}
    />
  );
};
