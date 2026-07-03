import React, { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { DayType, MONTH_NAMES, Country, DayState } from './types';
import { generateCalendarData, getDatesInRange } from './utils/plannerLogic';
import { fetchCountries, fetchHolidays } from './utils/holidays';
import Legend from './components/Legend';

// Icons
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);
const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a8 8 0 0 0-8-8H3"/></svg>
);
const RedoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a8 8 0 0 1 8-8h10"/></svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 5a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19 8c.36 0 .7.13.96.36.26.24.4.57.4.92v.72a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"></path>
  </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MAX_OVERRIDE_HISTORY = 150;
const DAY_CELL_COUNT = 31;
const CALENDAR_GRID_COLUMNS = 'grid-cols-[120px_repeat(31,_1fr)_80px_200px]';
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LONG_PRESS_DELAY_MS = 320;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HAPTICS_STORAGE_KEY = 'rotationPlanner:haptics';
const MOBILE_VIEW_STORAGE_KEY = 'rotationPlanner:forceMobile';
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

const getInitialForceMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MOBILE_VIEW_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const getInitialHapticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
};

const normalizeYear = (value: unknown): number | null => {
  const parsed =
    typeof value === 'string'
      ? Number(value)
      : typeof value === 'number'
        ? value
        : NaN;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < MIN_YEAR || parsed > MAX_YEAR) return null;
  return parsed;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const getColorClass = (type: DayType): string => {
  switch (type) {
    case DayType.WORK:
      return 'bg-orange-400 text-black';
    case DayType.OFF:
      return 'bg-green-500 text-white';
    case DayType.TRAVEL:
      return 'bg-yellow-300 text-black';
    case DayType.HOLIDAY:
      return 'bg-red-600 text-white font-bold';
    case DayType.EMPTY:
      return 'bg-white text-gray-800';
    default:
      return 'bg-gray-100';
  }
};

const applyOverride = (
  currentOverrides: Record<string, DayType>,
  dateStr: string,
  nextType: DayType | null
): Record<string, DayType> => {
  if (nextType === null) {
    if (!(dateStr in currentOverrides)) return currentOverrides;
    const { [dateStr]: _removed, ...nextOverrides } = currentOverrides;
    return nextOverrides;
  }

  if (currentOverrides[dateStr] === nextType) return currentOverrides;
  return { ...currentOverrides, [dateStr]: nextType };
};

const areOverridesEqual = (
  left: Record<string, DayType>,
  right: Record<string, DayType>
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};

type OverridesHistoryState = {
  past: Record<string, DayType>[];
  present: Record<string, DayType>;
  future: Record<string, DayType>[];
};

type OverridesHistoryAction =
  | { type: 'apply'; updater: (current: Record<string, DayType>) => Record<string, DayType> }
  | { type: 'set'; next: Record<string, DayType> }
  | { type: 'undo' }
  | { type: 'redo' };

const overridesHistoryReducer = (
  state: OverridesHistoryState,
  action: OverridesHistoryAction
): OverridesHistoryState => {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const [previous, ...restPast] = state.past;
    return {
      past: restPast,
      present: previous,
      future: [state.present, ...state.future].slice(0, MAX_OVERRIDE_HISTORY)
    };
  }

  if (action.type === 'redo') {
    if (state.future.length === 0) return state;
    const [next, ...restFuture] = state.future;
    return {
      past: [state.present, ...state.past].slice(0, MAX_OVERRIDE_HISTORY),
      present: next,
      future: restFuture
    };
  }

  if (action.type === 'set') {
    if (areOverridesEqual(state.present, action.next)) return state;
    return { past: [], present: action.next, future: [] };
  }

  const next = action.updater(state.present);
  if (next === state.present || areOverridesEqual(state.present, next)) return state;
  return {
    past: [state.present, ...state.past].slice(0, MAX_OVERRIDE_HISTORY),
    present: next,
    future: []
  };
};

const parseDateToUtcMs = (dateStr: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return Date.UTC(year, month - 1, day);
};

const getCycleDay = (dateStr: string, rotationStartMs: number): number => {
  const dayMs = parseDateToUtcMs(dateStr);
  if (dayMs === null) return 0;
  const diffDays = Math.floor((dayMs - rotationStartMs) / MS_PER_DAY);
  let cycleDay = diffDays % 56;
  if (cycleDay < 0) cycleDay += 56;
  return cycleDay;
};

