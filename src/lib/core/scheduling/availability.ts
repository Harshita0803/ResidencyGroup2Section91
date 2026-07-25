// Deterministic availability generation in the browser's local timezone.
// Working hours Mon–Fri, 9:00–17:00, with a 12:00–13:00 blackout (lunch).
// Slots must fit the full duration, exclude the past, and avoid conflicts
// with locally saved appointments for the same specialist.

import type { Appointment, TimeSlot } from "@/lib/types";

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const LUNCH_START = 12;
const LUNCH_END = 13;
const SLOT_STEP_MIN = 30;
const DAYS_AHEAD = 30;

export interface AvailableDay {
  /** local date key YYYY-MM-DD */
  dateKey: string;
  label: string; // e.g. "Mon, Jul 27"
  slotCount: number;
}

function pad(n: number): number | string {
  return n < 10 ? `0${n}` : n;
}

export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local ISO string without timezone conversion, e.g. 2026-07-27T09:30:00 */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

export function formatTimeLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m === 0 ? "00" : pad(m)} ${ampm}`;
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function longDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function conflicts(
  start: Date,
  durationMin: number,
  specialistId: string,
  existing: Appointment[]
): boolean {
  const end = start.getTime() + durationMin * 60000;
  for (const appt of existing) {
    if (appt.status !== "confirmed") continue;
    if (appt.specialistId !== specialistId) continue;
    const aStart = new Date(appt.startsAt).getTime();
    const aEnd = aStart + appt.durationMinutes * 60000;
    if (start.getTime() < aEnd && aStart < end) return true;
  }
  return false;
}

function slotsForDay(
  day: Date,
  durationMin: number,
  specialistId: string,
  existing: Appointment[],
  now: Date
): TimeSlot[] {
  const dow = day.getDay();
  if (dow === 0 || dow === 6) return []; // closed weekends
  const slots: TimeSlot[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MIN) {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
      const endMin = h * 60 + m + durationMin;
      // Must finish before closing.
      if (endMin > CLOSE_HOUR * 60) continue;
      // Must not overlap the lunch blackout.
      const startMin = h * 60 + m;
      if (startMin < LUNCH_END * 60 && endMin > LUNCH_START * 60) continue;
      // No past slots.
      if (start.getTime() <= now.getTime()) continue;
      if (conflicts(start, durationMin, specialistId, existing)) continue;
      slots.push({ startsAt: localIso(start), label: formatTimeLabel(start) });
    }
  }
  return slots;
}

export function availableDays(
  durationMin: number,
  specialistId: string,
  existing: Appointment[],
  now: Date = new Date()
): AvailableDay[] {
  const out: AvailableDay[] = [];
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const slots = slotsForDay(day, durationMin, specialistId, existing, now);
    if (slots.length > 0) {
      out.push({
        dateKey: dateKeyOf(day),
        label: formatDayLabel(day),
        slotCount: slots.length,
      });
    }
  }
  return out;
}

export function slotsForDate(
  dateKey: string,
  durationMin: number,
  specialistId: string,
  existing: Appointment[],
  now: Date = new Date()
): TimeSlot[] {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const day = new Date(y, mo - 1, d);
  return slotsForDay(day, durationMin, specialistId, existing, now);
}

/** Re-validate a chosen slot right before confirmation. */
export function isSlotStillValid(
  startsAt: string,
  durationMin: number,
  specialistId: string,
  existing: Appointment[],
  now: Date = new Date()
): boolean {
  const start = new Date(startsAt);
  if (start.getTime() <= now.getTime()) return false;
  const dateKey = dateKeyOf(start);
  return slotsForDate(dateKey, durationMin, specialistId, existing, now).some(
    (s) => s.startsAt === startsAt
  );
}
