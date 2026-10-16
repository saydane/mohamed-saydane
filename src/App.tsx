import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { MenuSection } from './components/MenuSection.tsx';
import { BookingSection } from './components/BookingSection.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ChatbotDrawer } from './components/ChatbotDrawer.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Footer } from './components/Footer.tsx';

const AppContent: React.FC = () => {
  const { isAdminRoute, settings } = useApp();

  // Inject Schema.org JSON-LD Structured Data for Restaurant (SEO Phase 6)
  useEffect(() => {
    const scriptId = 'restaurant-schema-ld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: settings?.restaurant_name_fr || 'Coeur de Bouskoura',
      alternateName: settings?.restaurant_name_ar || 'قلب بوسكورة',
      image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=80',
      servesCuisine: ['Moroccan', 'Maghreb', 'Halal'],
      priceRange: '25 DH - 180 DH',
      telephone: settings?.phone || '+212522123456',
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings?.address_fr || 'Route de Bouskoura',
        addressLocality: 'Bouskoura, Casablanca',
        addressRegion: 'Casablanca-Settat',
        addressCountry: 'MA',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 33.4489,
        longitude: -7.6489,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: settings?.opening_time || '12:00',
          closes: settings?.closing_time || '23:30',
        },
      ],
      acceptsReservations: 'True',
    };

    scriptEl.textContent = JSON.stringify(schemaData);
  }, [settings]);

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 dark:bg-stone-950 light:bg-stone-50 text-stone-100 dark:text-stone-100 light:text-stone-900 transition-colors">
      <Header />
      <main className="flex-1">
        <Hero />
        <MenuSection />
        <BookingSection />
      </main>
      <Footer />
      <CartDrawer />
      <ChatbotDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
