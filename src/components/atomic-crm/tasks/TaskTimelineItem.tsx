import { useState } from "react";
import { MoreVertical } from "lucide-react";
import {
  type Identifier,
  useDeleteWithUndoController,
  useGetOne,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { DateField } from "@/components/admin/date-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, Sale, Task } from "../types";
import { TaskAttachments } from "./TaskAttachments";
import { TaskEdit } from "./TaskEdit";
import { getTaskTypeWithIcon } from "./taskModel";

export const TaskTimelineItem = ({
  task,
  mode,
  contactCompanyId,
}: {
  task: Task;
  mode: "focus" | "history";
  contactCompanyId?: Identifier | null;
}) => {
  const { taskTypes } = useConfigurationContext();
  const notify = useNotify();
  const translate = useTranslate();
  const [openEdit, setOpenEdit] = useState(false);

  const [update, { isPending: isUpdatePending }] = useUpdate();
  const { handleDelete } = useDeleteWithUndoController({
    record: task,
    redirect: false,
    mutationOptions: {
      onSuccess() {
        notify("resources.tasks.deleted", { undoable: true });
      },
    },
  });

  const { data: company } = useGetOne(
    "companies",
    { id: contactCompanyId! },
    { enabled: !!contactCompanyId },
  );

  const handleCheck = () => {
    update("tasks", {
      id: task.id,
      data: { done_date: task.done_date ? null : new Date().toISOString() },
      previousData: task,
    });
  };

  const { Icon: TypeIcon } = getTaskTypeWithIcon(taskTypes, task.type);
  const labelId = `timeline-task-${task.id}`;

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0 mt-0.5">
            {task.type && task.type !== "none" ? (
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Checkbox
                id={labelId}
                checked={!!task.done_date}
                onCheckedChange={handleCheck}
                disabled={isUpdatePending}
                className="mt-0.5"
              />
              <span
                className={`text-sm font-medium leading-tight ${task.done_date ? "line-through text-muted-foreground" : ""}`}
              >
                {task.text}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 cursor-pointer"
                  aria-label={translate("resources.tasks.actions.title")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    update("tasks", {
                      id: task.id,
                      data: {
                        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 10),
                      },
                      previousData: task,
                    })
                  }
                >
                  {translate("resources.tasks.actions.postpone_tomorrow")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    update("tasks", {
                      id: task.id,
                      data: {
                        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 10),
                      },
                      previousData: task,
                    })
                  }
                >
                  {translate("resources.tasks.actions.postpone_next_week")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setOpenEdit(true)}
                >
                  {translate("ra.action.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleDelete}
                >
                  {translate("ra.action.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground pl-6">
            {mode === "focus" ? (
              <span>
                {translate("resources.tasks.fields.due_short")}{" "}
                <DateField
                  source="due_date"
                  record={task}
                  showDate
                  showTime={false}
                  className="inline"
                />
              </span>
            ) : task.done_date ? (
              <span>
                {translate("resources.tasks.fields.done_short", {
                  _: "Concluída em",
                })}{" "}
                <DateField
                  source="done_date"
                  record={task}
                  showDate
                  showTime={false}
                  className="inline"
                />
              </span>
            ) : null}

            {task.sales_id && (
              <ReferenceField<Task, Sale>
                source="sales_id"
                reference="sales"
                record={task}
                link={false}
                render={({ referenceRecord }) => {
                  if (!referenceRecord) return null;
                  return (
                    <span>
                      · {referenceRecord.first_name} {referenceRecord.last_name}
                    </span>
                  );
                }}
              />
            )}

            {task.deal_id && (
              <ReferenceField<Task, Deal>
                source="deal_id"
                reference="deals"
                record={task}
                link={false}
                render={({ referenceRecord }) => {
                  if (!referenceRecord) return null;
                  return <span>· {referenceRecord.name}</span>;
                }}
              />
            )}

            {company && <span>· {company.name}</span>}
          </div>

          <div className="pl-6">
            <TaskAttachments task={task} />
          </div>
        </div>
      </div>

      <TaskEdit
        taskId={task.id}
        open={openEdit}
        close={() => setOpenEdit(false)}
      />
    </>
  );
};
