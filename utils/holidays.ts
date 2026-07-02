import { Country } from '../types';

const API_BASE = 'https://calendarific.com/api/v2';
const API_KEY = import.meta.env.VITE_CALENDARIFIC_API_KEY as string | undefined;

// --- Local Fallback for Turkey (Preserved) ---
const getTurkeyHolidaysLocal = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {};
  const add = (month: number, day: number, name: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    holidays[dateStr] = name;
  };

  // Static
  add(1, 1, "New Year's Day");
  add(4, 23, "National Sovereignty and Children's Day");
  add(5, 1, "Labour and Solidarity Day");
  add(5, 19, "Commemoration of Atatürk, Youth and Sports Day");
  add(7, 15, "Democracy and National Unity Day");
  add(8, 30, "Victory Day");
  add(10, 29, "Republic Day");

  // Religious Estimates (Simplified for 2024-2027)
  if (year === 2024) {
    add(4, 10, "Ramadan Feast"); add(6, 16, "Sacrifice Feast");
  } else if (year === 2025) {
    add(3, 30, "Ramadan Feast"); add(6, 6, "Sacrifice Feast");
  } else if (year === 2026) {
    add(3, 20, "Ramadan Feast"); add(5, 27, "Sacrifice Feast");
  } else if (year === 2027) {
    add(3, 9, "Ramadan Feast"); add(5, 16, "Sacrifice Feast");
  }

  return holidays;
};

// --- API Functions ---

const getCalendarificUrl = (
  endpoint: 'countries' | 'holidays',
  params: Record<string, string>
): string => {
  const query = new URLSearchParams({
    api_key: API_KEY || '',
    ...params
  });
  return `${API_BASE}/${endpoint}?${query.toString()}`;
};

const ensureApiKey = (): void => {
  if (!API_KEY) {
    throw new Error('Missing VITE_CALENDARIFIC_API_KEY');
  }
};

type CalendarificCountriesResponse = {
  meta?: { code?: number };
  response?: {
    countries?: Array<{
      country_name?: string;
      ['iso-3166']?: string;
    }>;
  };
};

type CalendarificHolidaysResponse = {
  meta?: { code?: number };
  response?: {
    holidays?: Array<{
      name?: string;
      local_name?: string;
      date?: {
        iso?: string;
      };
    }>;
  };
};

export const fetchCountries = async (): Promise<Country[]> => {
  if (!API_KEY) {
    return [{ key: 'TR', value: 'Turkey' }];
  }

  try {
    const res = await fetch(getCalendarificUrl('countries', {}));
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data = (await res.json()) as CalendarificCountriesResponse;
    const countries = data.response?.countries || [];
    
    // Map API response (iso-3166, country_name) to App Interface (key, value)
    const mapped = countries
      .filter((country) => country['iso-3166'] && country.country_name)
      .map((country) => ({
        key: String(country['iso-3166']).toUpperCase(),
        value: String(country.country_name)
      }))
      .sort((left, right) => left.value.localeCompare(right.value));

    if (mapped.length === 0) {
      throw new Error('Calendarific countries payload is empty');
    }

    return mapped;
  } catch (e) {
    console.warn('Calendarific error fetching countries, using fallback.', e);
    return [{ key: 'TR', value: 'Turkey' }];
  }
};

export const fetchHolidays = async (
  year: number,
  countryCode: string,
  signal?: AbortSignal
): Promise<Record<string, string>> => {
  const map: Record<string, string> = {};

  if (!API_KEY) {
    return countryCode === 'TR' ? getTurkeyHolidaysLocal(year) : {};
  }

  try {
    const res = await fetch(
      getCalendarificUrl('holidays', {
        country: countryCode.toUpperCase(),
        year: String(year),
        type: 'national'
      }),
      { signal }
    );
    if (!res.ok) throw new Error('Failed to fetch holidays');
    
    const data = (await res.json()) as CalendarificHolidaysResponse;
    const holidays = data.response?.holidays || [];

    holidays.forEach((holiday) => {
      const isoDate = holiday.date?.iso;
      if (!isoDate) return;

      const dayKey = isoDate.slice(0, 10);
      map[dayKey] = holiday.local_name || holiday.name || 'Holiday';
    });
    
    return map;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e;
    }

    console.warn(`Calendarific error fetching holidays for ${countryCode}, checking fallback.`, e);
    
    // Fallback for Turkey if API fails
    if (countryCode === 'TR') {
      return getTurkeyHolidaysLocal(year);
    }
    return {};
  }
};
