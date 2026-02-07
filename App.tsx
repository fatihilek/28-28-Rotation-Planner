import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DayType, MONTH_NAMES, Country } from './types';
import { generateCalendarData } from './utils/plannerLogic';
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

const App: React.FC = () => {
  // --- State ---
  const [year, setYear] = useState<number>(2026);
  const [rotationStartDate, setRotationStartDate] = useState<string>('2025-12-01');
  const [overrides, setOverrides] = useState<Record<string, DayType>>({});
  const [selectedTool, setSelectedTool] = useState<DayType | 'AUTO'>('AUTO');
  const [countryCode, setCountryCode] = useState<string>('TR');
  
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

  const updateUrlHash = () => {
    const state = { year, rotationStartDate, overrides, countryCode };
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

  // --- Handlers ---
  const handleCellClick = (dateStr: string, currentType: DayType, isOverride: boolean) => {
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
    // Check if there are any overrides to clear
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
      case DayType.WORK: return 'bg-green-500 text-white';
      case DayType.OFF: return 'bg-orange-400 text-black';
      case DayType.TRAVEL: return 'bg-yellow-300 text-black';
      case DayType.HOLIDAY: return 'bg-red-600 text-white font-bold';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans print-layout">
      
      {/* Header & Controls */}
      <div className="mb-8 no-print">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Rotation Planner (28/28)</h1>
        <p className="text-gray-500 mb-6">Plan your work, off, and travel days. Holidays are loaded automatically.</p>

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
        </div>
      </div>

      {/* Tool Legend */}
      <div className="mb-6">
        <Legend selectedTool={selectedTool} onSelectTool={setSelectedTool} />
      </div>

      {/* Main Grid */}
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-300">
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

                  return (
                    <button
                      key={dayData.date}
                      type="button"
                      onClick={() => handleCellClick(dayData.date, dayData.type, dayData.isOverride)}
                      title={`${dayData.date} - ${dayData.type} ${dayData.holidayName ? `(${dayData.holidayName})` : ''}`}
                      className={`
                        relative w-full h-full border-r border-gray-200 flex items-center justify-center 
                        text-xs font-medium cursor-pointer transition-colors duration-75
                        ${getColorClass(dayData.type)}
                        ${dayData.isOverride ? 'ring-2 ring-inset ring-blue-500' : ''}
                      `}
                    >
                      {i + 1}
                      {dayData.isHoliday && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-300 rounded-full m-0.5"></span>}
                    </button>
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
      
      {/* Footer Info */}
      <div className="mt-8 text-xs text-gray-400 text-center no-print">
         <p>Click "Share" to generate a unique link with your current configuration.</p>
         <p className="mt-1">Public holiday data provided by nager.at</p>
      </div>

    </div>
  );
};

export default App;