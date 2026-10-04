function asDate(value) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function dayKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function weekday(date, timeZone) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[name];
}

function minutesOfDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  return hour * 60 + minute;
}

function atMinutes(day, minutes, timeZone) {
  const [year, month, date] = day.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const utcGuess = new Date(Date.UTC(year, month - 1, date, hour + 3, minute));
  const actual = minutesOfDay(utcGuess, timeZone);
  return new Date(utcGuess.getTime() + (minutes - actual) * 60000);
}

function isOpen(date, calendar, holidays) {
  const day = dayKey(date, calendar.timezone);
  if (holidays.has(day)) return false;
  if (!calendar.workDays.includes(weekday(date, calendar.timezone))) return false;
  const minute = minutesOfDay(date, calendar.timezone);
  return minute >= calendar.startMinute && minute < calendar.endMinute;
}

function addBusinessMinutes(start, amount, calendar, holidays) {
  let cursor = asDate(start);
  let left = amount;
  let guard = 0;
  while (left > 0 && guard < 200000) {
    guard += 1;
    if (!isOpen(cursor, calendar, holidays)) {
      cursor = new Date(cursor.getTime() + 60000);
      continue;
    }
    const minute = minutesOfDay(cursor, calendar.timezone);
    const room = calendar.endMinute - minute;
    const step = Math.min(left, room);
    cursor = new Date(cursor.getTime() + step * 60000);
    left -= step;
  }
  return cursor;
}

function overlapMinutes(start, end, pauses, calendar, holidays) {
  let total = 0;
  let cursor = asDate(start);
  const finish = asDate(end);
  let guard = 0;
  while (cursor < finish && guard < 200000) {
    guard += 1;
    if (!isOpen(cursor, calendar, holidays)) {
      cursor = new Date(cursor.getTime() + 60000);
      continue;
    }
    const paused = pauses.some((pause) => cursor >= asDate(pause.startedAt) && cursor < asDate(pause.endedAt || finish));
    if (!paused) total += 1;
    cursor = new Date(cursor.getTime() + 60000);
  }
  return total;
}

function calendarFromRow(row) {
  const [startHour, startMinute] = String(row.work_start).slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = String(row.work_end).slice(0, 5).split(":").map(Number);
  return {
    timezone: row.timezone,
    workDays: row.work_days,
    startMinute: startHour * 60 + startMinute,
    endMinute: endHour * 60 + endMinute
  };
}

module.exports = { addBusinessMinutes, overlapMinutes, calendarFromRow, dayKey, atMinutes };
