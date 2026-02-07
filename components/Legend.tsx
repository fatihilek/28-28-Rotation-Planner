import React from 'react';
import { DayType } from '../types';

interface LegendProps {
  selectedTool: DayType | 'AUTO';
  onSelectTool: (tool: DayType | 'AUTO') => void;
}

const Legend: React.FC<LegendProps> = ({ selectedTool, onSelectTool }) => {
  
  const items = [
    { type: 'AUTO', label: 'Pointer (Cycle Work/Off/Travel)', color: 'bg-white border-2 border-gray-300' },
    { type: DayType.WORK, label: 'Work', color: 'bg-green-500 text-white' },
    { type: DayType.OFF, label: 'Off', color: 'bg-orange-400 text-black' },
    { type: DayType.TRAVEL, label: 'Travel', color: 'bg-yellow-300 text-black' },
    { type: DayType.HOLIDAY, label: 'Holiday', color: 'bg-red-600 text-white' },
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 no-print">
      <span className="text-sm font-semibold self-center text-gray-600 mr-2">Select Tool:</span>
      {items.map((item) => (
        <button
          key={item.type}
          onClick={() => onSelectTool(item.type as DayType | 'AUTO')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selectedTool === item.type 
              ? 'ring-2 ring-offset-1 ring-blue-500 scale-105 shadow-md' 
              : 'hover:bg-gray-100 opacity-90 hover:opacity-100'
          }`}
        >
          <div className={`w-4 h-4 rounded-full ${item.color} border border-gray-300`}></div>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Legend;