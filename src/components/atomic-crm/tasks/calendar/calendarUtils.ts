import { addDays } from "date-fns/addDays";
import { startOfWeek } from "date-fns/startOfWeek";

/** "HH:MM" → minutes since 00:00. Returns null if invalid/empty. */
export const parseTimeToMinutes = (
  time: string | null | undefined,
): number | null => {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/** minutes since 00:00 → "HH:MM" (clamped to 00:00–23:59). */
export const formatMinutesToHHMM = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

/** Generates slot boundaries (minutes from 00:00) within the visible day range. */
export const generateTimeSlots = (
  dayStartHour: number,
  dayEndHour: number,
  slotInterval: number,
): number[] => {
  if (slotInterval <= 0 || dayEndHour <= dayStartHour) return [];
  const slots: number[] = [];
  const startMin = dayStartHour * 60;
  const endMin = dayEndHour * 60;
  for (let m = startMin; m < endMin; m += slotInterval) {
    slots.push(m);
  }
  return slots;
};

export interface GridDimensions {
  dayStartHour: number;
  dayEndHour: number;
  pxPerMinute: number;
}

export interface EventGeometry {
  topPx: number;
  heightPx: number;
}

/** Minimum visual height for an event regardless of duration, so it's always clickable. */
export const MIN_EVENT_HEIGHT_PX = 18;

/**
 * Given an event's start/end (in minutes), returns its top/height in px.
 * Clamps to the visible day range. Returns null if entirely outside.
 */
export const eventGeometry = (
  startMinutes: number,
  endMinutes: number,
  { dayStartHour, dayEndHour, pxPerMinute }: GridDimensions,
): EventGeometry | null => {
  if (endMinutes <= startMinutes) return null;
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayEndHour * 60;
  if (endMinutes <= dayStartMin || startMinutes >= dayEndMin) return null;
  const clampedStart = Math.max(startMinutes, dayStartMin);
  const clampedEnd = Math.min(endMinutes, dayEndMin);
  return {
    topPx: (clampedStart - dayStartMin) * pxPerMinute,
    heightPx: Math.max(
      MIN_EVENT_HEIGHT_PX,
      (clampedEnd - clampedStart) * pxPerMinute,
    ),
  };
};

export interface OverlapItem<TId> {
  id: TId;
  startMinutes: number;
  endMinutes: number;
}

export interface LaneAssignment<TId> {
  id: TId;
  lane: number;
  lanesCount: number;
}

/**
 * Assigns overlapping events to lanes so they render side-by-side without hiding each other.
 * Groups events into clusters of transitively-overlapping items; within a cluster, greedy
 * lane assignment ensures any given lane holds only non-overlapping events.
 */
export const groupOverlaps = <TId>(
  items: OverlapItem<TId>[],
): LaneAssignment<TId>[] => {
  if (items.length === 0) return [];
  const sorted = [...items].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const result: LaneAssignment<TId>[] = [];
  let cluster: OverlapItem<TId>[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assignments: { id: TId; lane: number }[] = [];
    for (const ev of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= ev.startMinutes);
      if (laneIdx === -1) {
        laneIdx = laneEnds.length;
        laneEnds.push(ev.endMinutes);
      } else {
        laneEnds[laneIdx] = ev.endMinutes;
      }
      assignments.push({ id: ev.id, lane: laneIdx });
    }
    const lanesCount = laneEnds.length;
    for (const a of assignments) {
      result.push({ id: a.id, lane: a.lane, lanesCount });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.startMinutes >= clusterEnd) {
      flush();
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMinutes);
  }
  flush();
  return result;
};

/**
 * Seven Date objects for a calendar week, starting on the given day (0=Sun, 1=Mon).
 * Useful for rendering the weekly view header.
 */
export const weekDaysFrom = (date: Date, weekStartsOn: 0 | 1): Date[] => {
  const start = startOfWeek(date, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** Snap a free-form minute value to the nearest slot boundary (down). */
export const snapToSlot = (minutes: number, slotInterval: number): number => {
  if (slotInterval <= 0) return minutes;
  return Math.floor(minutes / slotInterval) * slotInterval;
};
