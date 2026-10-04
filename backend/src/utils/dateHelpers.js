// Date Helpers Utility
// Provides timezone-aware start-of-day and start-of-week calculations
// as well as duration formatting.

/**
 * Returns a UTC Date object representing 00:00:00.000 in the specified timeZone
 * for the given reference date (defaults to now).
 * 
 * Completely host-independent; calculates exact UTC instant corresponding to local midnight.
 * 
 * @param {Date} [referenceDate=new Date()]
 * @param {string} [timeZone='UTC']
 * @returns {Date}
 */
function getLocalStartOfDay(referenceDate = new Date(), timeZone = 'UTC') {
  try {
    const validTz = (timeZone && typeof timeZone === 'string') ? timeZone.trim() : 'UTC';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: validTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = formatter.format(referenceDate).split('-').map(Number);
    const guessUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

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
    const fallback = new Date(referenceDate);
    fallback.setUTCHours(0, 0, 0, 0);
    return fallback;
  }
}

/**
 * Returns a UTC Date object representing Monday 00:00:00.000 in the specified timeZone
 * for the current week containing the reference date.
 * 
 * @param {Date} [referenceDate=new Date()]
 * @param {string} [timeZone='UTC']
 * @returns {Date}
 */
function getLocalStartOfWeek(referenceDate = new Date(), timeZone = 'UTC') {
  try {
    const validTz = (timeZone && typeof timeZone === 'string') ? timeZone.trim() : 'UTC';
    const startOfDay = getLocalStartOfDay(referenceDate, validTz);

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      weekday: 'short',
    });
    const dayStr = dayFormatter.format(referenceDate); // 'Sun', 'Mon', 'Tue', etc.
    const daysMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const daysSinceMonday = daysMap[dayStr] ?? 0;

    return new Date(startOfDay.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  } catch (err) {
    const fallback = new Date(referenceDate);
    fallback.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = fallback.getUTCDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    fallback.setUTCDate(fallback.getUTCDate() - diff);
    return fallback;
  }
}

/**
 * Formats a duration in seconds into a clean human-readable string (e.g. '2h 35m', '45m', '0m')
 * 
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (sec === 0) return '0m';

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '< 1m';
}

module.exports = {
  getLocalStartOfDay,
  getLocalStartOfWeek,
  formatDuration,
};
