import { useEffect, useMemo, useState } from "react";
import {
  useGetIdentity,
  useGetList,
  useRecordContext,
  useTranslate,
} from "ra-core";
import { useWatch } from "react-hook-form";
import { format, parse } from "date-fns";
import { addDays } from "date-fns/addDays";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Task } from "../../types";
import { applySlotSelection } from "../taskModel";
import { CalendarEvent } from "./CalendarEvent";
import { CalendarGrid, DEFAULT_SLOT_HEIGHT_PX, TimeAxis } from "./CalendarGrid";
import {
  eventGeometry,
  groupOverlaps,
  parseTimeToMinutes,
} from "./calendarUtils";
import { useCalendarSettings } from "./useCalendarSettings";

const ISO_DATE = "yyyy-MM-dd";

const toDate = (iso: string) => parse(iso, ISO_DATE, new Date());
const toIso = (d: Date) => format(d, ISO_DATE);

/**
 * Bidirectional mini-agenda rendered next to the TaskForm. Shows tasks for the navigated day
 * and a ghost preview of the task currently being edited/created. Clicking a slot reschedules
 * the task in the form (due_date + end_date + start_time + end_time) via applySlotSelection.
 * Reads form state via useWatch; writes via setValue (used by applySlotSelection).
 */
export interface DailyAgendaProps {
  setValue: (
    name: string,
    value: unknown,
    options?: { shouldDirty?: boolean },
  ) => void;
  className?: string;
}

export const DailyAgenda = ({ setValue, className }: DailyAgendaProps) => {
  const translate = useTranslate();
  const settings = useCalendarSettings();
  const { identity } = useGetIdentity();
  const record = useRecordContext<Task>();

  const watchedDueDate = useWatch({ name: "due_date" }) as string | undefined;
  const watchedStartTime = useWatch({ name: "start_time" }) as
    | string
    | undefined;
  const watchedEndTime = useWatch({ name: "end_time" }) as string | undefined;

  const todayIso = useMemo(() => format(new Date(), ISO_DATE), []);
  const [agendaDateIso, setAgendaDateIso] = useState<string>(
    watchedDueDate || todayIso,
  );

  useEffect(() => {
    if (watchedDueDate) {
      setAgendaDateIso(watchedDueDate);
    }
  }, [watchedDueDate]);

  const { data: tasks = [] } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "start_time", order: "ASC" },
      filter: {
        sales_id: identity?.id,
        due_date: agendaDateIso,
      },
    },
    { enabled: !!identity?.id && !!agendaDateIso },
  );

  const otherTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.id !== record?.id && parseTimeToMinutes(t.start_time) !== null,
      ),
    [tasks, record?.id],
  );

  const items = useMemo(
    () =>
      otherTasks
        .map((t) => {
          const s = parseTimeToMinutes(t.start_time);
          const e =
            parseTimeToMinutes(t.end_time) ?? (s != null ? s + 30 : null);
          if (s == null || e == null) return null;
          return { id: t.id, startMinutes: s, endMinutes: e };
        })
        .filter(
          (
            x,
          ): x is {
            id: Task["id"];
            startMinutes: number;
            endMinutes: number;
          } => x !== null,
        ),
    [otherTasks],
  );

  const laneMap = useMemo(() => {
    const lanes = groupOverlaps(items);
    return new Map(lanes.map((l) => [l.id, l]));
  }, [items]);

  const gridDims = useMemo(
    () => ({
      dayStartHour: settings.dayStartHour,
      dayEndHour: settings.dayEndHour,
      pxPerMinute: DEFAULT_SLOT_HEIGHT_PX / settings.slotInterval,
    }),
    [settings.dayStartHour, settings.dayEndHour, settings.slotInterval],
  );

  const ghostGeometry = useMemo(() => {
    if (agendaDateIso !== watchedDueDate) return null;
    const start = parseTimeToMinutes(watchedStartTime);
    if (start == null) return null;
    const end =
      parseTimeToMinutes(watchedEndTime) ?? start + settings.defaultDurationMin;
    return eventGeometry(start, end, gridDims);
  }, [
    agendaDateIso,
    watchedDueDate,
    watchedStartTime,
    watchedEndTime,
    settings.defaultDurationMin,
    gridDims,
  ]);

  const handleSlotClick = (slotMinutes: number) => {
    applySlotSelection(
      setValue as never,
      agendaDateIso,
      slotMinutes,
      settings.defaultDurationMin,
    );
  };

  const shift = (days: number) =>
    setAgendaDateIso(toIso(addDays(toDate(agendaDateIso), days)));

  const headerLabel = useMemo(
    () => format(toDate(agendaDateIso), "EEEE, dd 'de' MMMM", { locale: ptBR }),
    [agendaDateIso],
  );

  const ghostTask: Pick<
    Task,
    "id" | "type" | "text" | "start_time" | "end_time" | "done_date"
  > = {
    id: record?.id ?? "ghost",
    type: (record?.type as string) ?? "call",
    text: record?.text ?? "",
    start_time: watchedStartTime ?? null,
    end_time: watchedEndTime ?? null,
    done_date: null,
  };

  return (
    <div className={cn("flex flex-col gap-2 min-w-0", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {translate("resources.tasks.agenda.title")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shift(-1)}
            aria-label={translate("resources.tasks.agenda.previous_day")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAgendaDateIso(todayIso)}
          >
            {translate("resources.tasks.agenda.today")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shift(1)}
            aria-label={translate("resources.tasks.agenda.next_day")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground capitalize">{headerLabel}</p>
      <div className="flex border rounded-md overflow-hidden">
        <TimeAxis
          slotInterval={settings.slotInterval}
          dayStartHour={settings.dayStartHour}
          dayEndHour={settings.dayEndHour}
        />
        <CalendarGrid
          slotInterval={settings.slotInterval}
          dayStartHour={settings.dayStartHour}
          dayEndHour={settings.dayEndHour}
          onSlotClick={handleSlotClick}
          className="flex-1"
        >
          {otherTasks.map((t) => {
            const s = parseTimeToMinutes(t.start_time);
            const e =
              parseTimeToMinutes(t.end_time) ??
              (s != null ? s + settings.defaultDurationMin : null);
            if (s == null || e == null) return null;
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
              />
            );
          })}
          {ghostGeometry && (
            <CalendarEvent
              task={ghostTask}
              geometry={ghostGeometry}
              variant="ghost"
            />
          )}
        </CalendarGrid>
      </div>
    </div>
  );
};