const buildMonthGrid = (
  year: number,
  monthIndex: number,
  monthDays: DayState[]
): Array<DayState | null> => {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const slots: Array<DayState | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    slots.push(null);
  }

  monthDays.forEach((day) => slots.push(day));

  while (slots.length % 7 !== 0) {
    slots.push(null);
  }

  return slots;
};

const getNextAutoOverrideType = (
  currentType: DayType,
  isOverride: boolean
): DayType | null => {
  if (!isOverride) {
    return currentType === DayType.WORK ? DayType.OFF : DayType.WORK;
  }

  if (currentType === DayType.WORK) return DayType.OFF;
  if (currentType === DayType.OFF) return DayType.TRAVEL;
  return null;
};

const App: React.FC = () => {
  // --- State ---
  const [year, setYear] = useState<number>(2026);
  const [yearInput, setYearInput] = useState<string>('2026');
  const [rotationStartDate, setRotationStartDate] = useState<string>('2025-12-01');
  const [overridesHistory, dispatchOverrides] = useReducer(overridesHistoryReducer, {
    past: [],
    present: {},
    future: []
  });
  const [selectedTool, setSelectedTool] = useState<DayType | 'AUTO'>('AUTO');
  const [countryCode, setCountryCode] = useState<string>('TR');
  
  // Current Shift State
  const [shiftStart, setShiftStart] = useState<string>('');
  const [shiftEnd, setShiftEnd] = useState<string>('');

  // Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{x: number, y: number} | null>(null);
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    const now = new Date();
    return year === now.getFullYear() ? now.getMonth() : 0;
  });
  const [rangeMode, setRangeMode] = useState(false);
  const [showRangeHint, setShowRangeHint] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(getInitialHapticsEnabled);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forceMobileView, setForceMobileView] = useState<boolean>(getInitialForceMobile);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1024 : window.innerWidth
  );
  const [holidayFetchError, setHolidayFetchError] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator === 'undefined' ? false : !navigator.onLine
  );

  // Data State
  const [countries, setCountries] = useState<Country[]>([]);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const overrides = overridesHistory.present;
  const overrideCount = Object.keys(overrides).length;
  const canUndo = overridesHistory.past.length > 0;
  const canRedo = overridesHistory.future.length > 0;
  const isYearInputValid = normalizeYear(yearInput) !== null;
  const longPressTimeoutRef = useRef<number | null>(null);
  const rangeHintTimeoutRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    fetchCountries().then(data => {
      setCountries(data);
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(HAPTICS_STORAGE_KEY, String(hapticsEnabled));
    } catch {
      // no-op
    }
  }, [hapticsEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MOBILE_VIEW_STORAGE_KEY, String(forceMobileView));
    } catch {
      // no-op
    }
  }, [forceMobileView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Load/Save State from URL Hash ---
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = JSON.parse(decodeURIComponent(hash));
        const decodedYear = normalizeYear(decoded.year);
        if (decodedYear !== null) {
          setYear(decodedYear);
          setYearInput(String(decodedYear));
        }
        if (decoded.rotationStartDate) setRotationStartDate(decoded.rotationStartDate);
        if (decoded.overrides && typeof decoded.overrides === 'object') {
          dispatchOverrides({ type: 'set', next: decoded.overrides as Record<string, DayType> });
        }
        if (decoded.countryCode) setCountryCode(decoded.countryCode);
        if (decoded.shiftStart) setShiftStart(decoded.shiftStart);
        if (decoded.shiftEnd) setShiftEnd(decoded.shiftEnd);
      } catch (e) {
        console.error("Failed to parse state from URL", e);
      }
    }
  }, []);

  // --- Fetch Holidays when Year or Country Changes ---
  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;

    setIsLoadingHolidays(true);
    setHolidayFetchError(false);

    fetchHolidays(year, countryCode, abortController.signal)
      .then(data => {
        if (!isCurrent) return;
        setHolidays(data);
        setHolidayFetchError(false);
      })
      .catch(error => {
        if (!isCurrent || isAbortError(error)) return;
        console.error('Failed to fetch holidays', error);
        setHolidays({});
        setHolidayFetchError(true);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingHolidays(false);
        }
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [year, countryCode]);

  // --- Global Pointer Up for Selection End ---
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      clearLongPress();
      if (isSelecting) {
        // If mouse release happens outside a cell, we just stop selecting.
        setIsSelecting(false);
        // Note: We don't clear the selection here to avoid flickering if the user
        // releases the mouse just outside a cell. The selection remains visible
        // but no popup appears (unless they released ON a cell).
        // To clear the "stuck" selection, they can click anywhere else (handled by backdrop or reset).
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isSelecting]);

  useEffect(() => {
    return () => {
      if (rangeHintTimeoutRef.current) {
        window.clearTimeout(rangeHintTimeoutRef.current);
        rangeHintTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!popupPosition && !isSettingsOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsSettingsOpen(false);
      handleClearSelection();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [popupPosition, isSettingsOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!isSelecting || pointerTypeRef.current !== 'touch') return;

    const handlePointerMove = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const cell = target?.closest('[data-date]') as HTMLElement | null;
      const dateStr = cell?.dataset.date;
      if (dateStr) {
        setSelectionEnd(dateStr);
      }
    };

    const handlePointerUp = () => {
      setIsSelecting(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isSelecting]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        dispatchOverrides({ type: event.shiftKey ? 'redo' : 'undo' });
        return;
      }

      if (key === 'y') {
        event.preventDefault();
        dispatchOverrides({ type: 'redo' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const updateUrlHash = () => {
    const state = { year, rotationStartDate, overrides, countryCode, shiftStart, shiftEnd };
    const encoded = encodeURIComponent(JSON.stringify(state));
    window.location.hash = encoded;
    
    const url = window.location.href;
    const resetFeedback = () => {
      window.setTimeout(() => setCopyFeedback('idle'), COPY_FEEDBACK_TIMEOUT_MS);
    };

    if (!navigator.clipboard?.writeText) {
      setCopyFeedback('failed');
      resetFeedback();
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyFeedback('copied');
        resetFeedback();
      })
      .catch(() => {
        setCopyFeedback('failed');
        resetFeedback();
      });
  };

  // --- Calculation ---
  const { months, yearStats } = useMemo(() => 
    generateCalendarData(year, rotationStartDate, overrides, holidays), 
    [year, rotationStartDate, overrides, holidays]
  );
  const totalTrackedDays = yearStats.work + yearStats.off + yearStats.travel + yearStats.holidays;
  const selectedCountryName = useMemo(
    () => countries.find((country) => country.key === countryCode)?.value || countryCode,
    [countries, countryCode]
  );
  const rotationStartMs = useMemo(
    () => parseDateToUtcMs(rotationStartDate) ?? Date.UTC(year, 0, 1),
    [rotationStartDate, year]
  );
  const gridTouchClass = isSelecting ? 'touch-none' : 'touch-pan-y';
  const activeMonthGrid = useMemo(
    () => buildMonthGrid(year, activeMonth, months[activeMonth] || []),
    [year, activeMonth, months]
  );
  const isMobileView = forceMobileView || viewportWidth < 768;

  const selectedDatesSet = useMemo(() => {
    if (!selectionStart || !selectionEnd) return new Set<string>();
    return new Set(getDatesInRange(selectionStart, selectionEnd));
  }, [selectionStart, selectionEnd]);

  useEffect(() => {
    if (activeMonth < 0 || activeMonth > 11) {
      setActiveMonth(0);
    }
  }, [activeMonth]);

  const shiftProgress = useMemo(() => {
    if (!shiftStart || !shiftEnd) return null;
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    const now = new Date();
    
    // Normalize timestamps to midnight to compare days properly
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (start > end) return { error: true };

    const totalDuration = end.getTime() - start.getTime();
    const totalDays = Math.round(totalDuration / (1000 * 60 * 60 * 24)) + 1;
    
    const elapsedDuration = today.getTime() - start.getTime();
    const elapsedDays = Math.round(elapsedDuration / (1000 * 60 * 60 * 24)); // 0 on start date

    let percentage = 0;
    let text = "";
    let subText = "";

    if (today < start) {
       percentage = 0;
       const daysToStart = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       text = `Starts in ${daysToStart} days`;
       subText = `${totalDays} days total`;
    } else if (today > end) {
       percentage = 100;
       text = "Shift Completed";
       subText = `${totalDays} days total`;
    } else {
       const currentDay = elapsedDays + 1;
       percentage = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));
       const remaining = totalDays - currentDay;
       text = `Day ${currentDay} of ${totalDays}`;
       subText = `${remaining} day${remaining !== 1 ? 's' : ''} remaining`;
    }

    return { percentage, text, subText, totalDays, error: false };
  }, [shiftStart, shiftEnd]);


  // --- Handlers ---
  
  // Selection Handlers
  const showRangeModeHint = () => {
    setShowRangeHint(true);
    if (rangeHintTimeoutRef.current) {
      window.clearTimeout(rangeHintTimeoutRef.current);
    }
    rangeHintTimeoutRef.current = window.setTimeout(() => {
      setShowRangeHint(false);
      rangeHintTimeoutRef.current = null;
    }, 1800);
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const beginRangeSelection = (dateStr: string) => {
    setIsSelecting(true);
    setSelectionStart(dateStr);
    setSelectionEnd(dateStr);
    setPopupPosition(null);
  };

  const handlePointerDown = (e: React.PointerEvent, dateStr: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerTypeRef.current = e.pointerType;
    suppressClickRef.current = false;

    if (e.pointerType === 'touch') {
      if (rangeMode) {
        suppressClickRef.current = true;
        beginRangeSelection(dateStr);
        showRangeModeHint();
        if (hapticsEnabled && navigator.vibrate) navigator.vibrate(10);
        return;
      }
      clearLongPress();
      longPressTimeoutRef.current = window.setTimeout(() => {
        suppressClickRef.current = true;
        beginRangeSelection(dateStr);
        showRangeModeHint();
        if (hapticsEnabled && navigator.vibrate) navigator.vibrate(10);
      }, LONG_PRESS_DELAY_MS);
      return;
    }

    beginRangeSelection(dateStr);
  };

  const handlePointerEnter = (dateStr: string) => {
    if (isSelecting && pointerTypeRef.current !== 'touch') {
      setSelectionEnd(dateStr);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, dateStr: string) => {
    clearLongPress();
    if (isSelecting) {
      setIsSelecting(false);
      
      // Determine if it was a single click or a range
      // If start != end, it is a range selection -> Show Popup
      if (selectionStart && selectionStart !== dateStr) {
        setPopupPosition({ x: e.clientX, y: e.clientY });
        suppressClickRef.current = true;
      } else {
        // Single click -> Toggle logic will handle it via onClick
        setPopupPosition(null);
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    }
  };

  const handleClearSelection = () => {
    setPopupPosition(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleBulkApply = (type: DayType | 'CLEAR') => {
    if (!selectionStart || !selectionEnd) return;

    const dates = getDatesInRange(selectionStart, selectionEnd);
    dispatchOverrides({ type: 'apply', updater: (currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      dates.forEach((date) => {
        if (type === 'CLEAR') {
          delete nextOverrides[date];
        } else {
          nextOverrides[date] = type;
        }
      });
      return nextOverrides;
    }});
    handleClearSelection();
  };

  const handleCellClick = (dateStr: string, currentType: DayType, isOverride: boolean) => {
    if (popupPosition) {
      handleClearSelection();
      return;
    }

    dispatchOverrides({ type: 'apply', updater: (currentOverrides) => {
      if (selectedTool === 'AUTO') {
        const nextType = getNextAutoOverrideType(currentType, isOverride);
        return applyOverride(currentOverrides, dateStr, nextType);
      }

      const nextType = currentOverrides[dateStr] === selectedTool ? null : selectedTool;
      return applyOverride(currentOverrides, dateStr, nextType);
    }});
  };

  const commitYearInput = () => {
    const normalized = normalizeYear(yearInput);
    if (normalized === null) {
      setYearInput(String(year));
      return;
    }
    setYear(normalized);
    setYearInput(String(normalized));
  };

  const handleClearYear = () => {
    if (overrideCount === 0) return;
    if (window.confirm(`Are you sure you want to clear all manual overrides for the entire year?`)) {
      dispatchOverrides({ type: 'apply', updater: () => ({}) });
    }
  };

  const handlePrevMonth = () => {
    setActiveMonth((prev) => (prev + 11) % 12);
  };

  const handleNextMonth = () => {
    setActiveMonth((prev) => (prev + 1) % 12);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 print-layout relative app-shell">
      
      {/* Header & Controls */}
      <div className="mb-8 no-print">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Rotation Planner (28/28)</h1>
        <p className="text-gray-500 mb-6">Plan your work, off, and travel days. Drag to select multiple days.</p>

        <div className="flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200 surface-panel">
          
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-end">
            <div className="flex flex-wrap gap-4 items-end w-full lg:w-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select 
                  value={countryCode} 
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="block w-48 bg-white text-black border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                >
                  {countries.length === 0 && (
                    <option value="TR" className="text-black bg-white">
                      Loading...
                    </option>
                  )}
                  {countries.map(c => (
                    <option key={c.key} value={c.key} className="text-black bg-white">
                      {c.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input 
                  type="number" 
                  value={yearInput}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setYearInput(nextValue);
                    const normalized = normalizeYear(nextValue);
                    if (normalized !== null) {
                      setYear(normalized);
                    }
                  }}
                  onBlur={commitYearInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitYearInput();
                      e.currentTarget.blur();
                    }
                  }}
                  aria-invalid={!isYearInputValid}
                  title={`Enter a year from ${MIN_YEAR} to ${MAX_YEAR}`}
                  className={`block w-24 bg-white text-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2 ${
                    isYearInputValid ? 'border-gray-300' : 'border-red-400 bg-red-50'
                  }`}
                />
                {!isYearInputValid && (
                  <div className="mt-1 text-[11px] text-red-600">
                    {MIN_YEAR}-{MAX_YEAR}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rotation Start Date</label>
                <input 
                  type="date" 
                  value={rotationStartDate} 
                  onChange={(e) => setRotationStartDate(e.target.value)} 
                  className="block w-40 bg-white text-black border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                />
              </div>

              <div className="mb-0.5">
                <button
                  type="button"
                  onClick={handleClearYear}
                  disabled={overrideCount === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-700 bg-red-50 enabled:hover:bg-red-100 rounded-md text-sm font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                  title={overrideCount === 0 ? 'No manual overrides to clear' : `Remove ${overrideCount} manual override${overrideCount === 1 ? '' : 's'}`}
                >
                  <TrashIcon /> Clear Overrides
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
               <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Settings"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold border border-gray-200 shadow-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  <SettingsIcon /> Settings
                </button>
               <button
                  type="button"
                  onClick={() => dispatchOverrides({ type: 'undo' })}
                  disabled={!canUndo}
                  title="Undo (Cmd/Ctrl+Z)"
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white enabled:hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <UndoIcon /> Undo
                </button>
                <button
                  type="button"
                  onClick={() => dispatchOverrides({ type: 'redo' })}
                  disabled={!canRedo}
                  title="Redo (Shift+Cmd/Ctrl+Z)"
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white enabled:hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RedoIcon /> Redo
                </button>
               <button 
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PrintIcon /> Print
                </button>
                <button 
                  type="button"
                  onClick={updateUrlHash}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {copyFeedback === 'copied' ? (
                    <span>Copied</span>
                  ) : copyFeedback === 'failed' ? (
                    <span>Copy failed</span>
                  ) : (
                    <>
                      <ShareIcon /> Share
                    </>
                  )}
                </button>
            </div>
          </div>
          
          {/* Current Shift Section */}
          <div className="border-t border-gray-200 pt-6 mt-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon />
                Current Shift Tracker
            </h2>
            <div className="flex flex-col md:flex-row gap-6 items-start">
                 <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={shiftStart} 
                          onChange={(e) => setShiftStart(e.target.value)} 
                          className="block w-40 bg-white text-black border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <input 
                          type="date" 
                          value={shiftEnd} 
                          onChange={(e) => setShiftEnd(e.target.value)} 
                          className="block w-40 bg-white text-black border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                        />
                    </div>
                 </div>
                 
                 <div className="flex-1 w-full bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {shiftProgress && !shiftProgress.error ? (
                        <div>
                             <div className="flex justify-between items-end mb-4">
                                <span className="text-sm font-bold text-gray-800">{shiftProgress.text}</span>
                                <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{shiftProgress.subText}</span>
                             </div>
                             
                             <div className="relative mx-3 mb-2">
                                {/* Track Line */}
                                <div className="h-3 bg-gray-200 rounded-full w-full shadow-inner"></div>
                                
                                {/* Progress Fill */}
                                <div 
                                    className="absolute top-0 left-0 h-3 bg-blue-400 rounded-full transition-all duration-1000 shadow-sm"
                                    style={{ width: `${shiftProgress.percentage}%` }}
                                ></div>

                                {/* Start/End Icons */}
                                <div className="absolute top-1/2 -left-4 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-blue-500 bg-white shadow-sm" title="Start"></div>
                                <div className="absolute top-1/2 -right-4 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-emerald-500 bg-white shadow-sm" title="End"></div>

                                {/* Current position marker */}
                                <div 
                                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10 flex flex-col items-center group"
                                    style={{ 
                                        left: `${shiftProgress.percentage}%`, 
                                        transform: 'translate(-50%, -50%)' 
                                    }}
                                >
                                    {/* Percentage Bubble */}
                                    <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                                        {Math.round(shiftProgress.percentage)}%
                                    </div>
                                    
                                    <div className="h-6 w-6 rounded-full border-4 border-white bg-blue-600 shadow-md"></div>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 italic py-2 text-center">
                            {shiftStart && shiftEnd && new Date(shiftStart) > new Date(shiftEnd) 
                                ? "Start date must be before end date" 
                                : "Select start and end dates to track progress"}
                        </div>
                    )}
                 </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tool Legend */}
      <div className="mb-6">
        <Legend selectedTool={selectedTool} onSelectTool={setSelectedTool} />
      </div>

      {/* Year Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 no-print">
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-orange-700 font-semibold">Work</div>
          <div className="text-2xl font-bold text-orange-900">{yearStats.work}</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-green-700 font-semibold">Off</div>
          <div className="text-2xl font-bold text-green-900">{yearStats.off}</div>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-yellow-700 font-semibold">Travel</div>
          <div className="text-2xl font-bold text-yellow-900">{yearStats.travel}</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-red-700 font-semibold">Holiday</div>
          <div className="text-2xl font-bold text-red-900">{yearStats.holidays}</div>
        </div>
      </div>
      {(holidayFetchError || isOffline) && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 no-print">
          {isOffline
            ? 'Offline: showing cached holidays when available.'
            : 'Calendarific is unreachable. Showing cached or fallback holidays.'}
        </div>
      )}
      <div className="mb-5 text-xs text-gray-500 no-print flex flex-wrap gap-x-4 gap-y-1">
        <span>Total tracked days: <span className="font-semibold text-gray-700">{totalTrackedDays}</span>.</span>
        <span>Weekend days are outlined in the grid.</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-cyan-700/40"></span>
          Rotation days 1-28
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-orange-700/40"></span>
          Rotation days 29-56
        </span>
      </div>

      {/* Mobile Month View */}
      {isMobileView && (
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-gray-700 text-sm shadow-sm hover:bg-gray-50"
          >
            Prev
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-gray-800">{MONTH_NAMES[activeMonth]} {year}</div>
            <div className="text-xs text-gray-500">Month view</div>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-gray-700 text-sm shadow-sm hover:bg-gray-50"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 px-3 py-2 rounded-md text-sm font-semibold border border-gray-200 shadow-sm bg-white text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2"><SettingsIcon /> Settings</span>
          </button>
          <div className="text-[11px] text-gray-500">
            {rangeMode ? 'Drag to select' : 'Long-press for range'}
          </div>
        </div>

        <div className="mb-3">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(Number(e.target.value))}
            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 shadow-sm"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>
        </div>

        <div className={`rounded-lg border border-gray-200 bg-white shadow-sm p-3 ${gridTouchClass}`}>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 mb-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {activeMonthGrid.map((dayData, index) => {
              if (!dayData) {
                return <div key={`empty-${index}`} className="h-10 rounded" />;
              }

              const dayDate = new Date(dayData.date);
              const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const cycleDay = getCycleDay(dayData.date, rotationStartMs);
              const isSelected = selectedDatesSet.has(dayData.date);
              const weekendClass = isWeekend ? 'ring-1 ring-inset ring-slate-500/30' : '';
              const cycleBandClass = cycleDay < 28 ? 'after:bg-cyan-700/35' : 'after:bg-orange-700/35';
              const cycleBoundaryClass =
                cycleDay === 0
                  ? 'before:bg-cyan-700/55'
                  : cycleDay === 28
                    ? 'before:bg-orange-700/55'
                    : 'before:bg-transparent';

              return (
                <div
                  key={dayData.date}
                  data-date={dayData.date}
                  onPointerDown={(e) => handlePointerDown(e, dayData.date)}
                  onPointerEnter={() => handlePointerEnter(dayData.date)}
                  onPointerUp={(e) => handlePointerUp(e, dayData.date)}
                  onPointerCancel={() => {
                    clearLongPress();
                    if (isSelecting) setIsSelecting(false);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    if (selectedDatesSet.size <= 1) {
                      handleCellClick(dayData.date, dayData.type, dayData.isOverride);
                    }
                  }}
                  title={`${dayData.date} (${dayName}) - ${dayData.type} ${dayData.holidayName ? `(${dayData.holidayName})` : ''}`}
                  className={`
                    relative h-10 rounded flex items-center justify-center text-xs font-semibold cursor-pointer
                    before:absolute before:left-0 before:top-0 before:h-full before:w-[2px]
                    after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full
                    ${getColorClass(dayData.type)}
                    ${weekendClass}
                    ${cycleBandClass}
                    ${cycleBoundaryClass}
                    ${isSelected ? 'ring-2 ring-inset ring-blue-600' : ''}
                  `}
                >
                  {dayDate.getDate()}
                  {dayData.isHoliday && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-300 rounded-full m-0.5"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Main Grid */}
      {!isMobileView && (
      <div className={`overflow-x-auto overflow-y-visible bg-white rounded-lg shadow border border-gray-300 select-none surface-panel ${gridTouchClass}`}>
        <div className="min-w-[1000px]">
          {/* Header Row */}
          <div className={`grid ${CALENDAR_GRID_COLUMNS} border-b border-gray-300 bg-gray-100 font-bold text-sm text-center sticky top-0 z-30`}>
            <div className="p-2 text-left sticky left-0 bg-gray-100 z-40 border-r">Month</div>
            {Array.from({ length: DAY_CELL_COUNT }, (_, i) => (
              <div key={i} className="p-2 border-r border-gray-200">{i + 1}</div>
            ))}
            <div className="p-2 text-xs leading-3 flex items-center justify-center bg-gray-200">Working Days</div>
            <div className="p-2 text-left px-4">Holidays / Notes</div>
          </div>

          {isLoadingHolidays && (
            <div className="p-4 text-center text-gray-500 bg-gray-50 border-b border-gray-200">
              Loading holidays...
            </div>
          )}

          {/* Month Rows */}
          {!isLoadingHolidays && months.map((monthDays, mIndex) => {
            const workCount = monthDays.filter(d => d.type === DayType.WORK).length;
            const holidaysInMonth = monthDays
              .filter(d => d.isHoliday)
              .map(d => `${d.date.split('-')[2]} ${d.holidayName}`)
              .join(', ');

            return (
              <div key={mIndex} className={`grid ${CALENDAR_GRID_COLUMNS} border-b border-gray-200 text-sm h-12`}>
                {/* Month Name */}
                <div className="p-2 font-medium text-gray-700 flex items-center sticky left-0 bg-white z-20 border-r border-gray-300 text-sm">
                  {MONTH_NAMES[mIndex]}
                </div>

                {/* Days */}
                {Array.from({ length: DAY_CELL_COUNT }, (_, i) => {
                  const dayData = monthDays[i];
                  if (!dayData) return <div key={i} className="bg-gray-50 border-r border-gray-100" />;

                  const isSelected = selectedDatesSet.has(dayData.date);
                  const dayDate = new Date(year, mIndex, i + 1);
                  const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const cycleDay = getCycleDay(dayData.date, rotationStartMs);
                  const weekendClass = isWeekend ? 'ring-1 ring-inset ring-slate-500/30' : '';
                  const weekendTextClass = isWeekend && dayData.type === DayType.EMPTY ? 'text-slate-600' : '';
                  const cycleBandClass = cycleDay < 28 ? 'after:bg-cyan-700/35' : 'after:bg-orange-700/35';
                  const cycleBoundaryClass =
                    cycleDay === 0
                      ? 'before:bg-cyan-700/55'
                      : cycleDay === 28
                        ? 'before:bg-orange-700/55'
                        : 'before:bg-transparent';

                  return (
                    <div
                      key={dayData.date}
                      data-date={dayData.date}
                      onPointerDown={(e) => handlePointerDown(e, dayData.date)}
                      onPointerEnter={() => handlePointerEnter(dayData.date)}
                      onPointerUp={(e) => handlePointerUp(e, dayData.date)}
                      onPointerCancel={() => {
                        clearLongPress();
                        if (isSelecting) setIsSelecting(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        // Only trigger simple click if not dragging a range
                        if (selectedDatesSet.size <= 1) {
                            handleCellClick(dayData.date, dayData.type, dayData.isOverride);
                        }
                      }}
                      title={`${dayData.date} (${dayName}) - ${dayData.type} ${dayData.holidayName ? `(${dayData.holidayName})` : ''}`}
                      className={`
                        relative w-full h-full border-r border-gray-200 flex items-center justify-center
                        text-xs font-medium cursor-pointer transition-colors duration-75
                        before:absolute before:left-0 before:top-0 before:h-full before:w-[2px]
                        after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full
                        ${getColorClass(dayData.type)}
                        ${weekendClass}
                        ${weekendTextClass}
                        ${cycleBandClass}
                        ${cycleBoundaryClass}
                        ${isSelected ? 'ring-4 ring-inset ring-blue-600 z-20' : ''}
                      `}
                    >
                      {i + 1}
                      {dayData.isHoliday && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-300 rounded-full m-0.5"></span>}
                    </div>
                  );
                })}

                {/* Stats & Notes */}
                <div className="p-2 flex items-center justify-center font-bold text-gray-800 bg-gray-50 border-r border-gray-200">
                  {workCount}
                </div>
                <div className="p-2 text-xs text-gray-600 flex items-center truncate px-3" title={holidaysInMonth}>
                  {holidaysInMonth}
                </div>
              </div>
            );
          })}

           {/* Total Row */}
           <div className={`grid ${CALENDAR_GRID_COLUMNS} bg-gray-100 font-bold border-t-2 border-gray-300 sticky bottom-0 z-20`}>
            <div className="p-3 text-left sticky left-0 bg-gray-100 z-30 border-r">Total</div>
            <div className="col-span-31 flex items-center justify-end px-4 text-xs text-gray-500 font-normal">
              Based on {year} calendar for {selectedCountryName}
            </div>
            <div className="p-3 flex items-center justify-center text-lg text-blue-800 bg-blue-50 border-l border-r border-gray-300">
              {yearStats.work}
            </div>
            <div className="p-3 bg-gray-100"></div>
          </div>
        </div>
      </div>
      )}

      {showRangeHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <div className="px-3 py-2 rounded-full bg-slate-900 text-white text-xs shadow-lg">
            Range select active. Drag to extend.
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30"></div>
          <div
            className="relative w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-800">Settings</div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Range mode</div>
                  <div className="text-xs text-gray-500">Drag to select on touch devices</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRangeMode((prev) => !prev)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border transition ${
                    rangeMode
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {rangeMode ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Haptic feedback</div>
                  <div className="text-xs text-gray-500">Vibrate on long-press</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHapticsEnabled((prev) => !prev)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border transition ${
                    hapticsEnabled
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {hapticsEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Mobile layout</div>
                  <div className="text-xs text-gray-500">Force mobile view on desktop</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForceMobileView((prev) => !prev)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border transition ${
                    forceMobileView
                      ? 'border-purple-200 bg-purple-50 text-purple-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {forceMobileView ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu for Bulk Selection */}
      {popupPosition && (
        <>
            {/* Backdrop to close popup on outside click */}
            <div 
                className="fixed inset-0 z-40" 
                onClick={handleClearSelection}
            ></div>
            
            <div 
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex flex-col gap-1 popup-menu animate-in fade-in zoom-in duration-200"
                style={{ 
                    left: Math.min(window.innerWidth - 120, popupPosition.x + 10), 
                    top: Math.min(window.innerHeight - 150, popupPosition.y + 10) 
                }}
            >
                <div className="text-xs font-semibold text-gray-500 px-2 pb-1 border-b mb-1">
                    Set {selectedDatesSet.size} {selectedDatesSet.size === 1 ? 'day' : 'days'} to:
                </div>
                <button 
                    type="button"
                    onClick={() => handleBulkApply(DayType.WORK)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-orange-400 border border-gray-300"></div>
                    <span>Work</span>
                </button>
                <button 
                    type="button"
                    onClick={() => handleBulkApply(DayType.OFF)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-gray-300"></div>
                    <span>Off</span>
                </button>
                <button 
                    type="button"
                    onClick={() => handleBulkApply(DayType.TRAVEL)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-yellow-300 border border-gray-300"></div>
                    <span>Travel</span>
                </button>
                <button 
                    type="button"
                    onClick={() => handleBulkApply('CLEAR')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded text-left w-full"
                >
                    <TrashIcon />
                    <span>Reset to schedule</span>
                </button>
            </div>
        </>
      )}
      
      {/* Footer Info */}
      <div className="mt-8 text-xs text-gray-400 text-center no-print">
         <p>Click "Share" to generate a unique link with your current configuration.</p>
         <p className="mt-1">Public holiday data provided by Calendarific</p>
      </div>

    </div>
  );
};

export default App;
