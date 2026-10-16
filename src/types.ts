export type CategoryId = 'all' | 'starters' | 'mains' | 'grills' | 'desserts' | 'drinks';

export interface Dish {
  id: string;
  name_ar: string;
  name_fr: string;
  desc_ar: string;
  desc_fr: string;
  price: number;
  category: string;
  available: number;
  featured: number;
  sort_order: number;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  restaurant_name_fr: string;
  restaurant_name_ar: string;
  phone: string;
  whatsapp: string;
  tagline_fr: string;
  tagline_ar: string;
  hours_fr: string;
  hours_ar: string;
  opening_time: string;
  closing_time: string;
  timezone: string;
  address_fr: string;
  address_ar: string;
  hero_subtitle_fr: string;
  hero_subtitle_ar: string;
  theme_accent: string;
  announcement_fr?: string;
  announcement_ar?: string;
  [key: string]: string | undefined;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  instructions?: string;
}

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CartAction {
  type: 'ADD_TO_CART';
  dishId: string;
  quantity: number;
  dishName?: string;
  dishNameAr?: string;
  dishNameFr?: string;
  dishPrice?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'rule' | 'cache' | 'gemini' | 'whatsapp_fallback';
  timestamp: string;
  action?: CartAction;
}
