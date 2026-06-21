export type MealType = "lunch" | "dinner";

export type WeekRange = {
  weekStart: string;
  weekEnd: string;
};

export function formatDateInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getWeekdayIndex(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

export function getMondayForDate(isoDate: string) {
  const weekday = getWeekdayIndex(isoDate);
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(isoDate, -daysSinceMonday);
}

export function getCurrentWeekRange(now: Date, timezone: string): WeekRange {
  const today = formatDateInTimeZone(now, timezone);
  const weekStart = getMondayForDate(today);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  };
}

export function getNextWeekRange(now: Date, timezone: string): WeekRange {
  const current = getCurrentWeekRange(now, timezone);
  const weekStart = addDays(current.weekStart, 7);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  };
}

export function getDatesInWeek(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getWeekSlots(weekStart: string) {
  return getDatesInWeek(weekStart).flatMap((date) => [
    { date, mealType: "lunch" as const },
    { date, mealType: "dinner" as const },
  ]);
}

export function isDateWithinRange(date: string, range: WeekRange) {
  return date >= range.weekStart && date <= range.weekEnd;
}
