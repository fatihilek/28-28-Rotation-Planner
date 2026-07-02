import { DayType, DayState } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseDateOnlyToUtcMs = (dateStr: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
};

const formatUtcDate = (utcMs: number): string => new Date(utcMs).toISOString().slice(0, 10);

export const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
  const startMs = parseDateOnlyToUtcMs(startDateStr);
  const endMs = parseDateOnlyToUtcMs(endDateStr);
  if (startMs === null || endMs === null) return [];

  const dates: string[] = [];

  // Ensure start is before end
  const startDate = Math.min(startMs, endMs);
  const endDate = Math.max(startMs, endMs);

  for (let current = startDate; current <= endDate; current += MS_PER_DAY) {
    dates.push(formatUtcDate(current));
  }

  return dates;
};

export const generateCalendarData = (
  year: number,
  rotationStartDateStr: string,
  overrides: Record<string, DayType>,
  holidays: Record<string, string>
): { months: DayState[][], yearStats: { work: number, off: number, travel: number, holidays: number } } => {
  const rotationStartMs = parseDateOnlyToUtcMs(rotationStartDateStr) ?? Date.UTC(year, 0, 1);
  
  const monthsData: DayState[][] = [];
  const yearStats = { work: 0, off: 0, travel: 0, holidays: 0 };

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDays: DayState[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDateMs = Date.UTC(year, month, day);
      
      // Determine basic rotation type
      // 28 days work, 28 days off = 56 day cycle
      const diffTime = currentDateMs - rotationStartMs;
      const diffDays = Math.floor(diffTime / MS_PER_DAY);
      
      let cycleDay = diffDays % 56;
      if (cycleDay < 0) cycleDay += 56;

      let computedType = DayType.OFF;
      if (cycleDay < 28) {
        computedType = DayType.WORK;
      }

      // Check Holiday
      const apiHolidayName = holidays[currentDateStr];
      let holidayName = apiHolidayName;
      let isHoliday = !!apiHolidayName;

      // Apply Override or Default
      let finalType: DayType = computedType;
      const isOverride = !!overrides[currentDateStr];

      if (isOverride) {
        finalType = overrides[currentDateStr];
        if (finalType === DayType.HOLIDAY) {
          isHoliday = true;
          holidayName = holidayName || 'Manual Holiday';
        }
      } else if (isHoliday) {
        finalType = DayType.HOLIDAY;
      }

      // Update stats
      if (finalType === DayType.WORK) yearStats.work++;
      if (finalType === DayType.OFF) yearStats.off++;
      if (finalType === DayType.TRAVEL) yearStats.travel++;
      if (finalType === DayType.HOLIDAY) yearStats.holidays++;

      monthDays.push({
        date: currentDateStr,
        isHoliday,
        holidayName,
        type: finalType,
        isOverride
      });
    }
    monthsData.push(monthDays);
  }

  return { months: monthsData, yearStats };
};
