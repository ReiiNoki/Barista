import React from 'react';
import { DICTIONARY } from '../../constants';
import { Language } from '../../types';

export const ConfirmModal = ({ title, onConfirm, onCancel, lang }: { title: string, onConfirm: () => void, onCancel: () => void, lang: Language }) => {
  const t = DICTIONARY[lang];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-fade-in">
      <div className="bg-white dark:bg-[#292524] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-slide-up border border-stone-100 dark:border-stone-700">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-6 text-center">{title}</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl active:scale-95 transition-transform">{t.cancel}</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-transform">{t.delete}</button>
        </div>
      </div>
    </div>
  );
};