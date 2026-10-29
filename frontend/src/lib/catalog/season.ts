// A product's yearly season: "MM-DD" start and end days (no year; an end before
// the start crosses the new year), or "available all year". Whether a product
// is in season *today* is always the server's isInSeason: these helpers only
// check what the admin types and build labels like "Apr – Jun".
// Safe for client and server code.

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const SHORT = MONTHS.map((m) => m.slice(0, 3));
// February has 29 so that 02-29 (allowed by the backend) can be picked.
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_DAY = /^(\d{2})-(\d{2})$/;

/** Month (1–12) and day of a valid "MM-DD", else null. */
export function parseMonthDay(value: string | null | undefined): { month: number; day: number } | null {
  const m = MONTH_DAY.exec(value ?? "");
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN[month - 1] ? { month, day } : null;
}

export const daysInMonth = (month: number) => DAYS_IN[month - 1] ?? 31;

/** "04-01" from 4 and 1 (zero padded, as the backend wants). */
export const toMonthDay = (month: number, day: number) => `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export type SeasonErrors = Partial<Record<"seasonStart" | "seasonEnd" | "seasonComplete", string>>;

/** The same checks as the backend: real MM-DD days, and both or neither. */
export function seasonErrors(start: string, end: string): SeasonErrors {
  const errors: SeasonErrors = {};
  if (start && !parseMonthDay(start)) errors.seasonStart = "Enter a day as MM-DD, for example 11-01";
  if (end && !parseMonthDay(end)) errors.seasonEnd = "Enter a day as MM-DD, for example 11-01";
  if (!!start !== !!end) errors.seasonComplete = start ? "Choose when the season ends too" : "Choose when the season starts too";
  return errors;
}

function dayLabel(md: { month: number; day: number }) {
  return `${md.day} ${SHORT[md.month - 1]}`;
}

/**
 * For people: "Apr – Jun" when the season runs from the first of a month to the
 * last of another, else with days ("15 Apr – 10 Jun", "24 Oct"); "Available all
 * year" when that's switched on; null when there's no season.
 */
export function seasonLabel(p: { seasonStart: string | null; seasonEnd: string | null; alwaysInSeason?: boolean }): string | null {
  if (p.alwaysInSeason) return "Available all year";
  const start = parseMonthDay(p.seasonStart);
  const end = parseMonthDay(p.seasonEnd);
  if (!start || !end) return null;
  if (start.month === end.month && start.day === end.day) return dayLabel(start);
  const wholeMonths = start.day === 1 && (end.day === daysInMonth(end.month) || (end.month === 2 && end.day === 28));
  if (wholeMonths) return start.month === end.month ? MONTHS[start.month - 1] : `${SHORT[start.month - 1]} – ${SHORT[end.month - 1]}`;
  return `${dayLabel(start)} – ${dayLabel(end)}`;
}

/** True when the season runs over 31 Dec into the next year (Nov – Feb). */
export function crossesNewYear(start: string, end: string): boolean {
  const s = parseMonthDay(start);
  const e = parseMonthDay(end);
  return !!s && !!e && (e.month < s.month || (e.month === s.month && e.day < s.day));
}
