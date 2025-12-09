import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- 类型定义 (Types) ---

type Language = 'en' | 'zh' | 'ja';
type CoffeeType = 'homemade' | 'store';
type RoastLevel = 'light' | 'medium' | 'dark';
type ProcessMethod = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';
type BrewMethod = 'pour_over' | 'espresso' | 'aeropress' | 'french_press' | 'cold_brew' | 'moka' | 'other';
type ViewState = 'dashboard' | 'calendar' | 'inventory' | 'settings';
type ThemeOption = 'light' | 'dark' | 'system';
type ReviewMode = 'casual' | 'barista' | 'expert';

interface BeanReview {
  timestamp: number;
  mode: ReviewMode;
  rebuy: boolean;
  note: string;
  // Casual
  rating?: number; // 1-5
  // Barista
  baristaScore?: {
    acidity: number; // 1-5
    sweetness: number;
    body: number;
    bitterness: number;
    aftertaste: number;
  };
  flavors?: string[];
  bestFor?: string[]; // brew methods
  // Expert (SCA)
  expertScore?: {
    aroma: number; // 6-10 usually
    flavor: number;
    aftertaste: number;
    acidity: number;
    body: number;
    balance: number;
    uniformity: number;
    cleanCup: number;
    sweetness: number;
    overall: number;
    total: number;
  };
}

interface Bean {
  id: string;
  brand: string;
  name: string;
  roast: RoastLevel;
  process: ProcessMethod;
  weight: number; // in grams
  isActive: boolean; // false means finished
  review?: BeanReview;
}

interface CoffeeLog {
  id: string;
  timestamp: number; // Unix timestamp
  type: CoffeeType;
  // Store specific
  storeBrand?: string;
  productName?: string;
  // Homemade specific
  beanId?: string;
  method?: BrewMethod;
  beanWeight?: number; // Used weight in grams
  // Common
  caffeineMg: number;
  note?: string;
}

interface AppSettings {
  language: Language;
  caffeineHalfLife: number; // in hours, default 5
  safeSleepThreshold: number; // mg, default 50
  dailyLimit: number; // mg, default 400
  brewRatio: number; // 1:x, default 15
  tempUnit: 'c' | 'f';
  theme: ThemeOption;
  defaultReviewMode: ReviewMode;
}

// --- 常量与字典 (Constants & Dictionaries) ---

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh',
  caffeineHalfLife: 5,
  safeSleepThreshold: 50,
  dailyLimit: 400,
  brewRatio: 15,
  tempUnit: 'c',
  theme: 'system',
  defaultReviewMode: 'barista',
};

const BREW_METHODS: Record<BrewMethod, { caffeineFactor: number; label: Record<Language, string>; defaultDose: number }> = {
  pour_over: { caffeineFactor: 120, label: { en: 'Pour Over', zh: '手冲', ja: 'ハンドドリップ' }, defaultDose: 15 },
  espresso: { caffeineFactor: 65, label: { en: 'Espresso', zh: '意式浓缩', ja: 'エスプレッソ' }, defaultDose: 18 },
  aeropress: { caffeineFactor: 100, label: { en: 'Aeropress', zh: '爱乐压', ja: 'エアロプレス' }, defaultDose: 15 },
  french_press: { caffeineFactor: 150, label: { en: 'French Press', zh: '法压壶', ja: 'フレンチプレス' }, defaultDose: 20 },
  cold_brew: { caffeineFactor: 200, label: { en: 'Cold Brew', zh: '冷萃', ja: '水出し' }, defaultDose: 40 },
  moka: { caffeineFactor: 90, label: { en: 'Moka Pot', zh: '摩卡壶', ja: 'マキネッタ' }, defaultDose: 15 },
  other: { caffeineFactor: 100, label: { en: 'Other', zh: '其他', ja: 'その他' }, defaultDose: 15 },
};

