import { useRecordContext } from "ra-core";

import type { Contact } from "../types";
import { TasksPanel } from "./TasksPanel";

export const ContactTasksPanel = () => {
  const record = useRecordContext<Contact>();
  if (!record) return null;

  return (
    <TasksPanel
      filter={{ contact_id: record.id }}
      quickCreateDefaults={{ contact_id: record.id }}
      companyIdForBadges={record.company_id}
    />
  );
};
