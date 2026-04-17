import { useState } from "react";
import {
  useGetIdentity,
  useListContext,
  useTranslate,
  useUpdate,
  type Identifier,
} from "ra-core";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";

import { Checkbox } from "@/components/ui/checkbox";

import type { Contact, Deal, Task } from "../types";
import { TopToolbar } from "../layout/TopToolbar";
import { AddTask } from "./AddTask";
import { TaskEdit } from "./TaskEdit";
import { TaskPageFilter } from "./TaskPageFilter";
import { isOverdue, isDueToday } from "./tasksPredicate";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatTimeRange, getTaskTypeWithIcon } from "./taskModel";
import { TaskListViewToggle, type TaskViewMode } from "./TaskListViewToggle";
import { WeekCalendar } from "./calendar/WeekCalendar";
import { SalesUserPicker } from "./SalesUserPicker";

// ─── Actions toolbar ──────────────────────────────────────────────────────────

const TaskListActions = ({
  viewMode,
  onViewModeChange,
  selectedSalesId,
  onSelectedSalesIdChange,
}: {
  viewMode: TaskViewMode;
  onViewModeChange: (v: TaskViewMode) => void;
  selectedSalesId: Identifier | undefined;
  onSelectedSalesIdChange: (value: Identifier) => void;
}) => (
  <TopToolbar>
    <SalesUserPicker
      value={selectedSalesId}
      onChange={onSelectedSalesIdChange}
    />
    <TaskListViewToggle value={viewMode} onChange={onViewModeChange} />
    <AddTask selectContact display="chip" />
  </TopToolbar>
);

// ─── Done checkbox cell ───────────────────────────────────────────────────────

const DoneCheckbox = ({ task }: { task: Task }) => {
  const [update, { isPending }] = useUpdate();

  const handleChange = () => {
    update("tasks", {
      id: task.id as Identifier,
      data: {
        done_date: task.done_date ? null : new Date().toISOString(),
      },
      previousData: task,
    });
  };

  return (
    <Checkbox
      checked={!!task.done_date}
      onCheckedChange={handleChange}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

// ─── Type icon cell ───────────────────────────────────────────────────────────

const TypeIconCell = ({ task }: { task: Task }) => {
  const { taskTypes } = useConfigurationContext();
  const { taskType, Icon } = getTaskTypeWithIcon(taskTypes, task.type);
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs hidden lg:inline">{taskType?.label}</span>
    </div>
  );
};

// ─── Time cell ────────────────────────────────────────────────────────────────

const TimeCell = ({ task }: { task: Task }) => {
  const display = formatTimeRange(task.start_time, task.end_time) ?? "—";
  return <span className="text-xs">{display}</span>;
};

// ─── Desktop layout ───────────────────────────────────────────────────────────

const TaskListLayoutDesktop = () => {
  const { data, isPending, filterValues } = useListContext();
  const translate = useTranslate();
  const [editTaskId, setEditTaskId] = useState<Identifier | null>(null);

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;

  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">
          {translate("resources.tasks.empty_list_hint")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row gap-4">
        <TaskPageFilter />
        <div className="min-w-0 flex-1 flex flex-col gap-4">
          <div className="overflow-x-auto rounded-md border">
            <DataTable
              rowClick={(id) => {
                setEditTaskId(id);
                return false;
              }}
              bulkActionButtons={false}
              className="border-0 rounded-none"
              rowClassName={(record: Task) => {
                if (record.done_date) return "text-muted-foreground";
                if (record.due_date && isOverdue(record.due_date))
                  return "text-red-500";
                if (record.due_date && isDueToday(record.due_date))
                  return "text-green-600";
                return "";
              }}
            >
              <DataTable.Col
                source="done_date"
                label=" "
                disableSort
                render={(r: Task) => <DoneCheckbox task={r} />}
              />
              <DataTable.Col
                source="type"
                label={translate("resources.tasks.fields.type")}
                disableSort
                render={(r: Task) => <TypeIconCell task={r} />}
              />
              <DataTable.Col
                source="text"
                label={translate("resources.tasks.fields.text")}
                render={(r: Task) => (
                  <span className={r.done_date ? "line-through" : ""}>
                    {r.text}
                  </span>
                )}
              />
              <DataTable.Col
                source="contact_id"
                label={translate("resources.tasks.fields.contact_id")}
                disableSort
                render={(r: Task) => (
                  <ReferenceField<Task, Contact>
                    source="contact_id"
                    reference="contacts"
                    record={r}
                    link="show"
                    render={({ referenceRecord }) =>
                      referenceRecord
                        ? `${referenceRecord.first_name} ${referenceRecord.last_name}`
                        : "—"
                    }
                  />
                )}
              />
              <DataTable.Col
                source="deal_id"
                label={translate("resources.tasks.fields.deal_id")}
                disableSort
                render={(r: Task) =>
                  r.deal_id ? (
                    <ReferenceField<Task, Deal>
                      source="deal_id"
                      reference="deals"
                      record={r}
                      link="show"
                      render={({ referenceRecord }) =>
                        referenceRecord ? referenceRecord.name : "—"
                      }
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
              />
              <DataTable.Col
                source="due_date"
                label={translate("resources.tasks.fields.due_date")}
                render={(r: Task) => (
                  <DateField
                    source="due_date"
                    record={r}
                    showDate
                    showTime={false}
                  />
                )}
              />
              <DataTable.Col
                source="start_time"
                label={translate("resources.tasks.fields.start_time")}
                disableSort
                render={(r: Task) => <TimeCell task={r} />}
              />
            </DataTable>
          </div>
        </div>
      </div>

      {editTaskId != null && (
        <TaskEdit
          taskId={editTaskId}
          open={editTaskId != null}
          close={() => setEditTaskId(null)}
        />
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const TaskList = () => {
  const { identity } = useGetIdentity();
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [selectedSalesId, setSelectedSalesId] = useState<
    Identifier | undefined
  >();

  const effectiveSalesId = selectedSalesId ?? identity?.id;

  if (!identity) return null;

  const actions = (
    <TaskListActions
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      selectedSalesId={effectiveSalesId}
      onSelectedSalesIdChange={setSelectedSalesId}
    />
  );

  if (viewMode === "calendar") {
    return (
      <div className="flex flex-col gap-4">
        {actions}
        <WeekCalendar salesId={effectiveSalesId} />
      </div>
    );
  }

  return (
    <List
      title={false}
      actions={actions}
      perPage={25}
      sort={{ field: "due_date", order: "ASC" }}
      filter={{ sales_id: effectiveSalesId }}
    >
      <TaskListLayoutDesktop />
    </List>
  );
};

export default TaskList;
