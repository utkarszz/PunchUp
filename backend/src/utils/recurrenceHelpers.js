/**
 * Recurrence Scheduling and Timezone Helpers
 *
 * Implements robust, host-independent calculations for recurring tasks:
 * - Local date string formatting (YYYY-MM-DD) for any IANA timezone.
 * - Accurate UTC timestamp resolution for local clock times (e.g. 07:00 AM).
 * - Automatic daylight-saving time (DST) transition handling.
 * - Next run calculation with idempotency consideration.
 */

/**
 * Returns the local date string "YYYY-MM-DD" for a given reference date and IANA timezone.
 *
 * @param {Date} [referenceDate=new Date()]
 * @param {string} [timeZone='UTC']
 * @returns {string} e.g. "2026-10-12"
 */
function getLocalDateString(referenceDate = new Date(), timeZone = 'UTC') {
  try {
    const validTz = (timeZone && typeof timeZone === 'string') ? timeZone.trim() : 'UTC';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: validTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(referenceDate);
  } catch (err) {
    return new Date(referenceDate).toISOString().split('T')[0];
  }
}

/**
 * Parses "HH:mm" time string into hours and minutes integers.
 *
 * @param {string} timeStr - "HH:mm" format (e.g., "07:00")
 * @returns {{ hours: number, minutes: number }}
 */
function parseTime(timeStr = '07:00') {
  const parts = String(timeStr).split(':');
  const hours = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 7));
  const minutes = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  return { hours, minutes };
}

/**
 * Computes the exact UTC Date object corresponding to a given local calendar date
 * and local time in the specified timezone.
 *
 * Fully accounts for DST transitions and timezone offsets.
 *
 * @param {number} year
 * @param {number} month - 1-12
 * @param {number} day - 1-31
 * @param {number} hours - 0-23
 * @param {number} minutes - 0-59
 * @param {string} [timeZone='UTC']
 * @returns {Date}
 */
function getUtcInstantForLocalDateTime(yearOrDateStr, monthOrTimeStr, dayOrTz, hours, minutes, timeZone = 'UTC') {
  let year, month, day, h, m, tz;

  if (typeof yearOrDateStr === 'string' && yearOrDateStr.includes('-')) {
    // Overload: (dateStr, timeStr, timeZone)
    const [y, mo, d] = yearOrDateStr.split('-').map(Number);
    year = y;
    month = mo;
    day = d;
    const parsed = parseTime(monthOrTimeStr || '07:00');
    h = parsed.hours;
    m = parsed.minutes;
    tz = dayOrTz || 'UTC';
  } else {
    year = Number(yearOrDateStr);
    month = Number(monthOrTimeStr);
    day = Number(dayOrTz);
    h = Number(hours);
    m = Number(minutes);
    tz = timeZone || 'UTC';
  }

  try {
    const validTz = (tz && typeof tz === 'string') ? tz.trim() : 'UTC';
    const guessUtc = Date.UTC(year, month - 1, day, h, m, 0, 0);

    const partsFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = partsFormatter.formatToParts(new Date(guessUtc));
    const getVal = (type) => Number(parts.find((p) => p.type === type)?.value || 0);

    const tzYear = getVal('year');
    const tzMonth = getVal('month');
    const tzDay = getVal('day');
    let tzHour = getVal('hour');
    if (tzHour === 24) tzHour = 0;
    const tzMin = getVal('minute');
    const tzSec = getVal('second');

    const tzTimeAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec, 0);
    const offsetMs = tzTimeAsUtc - guessUtc;
    return new Date(guessUtc - offsetMs);
  } catch (err) {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  }
}

/**
 * Calculates the next UTC instant when a daily recurring task is due to run.
 *
 * Rules:
 * - If today's scheduled time in the user's timezone has not passed yet, run today.
 * - If today's scheduled time has passed, but a task for today was NOT yet generated,
 *   run immediately (or now) if within start/end window.
 * - If today's task was already generated for today's local date, schedule for tomorrow at creationTime.
 *
 * @param {string} creationTime - "HH:mm" (e.g. "07:00")
 * @param {string} timeZone - IANA timezone (e.g. "Asia/Kolkata", "America/New_York")
 * @param {Date} [referenceDate=new Date()]
 * @param {string|null} [lastGeneratedDate=null] - Local date string "YYYY-MM-DD"
 * @returns {Date}
 */
function computeNextRunAt(creationTime = '07:00', timeZone = 'UTC', referenceDate = new Date(), lastGeneratedDate = null) {
  const now = new Date(referenceDate);
  const validTz = (timeZone && typeof timeZone === 'string') ? timeZone.trim() : 'UTC';
  const { hours, minutes } = parseTime(creationTime);

  const localDateStr = getLocalDateString(now, validTz);
  const [year, month, day] = localDateStr.split('-').map(Number);

  // UTC instant for today's creation time
  const todayRunUtc = getUtcInstantForLocalDateTime(year, month, day, hours, minutes, validTz);

  // If today's task was not yet generated:
  if (lastGeneratedDate !== localDateStr) {
    if (now.getTime() < todayRunUtc.getTime()) {
      return todayRunUtc;
    }
    // Creation time has arrived or passed today, and task has not run yet -> run immediately
    return now;
  }

  // Today's task was already generated -> compute tomorrow's creation time
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = getLocalDateString(tomorrow, validTz);
  const [tomYear, tomMonth, tomDay] = tomorrowDateStr.split('-').map(Number);

  return getUtcInstantForLocalDateTime(tomYear, tomMonth, tomDay, hours, minutes, validTz);
}

module.exports = {
  getLocalDateString,
  parseTime,
  getUtcInstantForLocalDateTime,
  computeNextRunAt,
};
