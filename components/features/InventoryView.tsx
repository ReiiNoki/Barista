
import React, { useState, useMemo } from 'react';
import { Bean, BeanReview, ReviewMode, RoastLevel, ProcessMethod, Language } from '../../types';
import { Icons } from '../../icons';
import { Modal } from '../ui/Modal';
import { ReviewModalContent } from './ReviewModalContent';
import { ConfirmModal } from '../ui/ConfirmModal';

export const InventoryView = ({ beans, onAdd, onToggle, onDelete, onSaveReview, defaultReviewMode, t, lang }: { beans: Bean[], onAdd: (b: Omit<Bean, 'id' | 'isActive'>) => void, onToggle: (id: string) => void, onDelete: (id: string) => void, onSaveReview: (id: string, r: BeanReview) => void, defaultReviewMode: ReviewMode, t: any, lang: Language }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [reviewingBean, setReviewingBean] = useState<Bean | null>(null);
  const [deleteBeanId, setDeleteBeanId] = useState<string | null>(null);

  const groupedBeans = useMemo(() => {
    const groups: Record<string, Bean[]> = {};
    beans.forEach(b => {
      if (!groups[b.brand]) groups[b.brand] = [];
      groups[b.brand].push(b);
    });
    return groups;
  }, [beans]);

  const AddBeanForm = () => {
    const [brand, setBrand] = useState('');
    const [name, setName] = useState('');
    const [roast, setRoast] = useState<RoastLevel>('medium');
    const [process, setProcess] = useState<ProcessMethod>('washed');
    const [weight, setWeight] = useState<number>(200);

    const submit = () => {
      if (!brand || !name) return;
      onAdd({ brand, name, roast, process, weight });
      setBrand(''); setName(''); setWeight(200);
      setIsAdding(false);
    };

    return (
       <div className="space-y-4">
          <div>
            <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.brand}</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Blue Bottle" className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 placeholder-stone-400 focus:ring-2 focus:ring-[#5C4033]/20" />
          </div>
          <div>
            <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.beanName}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bella Donovan" className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 placeholder-stone-400 focus:ring-2 focus:ring-[#5C4033]/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.roast}</label>
                <select value={roast} onChange={e => setRoast(e.target.value as any)} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200">{(['light', 'medium', 'dark'] as const).map(r => <option key={r} value={r}>{t[r]}</option>)}</select>
             </div>
             <div>
                <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.process}</label>
                <select value={process} onChange={e => setProcess(e.target.value as any)} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200">{(['washed', 'natural', 'honey', 'anaerobic', 'other'] as const).map(p => <option key={p} value={p}>{t[p]}</option>)}</select>
             </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.weight}</label>
            <div className="relative">
              <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 font-bold" />
              <span className="absolute right-4 top-3 text-stone-400 text-sm">{t.grams}</span>
            </div>
          </div>
          <button onClick={submit} disabled={!brand || !name} className="w-full p-4 mt-2 bg-stone-800 dark:bg-stone-700 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 shadow-lg">{t.save}</button>
       </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-y-auto no-scrollbar bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors">
       {/* Header Stats */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h2 className="text-2xl font-bold text-[#3E2723] dark:text-white">{t.beanInventory}</h2>
            <div className="flex gap-4 text-sm text-stone-500 dark:text-stone-400 mt-1">
              <span>{t.totalBeans}: <strong className="text-stone-800 dark:text-stone-200">{beans.length}</strong></span>
              <span>{t.activeCount}: <strong className="text-stone-800 dark:text-stone-200">{beans.filter(b => b.isActive).length}</strong></span>
            </div>
         </div>
         <button onClick={() => setIsAdding(true)} className="bg-[#5C4033] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#4a332a] transition-all flex items-center gap-2">
           <Icons.Plus />
           {t.addNewBean}
         </button>
       </div>

       {/* Bean Grid */}
       {Object.keys(groupedBeans).length === 0 ? (
         <div className="flex flex-col items-center justify-center flex-1 text-stone-400 opacity-50">
           <div className="mb-4 text-stone-300 dark:text-stone-700">
             <Icons.Bean className="w-24 h-24" />
           </div>
           <p>Your inventory is empty.</p>
         </div>
       ) : (
         <div className="space-y-8 pb-20">
            {Object.entries(groupedBeans).map(([groupBrand, groupBeans]: [string, Bean[]]) => (
              <div key={groupBrand}>
                <h3 className="text-lg font-bold text-stone-400 mb-3 px-1">{groupBrand}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupBeans.map(b => (
                    <div key={b.id} className={`group relative p-5 rounded-2xl border transition-all hover:shadow-md ${b.isActive ? 'bg-white dark:bg-[#292524] border-stone-200 dark:border-stone-700' : 'bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-800 opacity-70'}`}>
                       <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${b.roast === 'light' ? 'bg-yellow-100 text-yellow-700' : b.roast === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-700'}`}>{t[b.roast]}</span>
                          
                          <div className="flex gap-2">
                            <button onClick={() => setDeleteBeanId(b.id)} className="text-xs px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                              <Icons.Trash className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onToggle(b.id)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${b.isActive ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100' : 'text-stone-400 border-stone-200 hover:bg-stone-200'}`}>
                              {b.isActive ? t.reopen : t.finished}
                            </button>
                          </div>
                       </div>
                       <h4 className="font-bold text-[#3E2723] dark:text-stone-200 text-lg mb-1">{b.name}</h4>
                       <div className="text-xs text-stone-500 mb-4 flex gap-2">
                          <span>{t[b.process]}</span>
                          <span>•</span>
                          <span className={b.weight < 50 ? 'text-red-500 font-bold' : ''}>{b.weight || 0}{t.grams}</span>
                       </div>
                       
                       {/* Review Section */}
                       <div className="pt-3 border-t border-stone-100 dark:border-stone-700 flex justify-between items-center">
                          {b.review ? (
                             <div className="flex items-center gap-2">
                               {b.review.mode === 'casual' && <div className="flex text-amber-400 text-xs"><Icons.Star filled /> <span className="text-stone-600 dark:text-stone-300 ml-1 font-bold">{b.review.rating}</span></div>}
                               {b.review.mode === 'barista' && <div className="text-xs font-bold text-stone-600 dark:text-stone-300">{((Object.values(b.review.baristaScore || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)} / 5</div>}
                               {b.review.mode === 'expert' && <div className="text-xs font-black text-[#5C4033] dark:text-[#a68b7c]">{b.review.expertScore?.total} pts</div>}
                               
                               {b.review.rebuy && <span className="text-xs bg-[#5C4033] text-white px-1.5 py-0.5 rounded-md flex items-center gap-1">👍</span>}
                             </div>
                          ) : (
                             <span className="text-[10px] text-stone-400 italic">{t.noReview}</span>
                          )}
                          <button onClick={() => setReviewingBean(b)} className="text-xs font-bold text-[#5C4033] dark:text-[#a68b7c] hover:underline flex items-center gap-1">
                             <Icons.Review /> {b.review ? t.editReview : t.review}
                          </button>
                       </div>

                       {!b.isActive && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="bg-stone-800 text-white text-xs px-3 py-1 rounded-full">{t.finished}</span>
                       </div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
         </div>
       )}
       
       {/* Add Bean Modal */}
       {isAdding && (
          <Modal title={t.addNewBean} onClose={() => setIsAdding(false)}>
             <AddBeanForm />
          </Modal>
       )}
       
       {/* Delete Confirmation Modal */}
       {deleteBeanId && (
         <ConfirmModal 
            title={t.deleteBeanConfirm}
            onConfirm={() => {
              if (deleteBeanId) onDelete(deleteBeanId);
              setDeleteBeanId(null);
            }}
            onCancel={() => setDeleteBeanId(null)}
            lang={lang}
         />
       )}

       {reviewingBean && (
         <Modal title={reviewingBean.review ? t.editReview : t.review} onClose={() => setReviewingBean(null)}>
            <ReviewModalContent 
               initialReview={reviewingBean.review} 
               defaultMode={defaultReviewMode}
               t={t} 
               onSave={(review) => {
                 onSaveReview(reviewingBean.id, review);
                 setReviewingBean(null);
               }} 
            />
         </Modal>
       )}
    </div>
  );
};
