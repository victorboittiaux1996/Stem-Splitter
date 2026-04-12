/**
 * Anniversary-based billing period utilities.
 *
 * Instead of resetting on the 1st of each calendar month, usage resets on the
 * anniversary of the user's account creation (Free) or billing start (Pro/Studio).
 *
 * The period key is stored as "YYYY-MM-DD" in the usage.month column.
 */

/**
 * Given an anchor date (account creation or billing start) and the current time,
 * return the "YYYY-MM-DD" string for the start of the current billing period.
 *
 * Examples (anchor = 15th):
 *   now = Apr 20 → "2026-04-15"
 *   now = Apr 10 → "2026-03-15" (period started last month)
 *
 * Edge cases:
 *   anchor = 31st, month has 30 days → clamps to 30th
 *   anchor = 29th, February non-leap → clamps to 28th
 */
export function computePeriodKey(anchorDate: Date, now: Date = new Date()): string {
  const anchorDay = anchorDate.getDate(); // 1-31
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11

  const periodStart = periodStartInMonth(anchorDay, y, m);
  if (now >= periodStart) {
    return toDateString(periodStart);
  }

  // Period hasn't started yet this month — it started last month
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  return toDateString(periodStartInMonth(anchorDay, prevY, prevM));
}

/**
 * Returns the number of days until the next billing period reset.
 * Minimum 1 so the UI never shows "Resets in 0d".
 */
export function getDaysUntilPeriodEnd(anchorDate: Date, now: Date = new Date()): number {
  const anchorDay = anchorDate.getDate();
  const periodKey = computePeriodKey(anchorDate, now);
  const currentPeriodStart = new Date(periodKey + "T00:00:00");

  // Next period start = same anchor day, one month later
  const nextM = currentPeriodStart.getMonth() + 1;
  const nextY = nextM > 11 ? currentPeriodStart.getFullYear() + 1 : currentPeriodStart.getFullYear();
  const nextPeriodStart = periodStartInMonth(anchorDay, nextY, nextM % 12);

  return Math.max(1, Math.ceil((nextPeriodStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// --- helpers ---

function periodStartInMonth(anchorDay: number, year: number, month: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(anchorDay, daysInMonth);
  return new Date(year, month, day);
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
