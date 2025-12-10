
import React, { useState } from 'react';
import { CoffeeLog, Bean, Language, AppSettings } from '../../types';
import { DICTIONARY, BREW_METHODS } from '../../constants';
import { Icons } from '../../icons';
import { getBrandName, formatDate } from '../../utils';
import { ConfirmModal } from '../ui/ConfirmModal';

export const HistoryList = ({ logs, beans, lang, settings, onReview, onDelete }: { logs: CoffeeLog[], beans: Bean[], lang: Language, settings: AppSettings, onReview: (l: CoffeeLog) => void, onDelete: (id: string) => void }) => {
  const t = DICTIONARY[lang];
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-3 no-scrollbar pb-20 lg:pb-0">
        {logs.length === 0 ? (
            <div className="text-center py-10 text-stone-400 flex flex-col items-center gap-2">
              <span className="text-2xl">☕️</span>
              <p className="text-sm">{t.noLogs}</p>
            </div>
        ) : (
          logs.map(log => {
              const bean = beans.find(b => b.id === log.beanId);
              
              // 1. Calculate the Title (Primary Info: Product Name or Bean Name)
              const displayTitle = log.type === 'store' 
                ? (log.productName || 'Unknown Product')
                : (bean ? bean.name : 'Unknown Bean');

              // 2. Calculate the Subtitle (Secondary Info: Brand + Details)
              const brandName = log.type === 'store' 
                ? (log.storeBrand ? getBrandName(log.storeBrand, settings.language) : 'Unknown Brand')
                : (bean ? bean.brand : 'Unknown Brand');
              
              const displaySubtitle = log.type === 'store'
                ? brandName
                : `${brandName}${log.method ? ` • ${BREW_METHODS[log.method].label[settings.language]}` : ''}${log.beanWeight ? ` • ${log.beanWeight}g` : ''}`;

              return (
                <div key={log.id} className="relative group bg-white dark:bg-[#292524] p-4 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm flex justify-between items-center hover:border-stone-300 dark:hover:border-stone-600 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${log.type === 'store' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{log.type === 'store' ? '🏪' : '🏠'}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-stone-800 dark:text-stone-200 text-sm truncate">{displayTitle}</div>
                        {log.review && (
                          <div className="flex items-center gap-1">
                            {log.review.rating && <div className="flex text-amber-400 text-[10px]"><Icons.Star filled className="w-3 h-3"/> <span className="text-stone-500 ml-0.5">{log.review.rating}</span></div>}
                            {log.review.rebuy && <span className="text-[10px]">👍</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 truncate">{displaySubtitle}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#5C4033] dark:text-[#a68b7c] text-sm">{log.caffeineMg}<span className="text-[10px] font-normal text-stone-400 ml-0.5">mg</span></div>
                    <div className="text-[10px] text-stone-400">{formatDate(log.timestamp, settings.language)}</div>
                  </div>
                  
                  {/* Actions: Review & Delete */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); onReview(log); }} className="p-2 text-stone-300 hover:text-[#5C4033] bg-white dark:bg-stone-800 shadow-sm rounded-lg transition-all active:scale-90"><Icons.Review className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(log.id); }} className="p-2 text-stone-300 hover:text-red-500 bg-white dark:bg-stone-800 shadow-sm rounded-lg transition-all active:scale-90"><Icons.Trash className="w-4 h-4" /></button>
                  </div>
                </div>
              );
          })
        )}
      </div>
      {deleteId && (
        <ConfirmModal 
          title={t.deleteConfirm} 
          onConfirm={() => { onDelete(deleteId); setDeleteId(null); }} 
          onCancel={() => setDeleteId(null)} 
          lang={lang}
        />
      )}
    </>
  );
};
