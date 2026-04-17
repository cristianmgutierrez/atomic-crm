import { useMemo, useState } from "react";
import {
  useGetIdentity,
  useGetList,
  useTranslate,
  useUpdate,
  type Identifier,
} from "ra-core";
import { format } from "date-fns";
import { addWeeks } from "date-fns/addWeeks";
import { isSameDay } from "date-fns/isSameDay";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../../root/ConfigurationContext";
import type { Task } from "../../types";
import { TaskEdit } from "../TaskEdit";
import { getTaskTypeWithIcon } from "../taskModel";
import { CalendarEvent } from "./CalendarEvent";
import { CalendarGrid, DEFAULT_SLOT_HEIGHT_PX, TimeAxis } from "./CalendarGrid";
import {
  eventGeometry,
  groupOverlaps,
  parseTimeToMinutes,
  weekDaysFrom,
} from "./calendarUtils";
import { useCalendarSettings } from "./useCalendarSettings";

const ISO_DATE = "yyyy-MM-dd";
const toIso = (d: Date) => format(d, ISO_DATE);

export interface WeekCalendarProps {
  salesId?: Identifier;
}

/**
 * Weekly calendar view: 7 columns (days), an all-day row for tasks without start_time,
 * and a scrollable timegrid below. Events open TaskEdit on click; checkbox toggles done_date.
 */
