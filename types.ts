
export type Language = 'en' | 'zh' | 'ja';
export type CoffeeType = 'homemade' | 'store';
export type RoastLevel = 'light' | 'medium' | 'dark';
export type ProcessMethod = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';
export type BrewMethod = 'pour_over' | 'espresso' | 'aeropress' | 'french_press' | 'cold_brew' | 'moka' | 'other';
export type ViewState = 'dashboard' | 'calendar' | 'inventory' | 'settings';
export type ThemeOption = 'light' | 'dark' | 'system';
export type ReviewMode = 'casual' | 'barista' | 'expert';

export interface BeanReview {
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

export interface Bean {
  id: string;
  brand: string;
  name: string;
  roast: RoastLevel;
  process: ProcessMethod;
  weight: number; // in grams
  isActive: boolean; // false means finished
  review?: BeanReview;
}

export interface CoffeeLog {
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
  review?: BeanReview;
}

export interface AppSettings {
  language: Language;
  caffeineHalfLife: number; // in hours, default 5
  safeSleepThreshold: number; // mg, default 50
  dailyLimit: number; // mg, default 400
  brewRatio: number; // 1:x, default 15
  tempUnit: 'c' | 'f';
  theme: ThemeOption;
  defaultReviewMode: ReviewMode;
}
