import React, { useState } from 'react';
import { CoffeeLog, Language } from '../../types';
import { Icons } from '../../icons';
import { DICTIONARY } from '../../constants';

export const Calendar = ({ logs, selectedDate, onSelectDate, lang }: { logs: CoffeeLog[], selectedDate: Date | null, onSelectDate: (d: Date | null) => void, lang: Language }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const hasLog = (day: number) => {
    return logs.some(l => {
      const d = new Date(l.timestamp);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="bg-white dark:bg-[#292524] p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500"><Icons.ChevronLeft /></button>
        <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">
          {currentMonth.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long' })}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500"><Icons.ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-stone-400 font-medium text-center place-items-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="h-8 w-8 flex items-center justify-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-8 w-8" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const active = hasLog(day);
          const selected = isSelected(day);
          return (
            <button
              key={day}
              onClick={() => {
                const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                if (selected) onSelectDate(null);
                else onSelectDate(newDate);
              }}
              className={`h-8 w-8 rounded-full flex flex-col items-center justify-center text-xs relative transition-all mx-auto
                ${selected ? 'bg-[#5C4033] text-white shadow-md' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'}
                ${active && !selected ? 'font-bold' : ''}
              `}
            >
              {day}
              {active && !selected && <div className="w-1 h-1 bg-[#5C4033] rounded-full absolute bottom-1"></div>}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <div className="mt-3 text-center">
          <button onClick={() => onSelectDate(null)} className="text-xs text-[#5C4033] font-medium hover:underline">
            {DICTIONARY[lang].clearDate}
          </button>
        </div>
      )}
    </div>
  );
};