import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dish, Settings, CartItem, CategoryId } from '../types.ts';
import { translations, Language } from '../i18n.ts';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (typeof translations)['fr'];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  settings: Settings | null;
  dishes: Dish[];
  loadingDishes: boolean;
  refreshDishes: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  cart: CartItem[];
  addToCart: (dish: Dish, quantity?: number, instructions?: string) => void;
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isAdminRoute: boolean;
  setIsAdminRoute: (admin: boolean) => void;
  activeCategory: CategoryId;
  setActiveCategory: (cat: CategoryId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language state (defaults to 'fr', supports 'ar', 'fr', 'en')
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('cb_lang');
    return saved === 'ar' || saved === 'fr' || saved === 'en' ? (saved as Language) : 'fr';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('cb_lang', newLang);
  };

  // Sync HTML lang and dir attributes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // 2. Theme state (default prefers-color-scheme)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('cb_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('cb_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 3. Settings state
  const [settings, setSettings] = useState<Settings | null>(null);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // 4. Dishes state
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);

  const refreshDishes = async () => {
    try {
      setLoadingDishes(true);
      const res = await fetch('/api/dishes');
      if (res.ok) {
        const data = await res.json();
        setDishes(data);
      }
    } catch (err) {
      console.error('Failed to load dishes:', err);
    } finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    refreshSettings();
    refreshDishes();
  }, []);

  // 5. Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('cb_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cb_cart', JSON.stringify(cart));
    } catch (err) {
      console.error('Cart sync error:', err);
    }
  }, [cart]);

  const addToCart = (dish: Dish, quantity: number = 1, instructions?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.dish.id === dish.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        if (instructions) updated[existingIndex].instructions = instructions;
        return updated;
      }
      return [...prev, { dish, quantity, instructions }];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => prev.filter((item) => item.dish.id !== dishId));
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.dish.id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 6. UI drawers & route state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#admin');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const t = translations[lang];

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        theme,
        toggleTheme,
        settings,
        dishes,
        loadingDishes,
        refreshDishes,
        refreshSettings,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        isChatOpen,
        setIsChatOpen,
        isAdminRoute,
        setIsAdminRoute,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
