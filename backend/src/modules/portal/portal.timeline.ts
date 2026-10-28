/**
 * Calendar arithmetic for the traveller portal.
 *
 * Trip dates are stored as instants at the workspace-local midnight (see the
 * project's date convention in lib/utils on the frontend). Day N of a trip is
 * therefore `startDate + (N - 1)` calendar days, and "today" must be compared in
 * the trip's own calendar — not the viewer's and not UTC — otherwise a traveller
 * in Auckland would see tomorrow's activity at 6am while the group is still asleep
 * in Kathmandu.
 */

export const DAY_MS = 86_400_000;

/** Whole calendar days between two instants, rounded to the nearest day. */
export function calendarDayIndex(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** Calendar date of day N of the trip (1-based), as an ISO string. */
export function dayDate(startDate: Date, dayNumber: number): string {
  return new Date(startDate.getTime() + (dayNumber - 1) * DAY_MS).toISOString();
}

/**
 * The day number that "now" falls on, clamped to the trip's range, or null when
 * the trip has not started or has already ended.
 */
export function currentDayNumber(
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): number | null {
  const offset = calendarDayIndex(startDate, now);
  if (offset < 0) return null;
  const total = Math.max(1, calendarDayIndex(startDate, endDate) + 1);
  if (offset >= total) return null;
  return offset + 1;
}

/** Days until departure (1 = tomorrow); null once the trip has started. */
export function daysUntilStart(
  startDate: Date,
  now: Date = new Date(),
): number | null {
  const offset = calendarDayIndex(now, startDate);
  return offset > 0 ? offset : null;
}

/**
 * The traveller's "up next" day:
 *  - the first day that is in progress, delayed or has a problem, else
 *  - the first day that is still pending, else
 *  - null when everything is finished.
 *
 * Deliberately status-driven rather than date-driven: the office can mark a day
 * in progress early or hold a day pending, and the portal must agree with them.
 */
export function nextRelevantDay<
  T extends { dayNumber: number; status: string },
>(days: T[]): T | null {
  const ordered = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const live = ordered.find(
    (day) =>
      day.status === "IN_PROGRESS" ||
      day.status === "DELAYED" ||
      day.status === "PROBLEM",
  );
  if (live) return live;
  return ordered.find((day) => day.status === "PENDING") ?? null;
}
