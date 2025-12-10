import React from 'react';
import { ViewState } from '../../types';
import { Icons } from '../../icons';

export const MobileTabBar = ({ activeTab, onChange, onAdd, t }: { activeTab: ViewState, onChange: (v: ViewState) => void, onAdd: () => void, t: any }) => (
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1c1917] border-t border-stone-200 dark:border-stone-800 px-2 py-2 grid grid-cols-5 gap-1 z-40 pb-safe text-[10px] font-medium text-stone-400 transition-colors">
    <button onClick={() => onChange('dashboard')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'dashboard' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Home />
      <span className="scale-90">{t.dashboard}</span>
    </button>
    <button onClick={() => onChange('calendar')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'calendar' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Calendar />
      <span className="scale-90">{t.history}</span>
    </button>
    
    <div className="flex items-center justify-center -mt-1">
      <button onClick={onAdd} className="w-10 h-10 bg-[#5C4033] text-white rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-[#4a332a]">
         <Icons.Plus />
      </button>
    </div>

    <button onClick={() => onChange('inventory')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'inventory' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Bean />
      <span className="scale-90">{t.inventory}</span>
    </button>
    <button onClick={() => onChange('settings')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'settings' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Settings />
      <span className="scale-90">{t.settings}</span>
    </button>
  </div>
);