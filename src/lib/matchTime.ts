// Scraped match times look like "19:00 UTC+7" — an explicit UTC offset lets us
// build a real Date and reproject it into any timezone, DST included. Some
// zones (e.g. Myanmar) use a half-hour offset like "UTC+6:30", so the offset
// minutes are optional and default to "00".
const TIME_WITH_OFFSET = /^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::(\d{2}))?$/;

export function toDate(date: string, time: string): Date | null {
  const match = TIME_WITH_OFFSET.exec(time.trim());
  if (!match) return null;

  const [, hour, minute, sign, offsetHour, offsetMinute = '00'] = match;
  const iso = `${date}T${hour.padStart(2, '0')}:${minute}:00${sign}${offsetHour.padStart(2, '0')}:${offsetMinute}`;

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant);
}

// en-CA formats as YYYY-MM-DD, matching the scraped `date` field, so callers
// can compare today's date (in a given zone) with match.date directly.
export function todayInZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
