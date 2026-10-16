import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ShoppingBag, Moon, Sun, Globe, Calendar, UtensilsCrossed } from 'lucide-react';

export const Header: React.FC = () => {
  const { lang, setLang, t, theme, toggleTheme, cartCount, setIsCartOpen, settings } = useApp();

  const brandName = lang === 'ar' 
    ? (settings?.restaurant_name_ar || 'قلب بوسكورة')
    : (settings?.restaurant_name_fr || 'Coeur de Bouskoura');

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-stone-950/85 dark:bg-stone-950/90 light:bg-stone-50/90 border-b border-amber-900/30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <a href="#" className="flex items-center gap-2 sm:gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/20 text-stone-950 font-bold border border-amber-300/40 transform group-hover:scale-105 transition-transform flex-shrink-0">
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-moroccan font-bold text-base sm:text-2xl tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent block truncate">
              {brandName}
            </span>
            <span className="text-[10px] sm:text-xs text-amber-500/80 tracking-wider uppercase block font-medium truncate">
              Bouskoura • Casablanca
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a
            href="#menu"
            className="text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-400 transition-colors"
          >
            {t.nav_menu}
          </a>
          <a
            href="#booking"
            className="text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-400 transition-colors"
          >
            {t.nav_booking}
          </a>
          <a
            href="#contact"
            className="text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-400 transition-colors"
          >
            {t.nav_contact}
          </a>
        </nav>

        {/* Action Controls: Lang, Theme, Cart, Quick Book */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          
          {/* 3-Language Switcher (AR, FR, EN) */}
          <div className="flex items-center rounded-full p-0.5 border border-amber-800/40 bg-stone-900/80 dark:bg-stone-900/80 light:bg-stone-200/90 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setLang('ar')}
              aria-label="العربية (الدارجة)"
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                lang === 'ar'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-300'
              }`}
              style={{ fontFamily: "'Tajawal', 'Amiri', sans-serif" }}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang('fr')}
              aria-label="Français"
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                lang === 'fr'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-300'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-label="English"
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                lang === 'en'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'text-stone-300 dark:text-stone-300 light:text-stone-700 hover:text-amber-300'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.theme_light : t.theme_dark}
            className="p-1.5 sm:p-2 rounded-full border border-amber-800/40 bg-stone-900/60 dark:bg-stone-900/60 light:bg-stone-200/80 text-amber-400 hover:text-amber-300 transition-colors focus:ring-2 focus:ring-amber-500"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-stone-800" />}
          </button>

          {/* Cart Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`${t.cart_title} (${cartCount} articles)`}
            className="relative p-2 sm:p-2.5 rounded-full border border-amber-600/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors focus:ring-2 focus:ring-amber-500"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 bg-amber-600 text-stone-950 font-bold text-[10px] sm:text-xs rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Quick Book Button */}
          <a
            href="#booking"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-amber-900/30"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.nav_booking}</span>
          </a>

        </div>

      </div>
    </header>
  );
};