const PRESET_BRANDS: Record<string, Record<Language, string>> = {
  'Starbucks': { en: 'Starbucks', zh: '星巴克', ja: 'スターバックス' },
  'Luckin': { en: 'Luckin Coffee', zh: '瑞幸咖啡', ja: 'ラッキンコーヒー' },
  'McCafé': { en: 'McCafé', zh: '麦咖啡', ja: 'マックカフェ' },
  'K-Coffee': { en: 'K-Coffee', zh: '肯悦咖啡', ja: 'ケンタッキー' },
  'Cotti': { en: 'Cotti Coffee', zh: '库迪咖啡', ja: 'コッティコーヒー' },
  'Blue Bottle': { en: 'Blue Bottle', zh: '蓝瓶咖啡', ja: 'ブルーボトル' },
  'Costa': { en: 'Costa', zh: '咖世家', ja: 'コスタ' },
  'Tim Hortons': { en: 'Tim Hortons', zh: 'Tims天好', ja: 'ティムホートンズ' },
  '% Arabica': { en: '% Arabica', zh: '% Arabica', ja: '% Arabica' },
};

const PRESET_BRAND_KEYS: string[] = Object.keys(PRESET_BRANDS);

const FLAVOR_TAGS = ['Fruity', 'Floral', 'Nutty', 'Cocoa', 'Spicy', 'Herbal', 'Roasted', 'Fermented', 'Sweet', 'Citrus', 'Berry', 'Stone Fruit'];

