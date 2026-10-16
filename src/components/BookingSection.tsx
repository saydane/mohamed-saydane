import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Calendar, Clock, Users, Phone, User, FileText, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';

export const BookingSection: React.FC = () => {
  const { lang, t, settings } = useApp();

  // Compute minimum date (today in Africa/Casablanca)
  const todayCasablanca = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: todayCasablanca,
    time: '19:30',
    guests: 2,
    note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    reservationId: string;
    whatsappNotificationLink: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMsg(t.booking_error_duplicate);
        } else if (res.status === 400) {
          if (data.error?.includes('past') || data.error?.includes('outside')) {
            setErrorMsg(
              formData.date < todayCasablanca
                ? t.booking_error_past
                : t.booking_error_hours
            );
          } else {
            setErrorMsg(data.error || 'Erreur de validation');
          }
        } else {
          setErrorMsg(data.error || 'Erreur lors de la réservation');
        }
        return;
      }

      setSuccessData(data);
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez réessayer ou contacter le restaurant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-16 sm:py-24 bg-stone-950 dark:bg-stone-950 light:bg-stone-100 transition-colors relative overflow-hidden">
      <div className="absolute inset-0 bg-moroccan-pattern opacity-40 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-3 font-moroccan">
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.nav_booking}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-moroccan text-stone-100 dark:text-stone-100 light:text-stone-900 tracking-tight mb-4">
            {t.booking_title}
          </h2>
          <p className="text-stone-400 dark:text-stone-400 light:text-stone-600 text-sm sm:text-base">
            {t.booking_subtitle}
          </p>
        </div>

        {/* Success Card or Booking Form */}
        <div className="bg-stone-900/80 dark:bg-stone-900/80 light:bg-white border border-amber-800/40 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {successData ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-moroccan font-bold text-2xl text-stone-100 mb-2">
                  {t.booking_success_title}
                </h3>
                <p className="text-stone-300 text-sm max-w-md mx-auto">
                  {t.booking_success_msg}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/60 border border-amber-900/30 max-w-sm mx-auto text-xs text-stone-300 space-y-1.5 font-mono">
                <div>Réf: <span className="text-amber-400 font-bold">{successData.reservationId.slice(0, 8)}</span></div>
                <div>Date: <span className="text-amber-300">{formData.date}</span> à <span className="text-amber-300">{formData.time}</span></div>
                <div>Convives: <span className="text-amber-300">{formData.guests} {t.booking_guests_unit}</span></div>
              </div>

              {/* One-tap WhatsApp confirmation with Owner */}
              <div className="pt-2">
                <a
                  href={successData.whatsappNotificationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.booking_notify_whatsapp}</span>
                </a>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setFormData({
                      name: '',
                      phone: '',
                      date: todayCasablanca,
                      time: '19:30',
                      guests: 2,
                      note: '',
                    });
                  }}
                  className="text-xs text-stone-400 hover:text-amber-400 underline"
                >
                  Nouvelle réservation
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Error feedback */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Name */}
                <div>
                  <label htmlFor="booking-name" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <User className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_name} *
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.booking_name_placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="booking-phone" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <Phone className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_phone} *
                  </label>
                  <input
                    id="booking-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t.booking_phone_placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono"
                  />
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="booking-date" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <Calendar className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_date} *
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    required
                    min={todayCasablanca}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {/* Time */}
                <div>
                  <label htmlFor="booking-time" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <Clock className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_time} (12:00 - 23:30) *
                  </label>
                  <select
                    id="booking-time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono"
                  >
                    {[
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
                      '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
                    ].map((timeOption) => (
                      <option key={timeOption} value={timeOption} className="bg-stone-900 text-stone-100">
                        {timeOption}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guests */}
                <div className="sm:col-span-2">
                  <label htmlFor="booking-guests" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <Users className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_guests} (1 - 20) *
                  </label>
                  <input
                    id="booking-guests"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono"
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label htmlFor="booking-note" className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    <FileText className="inline w-3.5 h-3.5 mr-1" />
                    {t.booking_note}
                  </label>
                  <textarea
                    id="booking-note"
                    rows={3}
                    maxLength={300}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder={t.booking_note_placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-stone-950/70 border border-amber-900/40 focus:border-amber-500 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
                  />
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-950/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? t.booking_submitting : t.booking_submit}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </section>
  );
};
