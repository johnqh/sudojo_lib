/**
 * Calendar-date helpers for daily puzzles.
 *
 * A daily's `date` is a calendar date (`YYYY-MM-DD`), not an instant. The API's
 * `/dailies/today` picks the daily by the **UTC** date, so "today" for the
 * daily is the UTC date everywhere in the clients.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * The UTC calendar date of `date` (default: now) as `YYYY-MM-DD`, the date
 * the API's `/dailies/today` uses.
 */
export function getUtcDateString(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )}`;
}

/**
 * Normalize a daily date (`YYYY-MM-DD`, or an ISO timestamp starting with
 * one) to `YYYY-MM-DD`, without any timezone shift. Returns null when it does
 * not start with a valid date.
 */
export function normalizeDailyDate(
  value: string | null | undefined
): string | null {
  const match = value ? DATE_PATTERN.exec(value) : null;
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

/**
 * Format a daily's `YYYY-MM-DD` date for display as that LOCAL calendar date
 * (never shifted by the viewer's UTC offset, which `new Date('2026-10-05')`
 * would do west of UTC).
 *
 * @param yyyyMmDd - The daily's date
 * @param locale - BCP 47 locale (default: the runtime's)
 * @param options - Intl options (default: short weekday, short month, day,
 *   e.g. "Mon, Oct 5")
 * @returns The formatted date, or null for an invalid date
 */
export function formatDailyDate(
  yyyyMmDd: string | null | undefined,
  locale?: string | string[],
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
): string | null {
  const normalized = normalizeDailyDate(yyyyMmDd);
  if (!normalized) return null;
  const [y, m, d] = normalized.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(y, m - 1, d).toLocaleDateString(locale, options);
}

/**
 * Whether a saved daily game is from another day than today's daily
 * (UTC, like the API), so it should be cleared rather than resumed.
 * A missing date counts as stale.
 */
export function isStaleDaily(
  dailyDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  const normalized = normalizeDailyDate(dailyDate);
  return normalized === null || normalized !== getUtcDateString(now);
}
