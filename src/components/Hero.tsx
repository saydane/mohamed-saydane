import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Utensils, Calendar, MessageCircle, Clock, MapPin, Sparkles, Phone } from 'lucide-react';

export const Hero: React.FC = () => {
  const { lang, t, settings } = useApp();

  const brandName = lang === 'ar'
    ? (settings?.restaurant_name_ar || 'قلب بوسكورة')
    : (settings?.restaurant_name_fr || 'Coeur de Bouskoura');

  const tagline = lang === 'ar'
    ? (settings?.tagline_ar || 'أصالة الطبخ المغربي الرفيع في قلب بوسكورة')
    : lang === 'en'
    ? (settings?.tagline_en || t.tagline)
    : (settings?.tagline_fr || 'Haute Gastronomie Marocaine au Cœur de Bouskoura');

  const subtitle = lang === 'ar'
    ? (settings?.hero_subtitle_ar || 'تجربة ضيافة مغربية راقية تجمع بين عبق التقاليد ونكهات الأطلس والشاوية في جو ساحر.')
    : lang === 'en'
    ? (settings?.hero_subtitle_en || 'An exceptional Moroccan fine dining journey blending authentic terroir flavors, Atlas heritage and warm hospitality in Bouskoura.')
    : (settings?.hero_subtitle_fr || 'Une expérience culinaire marocaine d’exception mêlant authenticité, saveurs du terroir et convivialité raffinée.');

  const hours = lang === 'ar'
    ? (settings?.hours_ar || 'يومياً: من 12:00 إلى 23:30')
    : lang === 'en'
    ? (settings?.hours_en || 'Daily: 12:00 PM - 11:30 PM')
    : (settings?.hours_fr || 'Tous les jours : 12h00 - 23h30');

  const address = lang === 'ar'
    ? (settings?.address_ar || 'طريق بوسكورة، الدار البيضاء، المغرب')
    : lang === 'en'
    ? (settings?.address_en || 'Route de Bouskoura, Casablanca, Morocco')
    : (settings?.address_fr || 'Route de Bouskoura, Casablanca, Maroc');

  const rawWa = (settings?.whatsapp || '212661234567').replace(/\D/g, '');
  const waOrderText = encodeURIComponent(
    lang === 'ar'
      ? 'السلام عليكم، أود الاستفسار والطلب من مطعم قلب بوسكورة.'
      : lang === 'en'
      ? 'Hello Coeur de Bouskoura, I would like to place an order.'
      : 'Bonjour Coeur de Bouskoura, je souhaite passer une commande.'
  );
  const waUrl = `https://wa.me/${rawWa}?text=${waOrderText}`;

  const announcement = lang === 'ar' ? settings?.announcement_ar : (lang === 'en' ? (settings?.announcement_en || settings?.announcement_fr) : settings?.announcement_fr);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 lg:py-28 bg-stone-950 dark:bg-stone-950 light:bg-stone-100 transition-colors">
      {/* Decorative Moroccan subtle background glow and motifs */}
      <div className="absolute inset-0 bg-moroccan-pattern dark:bg-moroccan-pattern light:bg-moroccan-pattern-light opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-600/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Top Announcement Badge */}
        {announcement && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-6 animate-fade-in shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{announcement}</span>
          </div>
        )}

        {/* Moroccan Heritage Sub-badge */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-amber-400 uppercase font-moroccan">
            {t.hero_badge}
          </span>
          <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-amber-500/60" />
        </div>

        {/* Grand Restaurant Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-moroccan tracking-tight text-stone-100 dark:text-stone-100 light:text-stone-900 mb-4 leading-tight">
          <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
            {brandName}
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-2xl font-serif text-amber-200/90 dark:text-amber-200/90 light:text-amber-800 font-medium max-w-3xl mx-auto mb-4 italic">
          « {tagline} »
        </p>

        {/* Subtitle / Atmosphere description */}
        <p className="text-sm sm:text-base text-stone-400 dark:text-stone-400 light:text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          {subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-12">
          
          <a
            href="#menu"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm sm:text-base tracking-wide shadow-lg shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Utensils className="w-4 h-4" />
            <span>{t.hero_cta_menu}</span>
          </a>

          <a
            href="#booking"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full border border-amber-500/50 bg-stone-900/80 dark:bg-stone-900/80 light:bg-white text-amber-400 hover:bg-amber-950/30 hover:border-amber-400 font-bold text-sm sm:text-base tracking-wide transition-all shadow-md"
          >
            <Calendar className="w-4 h-4" />
            <span>{t.hero_cta_booking}</span>
          </a>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full border border-emerald-600/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold text-sm sm:text-base transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.hero_whatsapp}</span>
          </a>

        </div>

        {/* Restaurant Quick Facts: Hours, Location, Phone */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-amber-900/30 text-xs sm:text-sm text-stone-300 dark:text-stone-300 light:text-stone-700">
          
          <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-stone-900/40 dark:bg-stone-900/40 light:bg-stone-200/50 border border-amber-900/20">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium">{hours}</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-stone-900/40 dark:bg-stone-900/40 light:bg-stone-200/50 border border-amber-900/20">
            <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium">{address}</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-stone-900/40 dark:bg-stone-900/40 light:bg-stone-200/50 border border-amber-900/20">
            <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <a href={`tel:${settings?.phone || '+212522123456'}`} className="hover:text-amber-400 transition-colors font-medium">
              {settings?.phone || '+212 522 123 456'}
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
