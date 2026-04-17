import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  formatMinutesToHHMM,
  generateTimeSlots,
  snapToSlot,
} from "./calendarUtils";

export const DEFAULT_SLOT_HEIGHT_PX = 24;

export interface CalendarGridProps {
  slotInterval: number;
  dayStartHour: number;
  dayEndHour: number;
  slotHeightPx?: number;
  onSlotClick?: (slotMinutes: number) => void;
  children?: ReactNode;
  className?: string;
}

/**
 * Single-column vertical timeline. Renders the slot gridlines and forwards slot clicks
 * via `onSlotClick` (minutes since 00:00). Events are expected to be rendered as absolutely
 * positioned children (see CalendarEvent). Stack multiple CalendarGrids side-by-side to
 * build a weekly view.
 */
export const CalendarGrid = ({
  slotInterval,
  dayStartHour,
  dayEndHour,
  slotHeightPx = DEFAULT_SLOT_HEIGHT_PX,
  onSlotClick,
  children,
  className,
}: CalendarGridProps) => {
  const slots = useMemo(
    () => generateTimeSlots(dayStartHour, dayEndHour, slotInterval),
    [dayStartHour, dayEndHour, slotInterval],
  );
  const pxPerMinute = slotHeightPx / slotInterval;
  const dayStartMin = dayStartHour * 60;
  const totalHeight = (dayEndHour - dayStartHour) * 60 * pxPerMinute;

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    if (e.defaultPrevented) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minuteOffset = y / pxPerMinute;
    const absoluteMinutes = dayStartMin + minuteOffset;
    onSlotClick(snapToSlot(absoluteMinutes, slotInterval));
  };

  return (
    <div
      className={cn(
        "relative bg-background",
        onSlotClick && "cursor-pointer",
        className,
      )}
      style={{ height: totalHeight }}
      onClick={handleClick}
    >
      {slots.map((m) => (
        <div
          key={m}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t",
            m % 60 === 0 ? "border-border" : "border-border/40",
          )}
          style={{ top: (m - dayStartMin) * pxPerMinute }}
          aria-hidden
        />
      ))}
      {children}
    </div>
  );
};

export interface TimeAxisProps {
  slotInterval: number;
  dayStartHour: number;
  dayEndHour: number;
  slotHeightPx?: number;
  className?: string;
}

/** Left-rail of hour labels aligned with CalendarGrid. */
export const TimeAxis = ({
  slotInterval,
  dayStartHour,
  dayEndHour,
  slotHeightPx = DEFAULT_SLOT_HEIGHT_PX,
  className,
}: TimeAxisProps) => {
  const slots = useMemo(
    () => generateTimeSlots(dayStartHour, dayEndHour, slotInterval),
    [dayStartHour, dayEndHour, slotInterval],
  );
  const pxPerMinute = slotHeightPx / slotInterval;
  const dayStartMin = dayStartHour * 60;
  const totalHeight = (dayEndHour - dayStartHour) * 60 * pxPerMinute;

  return (
    <div
      className={cn("relative w-12 shrink-0", className)}
      style={{ height: totalHeight }}
      aria-hidden
    >
      {slots
        .filter((m) => m % 60 === 0)
        .map((m) => (
          <div
            key={m}
            className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
            style={{ top: (m - dayStartMin) * pxPerMinute }}
          >
            {formatMinutesToHHMM(m)}
          </div>
        ))}
    </div>
  );
};
