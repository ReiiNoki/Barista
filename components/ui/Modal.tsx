import React from 'react';
import { Icons } from '../../icons';

export const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
    <div className="bg-white dark:bg-[#292524] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
      <div className="p-4 border-b border-stone-100 dark:border-stone-700 flex justify-between items-center bg-stone-50 dark:bg-[#1c1917]">
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-600 dark:text-stone-400">
          <Icons.X />
        </button>
      </div>
      <div className="overflow-y-auto p-4 space-y-4 no-scrollbar">
        {children}
      </div>
    </div>
  </div>
);