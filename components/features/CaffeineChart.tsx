import React, { useMemo } from 'react';
import { CoffeeLog, Language } from '../../types';
import { DICTIONARY } from '../../constants';
import { generateChartPoints } from '../../utils';

export const CaffeineChart = ({ logs, halfLife, lang }: { logs: CoffeeLog[]; halfLife: number; lang: Language }) => {
  const points = useMemo(() => generateChartPoints(logs, halfLife), [logs, halfLife]);

  const maxVal = Math.max(...points, 200);
  const height = 120;
  const width = 300;
  const polylinePoints = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val / maxVal) * height);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full bg-stone-50 dark:bg-[#292524] p-4 rounded-xl shadow-inner border border-stone-200 dark:border-stone-700 flex flex-col justify-between h-48 lg:h-full transition-colors">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{DICTIONARY[lang].metabolismChart}</span>
      </div>
      <div className="relative w-full overflow-hidden flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <line x1="0" y1={height} x2={width} y2={height} stroke="#e7e5e4" strokeWidth="1" className="dark:stroke-stone-700" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-stone-700" />
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8c7a6b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8c7a6b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M0,${height} ${polylinePoints} L${width},${height} Z`} fill="url(#gradient)" />
          <polyline points={polylinePoints} fill="none" stroke="#5C4033" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 mt-1">
        <span>Now</span>
        <span>+6h</span>
        <span>+12h</span>
      </div>
    </div>
  );
};