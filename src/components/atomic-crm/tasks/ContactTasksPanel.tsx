import { useMemo, useState } from "react";
import { useGetList, useRecordContext, useTranslate } from "ra-core";
import { Separator } from "@/components/ui/separator";

import type { Contact, Task } from "../types";
import { isDone } from "./tasksPredicate";
import { TaskHistoryTypeFilter } from "./TaskHistoryTypeFilter";
import { TaskQuickCreate } from "./TaskQuickCreate";
import { TaskTimelineItem } from "./TaskTimelineItem";

export const ContactTasksPanel = () => {
  const record = useRecordContext<Contact>();
  const translate = useTranslate();
  const [historyFilter, setHistoryFilter] = useState("all");

  const { data: tasks = [], isPending } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "due_date", order: "ASC" },
      filter: { contact_id: record?.id },
    },
    { enabled: !!record?.id },
  );

  const openTasks = useMemo(() => tasks.filter((t) => !isDone(t)), [tasks]);

  const doneTasks = useMemo(() => {
    const done = tasks
      .filter((t) => isDone(t))
      .sort((a, b) => {
        if (!a.done_date || !b.done_date) return 0;
        return (
          new Date(b.done_date).getTime() - new Date(a.done_date).getTime()
        );
      });
    if (historyFilter === "all") return done;
    return done.filter((t) => t.type === historyFilter);
  }, [tasks, historyFilter]);

  if (!record) return null;

  return (
    <div className="mt-4">
      <TaskQuickCreate />

      <div className="mb-6">
        <h3 className="font-medium text-sm pb-1">
          {translate("crm.tasks.focus", { _: "Foco" })}
        </h3>
        <Separator className="mb-3" />
        {isPending ? null : openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {translate("crm.tasks.no_open", {
              _: "Nenhuma atividade em aberto.",
            })}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {openTasks.map((task) => (
              <TaskTimelineItem
                key={task.id}
                task={task}
                mode="focus"
                contactCompanyId={record.company_id}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-sm pb-1">
          {translate("crm.tasks.history", { _: "Histórico" })}
        </h3>
        <Separator className="mb-3" />
        <TaskHistoryTypeFilter
          value={historyFilter}
          onChange={setHistoryFilter}
        />
        {isPending ? null : doneTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {translate("crm.tasks.no_done", {
              _: "Nenhuma atividade concluída.",
            })}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {doneTasks.map((task) => (
              <TaskTimelineItem
                key={task.id}
                task={task}
                mode="history"
                contactCompanyId={record.company_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
