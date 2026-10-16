import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { X, Trash2, Plus, Minus, MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { lang, t, cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart, cartTotal, settings } =
    useApp();

  const [orderNote, setOrderNote] = useState('');

  if (!isCartOpen) return null;

  // Build safe WhatsApp message with length cap and encodeURIComponent
  const rawWa = (settings?.whatsapp || '212661234567').replace(/\D/g, '');
  const brandName = lang === 'ar'
    ? (settings?.restaurant_name_ar || 'قلب بوسكورة')
    : (settings?.restaurant_name_fr || 'Coeur de Bouskoura');

  const buildWhatsAppLink = (): string => {
    const isAr = lang === 'ar';
    const isEn = lang === 'en';
    let msg = isAr
      ? `*طلب جديد من مطعم ${brandName}*\n\n`
      : isEn
      ? `*New Order from ${brandName}*\n\n`
      : `*Nouvelle Commande chez ${brandName}*\n\n`;

    cart.forEach((item, idx) => {
      const name = isAr ? item.dish.name_ar : item.dish.name_fr;
      const line = `${idx + 1}. *${name}* x${item.quantity} = ${item.dish.price * item.quantity} DH\n`;
      msg += line;
    });

    msg += isAr
      ? `\n💰 *المجموع الإجمالي: ${cartTotal} درهم*\n`
      : isEn
      ? `\n💰 *Total: ${cartTotal} DH*\n`
      : `\n💰 *Total : ${cartTotal} DH*\n`;

    if (orderNote.trim()) {
      msg += isAr
        ? `📝 *ملاحظات:* ${orderNote.trim().slice(0, 200)}\n`
        : isEn
        ? `📝 *Special Instructions:* ${orderNote.trim().slice(0, 200)}\n`
        : `📝 *Instructions:* ${orderNote.trim().slice(0, 200)}\n`;
    }

    msg += isAr
      ? `\nيرجى تأكيد الطلب ووقت التجهيز وشكراً!`
      : isEn
      ? `\nPlease confirm order acceptance and estimated prep time. Thank you!`
      : `\nMerci de confirmer la prise en charge et le délai de préparation !`;

    // Cap message length at 1500 chars to avoid WhatsApp/browser URL overflow
    const cappedMsg = msg.slice(0, 1500);
    return `https://wa.me/${rawWa}?text=${encodeURIComponent(cappedMsg)}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className={`fixed inset-y-0 ${lang === 'ar' ? 'left-0' : 'right-0'} max-w-full flex pl-0 sm:pl-10`}>
        <div className="w-screen max-w-md bg-stone-900 border-x border-amber-600/30 text-stone-100 flex flex-col justify-between shadow-2xl">
          
          {/* Header */}
          <div className="p-6 border-b border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 id="cart-drawer-title" className="font-moroccan font-bold text-xl text-amber-300">
                  {t.cart_title}
                </h2>
                <span className="text-xs text-stone-400">
                  {cart.length} {cart.length === 1 ? 'article' : 'articles'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              aria-label="Fermer le panier"
              className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500/60 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-moroccan font-bold text-lg text-stone-200">{t.cart_empty}</h3>
                <p className="text-stone-400 text-xs sm:text-sm max-w-xs mx-auto">
                  {t.cart_empty_sub}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-6 py-2.5 rounded-full bg-amber-600 text-stone-950 font-bold text-xs uppercase tracking-wider"
                >
                  {t.hero_cta_menu}
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => {
                    const name = lang === 'ar' ? item.dish.name_ar : item.dish.name_fr;
                    return (
                      <div
                        key={item.dish.id}
                        className="p-3.5 rounded-2xl bg-stone-950/60 border border-amber-900/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-moroccan font-semibold text-sm text-stone-100 truncate">
                            {name}
                          </h4>
                          <span className="text-xs text-amber-400 font-mono">
                            {item.dish.price} {t.cart_dh}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 bg-stone-900 px-2 py-1 rounded-full border border-amber-900/30">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.dish.id, -1)}
                            aria-label="Diminuer la quantité"
                            className="p-1 rounded-full text-stone-400 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-stone-100 px-1 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.dish.id, 1)}
                            aria-label="Augmenter la quantité"
                            className="p-1 rounded-full text-stone-400 hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.dish.id)}
                          aria-label={`Supprimer ${name}`}
                          className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Clear Cart Button */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-stone-500 hover:text-rose-400 underline transition-colors"
                  >
                    {t.cart_clear}
                  </button>
                </div>

                {/* Special Instructions Note */}
                <div className="pt-2">
                  <label htmlFor="cart-note" className="block text-xs font-medium text-stone-400 mb-1.5">
                    {t.cart_special_instructions}
                  </label>
                  <textarea
                    id="cart-note"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={2}
                    maxLength={200}
                    placeholder="Ex: Sans oignons, sauce à part, livraison ou à emporter..."
                    className="w-full p-2.5 rounded-xl bg-stone-950/80 border border-amber-900/30 text-stone-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer with Total and 1-Tap WhatsApp Order */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-amber-900/30 bg-stone-950/80 space-y-4">
              <div className="flex items-center justify-between text-base">
                <span className="font-moroccan font-bold text-stone-300">{t.cart_total}</span>
                <span className="font-mono font-bold text-2xl text-amber-400">
                  {cartTotal} {t.cart_dh}
                </span>
              </div>

              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{t.cart_order_whatsapp}</span>
              </a>

              <p className="text-[11px] text-stone-400 text-center leading-tight">
                {t.cart_whatsapp_note}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
