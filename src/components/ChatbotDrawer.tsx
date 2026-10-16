import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ChatMessage } from '../types.ts';
import { MessageSquare, X, Send, Sparkles, MessageCircle, Bot, ShoppingBag, ArrowRight, Check } from 'lucide-react';

export const ChatbotDrawer: React.FC = () => {
  const { lang, t, isChatOpen, setIsChatOpen, settings, addToCart, dishes, setIsCartOpen } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  
  const getWelcomeText = (currentLang: string) => {
    if (currentLang === 'ar') {
      return 'مرحباً بكم فـ «قلب بوسكورة»! أنا المساعد الذكي، يمكنكم سؤالي عن الأطباق والأسعار، أو طلب أي طبق مباشرة ليُضاف إلى سلتكم (مثلاً: "كومودي ليا كسكس").';
    }
    if (currentLang === 'en') {
      return 'Welcome to Coeur de Bouskoura! I am your AI assistant. You can ask me about dishes, prices, hours, or tell me to add any dish directly to your cart (e.g. "order couscous for me")!';
    }
    return 'Bienvenue chez Coeur de Bouskoura ! Je suis votre assistant IA. Posez-moi vos questions ou demandez-moi d’ajouter un plat à votre panier (ex: "ajoute un couscous au panier").';
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: getWelcomeText(lang),
      source: 'gemini',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [toastItem, setToastItem] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Update initial welcome message when language changes if no interaction has taken place yet
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-msg') {
        return [
          {
            ...prev[0],
            text: getWelcomeText(lang),
          },
        ];
      }
      return prev;
    });
  }, [lang]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Prepare history (last 6 validated messages)
      const history = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          text: m.text,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      // AUTO ADD TO CART ACTION DETECTION
      if (data.action && data.action.type === 'ADD_TO_CART') {
        const dishId = data.action.dishId;
        const targetDish = dishes.find((d) => d.id === dishId) || {
          id: dishId,
          name_ar: data.action.dishNameAr || data.action.dishName || 'طبق مغربي',
          name_fr: data.action.dishNameFr || data.action.dishName || 'Plat Marocain',
          desc_ar: '',
          desc_fr: '',
          price: data.action.dishPrice || 0,
          category: 'mains',
          available: 1,
          featured: 0,
          sort_order: 99,
        };

        addToCart(targetDish, data.action.quantity || 1);
        
        // Show brief visual feedback toast
        const addedTitle = lang === 'ar' ? targetDish.name_ar : targetDish.name_fr;
        setToastItem(addedTitle);
        setTimeout(() => setToastItem(null), 3000);
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || (lang === 'ar' ? 'عذراً، وقع خطأ.' : lang === 'en' ? 'Sorry, an error occurred.' : 'Désolé, une erreur est survenue.'),
        source: data.source || 'gemini',
        action: data.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text:
            lang === 'ar'
              ? 'عذراً، وقع خطأ في الاتصال. يمكنكم التواصل معنا مباشرة عبر واتساب.'
              : lang === 'en'
              ? 'Sorry, a connection error occurred. Please contact us directly on WhatsApp.'
              : 'Désolé, une erreur de connexion est survenue. N’hésitez pas à nous contacter sur WhatsApp.',
          source: 'whatsapp_fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const rawWa = (settings?.whatsapp || '212661234567').replace(/\D/g, '');
  const waHelpUrl = `https://wa.me/${rawWa}?text=${encodeURIComponent(
    lang === 'ar'
      ? 'السلام عليكم، أود التواصل مع خدمة الزبناء لمطعم قلب بوسكورة.'
      : lang === 'en'
      ? 'Hello Coeur de Bouskoura, I would like to speak with a customer representative.'
      : 'Bonjour Coeur de Bouskoura, je souhaite parler à un conseiller.'
  )}`;

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          aria-label={t.chat_title}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-950 shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-amber-500/50"
        >
          <Bot className="w-6 h-6 transform group-hover:rotate-12 transition-transform" />
          <span className="sr-only">{t.chat_title}</span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-950 animate-ping" />
        </button>
      )}

      {/* Chat Drawer / Modal */}
      {isChatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[550px] max-h-[85vh] bg-stone-900 border border-amber-600/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="p-4 bg-stone-950/90 border-b border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 id="chat-title" className="font-moroccan font-bold text-sm text-amber-300">
                  {t.chat_title}
                </h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {lang === 'ar' ? 'متصل الآن • بوسكورة' : lang === 'en' ? 'Online • Bouskoura' : 'En ligne • Bouskoura'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              aria-label={lang === 'ar' ? 'إغلاق المحادثة' : lang === 'en' ? 'Close chat' : 'Fermer le chat'}
              className="p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Item Added Toast Notification */}
          {toastItem && (
            <div className="bg-emerald-600/90 text-white text-xs px-4 py-2 flex items-center justify-between animate-fade-in shadow-md">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{lang === 'ar' ? `تمت إضافة «${toastItem}» إلى السلة!` : lang === 'en' ? `Added "${toastItem}" to cart!` : `« ${toastItem} » ajouté au panier !`}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsChatOpen(false);
                  setIsCartOpen(true);
                }}
                className="underline text-[11px] font-bold ml-2 whitespace-nowrap hover:text-amber-200"
              >
                {t.chat_view_cart}
              </button>
            </div>
          )}

          {/* Quick FAQ Prompts */}
          <div className="px-4 py-2 bg-stone-950/40 border-b border-amber-900/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[t.chat_faq_1, t.chat_faq_2, t.chat_faq_3].map((faq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(faq)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium transition-colors"
              >
                {faq}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              const isArabicText = /[\u0600-\u06FF]/.test(m.text);
              const isAi = m.source === 'gemini';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    dir={isArabicText ? 'rtl' : 'ltr'}
                    className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-sm transition-all ${
                      isUser
                        ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                        : isAi
                        ? 'bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/40 border border-amber-500/50 text-stone-100 rounded-tl-none shadow-md shadow-amber-950/30'
                        : 'bg-stone-950/70 border border-amber-900/30 text-stone-200 rounded-tl-none'
                    } ${isArabicText ? "font-['Tajawal',sans-serif]" : ''}`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {/* Interactive 1-Tap Cart Navigation Card if Action Was Generated */}
                    {m.action && m.action.type === 'ADD_TO_CART' && (
                      <div className="mt-2.5 pt-2 border-t border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-600 text-stone-950 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-amber-200 block truncate">
                              {m.action.quantity}x {lang === 'ar' ? (m.action.dishNameAr || m.action.dishName) : (m.action.dishNameFr || m.action.dishName)}
                            </span>
                            <span className="text-[10px] text-amber-400/80 font-mono block">
                              {m.action.dishPrice ? `${m.action.dishPrice * m.action.quantity} ${t.menu_price_unit}` : t.chat_added_to_cart}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsChatOpen(false);
                            setIsCartOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          <span>{t.chat_view_cart}</span>
                          <ArrowRight className={`w-3 h-3 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[10px] text-stone-500 font-mono">{m.timestamp}</span>
                    {m.source && !isUser && (
                      <span
                        className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                          isAi
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : m.source === 'rule'
                            ? 'bg-stone-800 text-stone-300'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {isAi && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                        <span>
                          {m.source === 'rule' && t.chat_source_rule}
                          {m.source === 'cache' && t.chat_source_cache}
                          {m.source === 'gemini' && (lang === 'ar' ? 'ذكاء اصطناعي ✨' : lang === 'en' ? 'Gemini AI ✨' : 'Assistant IA ✨')}
                          {m.source === 'whatsapp_fallback' && t.chat_source_whatsapp}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-stone-950/80 border border-amber-500/40 text-amber-300 text-xs w-44 animate-pulse shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>{lang === 'ar' ? 'الذكاء الاصطناعي يفكر...' : lang === 'en' ? 'AI is thinking...' : 'L’IA formule sa réponse...'}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Fallback to WhatsApp Link */}
          <div className="px-4 py-2 bg-stone-950/60 border-t border-amber-900/20 flex items-center justify-between text-[11px]">
            <span className="text-stone-400">
              {lang === 'ar' ? 'تحتاج مساعدة مباشرة؟' : lang === 'en' ? 'Need human assistance?' : 'Besoin d’aide humaine ?'}
            </span>
            <a
              href={waHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-stone-950 border-t border-amber-900/30 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.chat_placeholder}
              maxLength={300}
              className="flex-1 px-4 py-2.5 rounded-full bg-stone-900 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              aria-label={lang === 'ar' ? 'إرسال' : lang === 'en' ? 'Send' : 'Envoyer'}
              className="p-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
