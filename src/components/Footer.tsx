import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { MapPin, Phone, Clock, MessageCircle, UtensilsCrossed, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { lang, t, settings } = useApp();

  const brandName = lang === 'ar'
    ? (settings?.restaurant_name_ar || 'قلب بوسكورة')
    : (settings?.restaurant_name_fr || 'Coeur de Bouskoura');

  const tagline = lang === 'ar'
    ? (settings?.tagline_ar || 'أصالة الطبخ المغربي الرفيع في قلب بوسكورة')
    : (settings?.tagline_fr || 'Haute Gastronomie Marocaine au Cœur de Bouskoura');

  const hours = lang === 'ar'
    ? (settings?.hours_ar || 'يومياً: من 12:00 إلى 23:30')
    : (settings?.hours_fr || 'Tous les jours : 12h00 - 23h30');

  const address = lang === 'ar'
    ? (settings?.address_ar || 'طريق بوسكورة، الدار البيضاء، المغرب')
    : (settings?.address_fr || 'Route de Bouskoura, Casablanca, Maroc');

  const rawWa = (settings?.whatsapp || '212661234567').replace(/\D/g, '');

  return (
    <footer id="contact" className="bg-stone-950 dark:bg-stone-950 light:bg-stone-900 text-stone-300 border-t border-amber-900/30 pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Column 1: Brand & Identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold border border-amber-300/40">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="font-moroccan font-bold text-2xl text-amber-300">
                {brandName}
              </span>
            </div>

            <p className="text-stone-400 text-sm italic font-serif max-w-md">
              « {tagline} »
            </p>

            <p className="text-stone-400 text-xs leading-relaxed max-w-md">
              {lang === 'ar'
                ? 'مطعم مغربي يرحب بكم في قلب طبيعة بوسكورة الهادئة بالدار البيضاء لتذوق أشهى الطواجن والمشويات والحلويات التقليدية.'
                : lang === 'en'
                ? 'Nestled in the tranquil green forest of Bouskoura, Casablanca, Coeur de Bouskoura celebrates Moroccan culinary heritage at its finest.'
                : 'Niché dans la quiétude et la verdure de Bouskoura à Casablanca, Coeur de Bouskoura célèbre l’art culinaire marocain dans sa plus haute expression.'}
            </p>
          </div>

          {/* Column 2: Hours */}
          <div className="space-y-3">
            <h4 className="font-moroccan font-bold text-amber-400 text-sm tracking-wider uppercase flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t.footer_hours}</span>
            </h4>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {hours}
            </p>
            <span className="inline-block text-[11px] text-amber-400/80 font-mono bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/30">
              Fuseau horaire : Africa/Casablanca
            </span>
          </div>

          {/* Column 3: Contact & Access */}
          <div className="space-y-3">
            <h4 className="font-moroccan font-bold text-amber-400 text-sm tracking-wider uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{t.footer_address}</span>
            </h4>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {address}
            </p>
            <div className="space-y-1.5 pt-1 text-xs">
              <a
                href={`tel:${settings?.phone || '+212522123456'}`}
                className="flex items-center gap-2 text-stone-300 hover:text-amber-400 transition-colors font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{settings?.phone || '+212 522 123 456'}</span>
              </a>
              <a
                href={`https://wa.me/${rawWa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp : +{rawWa}</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Copyright & Discreet Admin Link */}
        <div className="pt-8 border-t border-amber-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {brandName}. {t.footer_rights}</p>

          <div className="flex items-center gap-4">
            <span className="text-[11px]">Bouskoura, Casablanca, Maroc</span>
            
            {/* Discreet Link to #admin (Phase 5: #admin route, no public nav link) */}
            <a
              href="#admin"
              className="text-stone-600 hover:text-amber-500/70 p-1 transition-colors"
              title="Accès Administrateur"
              aria-label="Accès Administrateur"
            >
              <Lock className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
