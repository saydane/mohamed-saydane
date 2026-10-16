import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Dish, CategoryId } from '../types.ts';
import { Search, Plus, Check, Star, Utensils, X, Eye } from 'lucide-react';

export const MenuSection: React.FC = () => {
  const {
    lang,
    t,
    dishes,
    loadingDishes,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    addToCart,
    setIsCartOpen,
  } = useApp();

  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const categories: { id: CategoryId; label: string }[] = [
    { id: 'all', label: t.categories.all },
    { id: 'starters', label: t.categories.starters },
    { id: 'mains', label: t.categories.mains },
    { id: 'grills', label: t.categories.grills },
    { id: 'desserts', label: t.categories.desserts },
    { id: 'drinks', label: t.categories.drinks },
  ];

  // Filter and sort dishes: dishes with photos first, then by featured, then sort order
  const filteredDishes = useMemo(() => {
    return dishes
      .filter((dish) => {
        const matchesCategory = activeCategory === 'all' || dish.category === activeCategory;
        if (!matchesCategory) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const nameMatch =
          dish.name_ar.toLowerCase().includes(q) || dish.name_fr.toLowerCase().includes(q);
        const descMatch =
          dish.desc_ar.toLowerCase().includes(q) || dish.desc_fr.toLowerCase().includes(q);
        return nameMatch || descMatch;
      })
      .sort((a, b) => {
        // Available dishes first
        if (a.available !== b.available) return b.available - a.available;
        // Dishes with photo first
        const aHasImage = !!(a.image && a.image.trim());
        const bHasImage = !!(b.image && b.image.trim());
        if (aHasImage !== bHasImage) return aHasImage ? -1 : 1;
        // Featured next
        if (a.featured !== b.featured) return b.featured - a.featured;
        // Sort order
        return a.sort_order - b.sort_order;
      });
  }, [dishes, activeCategory, searchQuery]);

  const handleAddToCart = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    if (!dish.available) return;
    addToCart(dish, 1);
    setJustAddedId(dish.id);
    setTimeout(() => setJustAddedId(null), 1200);
  };

  return (
    <section id="menu" className="py-16 sm:py-24 bg-stone-900/40 dark:bg-stone-900/40 light:bg-stone-50 border-t border-amber-900/30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-3 font-moroccan">
            <Utensils className="w-3.5 h-3.5" />
            <span>{t.nav_menu}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-moroccan text-stone-100 dark:text-stone-100 light:text-stone-900 tracking-tight mb-4">
            {lang === 'ar' ? 'أطايب المطبخ المغربي الأصيل' : lang === 'en' ? 'The Fine Moroccan Menu' : 'La Carte Gastronomique'}
          </h2>
          <p className="text-stone-400 dark:text-stone-400 light:text-stone-600 text-sm sm:text-base">
            {lang === 'ar'
              ? 'مكونات بلدية طازجة، بهارات مطحونة تقليدياً، ووصفات فاسية ومراكشية متوارثة عبر الأجيال.'
              : lang === 'en'
              ? 'Fresh local farm ingredients, hand-ground spices and ancestral recipes simmered in true Moroccan tradition.'
              : 'Des ingrédients frais du terroir, épices moulues à la main et recettes ancestrales mijotées dans le respect des traditions.'}
          </p>
        </div>

        {/* Search Bar & Stats */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.menu_search_placeholder}
              aria-label={t.menu_search_placeholder}
              className="w-full pl-12 pr-10 py-3.5 rounded-full bg-stone-950/70 dark:bg-stone-950/70 light:bg-white border border-amber-900/40 focus:border-amber-500 text-stone-100 dark:text-stone-100 light:text-stone-900 placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.menu_clear_search}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-900/30 scale-105'
                    : 'bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-200/80 text-stone-300 dark:text-stone-300 light:text-stone-700 hover:bg-stone-800/80 border border-amber-900/20'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Dishes Grid */}
        {loadingDishes ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-stone-900/40 border border-amber-900/20 animate-pulse"
              />
            ))}
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-center py-16 px-4 bg-stone-950/40 rounded-2xl border border-amber-900/20 max-w-md mx-auto">
            <Utensils className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
            <p className="text-stone-300 text-base font-medium mb-4">{t.menu_no_results}</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-5 py-2 rounded-full bg-amber-600 text-stone-950 font-bold text-xs"
            >
              {t.menu_clear_search}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredDishes.map((dish) => {
              const hasPhoto = !!(dish.image && dish.image.trim());
              const name = lang === 'ar' ? dish.name_ar : dish.name_fr;
              const secondaryName = lang === 'ar' ? dish.name_fr : dish.name_ar;
              const desc = lang === 'ar' ? dish.desc_ar : dish.desc_fr;
              const isAdded = justAddedId === dish.id;

              return (
                <div
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border flex flex-col justify-between ${
                    dish.available
                      ? 'bg-stone-950/70 dark:bg-stone-950/70 light:bg-white border-amber-900/30 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-950/20 hover:-translate-y-1'
                      : 'bg-stone-950/40 border-stone-800 opacity-60'
                  }`}
                >
                  {/* Dish Visual: Photo or Moroccan Gradient Text Card */}
                  {hasPhoto ? (
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-900">
                      <img
                        src={dish.image!}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                      
                      {/* Featured Badge */}
                      {dish.featured ? (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-600/90 text-stone-950 text-xs font-bold shadow-md">
                          <Star className="w-3 h-3 fill-stone-950" />
                          <span>Spécialité</span>
                        </div>
                      ) : null}

                      {/* Quick Details Eye */}
                      <div className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/60 text-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    /* Elegant Moroccan Gradient Card (Never mismatched photos!) */
                    <div className="relative h-44 sm:h-48 w-full p-6 flex flex-col justify-between bg-gradient-to-br from-amber-950/70 via-stone-900 to-amber-900/30 border-b border-amber-800/30 overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-moroccan">
                          {t.card_authentic_recipe}
                        </span>
                        {dish.featured ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <p className="font-arabic-title text-xl text-amber-200 line-clamp-1 font-bold">
                          {name}
                        </p>
                        <p className="text-xs text-amber-400/80 font-serif italic mt-0.5">
                          {secondaryName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dish Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-moroccan font-bold text-lg text-stone-100 dark:text-stone-100 light:text-stone-900 group-hover:text-amber-400 transition-colors">
                          {name}
                        </h3>
                        <span className="flex-shrink-0 text-base font-bold text-amber-400 font-mono">
                          {dish.price} {t.menu_price_unit}
                        </span>
                      </div>

                      <p className="text-stone-400 dark:text-stone-400 light:text-stone-600 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                        {desc}
                      </p>
                    </div>

                    {/* Bottom Action: Add to Cart */}
                    <div className="pt-3 border-t border-amber-900/20 flex items-center justify-between">
                      <span className="text-xs text-stone-500 italic">
                        {dish.available ? (
                          secondaryName
                        ) : (
                          <span className="text-rose-400">{t.menu_unavailable}</span>
                        )}
                      </span>

                      {dish.available ? (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(e, dish)}
                          aria-label={`${t.menu_add_to_cart} ${name}`}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 border border-amber-600/40'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Ajouté</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{t.menu_add_to_cart}</span>
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Dish Quick Detail Modal */}
      {selectedDish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dish-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedDish(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-stone-900 border border-amber-600/40 p-6 sm:p-8 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedDish(null)}
              aria-label="Fermer"
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-800/80 text-stone-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedDish.image && (
              <div className="h-56 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 overflow-hidden">
                <img
                  src={selectedDish.image}
                  alt={selectedDish.name_fr}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 id="dish-modal-title" className="font-moroccan font-bold text-2xl text-amber-300">
                  {lang === 'ar' ? selectedDish.name_ar : selectedDish.name_fr}
                </h3>
                <p className="text-stone-400 font-serif italic text-sm">
                  {lang === 'ar' ? selectedDish.name_fr : selectedDish.name_ar}
                </p>
              </div>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {selectedDish.price} {t.menu_price_unit}
              </span>
            </div>

            <div className="my-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-amber-900/30">
                <p className="text-xs text-amber-400 font-semibold mb-1 uppercase tracking-wider">
                  Description (FR)
                </p>
                <p className="text-stone-300 text-sm leading-relaxed">{selectedDish.desc_fr}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-amber-900/30 text-right" dir="rtl">
                <p className="text-xs text-amber-400 font-semibold mb-1 uppercase tracking-wider">
                  الوصف (العربية)
                </p>
                <p className="text-stone-300 text-sm leading-relaxed font-arabic-title">{selectedDish.desc_ar}</p>
              </div>
            </div>

            {selectedDish.available ? (
              <button
                type="button"
                onClick={(e) => {
                  handleAddToCart(e, selectedDish);
                  setSelectedDish(null);
                  setIsCartOpen(true);
                }}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t.menu_add_to_cart} • {selectedDish.price} {t.menu_price_unit}</span>
              </button>
            ) : (
              <p className="text-center text-rose-400 text-sm font-semibold">{t.menu_unavailable}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
