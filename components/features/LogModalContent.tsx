
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CoffeeLog, Bean, AppSettings, CoffeeType, BrewMethod } from '../../types';
import { PRESET_BRANDS, PRESET_BRAND_KEYS, BREW_METHODS, DICTIONARY } from '../../constants';
import { Icons } from '../../icons';

interface LogModalContentProps {
  onAddLog: (log: Omit<CoffeeLog, 'id'>) => void;
  onAddCustomBrand: (brand: string) => void;
  handleDeleteCustomBrand: (brand: string) => void;
  customBrands: string[];
  beans: Bean[];
  settings: AppSettings;
}

export const LogModalContent = ({ onAddLog, onAddCustomBrand, handleDeleteCustomBrand, customBrands, beans, settings }: LogModalContentProps) => {
    const t = DICTIONARY[settings.language];
    const [mode, setMode] = useState<CoffeeType>('store');
    const [storeBrand, setStoreBrand] = useState(PRESET_BRAND_KEYS[0]);
    const [customBrand, setCustomBrand] = useState('');
    const [productName, setProductName] = useState('');
    const [isAddingBrand, setIsAddingBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [selectedBeanId, setSelectedBeanId] = useState('');
    const [method, setMethod] = useState<BrewMethod>('pour_over');
    const [caffeine, setCaffeine] = useState(150);
    const [dose, setDose] = useState(15);
    const [logDate, setLogDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    // AI State
    const [aiRecipe, setAiRecipe] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');

    const activeBeans = beans.filter(b => b.isActive);
    const selectedBean = beans.find(b => b.id === selectedBeanId);

    // Time Selection Helpers
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    // Use 5-minute steps for cleaner UI, or 1-minute for precision. Let's use 1-minute to match previous precision.
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const [datePart, timePart] = logDate.split('T');
    const [currentHour, currentMinute] = timePart ? timePart.split(':') : ['00', '00'];

    useEffect(() => {
      if (mode === 'homemade') {
        setCaffeine(BREW_METHODS[method].caffeineFactor);
        setDose(BREW_METHODS[method].defaultDose);
      } else {
        if (productName.toLowerCase().includes('espresso') || productName.toLowerCase().includes('shot')) setCaffeine(75);
        else if (productName.toLowerCase().includes('cold brew')) setCaffeine(200);
        else setCaffeine(150);
      }
    }, [mode, method, productName]);

    const submit = () => {
      const timestamp = new Date(logDate).getTime();
      onAddLog({
        type: mode,
        timestamp,
        caffeineMg: Number(caffeine),
        storeBrand: mode === 'store' ? (storeBrand === 'Other' ? customBrand : storeBrand) : undefined,
        productName: mode === 'store' ? productName : undefined,
        beanId: mode === 'homemade' ? selectedBeanId : undefined,
        method: mode === 'homemade' ? method : undefined,
        beanWeight: mode === 'homemade' ? dose : undefined,
      });
    };

    const submitNewBrand = () => {
      if (newBrandName.trim()) {
        onAddCustomBrand(newBrandName.trim());
        setStoreBrand(newBrandName.trim());
        setNewBrandName('');
        setIsAddingBrand(false);
      }
    };

    const generateRecipe = async () => {
      if (!selectedBean || !process.env.API_KEY) return;
      setIsLoadingAI(true);
      setAiRecipe('');
      setAiError('');

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langPrompt = settings.language === 'zh' ? 'Chinese' : settings.language === 'ja' ? 'Japanese' : 'English';
        
        const prompt = `Act as a professional barista. I have a coffee bean with the following traits:
        - Brand: ${selectedBean.brand}
        - Name: ${selectedBean.name}
        - Roast Level: ${selectedBean.roast}
        - Process Method: ${selectedBean.process}
        
        I want to brew it using: ${BREW_METHODS[method].label.en}.
        
        Please provide a concise brewing guide in ${langPrompt}.
        Include:
        1. Recommended Grind Size
        2. Water Temperature (${settings.tempUnit === 'c' ? 'Celsius' : 'Fahrenheit'})
        3. Ratio (Coffee:Water)
        4. Key Steps (Bloom, Pouring structure).
        
        Keep it structured and short (under 200 words). Use **bold** for key numbers and terms.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        setAiRecipe(response.text);
      } catch (e) {
        console.error("AI Error", e);
        setAiError(t.aiError);
      } finally {
        setIsLoadingAI(false);
      }
    };

    // Helper to format AI markdown-style bold text
    const formatAiResponse = (text: string) => {
      if (!text) return null;
      // Split by **text**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove asterisks and render strong
          return <strong key={index} className="text-[#5C4033] dark:text-[#a68b7c] font-bold">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       setLogDate(`${e.target.value}T${timePart}`);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
       setLogDate(`${datePart}T${e.target.value}:${currentMinute}`);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
       setLogDate(`${datePart}T${currentHour}:${e.target.value}`);
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.date}</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={datePart} 
              onChange={handleDateChange} 
              className="flex-[2] p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" 
            />
            <div className="flex flex-1 items-center gap-1 bg-[#5C4033] rounded-lg shadow-sm p-1">
               <select 
                 value={currentHour} 
                 onChange={handleHourChange}
                 className="w-full h-full bg-transparent text-center outline-none text-[#FDFBF7] font-bold"
               >
                 {hours.map(h => <option key={h} value={h} className="text-stone-800">{h}</option>)}
               </select>
               <span className="text-[#FDFBF7]/60 font-bold">:</span>
               <select 
                 value={currentMinute} 
                 onChange={handleMinuteChange}
                 className="w-full h-full bg-transparent text-center outline-none text-[#FDFBF7] font-bold"
               >
                 {minutes.map(m => <option key={m} value={m} className="text-stone-800">{m}</option>)}
               </select>
            </div>
          </div>
        </div>
        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
          {(['store', 'homemade'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-500'}`}>{t[m]}</button>
          ))}
        </div>
        {mode === 'store' ? (
          <div className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.brand}</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(PRESET_BRAND_KEYS as string[]).map(key => (
                  <button key={key} onClick={() => setStoreBrand(key)} className={`w-full text-xs p-2 rounded border truncate ${storeBrand === key ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>{PRESET_BRANDS[key][settings.language]}</button>
                ))}
                {(customBrands as string[]).map(b => (
                  <div key={b} className="relative group"><button onClick={() => setStoreBrand(b)} className={`w-full text-xs p-2 rounded border truncate ${storeBrand === b ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>{b}</button><button onClick={(e) => { e.stopPropagation(); handleDeleteCustomBrand(b); }} className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 hidden group-hover:block"><Icons.X /></button></div>
                ))}
                {isAddingBrand ? (
                  <div className="col-span-1 flex items-center gap-1"><input autoFocus value={newBrandName} onChange={e => setNewBrandName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitNewBrand()} onBlur={() => { if(!newBrandName) setIsAddingBrand(false); }} placeholder={t.newBrand} className="w-full text-xs p-2 rounded border border-[#5C4033] outline-none text-[#3E2723] dark:text-stone-200 bg-white dark:bg-stone-800" /><button onClick={submitNewBrand} className="text-[#5C4033]"><Icons.Check /></button></div>
                ) : (
                  <button onClick={() => setIsAddingBrand(true)} className="text-xs p-2 rounded border border-dashed border-stone-300 dark:border-stone-600 text-stone-400 hover:border-[#5C4033] hover:text-[#5C4033] transition-colors">+ {t.add}</button>
                )}
              </div>
              <select value={storeBrand} onChange={e => setStoreBrand(e.target.value)} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200"><option value="" disabled>{t.selectBrand}</option><optgroup label="Popular">{(PRESET_BRAND_KEYS as string[]).map(key => <option key={key} value={key}>{PRESET_BRANDS[key][settings.language]}</option>)}</optgroup>{customBrands.length > 0 && <optgroup label={t.customBrand}>{(customBrands as string[]).map(b => <option key={b} value={b}>{b}</option>)}</optgroup>}<option value="Other">Other / Custom</option></select>
            </div>
            {storeBrand === 'Other' && <input type="text" placeholder={t.customBrand} value={customBrand} onChange={e => setCustomBrand(e.target.value)} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 text-[#3E2723] dark:text-stone-200 bg-white dark:bg-stone-800" />}
            <div><label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.product}</label><input type="text" placeholder="e.g. Latte" value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 text-[#3E2723] dark:text-stone-200 bg-white dark:bg-stone-800" /></div>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.bean}</label>
              {activeBeans.length === 0 ? <div className="text-sm text-amber-600">No active beans.</div> : <select value={selectedBeanId} onChange={e => setSelectedBeanId(e.target.value)} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200"><option value="">{t.selectBean}</option>{(activeBeans as Bean[]).map(b => <option key={b.id} value={b.id}>{b.brand} - {b.name} ({t.remaining}: {b.weight}g)</option>)}</select>}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.method}</label>
              <div className="grid grid-cols-2 gap-2">{(Object.keys(BREW_METHODS) as BrewMethod[]).map((m) => <button key={m} onClick={() => setMethod(m)} className={`text-xs p-2 rounded border text-left ${method === m ? 'border-[#5C4033] bg-[#5C4033]/10 text-[#5C4033] dark:text-[#a68b7c]' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>{BREW_METHODS[m].label[settings.language]}</button>)}</div>
            </div>
            {selectedBean && (
               <div className="space-y-4">
                  {/* AI Guide Section */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-800 border border-amber-100 dark:border-stone-700 rounded-xl p-1">
                     {!aiRecipe && !isLoadingAI && (
                       <button onClick={generateRecipe} className="w-full py-2 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-500 font-bold text-sm hover:bg-amber-100 dark:hover:bg-stone-700 rounded-lg transition-colors">
                         <Icons.Sparkles /> {t.aiGuide}
                       </button>
                     )}
                     {isLoadingAI && (
                       <div className="w-full py-4 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-500 text-sm animate-pulse">
                         <Icons.Coffee /> {t.generating}
                       </div>
                     )}
                     {aiRecipe && (
                        <div className="p-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap font-medium">
                           {formatAiResponse(aiRecipe)}
                           <div className="mt-2 flex justify-end">
                              <button onClick={() => setAiRecipe('')} className="text-[10px] text-stone-400 underline">Close Guide</button>
                           </div>
                        </div>
                     )}
                     {aiError && <div className="p-2 text-xs text-red-500 text-center">{aiError}</div>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.dose}</label>
                    <div className="relative">
                      <input type="number" value={dose} onChange={e => setDose(Number(e.target.value))} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" />
                      <span className="absolute right-3 top-3 text-stone-400 text-sm">/ {selectedBean.weight}g left</span>
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-700"><label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.caffeineEst} ({t.mg})</label><input type="number" value={caffeine} onChange={e => setCaffeine(Number(e.target.value))} className="w-full p-3 text-2xl font-bold text-[#5C4033] dark:text-[#a68b7c] rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800" /></div>
        <button onClick={submit} disabled={mode === 'homemade' && !selectedBeanId} className="w-full py-4 bg-[#5C4033] text-white font-bold rounded-xl shadow-lg hover:bg-[#4a332a] disabled:opacity-50">{t.add}</button>
      </div>
    );
};
