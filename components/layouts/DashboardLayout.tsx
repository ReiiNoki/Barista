import React from 'react';
import { CoffeeLog, Bean, AppSettings, ViewState } from '../../types';
import { DICTIONARY } from '../../constants';
import { Icons } from '../../icons';
import { calculateCurrentLevel, getTodayTotal, formatDate } from '../../utils';
import { Calendar } from '../ui/Calendar';
import { HistoryList } from '../features/HistoryList';
import { CaffeineChart } from '../features/CaffeineChart';

export const DashboardLayout = ({ logs, filteredLogs, beans, settings, onSelectDate, selectedDate, searchQuery, setSearchQuery, onReview, onDelete, activeView }: {
    logs: CoffeeLog[], filteredLogs: CoffeeLog[], beans: Bean[], settings: AppSettings, onSelectDate: (d: Date | null) => void, selectedDate: Date | null, searchQuery: string, setSearchQuery: (q: string) => void, onReview: (l: CoffeeLog) => void, onDelete: (id: string) => void, activeView: ViewState
}) => {
  const t = DICTIONARY[settings.language];
  const currentLevel = calculateCurrentLevel(logs, settings.caffeineHalfLife);
  const todayTotal = getTodayTotal(logs);

  return (
    <div className="h-full grid lg:grid-cols-[400px_1fr]">
        {/* Middle Column (Manager) - Desktop Only (Shows as Main on Mobile/Tablet if Tab=History) */}
        <div className={`flex-col h-full bg-[#FDFBF7] dark:bg-[#1c1917] border-r border-stone-200 dark:border-stone-800 overflow-hidden transition-colors ${activeView === 'dashboard' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
            <div className="relative shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                <Icons.Search />
              </div>
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#292524] text-[#3E2723] dark:text-stone-200 focus:ring-2 focus:ring-[#5C4033]/20 outline-none"
              />
            </div>
            
            <Calendar logs={logs} selectedDate={selectedDate} onSelectDate={onSelectDate} lang={settings.language} />
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-2 px-1 sticky top-0 bg-[#FDFBF7] dark:bg-[#1c1917] py-2 z-10">
                <h3 className="font-bold text-stone-700 dark:text-stone-300">{selectedDate ? formatDate(selectedDate.getTime(), settings.language) : t.allHistory}</h3>
                <span className="text-xs bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full">{filteredLogs.length}</span>
              </div>
              <HistoryList logs={filteredLogs} beans={beans} lang={settings.language} settings={settings} onReview={onReview} onDelete={onDelete} />
            </div>
          </div>
        </div>

        {/* Right Column (Dashboard) - Desktop Only (Shows as Main on Mobile/Tablet if Tab=Dashboard) */}
        <div className={`flex-col h-full overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6 bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors ${activeView === 'dashboard' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-white dark:bg-[#292524] p-8 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 text-center flex flex-col justify-center relative overflow-hidden group min-h-[250px] shrink-0 transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#5C4033] to-[#8c7a6b]"></div>
            <div className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">{t.currentLevel}</div>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-8xl font-black text-[#5C4033] dark:text-[#a68b7c] tracking-tighter">{currentLevel}</span>
              <span className="text-2xl font-bold text-stone-400">mg</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-stone-500 max-w-xs mx-auto w-full">
               <div className="flex justify-between w-full px-2 text-xs font-bold text-stone-400 uppercase tracking-wide">
                 <span>{t.todayTotal}</span>
                 <span>{Math.round((todayTotal / settings.dailyLimit) * 100)}%</span>
               </div>
               <div className="w-full bg-stone-100 dark:bg-stone-800 h-3 rounded-full overflow-hidden">
                 <div className="bg-[#5C4033] dark:bg-[#a68b7c] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((todayTotal / settings.dailyLimit) * 100, 100)}%` }}></div>
               </div>
               <div className="text-xs text-stone-400">{todayTotal} / {settings.dailyLimit} mg</div>
            </div>
            {currentLevel > settings.safeSleepThreshold * 2 && <div className="mt-6 inline-flex mx-auto items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-sm px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-800 font-medium animate-pulse">⚠️ {t.sleepWarning}</div>}
          </div>

          <div className="flex-1 min-h-[300px]">
             <CaffeineChart logs={logs} halfLife={settings.caffeineHalfLife} lang={settings.language} />
          </div>
        </div>
    </div>
  );
};