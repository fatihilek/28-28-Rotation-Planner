import { DayType, DayState } from '../types';

export const generateCalendarData = (
  year: number,
  rotationStartDateStr: string,
  overrides: Record<string, DayType>,
  holidays: Record<string, string>
): { months: DayState[][], yearStats: { work: number, off: number, travel: number, holidays: number } } => {
  
  const rotationStartDate = new Date(rotationStartDateStr);
  
  const monthsData: DayState[][] = [];
  const yearStats = { work: 0, off: 0, travel: 0, holidays: 0 };

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDays: DayState[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDate = new Date(currentDateStr);
      
      // Determine basic rotation type
      // 28 days work, 28 days off = 56 day cycle
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffTime = currentDate.getTime() - rotationStartDate.getTime();
      const diffDays = Math.floor(diffTime / msPerDay);
      
      let cycleDay = diffDays % 56;
      if (cycleDay < 0) cycleDay += 56;

      let computedType = DayType.OFF;
      if (cycleDay < 28) {
        computedType = DayType.WORK;
      }

      // Check Holiday
      const holidayName = holidays[currentDateStr];
      const isHoliday = !!holidayName;

      // Apply Override or Default
      let finalType: DayType = computedType;
      const isOverride = !!overrides[currentDateStr];

      if (isOverride) {
        finalType = overrides[currentDateStr];
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
