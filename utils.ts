import { CoffeeLog, Language } from './types';
import { PRESET_BRANDS } from './constants';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatDate = (ts: number, lang: Language) => {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(ts));
};

export const getBrandName = (brandKey: string, lang: Language): string => {
  if (PRESET_BRANDS[brandKey]) {
    return PRESET_BRANDS[brandKey][lang];
  }
  return brandKey;
};

export const calculateCurrentLevel = (logs: CoffeeLog[], halfLife: number) => {
  const now = Date.now();
  let totalLevel = 0;
  logs.forEach((log) => {
    const elapsedHours = (now - log.timestamp) / (1000 * 60 * 60);
    if (elapsedHours >= 0) {
      const remaining = log.caffeineMg * Math.pow(0.5, elapsedHours / halfLife);
      if (remaining > 1) totalLevel += remaining;
    }
  });
  return Math.round(totalLevel);
};

export const getTodayTotal = (logs: CoffeeLog[]) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return logs
    .filter((l) => l.timestamp >= startOfDay.getTime())
    .reduce((acc, curr) => acc + curr.caffeineMg, 0);
};

export const generateChartPoints = (logs: CoffeeLog[], halfLife: number) => {
  const now = Date.now();
  const dataPoints: number[] = [];
  const hoursToForecast = 12;
  const intervals = 24;

  for (let i = 0; i <= intervals; i++) {
    const timeOffset = (i / intervals) * hoursToForecast * 60 * 60 * 1000;
    const futureTime = now + timeOffset;
    let level = 0;
    logs.forEach(log => {
      const elapsedHours = (futureTime - log.timestamp) / (3600 * 1000);
      if (elapsedHours >= 0) {
         level += log.caffeineMg * Math.pow(0.5, elapsedHours / halfLife);
      }
    });
    dataPoints.push(level);
  }
  return dataPoints;
};