const DICTIONARY = {
  en: {
    dashboard: 'Dashboard',
    addLog: 'Log Coffee',
    inventory: 'Beans',
    settings: 'Settings',
    currentLevel: 'Caffeine Level',
    todayTotal: 'Today',
    mg: 'mg',
    halfLife: 'Half-life',
    hours: 'hrs',
    exportData: 'Export Data (JSON)',
    store: 'Store Bought',
    homemade: 'Homemade',
    brand: 'Brand',
    product: 'Product',
    bean: 'Coffee Bean',
    method: 'Method',
    caffeineEst: 'Est. Caffeine',
    add: 'Add',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    activeBeans: 'Inventory',
    history: 'History',
    noLogs: 'No coffee records found.',
    sleepWarning: 'High caffeine!',
    metabolismChart: 'Metabolism',
    customBrand: 'Custom Brand',
    roast: 'Roast',
    process: 'Process',
    beanName: 'Bean Name',
    light: 'Light',
    medium: 'Medium',
    dark: 'Dark',
    washed: 'Washed',
    natural: 'Natural',
    honey: 'Honey',
    anaerobic: 'Anaerobic',
    other: 'Other',
    finished: 'Finished',
    reopen: 'Active',
    selectBean: 'Select bean...',
    newBrand: 'New Brand',
    enterBrandName: 'Brand name',
    selectBrand: 'Select brand...',
    calendar: 'Calendar',
    searchPlaceholder: 'Search coffee...',
    allHistory: 'All History',
    clearDate: 'Clear Date',
    weight: 'Weight',
    grams: 'g',
    addNewBean: 'Add New Bean',
    totalBeans: 'Total Bags',
    activeCount: 'Active',
    beanInventory: 'Bean Inventory',
    dailyLimit: 'Daily Limit',
    preferences: 'Preferences',
    appearance: 'Appearance',
    brewRatio: 'Default Brew Ratio',
    tempUnit: 'Temp Unit',
    theme: 'Theme',
    system: 'System',
    general: 'General',
    health: 'Health',
    brewing: 'Brewing',
    data: 'Data',
    dose: 'Dose (g)',
    remaining: 'Remaining',
    date: 'Time',
    aiGuide: 'AI Brew Guide',
    generating: 'Brewing recipe...',
    aiError: 'Failed to generate recipe.',
    review: 'Review',
    editReview: 'Edit Review',
    rebuy: 'Rebuy?',
    notes: 'Notes',
    casual: 'Casual',
    barista: 'Barista',
    expert: 'Expert',
    acidity: 'Acidity',
    sweetness: 'Sweetness',
    body: 'Body',
    bitterness: 'Bitterness',
    aftertaste: 'Aftertaste',
    aroma: 'Aroma',
    balance: 'Balance',
    uniformity: 'Uniformity',
    cleanCup: 'Clean Cup',
    overall: 'Overall',
    totalScore: 'Total Score',
    flavors: 'Flavors',
    defaultReviewMode: 'Default Review Mode',
    noReview: 'No review yet',
  },
  zh: {
    dashboard: '概览',
    addLog: '记录',
    inventory: '豆仓',
    settings: '设置',
    currentLevel: '当前残留',
    todayTotal: '今日',
    mg: '毫克',
    halfLife: '半衰期',
    hours: '小时',
    exportData: '导出数据 (JSON)',
    store: '外购',
    homemade: '自制',
    brand: '品牌',
    product: '商品',
    bean: '豆子',
    method: '方式',
    caffeineEst: '预估含量',
    add: '添加',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    activeBeans: '库存管理',
    history: '历史记录',
    noLogs: '没有找到记录。',
    sleepWarning: '咖啡因较高！',
    metabolismChart: '代谢趋势',
    customBrand: '自定义',
    roast: '烘焙',
    process: '处理',
    beanName: '名称',
    light: '浅烘',
    medium: '中烘',
    dark: '深烘',
    washed: '水洗',
    natural: '日晒',
    honey: '蜜处理',
    anaerobic: '厌氧',
    other: '其他',
    finished: '已喝完',
    reopen: '喝着呢',
    selectBean: '选择豆子...',
    newBrand: '新品牌',
    enterBrandName: '输入品牌名',
    selectBrand: '选择品牌...',
    calendar: '日历',
    searchPlaceholder: '搜索咖啡记录...',
    allHistory: '全部记录',
    clearDate: '清除日期',
    weight: '重量',
    grams: '克',
    addNewBean: '入库新豆',
    totalBeans: '总库存',
    activeCount: '喝着呢',
    beanInventory: '豆仓管理',
    dailyLimit: '每日上限',
    preferences: '偏好设置',
    appearance: '外观',
    brewRatio: '默认粉液比',
    tempUnit: '温度单位',
    theme: '主题',
    system: '跟随系统',
    general: '通用',
    health: '健康管理',
    brewing: '冲煮参数',
    data: '数据管理',
    dose: '粉重 (g)',
    remaining: '剩余',
    date: '时间',
    aiGuide: 'AI 智能冲煮向导',
    generating: '正在生成配方...',
    aiError: '无法生成配方。',
    review: '评价',
    editReview: '修改评价',
    rebuy: '会回购吗？',
    notes: '笔记',
    casual: '休闲',
    barista: '咖啡师',
    expert: '专家(SCA)',
    acidity: '酸度',
    sweetness: '甜感',
    body: '醇度',
    bitterness: '苦度',
    aftertaste: '余韵',
    aroma: '干/湿香',
    balance: '平衡度',
    uniformity: '一致性',
    cleanCup: '干净度',
    overall: '综评',
    totalScore: '总分',
    flavors: '风味标签',
    defaultReviewMode: '默认评价模式',
    noReview: '暂无评价',
  },
  ja: {
    dashboard: 'ホーム',
    addLog: '記録',
    inventory: '豆リスト',
    settings: '設定',
    currentLevel: '現在量',
    todayTotal: '本日',
    mg: 'mg',
    halfLife: '半減期',
    hours: '時間',
    exportData: '出力 (JSON)',
    store: 'お店',
    homemade: '自宅',
    brand: 'ブランド',
    product: '商品',
    bean: '豆',
    method: '淹れ方',
    caffeineEst: '目安量',
    add: '追加',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    activeBeans: '在庫管理',
    history: '履歴',
    noLogs: '記録が見つかりません。',
    sleepWarning: 'カフェイン高め！',
    metabolismChart: '代謝予測',
    customBrand: 'カスタム',
    roast: '焙煎',
    process: '精製',
    beanName: '豆名',
    light: '浅煎り',
    medium: '中煎り',
    dark: '深煎り',
    washed: '水洗',
    natural: '日晒',
    honey: 'ハニー',
    anaerobic: '嫌気性',
    other: 'その他',
    finished: '完飲',
    reopen: '在庫あり',
    selectBean: '豆を選択...',
    newBrand: '新ブランド',
    enterBrandName: 'ブランド名',
    selectBrand: 'ブランド選択...',
    calendar: 'カレンダー',
    searchPlaceholder: '検索...',
    allHistory: '全履歴',
    clearDate: '日付解除',
    weight: '重量',
    grams: 'g',
    addNewBean: '新しい豆を追加',
    totalBeans: '総在庫',
    activeCount: '使用中',
    beanInventory: 'コーヒー豆在庫',
    dailyLimit: '1日摂取上限',
    preferences: '環境設定',
    appearance: '外観',
    brewRatio: '抽出比率',
    tempUnit: '温度単位',
    theme: 'テーマ',
    system: 'システム',
    general: '一般',
    health: '健康管理',
    brewing: '抽出設定',
    data: 'データ管理',
    dose: '使用量 (g)',
    remaining: '残り',
    date: '日時',
    aiGuide: 'AI 抽出ガイド',
    generating: 'レシピ作成中...',
    aiError: '生成に失敗しました。',
    review: 'レビュー',
    editReview: 'レビュー編集',
    rebuy: 'リピートする？',
    notes: 'メモ',
    casual: 'カジュアル',
    barista: 'バリスタ',
    expert: 'エキスパート',
    acidity: '酸味',
    sweetness: '甘み',
    body: 'コク',
    bitterness: '苦味',
    aftertaste: '後味',
    aroma: '香り',
    balance: 'バランス',
    uniformity: '均一性',
    cleanCup: 'クリーン',
    overall: '総合評価',
    totalScore: '総合点',
    flavors: 'フレーバー',
    defaultReviewMode: 'デフォルト評価モード',
    noReview: 'レビューなし',
  },
};

