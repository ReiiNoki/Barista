import React, { useState, useEffect } from 'react';
import { BeanReview, ReviewMode } from '../../types';
import { Icons } from '../../icons';
import { FLAVOR_TAGS } from '../../constants';

export const ReviewModalContent = ({ initialReview, onSave, defaultMode, t }: { initialReview?: BeanReview, onSave: (r: BeanReview) => void, defaultMode: ReviewMode, t: any }) => {
  const [mode, setMode] = useState<ReviewMode>(defaultMode);
  const [rebuy, setRebuy] = useState(initialReview?.rebuy ?? false);
  const [note, setNote] = useState(initialReview?.note ?? '');
  
  // Casual
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  
  // Barista
  const [baristaScore, setBaristaScore] = useState(initialReview?.baristaScore ?? { acidity: 3, sweetness: 3, body: 3, bitterness: 3, aftertaste: 3 });
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(initialReview?.flavors ?? []);
  
  // Expert
  const [expertScore, setExpertScore] = useState(initialReview?.expertScore ?? { aroma: 8, flavor: 8, aftertaste: 8, acidity: 8, body: 8, balance: 8, uniformity: 10, cleanCup: 10, sweetness: 10, overall: 8, total: 0 });

  useEffect(() => {
    // Recalculate Expert Total
    const values = Object.values(expertScore) as number[];
    const sum = values.reduce((a, b) => a + b, 0);
    const calculatedTotal = sum - expertScore.total;
    if (calculatedTotal !== expertScore.total) setExpertScore(p => ({ ...p, total: calculatedTotal }));
  }, [expertScore]);

  const toggleFlavor = (f: string) => {
    setSelectedFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const save = () => {
    onSave({
      timestamp: Date.now(),
      mode,
      rebuy,
      note,
      rating: mode === 'casual' ? rating : undefined,
      baristaScore: mode === 'barista' ? baristaScore : undefined,
      flavors: mode === 'barista' ? selectedFlavors : undefined,
      expertScore: mode === 'expert' ? expertScore : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
        {(['casual', 'barista', 'expert'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${mode === m ? 'bg-white dark:bg-stone-600 shadow-sm text-[#5C4033] dark:text-[#a68b7c]' : 'text-stone-400'}`}>{t[m]}</button>
        ))}
      </div>

      <div className="space-y-6 animate-slide-up">
        {mode === 'casual' && (
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)} className={`transform transition-transform active:scale-90 ${rating >= star ? 'text-amber-400' : 'text-stone-200 dark:text-stone-700'}`}>
                <Icons.Star filled={rating >= star} />
              </button>
            ))}
          </div>
        )}

        {mode === 'barista' && (
          <div className="space-y-4">
            {(['acidity', 'sweetness', 'body', 'bitterness', 'aftertaste'] as const).map(attr => (
              <div key={attr} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-stone-500 uppercase">
                  <span>{t[attr]}</span>
                  <span className="text-[#5C4033] dark:text-[#a68b7c]">{baristaScore[attr]}</span>
                </div>
                <input type="range" min="1" max="5" step="0.5" value={baristaScore[attr]} onChange={e => setBaristaScore(p => ({...p, [attr]: Number(e.target.value)}))} className="w-full accent-[#5C4033]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-2">{t.flavors}</label>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_TAGS.map(f => (
                  <button key={f} onClick={() => toggleFlavor(f)} className={`text-xs px-2 py-1 rounded-md border transition-colors ${selectedFlavors.includes(f) ? 'bg-[#5C4033] text-white border-[#5C4033]' : 'bg-white dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'expert' && (
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2 text-center py-2 bg-stone-50 dark:bg-stone-800 rounded-xl mb-2">
                <div className="text-xs text-stone-500 uppercase font-bold">{t.totalScore}</div>
                <div className="text-3xl font-black text-[#5C4033] dark:text-[#a68b7c]">{expertScore.total}</div>
             </div>
             {(['aroma', 'flavor', 'aftertaste', 'acidity', 'body', 'balance', 'uniformity', 'cleanCup', 'sweetness', 'overall'] as const).map(attr => (
               <div key={attr}>
                 <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">{t[attr]}</label>
                 <input type="number" min="0" max="10" step="0.25" value={expertScore[attr]} onChange={e => setExpertScore(p => ({...p, [attr]: Number(e.target.value)}))} className="w-full p-2 text-center font-bold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" />
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-stone-100 dark:border-stone-700 space-y-4">
        <div className="flex items-center justify-between">
           <span className="font-medium text-stone-700 dark:text-stone-300">{t.rebuy}</span>
           <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              <button onClick={() => setRebuy(false)} className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${!rebuy ? 'bg-white dark:bg-stone-600 shadow-sm text-stone-600 dark:text-stone-200' : 'text-stone-400'}`}><Icons.ThumbsDown /> No</button>
              <button onClick={() => setRebuy(true)} className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${rebuy ? 'bg-[#5C4033] shadow-sm text-white' : 'text-stone-400'}`}><Icons.ThumbsUp /> Yes</button>
           </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">{t.notes}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="..." className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200 h-24 resize-none" />
        </div>
      </div>
      
      <button onClick={save} className="w-full py-4 bg-[#5C4033] text-white font-bold rounded-xl shadow-lg hover:bg-[#4a332a]">{t.save}</button>
    </div>
  );
};