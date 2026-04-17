import { describe, it, expect } from "vitest";
import {
  eventGeometry,
  formatMinutesToHHMM,
  generateTimeSlots,
  groupOverlaps,
  MIN_EVENT_HEIGHT_PX,
  parseTimeToMinutes,
  snapToSlot,
  weekDaysFrom,
} from "./calendarUtils";

describe("parseTimeToMinutes", () => {
  it("parses HH:MM correctly", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("09:30")).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("returns null for invalid input", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("12:60")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
    expect(parseTimeToMinutes("12-30")).toBeNull();
  });

  it("accepts single-digit hour (H:MM)", () => {
    expect(parseTimeToMinutes("9:05")).toBe(9 * 60 + 5);
  });
});

describe("formatMinutesToHHMM", () => {
  it("formats minutes back to HH:MM with zero-padding", () => {
    expect(formatMinutesToHHMM(0)).toBe("00:00");
    expect(formatMinutesToHHMM(9 * 60 + 5)).toBe("09:05");
    expect(formatMinutesToHHMM(23 * 60 + 59)).toBe("23:59");
  });

  it("clamps out-of-range values", () => {
    expect(formatMinutesToHHMM(-10)).toBe("00:00");
    expect(formatMinutesToHHMM(24 * 60 + 5)).toBe("23:59");
  });
});

describe("generateTimeSlots", () => {
  it("generates boundaries respecting slotInterval", () => {
    const slots = generateTimeSlots(8, 10, 30);
    expect(slots).toEqual([8 * 60, 8 * 60 + 30, 9 * 60, 9 * 60 + 30]);
  });

  it("returns [] when range is empty or invalid", () => {
    expect(generateTimeSlots(8, 8, 30)).toEqual([]);
    expect(generateTimeSlots(10, 8, 30)).toEqual([]);
    expect(generateTimeSlots(8, 10, 0)).toEqual([]);
  });
});

describe("eventGeometry", () => {
  const dims = { dayStartHour: 8, dayEndHour: 20, pxPerMinute: 1 };

  it("returns offset/height for events inside the window", () => {
    const g = eventGeometry(9 * 60, 10 * 60, dims);
    expect(g).toEqual({ topPx: 60, heightPx: 60 });
  });

  it("clamps events that start before dayStartHour", () => {
    const g = eventGeometry(7 * 60, 9 * 60, dims);
    expect(g).toEqual({ topPx: 0, heightPx: 60 });
  });

  it("clamps events that end after dayEndHour", () => {
    const g = eventGeometry(19 * 60, 22 * 60, dims);
    expect(g).toEqual({ topPx: 11 * 60, heightPx: 60 });
  });

  it("returns null for events entirely outside the window", () => {
    expect(eventGeometry(6 * 60, 7 * 60, dims)).toBeNull();
    expect(eventGeometry(21 * 60, 22 * 60, dims)).toBeNull();
    expect(eventGeometry(10 * 60, 10 * 60, dims)).toBeNull();
    expect(eventGeometry(11 * 60, 10 * 60, dims)).toBeNull();
  });

  it("enforces a minimum visual height for very short events", () => {
    const g = eventGeometry(9 * 60, 9 * 60 + 5, dims);
    expect(g?.heightPx).toBe(MIN_EVENT_HEIGHT_PX);
  });
});

describe("groupOverlaps", () => {
  it("puts non-overlapping events in a single lane", () => {
    const result = groupOverlaps([
      { id: "a", startMinutes: 540, endMinutes: 600 },
      { id: "b", startMinutes: 600, endMinutes: 660 },
    ]);
    expect(result).toEqual([
      { id: "a", lane: 0, lanesCount: 1 },
      { id: "b", lane: 0, lanesCount: 1 },
    ]);
  });

  it("spreads overlapping events across lanes", () => {
    const result = groupOverlaps([
      { id: "a", startMinutes: 540, endMinutes: 660 },
      { id: "b", startMinutes: 570, endMinutes: 630 },
      { id: "c", startMinutes: 600, endMinutes: 720 },
    ]);
    const by = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(by.a.lanesCount).toBe(3);
    expect(by.b.lanesCount).toBe(3);
    expect(by.c.lanesCount).toBe(3);
    const lanes = new Set([by.a.lane, by.b.lane, by.c.lane]);
    expect(lanes.size).toBe(3);
  });

  it("splits into distinct clusters when a gap separates events", () => {
    const result = groupOverlaps([
      { id: "a", startMinutes: 540, endMinutes: 600 },
      { id: "b", startMinutes: 570, endMinutes: 600 },
      { id: "c", startMinutes: 700, endMinutes: 720 },
    ]);
    const by = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(by.a.lanesCount).toBe(2);
    expect(by.b.lanesCount).toBe(2);
    expect(by.c.lanesCount).toBe(1);
  });

  it("returns [] for empty input", () => {
    expect(groupOverlaps([])).toEqual([]);
  });
});

describe("weekDaysFrom", () => {
  it("returns 7 days starting on Sunday when weekStartsOn=0", () => {
    const days = weekDaysFrom(new Date("2026-04-15T12:00:00"), 0);
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(0);
    expect(days[6].getDay()).toBe(6);
  });

  it("returns 7 days starting on Monday when weekStartsOn=1", () => {
    const days = weekDaysFrom(new Date("2026-04-15T12:00:00"), 1);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });
});

describe("snapToSlot", () => {
  it("snaps down to the nearest slot boundary", () => {
    expect(snapToSlot(542, 30)).toBe(540);
    expect(snapToSlot(540, 30)).toBe(540);
    expect(snapToSlot(0, 30)).toBe(0);
  });

  it("returns the value when slot interval is invalid", () => {
    expect(snapToSlot(123, 0)).toBe(123);
  });
});