// --- 工具函数 (Utils) ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (ts: number, lang: Language) => {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(ts));
};

const getBrandName = (brandKey: string, lang: Language): string => {
  if (PRESET_BRANDS[brandKey]) {
    return PRESET_BRANDS[brandKey][lang];
  }
  return brandKey;
};

const calculateCurrentLevel = (logs: CoffeeLog[], halfLife: number) => {
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

const getTodayTotal = (logs: CoffeeLog[]) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return logs
    .filter((l) => l.timestamp >= startOfDay.getTime())
    .reduce((acc, curr) => acc + curr.caffeineMg, 0);
};

// --- 图标组件 (Icons) ---
const Icons = {
  Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>,
  Bean: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c1.237 0 2.399-.5 3.268-1.291a6.09 6.09 0 0 1 .55-.55c.194-.194.437-.38.751-.551.315-.172.695-.308 1.133-.308.438 0 .818.136 1.133.308.438 0 .818.136 1.133.308.314.172.557.357.75.551.05.05.1.101.147.153A6.038 6.038 0 0 0 19 21a6 6 0 0 0-6-6 6.09 6.09 0 0 1-2.835-1.402z"/><path d="M5.341 10.62a6 6 0 1 0 5.279-5.28"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  LayoutDashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 5H1"/><path d="M19.5 7.5 21 12l1.5-4.5L24 6l-1.5-1.5L21 0l-1.5 4.5L18 6l1.5 1.5Z"/></svg>,
  ThumbsUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>,
  ThumbsDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>,
  Star: ({ filled }: { filled?: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  Review: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
};

// --- 子组件 (Sub-Components) ---

const CaffeineChart = ({ logs, halfLife, lang }: { logs: CoffeeLog[]; halfLife: number; lang: Language }) => {
  const points = useMemo(() => {
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
  }, [logs, halfLife]);

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

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
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

const Calendar = ({ logs, selectedDate, onSelectDate, lang }: { logs: CoffeeLog[], selectedDate: Date | null, onSelectDate: (d: Date | null) => void, lang: Language }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const hasLog = (day: number) => {
    return logs.some(l => {
      const d = new Date(l.timestamp);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="bg-white dark:bg-[#292524] p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500"><Icons.ChevronLeft /></button>
        <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">
          {currentMonth.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long' })}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500"><Icons.ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-stone-400 font-medium text-center place-items-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="h-8 w-8 flex items-center justify-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-8 w-8" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const active = hasLog(day);
          const selected = isSelected(day);
          return (
            <button
              key={day}
              onClick={() => {
                const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                if (selected) onSelectDate(null);
                else onSelectDate(newDate);
              }}
              className={`h-8 w-8 rounded-full flex flex-col items-center justify-center text-xs relative transition-all mx-auto
                ${selected ? 'bg-[#5C4033] text-white shadow-md' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'}
                ${active && !selected ? 'font-bold' : ''}
              `}
            >
              {day}
              {active && !selected && <div className="w-1 h-1 bg-[#5C4033] rounded-full absolute bottom-1"></div>}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <div className="mt-3 text-center">
          <button onClick={() => onSelectDate(null)} className="text-xs text-[#5C4033] font-medium hover:underline">
            {DICTIONARY[lang].clearDate}
          </button>
        </div>
      )}
    </div>
  );
};

const MobileTabBar = ({ activeTab, onChange, onAdd, t }: { activeTab: ViewState, onChange: (v: ViewState) => void, onAdd: () => void, t: any }) => (
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1c1917] border-t border-stone-200 dark:border-stone-800 px-2 py-2 grid grid-cols-5 gap-1 z-40 pb-safe text-[10px] font-medium text-stone-400 transition-colors">
    <button onClick={() => onChange('dashboard')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'dashboard' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Home />
      <span className="scale-90">{t.dashboard}</span>
    </button>
    <button onClick={() => onChange('calendar')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'calendar' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Calendar />
      <span className="scale-90">{t.history}</span>
    </button>
    
    <div className="flex items-center justify-center -mt-1">
      <button onClick={onAdd} className="w-10 h-10 bg-[#5C4033] text-white rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-[#4a332a]">
         <Icons.Plus />
      </button>
    </div>

    <button onClick={() => onChange('inventory')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'inventory' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Bean />
      <span className="scale-90">{t.inventory}</span>
    </button>
    <button onClick={() => onChange('settings')} className={`flex flex-col items-center justify-center gap-1 ${activeTab === 'settings' ? 'text-[#5C4033]' : 'text-stone-400'}`}>
      <Icons.Settings />
      <span className="scale-90">{t.settings}</span>
    </button>
  </div>
);

const ReviewModalContent = ({ bean, onSave, defaultMode, t }: { bean: Bean, onSave: (r: BeanReview) => void, defaultMode: ReviewMode, t: any }) => {
  const [mode, setMode] = useState<ReviewMode>(defaultMode);
  const [rebuy, setRebuy] = useState(bean.review?.rebuy ?? false);
  const [note, setNote] = useState(bean.review?.note ?? '');
  
  // Casual
  const [rating, setRating] = useState(bean.review?.rating ?? 0);
  
  // Barista
  const [baristaScore, setBaristaScore] = useState(bean.review?.baristaScore ?? { acidity: 3, sweetness: 3, body: 3, bitterness: 3, aftertaste: 3 });
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(bean.review?.flavors ?? []);
  
  // Expert
  const [expertScore, setExpertScore] = useState(bean.review?.expertScore ?? { aroma: 8, flavor: 8, aftertaste: 8, acidity: 8, body: 8, balance: 8, uniformity: 10, cleanCup: 10, sweetness: 10, overall: 8, total: 0 });

  useEffect(() => {
    // Recalculate Expert Total
    const total = Object.values(expertScore).reduce((a, b) => a + b, 0) - expertScore.total;
    if (total !== expertScore.total) setExpertScore(p => ({ ...p, total }));
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

const InventoryView = ({ beans, onAdd, onToggle, onSaveReview, defaultReviewMode, t }: { beans: Bean[], onAdd: (b: Omit<Bean, 'id' | 'isActive'>) => void, onToggle: (id: string) => void, onSaveReview: (id: string, r: BeanReview) => void, defaultReviewMode: ReviewMode, t: any }) => {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [roast, setRoast] = useState<RoastLevel>('medium');
  const [process, setProcess] = useState<ProcessMethod>('washed');
  const [weight, setWeight] = useState<number>(200);
  const [isAdding, setIsAdding] = useState(false);
  const [reviewingBean, setReviewingBean] = useState<Bean | null>(null);

  const groupedBeans = useMemo(() => {
    const groups: Record<string, Bean[]> = {};
    beans.forEach(b => {
      if (!groups[b.brand]) groups[b.brand] = [];
      groups[b.brand].push(b);
    });
    return groups;
  }, [beans]);

  const submit = () => {
    if (!brand || !name) return;
    onAdd({ brand, name, roast, process, weight });
    setBrand(''); setName(''); setWeight(200);
    setIsAdding(false);
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
         <button onClick={() => setIsAdding(!isAdding)} className="bg-[#5C4033] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#4a332a] transition-all flex items-center gap-2">
           {isAdding ? <Icons.X /> : <Icons.Plus />}
           {t.addNewBean}
         </button>
       </div>

       {/* Add Form Area */}
       <div className={`transition-all duration-300 overflow-hidden ${isAdding ? 'max-h-[500px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white dark:bg-[#292524] p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.brand}</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Blue Bottle" className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 placeholder-stone-400 focus:ring-2 focus:ring-[#5C4033]/20" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.beanName}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bella Donovan" className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 placeholder-stone-400 focus:ring-2 focus:ring-[#5C4033]/20" />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.roast}</label>
              <select value={roast} onChange={e => setRoast(e.target.value as any)} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200">{(['light', 'medium', 'dark'] as const).map(r => <option key={r} value={r}>{t[r]}</option>)}</select>
            </div>
            <div>
              <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.process}</label>
              <select value={process} onChange={e => setProcess(e.target.value as any)} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200">{(['washed', 'natural', 'honey', 'anaerobic', 'other'] as const).map(p => <option key={p} value={p}>{t[p]}</option>)}</select>
            </div>
            <div>
              <label className="text-xs text-stone-500 font-bold uppercase ml-1 mb-1 block">{t.weight}</label>
              <div className="relative">
                <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-none text-[#3E2723] dark:text-stone-200 font-bold" />
                <span className="absolute right-4 top-3 text-stone-400 text-sm">{t.grams}</span>
              </div>
            </div>
            <button onClick={submit} disabled={!brand || !name} className="p-3 bg-stone-800 dark:bg-stone-700 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50">{t.save}</button>
          </div>
       </div>

       {/* Bean Grid */}
       {Object.keys(groupedBeans).length === 0 ? (
         <div className="flex flex-col items-center justify-center flex-1 text-stone-400 opacity-50">
           <div className="text-6xl mb-4">🫘</div>
           <p>Your inventory is empty.</p>
         </div>
       ) : (
         <div className="space-y-8 pb-20">
            {Object.entries(groupedBeans).map(([groupBrand, groupBeans]) => (
              <div key={groupBrand}>
                <h3 className="text-lg font-bold text-stone-400 mb-3 px-1">{groupBrand}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupBeans.map(b => (
                    <div key={b.id} className={`group relative p-5 rounded-2xl border transition-all hover:shadow-md ${b.isActive ? 'bg-white dark:bg-[#292524] border-stone-200 dark:border-stone-700' : 'bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-800 opacity-70'}`}>
                       <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${b.roast === 'light' ? 'bg-yellow-100 text-yellow-700' : b.roast === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-700'}`}>{t[b.roast]}</span>
                          <button onClick={() => onToggle(b.id)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${b.isActive ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100' : 'text-stone-400 border-stone-200 hover:bg-stone-200'}`}>
                            {b.isActive ? t.reopen : t.finished}
                          </button>
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
                               {b.review.mode === 'barista' && <div className="text-xs font-bold text-stone-600 dark:text-stone-300">{(Object.values(b.review.baristaScore || {}).reduce((a, b) => a + b, 0) / 5).toFixed(1)} / 5</div>}
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

       {reviewingBean && (
         <Modal title={reviewingBean.review ? t.editReview : t.review} onClose={() => setReviewingBean(null)}>
            <ReviewModalContent 
               bean={reviewingBean} 
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
  const currentLevel = calculateCurrentLevel(logs, settings.caffeineHalfLife);
  const todayTotal = getTodayTotal(logs);

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

  const handleDeleteLog = (id: string) => {
    if (confirm('Delete this record?')) setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleAddBean = (beanData: Omit<Bean, 'id' | 'isActive'>) => {
    const newBean: Bean = { ...beanData, id: generateId(), isActive: true };
    setBeans(prev => [newBean, ...prev]);
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

  // Sub-Renderers
  const LogModalContent = () => {
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
      handleAddLog({
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
        handleAddCustomBrand(newBrandName.trim());
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
        
        Keep it structured and short (under 200 words).`;

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

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.date}</label>
          <input type="datetime-local" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[#3E2723] dark:text-stone-200" />
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
                           {aiRecipe}
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

  const SettingsContent = () => (
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
         <button onClick={() => {
             const data = { logs, beans, settings, customBrands, exportDate: new Date().toISOString() };
             const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a'); a.href = url; a.download = `coffee_data_${Date.now()}.json`; a.click();
          }} className="w-full flex items-center justify-center gap-2 py-3 border border-stone-300 dark:border-stone-600 rounded-xl text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {t.exportData}
        </button>
      </div>
    </div>
  );

  const HistoryList = () => (
    <div className="space-y-3 no-scrollbar pb-20 lg:pb-0">
       {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-stone-400 flex flex-col items-center gap-2">
            <span className="text-2xl">☕️</span>
            <p className="text-sm">{t.noLogs}</p>
          </div>
       ) : (
         filteredLogs.map(log => {
            const bean = beans.find(b => b.id === log.beanId);
            const displayBrand = log.type === 'store' 
              ? (log.storeBrand ? getBrandName(log.storeBrand, settings.language) : 'Unknown')
              : (bean ? bean.brand : 'Unknown Bean');
            return (
              <div key={log.id} className="relative group bg-white dark:bg-[#292524] p-4 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm flex justify-between items-center hover:border-stone-300 dark:hover:border-stone-600 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${log.type === 'store' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{log.type === 'store' ? '🏪' : '🏠'}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-800 dark:text-stone-200 text-sm truncate">{displayBrand}</div>
                    <div className="text-xs text-stone-500 truncate">{log.type === 'store' ? log.productName : `${bean?.name || ''} • ${log.method ? BREW_METHODS[log.method].label[settings.language] : ''}${log.beanWeight ? ` • ${log.beanWeight}g` : ''}`}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                   <div className="font-bold text-[#5C4033] dark:text-[#a68b7c] text-sm">{log.caffeineMg}<span className="text-[10px] font-normal text-stone-400 ml-0.5">mg</span></div>
                   <div className="text-[10px] text-stone-400">{formatDate(log.timestamp, settings.language)}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }} className="absolute right-2 top-2 p-1.5 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 bg-white dark:bg-stone-800 shadow-sm rounded-lg transition-all"><Icons.Trash /></button>
              </div>
            );
         })
       )}
    </div>
  );

  const DashboardLayout = () => (
    <div className="h-full grid lg:grid-cols-[400px_1fr]">
        {/* Middle Column (Manager) - Desktop Only (Shows as Main on Mobile/Tablet if Tab=History) */}
        <div className={`
          flex flex-col h-full bg-[#FDFBF7] dark:bg-[#1c1917] border-r border-stone-200 dark:border-stone-800 overflow-hidden transition-colors
          ${view === 'calendar' ? 'block' : 'hidden lg:flex'} 
          ${view !== 'calendar' && 'lg:flex'}
        `}>
          <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
            <div className="relative shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                <Icons.Search />
              </div>
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#292524] text-[#3E2723] dark:text-stone-200 focus:ring-2 focus:ring-[#5C4033]/20 outline-none"
              />
            </div>
            
            <Calendar logs={logs} selectedDate={selectedDate} onSelectDate={setSelectedDate} lang={settings.language} />
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-2 px-1 sticky top-0 bg-[#FDFBF7] dark:bg-[#1c1917] py-2 z-10">
                <h3 className="font-bold text-stone-700 dark:text-stone-300">{selectedDate ? formatDate(selectedDate.getTime(), settings.language) : t.allHistory}</h3>
                <span className="text-xs bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full">{filteredLogs.length}</span>
              </div>
              <HistoryList />
            </div>
          </div>
        </div>

        {/* Right Column (Dashboard) - Desktop Only (Shows as Main on Mobile/Tablet if Tab=Dashboard) */}
        <div className={`
          flex flex-col h-full overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6 bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors
          ${view === 'dashboard' ? 'block' : 'hidden lg:block'}
        `}>
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-[#5C4033] text-white rounded-lg flex items-center justify-center"><Icons.Coffee /></div>
               <h1 className="font-bold text-xl tracking-tight text-[#3E2723] dark:text-stone-200">Barista</h1>
             </div>
          </header>

          <div className="bg-white dark:bg-[#292524] p-8 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 text-center flex flex-col justify-center relative overflow-hidden group min-h-[250px] shrink-0 transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#5C4033] to-[#8c7a6b]"></div>
            <div className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">{t.currentLevel}</div>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-8xl font-black text-[#5C4033] dark:text-[#a68b7c] tracking-tighter">{currentLevel}</span>
              <span className="text-2xl font-bold text-stone-400">mg</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-stone-500 max-w-xs mx-auto w-full">
               <div className="flex justify-between w-full px-2 text-xs font-bold text-stone-400 uppercase tracking-wide">
                 <span>{t.todayTotal}</span>
                 <span>{Math.round((todayTotal / settings.dailyLimit) * 100)}%</span>
               </div>
               <div className="w-full bg-stone-100 dark:bg-stone-800 h-3 rounded-full overflow-hidden">
                 <div className="bg-[#5C4033] dark:bg-[#a68b7c] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((todayTotal / settings.dailyLimit) * 100, 100)}%` }}></div>
               </div>
               <div className="text-xs text-stone-400">{todayTotal} / {settings.dailyLimit} mg</div>
            </div>
            {currentLevel > settings.safeSleepThreshold * 2 && <div className="mt-6 inline-flex mx-auto items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-sm px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-800 font-medium animate-pulse">⚠️ {t.sleepWarning}</div>}
          </div>

          <div className="flex-1 min-h-[300px]">
             <CaffeineChart logs={logs} halfLife={settings.caffeineHalfLife} lang={settings.language} />
          </div>
        </div>
    </div>
  );

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
         <button onClick={() => setShowLogModal(true)} className="w-full py-4 bg-[#5C4033] text-white font-bold rounded-xl shadow-lg hover:bg-[#4a332a] flex items-center justify-center gap-2"><Icons.Plus /> {t.addLog}</button>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[240px] h-screen overflow-hidden">
        
        {/* View Switcher */}
        {(view === 'dashboard' || view === 'calendar') && <DashboardLayout />}
        
        {view === 'inventory' && (
           <InventoryView beans={beans} onAdd={handleAddBean} onToggle={toggleBeanStatus} onSaveReview={handleSaveReview} defaultReviewMode={settings.defaultReviewMode} t={t} />
        )}
        
        {view === 'settings' && (
           <div className="hidden lg:block p-8 h-full overflow-y-auto bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors">
             <h2 className="text-2xl font-bold mb-8 text-[#3E2723] dark:text-stone-200">{t.settings}</h2>
             <div className="max-w-4xl">
               <SettingsContent />
             </div>
           </div>
        )}

        {/* Mobile/Tablet Views Container */}
        <div className="lg:hidden h-full overflow-y-auto pb-24 bg-[#FDFBF7] dark:bg-[#1c1917] transition-colors">
           {(view === 'dashboard' || view === 'calendar') && <DashboardLayout />}
           {view === 'inventory' && <InventoryView beans={beans} onAdd={handleAddBean} onToggle={toggleBeanStatus} onSaveReview={handleSaveReview} defaultReviewMode={settings.defaultReviewMode} t={t} />}
           {view === 'settings' && <div className="p-4"><h2 className="text-2xl font-bold mb-4 text-[#3E2723] dark:text-stone-200">{t.settings}</h2><SettingsContent /></div>}
        </div>

      </div>

      {/* Mobile/Tablet Bottom Tab Bar - Visible until LG screens */}
      <MobileTabBar activeTab={view} onChange={setView} onAdd={() => setShowLogModal(true)} t={t} />

      {/* Log Modal (Global) */}
      {showLogModal && <Modal title={t.addLog} onClose={() => setShowLogModal(false)}><LogModalContent /></Modal>}

    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);