/**
 * Server-side validation and formatting utilities
 * Africa/Casablanca timezone
 */

export interface ReservationInput {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: ReservationInput;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get current date and time in Africa/Casablanca
 */
export function getCasablancaNow(referenceDate: Date = new Date()): { date: string; time: string } {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(referenceDate);

  return { date: dateParts, time: timeParts };
}

/**
 * Validate Moroccan phone number:
 * Format: +212XXXXXXXXX (where X starts with 5, 6, or 7 followed by 8 digits)
 * Or: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX (10 digits total)
 */
export function validateMoroccanPhone(phone: string): { valid: boolean; normalized?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false };
  }
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  // Matches +212 5/6/7 XXXXXXXX or 00212 5/6/7 XXXXXXXX or 0 5/6/7 XXXXXXXX
  const match = cleaned.match(/^(?:\+212|00212|0)([567]\d{8})$/);
  if (!match) {
    return { valid: false };
  }
  // Standardize to 212XXXXXXXXX
  const nationalDigits = match[1];
  return { valid: true, normalized: `212${nationalDigits}` };
}

/**
 * Validate Reservation
 */
export function validateReservation(
  input: any,
  openingTime: string = '12:00',
  closingTime: string = '23:30',
  nowRef: Date = new Date()
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input payload' };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const date = typeof input.date === 'string' ? input.date.trim() : '';
  const time = typeof input.time === 'string' ? input.time.trim() : '';
  const rawGuests = Number(input.guests);
  const note = typeof input.note === 'string' ? input.note.trim() : '';

  if (!name || name.length < 2 || name.length > 80) {
    return { valid: false, error: 'Name must be between 2 and 80 characters' };
  }

  const phoneCheck = validateMoroccanPhone(phone);
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    return { valid: false, error: 'Invalid Moroccan phone number (+212/05/06/07)' };
  }

  // Date format: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }

  // Time format: HH:MM
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Time must be in HH:MM format' };
  }

  const { date: nowCasablancaDate, time: nowCasablancaTime } = getCasablancaNow(nowRef);

  // Check past date
  if (date < nowCasablancaDate) {
    return { valid: false, error: 'date in the past or time outside opening hours' };
  }
  if (date === nowCasablancaDate && time < nowCasablancaTime) {
    return { valid: false, error: 'date in the past or time outside opening hours' };
  }

  // Check opening hours
  if (time < openingTime || time > closingTime) {
    return { valid: false, error: 'date in the past or time outside opening hours' };
  }

  if (!Number.isInteger(rawGuests) || rawGuests < 1 || rawGuests > 20) {
    return { valid: false, error: 'Number of guests must be between 1 and 20' };
  }

  if (note.length > 300) {
    return { valid: false, error: 'Note cannot exceed 300 characters' };
  }

  return {
    valid: true,
    sanitized: {
      name: escapeHtml(name),
      phone: phoneCheck.normalized,
      date,
      time,
      guests: rawGuests,
      note: escapeHtml(note),
    },
  };
}
