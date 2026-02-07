import { Country } from '../types';

const API_BASE = 'https://date.nager.at/api/v3';

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

export const fetchCountries = async (): Promise<Country[]> => {
  try {
    const res = await fetch(`${API_BASE}/AvailableCountries`);
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data = await res.json();
    
    // Map API response (countryCode, name) to App Interface (key, value)
    return data.map((c: any) => ({
      key: c.countryCode,
      value: c.name
    }));
  } catch (e) {
    console.warn("API Error fetching countries, using fallback.", e);
    return [{ key: 'TR', value: 'Turkey' }];
  }
};

export const fetchHolidays = async (year: number, countryCode: string): Promise<Record<string, string>> => {
  const map: Record<string, string> = {};

  try {
    const res = await fetch(`${API_BASE}/PublicHolidays/${year}/${countryCode}`);
    if (!res.ok) throw new Error('Failed to fetch holidays');
    
    const data: any[] = await res.json();
    data.forEach(h => {
      // Use localName or name
      map[h.date] = h.localName || h.name;
    });
    
    return map;
  } catch (e) {
    console.warn(`API Error fetching holidays for ${countryCode}, checking fallback.`, e);
    
    // Fallback for Turkey if API fails
    if (countryCode === 'TR') {
      return getTurkeyHolidaysLocal(year);
    }
    return {};
  }
};