export const WeekCalendar = ({ salesId }: WeekCalendarProps) => {
  const translate = useTranslate();
  const settings = useCalendarSettings();
  const { identity } = useGetIdentity();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [editTaskId, setEditTaskId] = useState<Identifier | null>(null);

  const effectiveSalesId = salesId ?? identity?.id;

  const days = useMemo(
    () => weekDaysFrom(anchorDate, settings.weekStartsOn),
    [anchorDate, settings.weekStartsOn],
  );
  const weekStartIso = toIso(days[0]);
  const weekEndIso = toIso(days[6]);

  const { data: tasks = [] } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 500 },
      sort: { field: "start_time", order: "ASC" },
      filter: {
        sales_id: effectiveSalesId,
        "due_date@gte": weekStartIso,
        "due_date@lte": weekEndIso,
      },
    },
    { enabled: !!effectiveSalesId },
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const d of days) map.set(toIso(d), []);
    for (const t of tasks) {
      if (!t.due_date) continue;
      const iso = t.due_date.slice(0, 10);
      const bucket = map.get(iso);
      if (bucket) bucket.push(t);
    }
    return map;
  }, [tasks, days]);

  const gridDims = useMemo(
    () => ({
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      pxPerMinute: DEFAULT_SLOT_HEIGHT_PX / settings.slotInterval,
    }),
    [settings.dayStartHour, settings.dayEndHour, settings.slotInterval],
  );

  const rangeLabel = useMemo(() => {
    const start = days[0];
    const end = days[6];
    const startFmt = format(start, "d 'de' MMM", { locale: ptBR });
    const endFmt = format(end, "d 'de' MMM yyyy", { locale: ptBR });
    return `${startFmt} – ${endFmt}`;
  }, [days]);

  const shiftWeek = (weeks: number) => setAnchorDate((d) => addWeeks(d, weeks));

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shiftWeek(-1)}
            aria-label={translate("resources.tasks.calendar.previous_week")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnchorDate(new Date())}
          >
            {translate("resources.tasks.calendar.today")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shiftWeek(1)}
            aria-label={translate("resources.tasks.calendar.next_week")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h3 className="text-sm font-semibold capitalize">{rangeLabel}</h3>
      </div>

      <div className="flex border rounded-md overflow-hidden">
        <div className="w-12 shrink-0 border-r bg-muted/30" />
        <div className="flex-1 grid grid-cols-7 divide-x">
          {days.map((d) => {
            const isToday = isSameDay(d, new Date());
            return (
              <div
                key={toIso(d)}
                className={cn(
                  "flex flex-col items-center py-2",
                  isToday && "bg-primary/5",
                )}
              >
                <span className="text-xs text-muted-foreground uppercase">
                  {format(d, "EEE", { locale: ptBR })}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isToday && "text-primary",
                  )}
                >
                  {format(d, "d", { locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex border rounded-md overflow-hidden">
        <div className="w-12 shrink-0 border-r bg-muted/30 flex items-start justify-end pr-2 pt-1">
          <span className="text-[10px] text-muted-foreground">
            {translate("resources.tasks.calendar.all_day")}
          </span>
        </div>
        <div className="flex-1 grid grid-cols-7 divide-x min-h-10">
          {days.map((d) => {
            const iso = toIso(d);
            const allDay = (tasksByDay.get(iso) ?? []).filter(
              (t) => parseTimeToMinutes(t.start_time) == null,
            );
            return (
              <div key={iso} className="flex flex-col gap-1 p-1 min-w-0">
                {allDay.map((t) => (
                  <AllDayCard
                    key={t.id}
                    task={t}
                    onClick={() => setEditTaskId(t.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex border rounded-md overflow-auto">
        <TimeAxis
          slotInterval={settings.slotInterval}
          dayStartHour={settings.dayStartHour}
          dayEndHour={settings.dayEndHour}
          className="border-r"
        />
        <div className="flex-1 grid grid-cols-7 divide-x">
          {days.map((d) => {
            const iso = toIso(d);
            const scheduled = (tasksByDay.get(iso) ?? []).filter(
              (t) => parseTimeToMinutes(t.start_time) != null,
            );
            const items = scheduled.map((t) => {
              const s = parseTimeToMinutes(t.start_time)!;
              const e =
                parseTimeToMinutes(t.end_time) ??
                s + settings.defaultDurationMin;
              return { id: t.id, startMinutes: s, endMinutes: e };
            });
            const laneMap = new Map(groupOverlaps(items).map((l) => [l.id, l]));
            return (
              <CalendarGrid
                key={iso}
                slotInterval={settings.slotInterval}
                dayStartHour={settings.dayStartHour}
                dayEndHour={settings.dayEndHour}
                className="min-w-0"
              >
                {scheduled.map((t) => {
                  const s = parseTimeToMinutes(t.start_time)!;
                  const e =
                    parseTimeToMinutes(t.end_time) ??
                    s + settings.defaultDurationMin;
                  const geo = eventGeometry(s, e, gridDims);
                  if (!geo) return null;
                  const lane = laneMap.get(t.id);
                  return (
                    <CalendarEvent
                      key={t.id}
                      task={t}
                      geometry={geo}
                      lane={lane?.lane ?? 0}
                      lanesCount={lane?.lanesCount ?? 1}
                      onClick={() => setEditTaskId(t.id)}
                    />
                  );
                })}
              </CalendarGrid>
            );
          })}
        </div>
      </div>

      {editTaskId != null && (
        <TaskEdit
          taskId={editTaskId}
          open={editTaskId != null}
          close={() => setEditTaskId(null)}
        />
      )}
    </div>
  );
};

/**
 * Compact card for a task with no specific time, shown in the all-day row.
 * Keeps the same done-toggle mechanism as CalendarEvent for DRY.
 */
const AllDayCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  const { taskTypes } = useConfigurationContext();
  const { Icon } = getTaskTypeWithIcon(taskTypes, task.type);
  const [update, { isPending }] = useUpdate();
  const isDone = !!task.done_date;

  const handleCheck = (checked: boolean | "indeterminate") => {
    update("tasks", {
      id: task.id,
      data: { done_date: checked ? new Date().toISOString() : null },
      previousData: task,
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs text-left bg-primary/20 border-primary/40 hover:bg-primary/30 overflow-hidden",
        isDone && "opacity-60 line-through",
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={handleCheck}
        disabled={isPending}
        onClick={(e) => e.stopPropagation()}
        className="size-3 shrink-0"
        aria-label="Marcar como feito"
      />
      {task.type && task.type !== "none" && (
        <Icon className="size-3 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate font-medium">{task.text}</span>
    </button>
  );
};
