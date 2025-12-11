
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CoffeeType, ViewState,
  BeanReview, Bean, CoffeeLog, AppSettings
} from './types';
import {
  DEFAULT_SETTINGS, PRESET_BRAND_KEYS, DICTIONARY
} from './constants';
import { Icons } from './icons';
import { 
  generateId, getBrandName, calculateCurrentLevel, getTodayTotal 
} from './utils';

// Imported Components
import { Modal } from './components/ui/Modal';
import { MobileTabBar } from './components/features/MobileTabBar';
import { ReviewModalContent } from './components/features/ReviewModalContent';
import { InventoryView } from './components/features/InventoryView';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LogModalContent } from './components/features/LogModalContent';
import { SettingsContent } from './components/features/SettingsContent';

// --- 主应用组件 (Main App) ---

export default function App() {
  // State
  const [logs, setLogs] = useState<CoffeeLog[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<ViewState>('dashboard'); // View control
  const [showLogModal, setShowLogModal] = useState(false);
  const [reviewingLog, setReviewingLog] = useState<CoffeeLog | null>(null);
  
  // Manager State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Real-time ticker
  const [tick, setTick] = useState(0);

  // Load/Save Logic (Same as before)
  useEffect(() => {
    try {
      const loadedLogs = localStorage.getItem('coffee_logs');
      const loadedBeans = localStorage.getItem('coffee_beans');
      const loadedSettings = localStorage.getItem('coffee_settings');
      const loadedCustomBrands = localStorage.getItem('coffee_custom_brands');

      if (loadedLogs) setLogs(JSON.parse(loadedLogs) as CoffeeLog[]);
      if (loadedBeans) setBeans(JSON.parse(loadedBeans) as Bean[]);
      if (loadedSettings) {
        // Merge with defaults to handle new fields
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(loadedSettings) });
      }
      if (loadedCustomBrands) setCustomBrands(JSON.parse(loadedCustomBrands) as string[]);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => { if (isDataLoaded) localStorage.setItem('coffee_logs', JSON.stringify(logs)); }, [logs, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem('coffee_beans', JSON.stringify(beans)); }, [beans, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem('coffee_settings', JSON.stringify(settings)); }, [settings, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem('coffee_custom_brands', JSON.stringify(customBrands)); }, [customBrands, isDataLoaded]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Theme Application Effect
  useEffect(() => {
    const applyTheme = () => {
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };

    applyTheme(); // Apply immediately on change

    // If system, listen for changes
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  const t = DICTIONARY[settings.language];

  // Logic
  const handleAddLog = (logData: Omit<CoffeeLog, 'id'>) => {
    const newLog: CoffeeLog = { ...logData, id: generateId() };
    setLogs(prev => [newLog, ...prev]);

    // Inventory Deduction Logic
    if (newLog.type === 'homemade' && newLog.beanId && newLog.beanWeight) {
       setBeans((prevBeans: Bean[]) => prevBeans.map(bean => {
          if (bean.id === newLog.beanId) {
             const newWeight = Math.max(0, bean.weight - (newLog.beanWeight || 0));
             return { ...bean, weight: newWeight };
          }
          return bean;
       }));
    }

    setShowLogModal(false);
  };

  const handleSaveLogReview = (logId: string, review: BeanReview) => {
    setLogs((prev: CoffeeLog[]) => prev.map(l => l.id === logId ? { ...l, review } : l));
  };

  const handleDeleteLog = (id: string) => {
    // Restore inventory if it was a homemade log with a bean attached
    const logToDelete = logs.find(l => l.id === id);
    if (logToDelete && logToDelete.type === 'homemade' && logToDelete.beanId && logToDelete.beanWeight) {
      setBeans(prevBeans => prevBeans.map(bean => {
        if (bean.id === logToDelete.beanId) {
          return { ...bean, weight: bean.weight + (logToDelete.beanWeight || 0) };
        }
        return bean;
      }));
    }
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleAddBean = (beanData: Omit<Bean, 'id' | 'isActive'>) => {
    const newBean: Bean = { ...beanData, id: generateId(), isActive: true };
    setBeans(prev => [newBean, ...prev]);
  };

  const handleDeleteBean = (id: string) => {
    setBeans(prev => prev.filter(b => b.id !== id));
  };

  const toggleBeanStatus = (id: string) => {
    setBeans((prev: Bean[]) => prev.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };
  
  const handleSaveReview = (beanId: string, review: BeanReview) => {
    setBeans((prev: Bean[]) => prev.map(b => b.id === beanId ? { ...b, review } : b));
  };

  const handleAddCustomBrand = (newBrand: string) => {
    if (newBrand && !customBrands.includes(newBrand) && !PRESET_BRAND_KEYS.includes(newBrand)) {
      setCustomBrands(prev => [...prev, newBrand]);
    }
  };

  const handleDeleteCustomBrand = (brandToDelete: string) => {
    if (confirm(`Remove custom brand "${brandToDelete}"?`)) {
      setCustomBrands(prev => prev.filter(b => b !== brandToDelete));
    }
  };

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Date Filter
      if (selectedDate) {
        const logDate = new Date(log.timestamp);
        if (
          logDate.getDate() !== selectedDate.getDate() ||
          logDate.getMonth() !== selectedDate.getMonth() ||
          logDate.getFullYear() !== selectedDate.getFullYear()
        ) {
          return false;
        }
      }
      
      // 2. Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        let text = '';
        if (log.type === 'store') {
          const brand = log.storeBrand ? getBrandName(log.storeBrand, settings.language) : '';
          text = `${brand} ${log.productName || ''}`;
        } else {
          const bean = beans.find(b => b.id === log.beanId);
          text = `${bean?.brand || ''} ${bean?.name || ''} ${log.method || ''}`;
        }
        return text.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, selectedDate, searchQuery, settings.language, beans]);

  // --- Main Render ---

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1c1917] text-stone-800 dark:text-stone-100 font-sans selection:bg-[#5C4033] selection:text-white transition-colors">
      
      {/* Desktop Sidebar (Left 1) - Only visible on LG screens */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] bg-white dark:bg-[#292524] border-r border-stone-200 dark:border-stone-800 flex-col p-6 z-30 transition-colors">
         <div className="flex items-center gap-3 mb-10">
           <div className="w-10 h-10 bg-[#5C4033] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#5C4033]/20"><Icons.Coffee /></div>
           <h1 className="font-bold text-xl tracking-tight text-[#3E2723] dark:text-stone-200">Barista</h1>
         </div>
         <nav className="space-y-1 flex-1">
            <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-all ${view === 'dashboard' || view === 'calendar' ? 'bg-stone-100 dark:bg-stone-800 text-[#5C4033] dark:text-[#a68b7c]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><Icons.LayoutDashboard /> {t.dashboard}</button>
            <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-all ${view === 'inventory' ? 'bg-stone-100 dark:bg-stone-800 text-[#5C4033] dark:text-[#a68b7c]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><Icons.Bean /> {t.inventory}</button>
            <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-all ${view === 'settings' ? 'bg-stone-100 dark:bg-stone-800 text-[#5C4033] dark:text-[#a68b7c]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><Icons.Settings /> {t.settings}</button>
         </nav>
         <button onClick={() => setShowLogModal(true)} className="w-full py-4 bg-[#5C4033] text-white font-bold rounded-xl shadow-lg hover:bg-[#4a332a] flex items-center justify-center gap-2" aria-label={t.addLog}><Icons.Plus /></button>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[240px] h-screen overflow-hidden">
        
        {/* View Switcher */}
        {(view === 'dashboard' || view === 'calendar') && (
            <DashboardLayout 
               logs={logs}
               filteredLogs={filteredLogs}
               beans={beans}
               settings={settings}
               onSelectDate={setSelectedDate}
               selectedDate={selectedDate}
               searchQuery={searchQuery}
               setSearchQuery={setSearchQuery}
               onReview={setReviewingLog}
               onDelete={handleDeleteLog}
               activeView={view}
            />
        )}
        
        {view === 'inventory' && (
           <InventoryView 
              beans={beans} 
              onAdd={handleAddBean} 
              onToggle={toggleBeanStatus} 
              onDelete={handleDeleteBean}
              onSaveReview={handleSaveReview} 
              defaultReviewMode={settings.defaultReviewMode} 
              t={t} 
              lang={settings.language}
           />
        )}
        
        {view === 'settings' && (
           <div className="hidden lg:block p-8 h-full overflow-y-auto bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors">
             <h2 className="text-2xl font-bold mb-8 text-[#3E2723] dark:text-stone-200">{t.settings}</h2>
             <div className="max-w-4xl">
               <SettingsContent 
                 logs={logs} setLogs={setLogs}
                 beans={beans} setBeans={setBeans}
                 settings={settings} setSettings={setSettings}
                 customBrands={customBrands} setCustomBrands={setCustomBrands}
               />
             </div>
           </div>
        )}

        {/* Mobile/Tablet Views Container */}
        <div className="lg:hidden h-full overflow-y-auto pb-24 bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors">
           {(view === 'dashboard' || view === 'calendar') && (
              <DashboardLayout 
               logs={logs}
               filteredLogs={filteredLogs}
               beans={beans}
               settings={settings}
               onSelectDate={setSelectedDate}
               selectedDate={selectedDate}
               searchQuery={searchQuery}
               setSearchQuery={setSearchQuery}
               onReview={setReviewingLog}
               onDelete={handleDeleteLog}
               activeView={view}
              />
           )}
           {view === 'inventory' && (
              <InventoryView 
                beans={beans} 
                onAdd={handleAddBean} 
                onToggle={toggleBeanStatus} 
                onDelete={handleDeleteBean}
                onSaveReview={handleSaveReview} 
                defaultReviewMode={settings.defaultReviewMode} 
                t={t} 
                lang={settings.language}
              />
           )}
           {view === 'settings' && (
             <div className="p-4">
               <h2 className="text-2xl font-bold mb-4 text-[#3E2723] dark:text-stone-200">{t.settings}</h2>
               <SettingsContent 
                 logs={logs} setLogs={setLogs}
                 beans={beans} setBeans={setBeans}
                 settings={settings} setSettings={setSettings}
                 customBrands={customBrands} setCustomBrands={setCustomBrands}
               />
             </div>
           )}
        </div>

      </div>

      {/* Mobile/Tablet Bottom Tab Bar - Visible until LG screens */}
      <MobileTabBar activeTab={view} onChange={setView} onAdd={() => setShowLogModal(true)} t={t} />

      {/* Log Modal (Global) */}
      {showLogModal && (
        <Modal title={t.addLog} onClose={() => setShowLogModal(false)}>
           <LogModalContent 
             onAddLog={handleAddLog}
             onAddCustomBrand={handleAddCustomBrand}
             handleDeleteCustomBrand={handleDeleteCustomBrand}
             customBrands={customBrands}
             beans={beans}
             settings={settings}
           />
        </Modal>
      )}
      
      {/* Review Log Modal */}
      {reviewingLog && (
        <Modal title={t.review} onClose={() => setReviewingLog(null)}>
           <ReviewModalContent 
              initialReview={reviewingLog.review}
              defaultMode={settings.defaultReviewMode}
              t={t}
              onSave={(review) => {
                 handleSaveLogReview(reviewingLog.id, review);
                 setReviewingLog(null);
              }}
           />
        </Modal>
      )}

    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
