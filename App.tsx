import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DayType, MONTH_NAMES, Country } from './types';
import { generateCalendarData, getDatesInRange } from './utils/plannerLogic';
import { fetchCountries, fetchHolidays } from './utils/holidays';
import Legend from './components/Legend';

// Icons
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);
const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const App: React.FC = () => {
  // --- State ---
  const [year, setYear] = useState<number>(2026);
  const [rotationStartDate, setRotationStartDate] = useState<string>('2025-12-01');
  const [overrides, setOverrides] = useState<Record<string, DayType>>({});
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

  // Data State
  const [countries, setCountries] = useState<Country[]>([]);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    fetchCountries().then(data => {
      setCountries(data);
    });
  }, []);

  // --- Load/Save State from URL Hash ---
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = JSON.parse(decodeURIComponent(hash));
        if (decoded.year) setYear(decoded.year);
        if (decoded.rotationStartDate) setRotationStartDate(decoded.rotationStartDate);
        if (decoded.overrides) setOverrides(decoded.overrides);
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
    setIsLoadingHolidays(true);
    fetchHolidays(year, countryCode).then(data => {
      setHolidays(data);
      setIsLoadingHolidays(false);
    });
  }, [year, countryCode]);

  // --- Global Mouse Up for Selection End ---
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        // If mouse release happens outside a cell, we just stop selecting.
        setIsSelecting(false);
        // Note: We don't clear the selection here to avoid flickering if the user
        // releases the mouse just outside a cell. The selection remains visible
        // but no popup appears (unless they released ON a cell).
        // To clear the "stuck" selection, they can click anywhere else (handled by backdrop or reset).
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);


  const updateUrlHash = () => {
    const state = { year, rotationStartDate, overrides, countryCode, shiftStart, shiftEnd };
    const encoded = encodeURIComponent(JSON.stringify(state));
    window.location.hash = encoded;
    
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // --- Calculation ---
  const { months, yearStats } = useMemo(() => 
    generateCalendarData(year, rotationStartDate, overrides, holidays), 
    [year, rotationStartDate, overrides, holidays]
  );

  const selectedDatesSet = useMemo(() => {
    if (!selectionStart || !selectionEnd) return new Set<string>();
    return new Set(getDatesInRange(selectionStart, selectionEnd));
  }, [selectionStart, selectionEnd]);

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
  const handleMouseDown = (dateStr: string) => {
    setIsSelecting(true);
    setSelectionStart(dateStr);
    setSelectionEnd(dateStr);
    setPopupPosition(null); // Hide popup if starting new selection
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isSelecting) {
      setSelectionEnd(dateStr);
    }
  };

  const handleMouseUp = (e: React.MouseEvent, dateStr: string) => {
    if (isSelecting) {
      setIsSelecting(false);
      
      // Determine if it was a single click or a range
      // If start != end, it is a range selection -> Show Popup
      if (selectionStart && selectionStart !== dateStr) {
        setPopupPosition({ x: e.clientX, y: e.clientY });
      } else {
        // Single click -> Toggle logic will handle it via onClick
        setPopupPosition(null);
        // Clear selection range immediately for single clicks to avoid residual highlight
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    }
  };

  const handleBulkApply = (type: DayType | 'CLEAR') => {
    if (!selectionStart || !selectionEnd) return;

    const dates = getDatesInRange(selectionStart, selectionEnd);
    const newOverrides = { ...overrides };

    dates.forEach(date => {
      if (type === 'CLEAR') {
        delete newOverrides[date];
      } else {
        newOverrides[date] = type;
      }
    });

    setOverrides(newOverrides);
    setPopupPosition(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleClearSelection = () => {
    setPopupPosition(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Single Click Fallback (only if not using the bulk selection popup effectively)
  // We can keep this for when the user just clicks quickly without dragging much
  const handleCellClick = (dateStr: string, currentType: DayType, isOverride: boolean) => {
    // If popup is open, don't trigger cell click logic, just close popup?
    if (popupPosition) {
        // This usually won't be hit because backdrop catches clicks
        handleClearSelection();
        return;
    }

    if (selectedTool === 'AUTO') {
      if (isOverride) {
        if (currentType === DayType.WORK) {
          setOverrides({ ...overrides, [dateStr]: DayType.OFF });
        } else if (currentType === DayType.OFF) {
          setOverrides({ ...overrides, [dateStr]: DayType.TRAVEL });
        } else if (currentType === DayType.TRAVEL) {
          const newOverrides = { ...overrides };
          delete newOverrides[dateStr];
          setOverrides(newOverrides);
        } else {
          const newOverrides = { ...overrides };
          delete newOverrides[dateStr];
          setOverrides(newOverrides);
        }
      } else {
        if (currentType === DayType.WORK) {
          setOverrides({ ...overrides, [dateStr]: DayType.OFF });
        } else {
          setOverrides({ ...overrides, [dateStr]: DayType.WORK });
        }
      }
    } else {
      if (overrides[dateStr] === selectedTool) {
        const newOverrides = { ...overrides };
        delete newOverrides[dateStr];
        setOverrides(newOverrides);
      } else {
        setOverrides({ ...overrides, [dateStr]: selectedTool });
      }
    }
  };

  const handleClearYear = () => {
    if (Object.keys(overrides).length === 0) {
      alert("No overrides to clear.");
      return;
    }
    if (window.confirm(`Are you sure you want to clear all manual overrides for the entire year?`)) {
      setOverrides({});
    }
  };

  const getColorClass = (type: DayType) => {
    switch (type) {
      case DayType.WORK: return 'bg-orange-400 text-black';
      case DayType.OFF: return 'bg-green-500 text-white';
      case DayType.TRAVEL: return 'bg-yellow-300 text-black';
      case DayType.HOLIDAY: return 'bg-red-600 text-white font-bold';
      case DayType.EMPTY: return 'bg-white text-gray-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans print-layout relative">
      
      {/* Header & Controls */}
      <div className="mb-8 no-print">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Rotation Planner (28/28)</h1>
        <p className="text-gray-500 mb-6">Plan your work, off, and travel days. Drag to select multiple days.</p>

        <div className="flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          
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
                  value={year} 
                  onChange={(e) => setYear(Number(e.target.value))} 
                  className="block w-24 bg-white text-black border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                />
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
                  className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                  title="Remove all manual overrides"
                >
                  <TrashIcon /> Clear Overrides
                </button>
              </div>
            </div>

            <div className="flex gap-2 w-full lg:w-auto justify-end">
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
                  {copyFeedback ? (
                    <span>Copied!</span>
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
                                <div className="absolute top-1/2 -left-4 -translate-y-1/2 text-xl" title="Start">🏢</div>
                                <div className="absolute top-1/2 -right-4 -translate-y-1/2 text-xl" title="Freedom">🏖️</div>

                                {/* Moving Turtle */}
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
                                    
                                    {/* Avatar (flipped to face right) */}
                                    <div 
                                        className="text-2xl filter drop-shadow-md cursor-pointer hover:scale-x-[-1.1] hover:scale-y-110 transition-transform"
                                        style={{ transform: 'scaleX(-1)' }}
                                    >
                                        🐢
                                    </div>
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

      {/* Main Grid */}
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-300 select-none">
        <div className="min-w-[1000px]">
          {/* Header Row */}
          <div className="grid grid-cols-[120px_repeat(31,_1fr)_80px_200px] border-b border-gray-300 bg-gray-100 font-bold text-sm text-center">
            <div className="p-2 text-left sticky left-0 bg-gray-100 z-10 border-r">Month</div>
            {Array.from({ length: 31 }, (_, i) => (
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
              <div key={mIndex} className="grid grid-cols-[120px_repeat(31,_1fr)_80px_200px] border-b border-gray-200 text-sm h-12">
                {/* Month Name */}
                <div className="p-2 font-medium text-gray-700 flex items-center sticky left-0 bg-white z-10 border-r border-gray-300 text-sm">
                  {MONTH_NAMES[mIndex]}
                </div>

                {/* Days */}
                {Array.from({ length: 31 }, (_, i) => {
                  const dayData = monthDays[i];
                  if (!dayData) return <div key={i} className="bg-gray-50 border-r border-gray-100" />;

                  const isSelected = selectedDatesSet.has(dayData.date);
                  const dayName = new Date(year, mIndex, i + 1).toLocaleDateString('en-US', { weekday: 'long' });

                  return (
                    <div
                      key={dayData.date}
                      onMouseDown={(e) => {
                          if (e.button === 0) { // Left click only
                             handleMouseDown(dayData.date);
                          }
                      }}
                      onMouseEnter={() => handleMouseEnter(dayData.date)}
                      onMouseUp={(e) => handleMouseUp(e, dayData.date)}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        // Only trigger simple click if not dragging a range
                        if (selectedDatesSet.size <= 1) {
                            handleCellClick(dayData.date, dayData.type, dayData.isOverride);
                        }
                      }}
                      title={`${dayData.date} (${dayName}) - ${dayData.type} ${dayData.holidayName ? `(${dayData.holidayName})` : ''}`}
                      className={`
                        relative w-full h-full border-r border-gray-200 flex items-center justify-center 
                        text-xs font-medium cursor-pointer transition-colors duration-75
                        ${getColorClass(dayData.type)}
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
           <div className="grid grid-cols-[120px_repeat(31,_1fr)_80px_200px] bg-gray-100 font-bold border-t-2 border-gray-300">
            <div className="p-3 text-left sticky left-0 bg-gray-100 z-10 border-r">Total</div>
            <div className="col-span-31 flex items-center justify-end px-4 text-xs text-gray-500 font-normal">
              Based on {year} calendar for {countries.find(c => c.key === countryCode)?.value || countryCode}
            </div>
            <div className="p-3 flex items-center justify-center text-lg text-blue-800 bg-blue-50 border-l border-r border-gray-300">
              {yearStats.work}
            </div>
            <div className="p-3 bg-gray-100"></div>
          </div>
        </div>
      </div>

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
                    Set {selectedDatesSet.size} days to:
                </div>
                <button 
                    onClick={() => handleBulkApply(DayType.WORK)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-orange-400 border border-gray-300"></div>
                    <span>Work</span>
                </button>
                <button 
                    onClick={() => handleBulkApply(DayType.OFF)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-gray-300"></div>
                    <span>Off</span>
                </button>
                <button 
                    onClick={() => handleBulkApply(DayType.TRAVEL)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-yellow-300 border border-gray-300"></div>
                    <span>Travel</span>
                </button>
                <button 
                    onClick={() => handleBulkApply(DayType.EMPTY)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded text-left w-full"
                >
                    <div className="w-3 h-3 rounded-full bg-white border border-gray-300 shadow-sm"></div>
                    <span>Clear</span>
                </button>
                <div className="h-px bg-gray-200 my-1"></div>
                <button 
                    onClick={() => handleBulkApply('CLEAR')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded text-left w-full"
                >
                    <TrashIcon />
                    <span>Reset</span>
                </button>
            </div>
        </>
      )}
      
      {/* Footer Info */}
      <div className="mt-8 text-xs text-gray-400 text-center no-print">
         <p>Click "Share" to generate a unique link with your current configuration.</p>
         <p className="mt-1">Public holiday data provided by nager.at</p>
      </div>

    </div>
  );
};

export default App;