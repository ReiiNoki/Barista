import React, { useRef, useState } from 'react';
import { AppSettings, Bean, CoffeeLog, ReviewMode } from '../../types';
import { Icons } from '../../icons';
import { DICTIONARY } from '../../constants';
import { Modal } from '../ui/Modal';

interface SettingsContentProps {
  logs: CoffeeLog[];
  setLogs: React.Dispatch<React.SetStateAction<CoffeeLog[]>>;
  beans: Bean[];
  setBeans: React.Dispatch<React.SetStateAction<Bean[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  customBrands: string[];
  setCustomBrands: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SettingsContent = ({ logs, setLogs, beans, setBeans, settings, setSettings, customBrands, setCustomBrands }: SettingsContentProps) => {
    const t = DICTIONARY[settings.language];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importSummary, setImportSummary] = useState<{
      newLogs: CoffeeLog[];
      newBeans: Bean[];
      newSettings?: Partial<AppSettings>;
      newBrands?: string[];
    } | null>(null);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!Array.isArray(json.logs) || !Array.isArray(json.beans)) {
            alert(t.invalidFile);
            return;
          }

          const newLogs = json.logs.filter((l: CoffeeLog) => !logs.some(cl => cl.id === l.id));
          const newBeans = json.beans.filter((b: Bean) => !beans.some(cb => cb.id === b.id));
          
          // Check if there is anything to import
          if (newLogs.length === 0 && newBeans.length === 0 && !json.customBrands) {
             alert("No new data found to import.");
             return;
          }

          setImportSummary({
            newLogs,
            newBeans,
            newSettings: json.settings,
            newBrands: json.customBrands
          });
        } catch (err) {
          alert(t.invalidFile);
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
    };

    const confirmImport = () => {
      if (!importSummary) return;
      
      const { newLogs, newBeans, newSettings, newBrands } = importSummary;
      
      if (newLogs.length > 0) setLogs(prev => [...prev, ...newLogs]);
      if (newBeans.length > 0) setBeans(prev => [...prev, ...newBeans]);
      if (newSettings) setSettings(prev => ({...prev, ...newSettings}));
      if (newBrands && Array.isArray(newBrands)) {
        setCustomBrands(prev => Array.from(new Set([...prev, ...newBrands])));
      }
      
      setImportSummary(null);
    };

    return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* General Settings */}
      <div className="bg-white dark:bg-[#292524] p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 space-y-4">
        <h3 className="font-bold text-[#3E2723] dark:text-stone-200 mb-4 flex items-center gap-2"><Icons.Settings /> {t.general}</h3>
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">Language</label>
          <div className="flex gap-2">{(['en', 'zh', 'ja'] as const).map(lang => <button key={lang} onClick={() => setSettings(s => ({ ...s, language: lang }))} className={`flex-1 py-2 rounded-lg border text-sm transition-all ${settings.language === lang ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c] font-bold' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>{lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '日本語'}</button>)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.appearance}</label>
           <div className="flex gap-2">
             <button onClick={() => setSettings(s => ({...s, theme: 'light'}))} className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${settings.theme === 'light' ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}><Icons.Sun /> Light</button>
             <button onClick={() => setSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 ${settings.theme === 'dark' ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}><Icons.Moon /> Dark</button>
             <button onClick={() => setSettings(s => ({...s, theme: 'system'}))} className={`flex-1 py-2 rounded-lg border text-sm ${settings.theme === 'system' ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>{t.system}</button>
           </div>
        </div>
        <div>
           <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.defaultReviewMode}</label>
           <select value={settings.defaultReviewMode} onChange={e => setSettings(s => ({ ...s, defaultReviewMode: e.target.value as ReviewMode }))} className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[#3E2723] dark:text-stone-200 text-sm">
             <option value="casual">{t.casual}</option>
             <option value="barista">{t.barista}</option>
             <option value="expert">{t.expert}</option>
           </select>
        </div>
      </div>

      {/* Health Settings */}
      <div className="bg-white dark:bg-[#292524] p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 space-y-4">
        <h3 className="font-bold text-[#3E2723] dark:text-stone-200 mb-4 flex items-center gap-2">❤️ {t.health}</h3>
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.halfLife} ({t.hours})</label>
          <input type="range" min="3" max="10" step="0.5" value={settings.caffeineHalfLife} onChange={e => setSettings(s => ({ ...s, caffeineHalfLife: Number(e.target.value) }))} className="w-full accent-[#5C4033]" />
          <div className="flex justify-between text-xs text-stone-400 mt-1"><span>3h</span><span className="text-[#5C4033] dark:text-[#a68b7c] font-bold">{settings.caffeineHalfLife}h</span><span>10h</span></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.dailyLimit} ({t.mg})</label>
          <input type="number" value={settings.dailyLimit} onChange={e => setSettings(s => ({ ...s, dailyLimit: Number(e.target.value) }))} className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" />
        </div>
      </div>

      {/* Brewing Settings */}
      <div className="bg-white dark:bg-[#292524] p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 space-y-4">
        <h3 className="font-bold text-[#3E2723] dark:text-stone-200 mb-4 flex items-center gap-2">☕ {t.brewing}</h3>
        <div>
           <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.brewRatio} (1:x)</label>
           <input type="number" value={settings.brewRatio} onChange={e => setSettings(s => ({ ...s, brewRatio: Number(e.target.value) }))} className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" />
        </div>
        <div>
           <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.tempUnit}</label>
           <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
             <button onClick={() => setSettings(s => ({...s, tempUnit: 'c'}))} className={`flex-1 py-1 rounded text-sm ${settings.tempUnit === 'c' ? 'bg-white dark:bg-stone-600 shadow-sm' : 'text-stone-500'}`}>°C</button>
             <button onClick={() => setSettings(s => ({...s, tempUnit: 'f'}))} className={`flex-1 py-1 rounded text-sm ${settings.tempUnit === 'f' ? 'bg-white dark:bg-stone-600 shadow-sm' : 'text-stone-500'}`}>°F</button>
           </div>
        </div>
      </div>

      {/* Data Settings */}
      <div className="bg-white dark:bg-[#292524] p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 space-y-4">
         <h3 className="font-bold text-[#3E2723] dark:text-stone-200 mb-4 flex items-center gap-2">💾 {t.data}</h3>
         <div className="flex gap-4">
            <button onClick={() => {
                const data = { logs, beans, settings, customBrands, exportDate: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `coffee_data_${Date.now()}.json`; a.click();
              }} className="flex-1 flex items-center justify-center gap-2 py-3 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <Icons.Download />
              {t.exportData}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <Icons.Upload />
              {t.importData}
            </button>
         </div>
      </div>
    </div>
    
    {importSummary && (
        <Modal title={t.importData} onClose={() => setImportSummary(null)}>
            <div className="space-y-6">
                <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-xl border border-stone-100 dark:border-stone-700">
                   <p className="text-stone-800 dark:text-stone-200 font-medium whitespace-pre-wrap leading-relaxed">
                       {t.importConfirm
                           .replace('{logs}', String(importSummary.newLogs.length))
                           .replace('{beans}', String(importSummary.newBeans.length))
                       }
                   </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setImportSummary(null)} 
                        className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl active:scale-95 transition-transform"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        onClick={confirmImport} 
                        className="flex-1 py-3 bg-[#5C4033] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        {t.save}
                    </button>
                </div>
            </div>
        </Modal>
    )}
    </>
    );
};