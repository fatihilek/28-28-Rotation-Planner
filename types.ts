export enum DayType {
  WORK = 'WORK',
  OFF = 'OFF',
  TRAVEL = 'TRAVEL',
  HOLIDAY = 'HOLIDAY',
  EMPTY = 'EMPTY',
}

export interface DayState {
  date: string; // YYYY-MM-DD
  isHoliday: boolean;
  holidayName?: string;
  type: DayType;
  isOverride: boolean;
}

export interface AppState {
  year: number;
  rotationStartDate: string; // YYYY-MM-DD
  overrides: Record<string, DayType>; // Date -> Type
  countryCode: string;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface Country {
  key: string;
  value: string;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];