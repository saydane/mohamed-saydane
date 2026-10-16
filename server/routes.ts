import express from 'express';
import type { Request, Response, NextFunction } from 'express';
const { Router } = express;
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import multer from 'multer';
import { db, getSetting, getAllSettings, setSetting } from './db.ts';
import {
  hashPassword,
  verifyPassword,
  checkIpLock,
  recordFailedAttempt,
  resetLoginAttempts,
  isAdminSetup,
  setupAdminPassword,
  changeAdminPassword,
  createSession,
  verifySession,
  deleteSession,
} from './auth.ts';
import { validateReservation, escapeHtml } from './validation.ts';
import { processChatMessage, flushChatCache } from './chatbot.ts';
import { createBackup, listBackups } from './backup.ts';

export const apiRouter = Router();

// Setup multer in memory to inspect magic bytes and re-encode with sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB cap
  },
});

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Helper to get client IP cleanly (supporting explicit proxy hop or direct socket)
 */
export function getClientIp(req: Request): string {
  // If behind Cloudflare and cf-connecting-ip is provided
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  // Otherwise use express req.ip (configured with trust proxy 1)
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Check Magic Bytes to ensure file is genuinely a JPEG, PNG, or WebP
 */
export function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WebP: 'RIFF' .... 'WEBP'
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP

  return isJpeg || isPng || (isRiff && isWebp);
}

/**
 * Middleware: Admin Auth Guard
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.admin_session ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token || !verifySession(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as any).adminToken = token;
  next();
}

/* ==========================================
   PUBLIC ROUTES
   ========================================== */

/**
 * GET /api/settings
 */
apiRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = getAllSettings();
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dishes
 */
apiRouter.get('/dishes', (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    let query = 'SELECT * FROM dishes';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY available DESC, featured DESC, sort_order ASC';

    const dishes = db.prepare(query).all(...params);
    res.json(dishes);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reservations
 */
apiRouter.post('/reservations', (req: Request, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    const openingTime = getSetting('opening_time') || '12:00';
    const closingTime = getSetting('closing_time') || '23:30';

    const validation = validateReservation(req.body, openingTime, closingTime);
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({ error: validation.error || 'Invalid reservation data' });
      return;
    }

    const { name, phone, date, time, guests, note } = validation.sanitized;

    // Check duplicate reservation (name, phone, date, time)
    const existing = db
      .prepare('SELECT id FROM reservations WHERE name = ? AND phone = ? AND date = ? AND time = ?')
      .get(name, phone, date, time);

    if (existing) {
      res.status(409).json({ error: 'Duplicate reservation for this name, phone, date, and time' });
      return;
    }

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO reservations (id, name, phone, date, time, guests, note, status, client_ip, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(id, name, phone, date, time, guests, note || null, clientIp, nowIso, nowIso);

    // Build WhatsApp owner notification link
    const waNumber = getSetting('whatsapp').replace(/\D/g, '') || '212661234567';
    const msg = `Bonjour Coeur de Bouskoura, je souhaite confirmer ma réservation :\n• Nom : ${name}\n• Téléphone : ${phone}\n• Date : ${date}\n• Heure : ${time}\n• Personnes : ${guests}${
      note ? `\n• Note : ${note}` : ''
    }`;
    const whatsappLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

    res.status(201).json({
      success: true,
      reservationId: id,
      whatsappNotificationLink: whatsappLink,
    });
  } catch (err: any) {
    if (err && err.code === 'ERR_SQLITE_ERROR' && err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: 'Duplicate reservation for this name, phone, date, and time' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat
 */
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const clientIp = getClientIp(req);
    const result = await processChatMessage(message, Array.isArray(history) ? history : [], clientIp);

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/setup-status
 */
apiRouter.get('/admin/setup-status', (_req: Request, res: Response) => {
  res.json({ isSetup: isAdminSetup() });
});

/* ==========================================
   ADMIN AUTH & ACTIONS
   ========================================== */

/**
 * POST /api/admin/setup (First-run password setup)
 */
apiRouter.post('/admin/setup', (req: Request, res: Response) => {
  try {
    if (isAdminSetup()) {
      res.status(400).json({ error: 'Admin is already set up' });
      return;
    }
    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    setupAdminPassword(password);
    const clientIp = getClientIp(req);
    const token = createSession(clientIp);

    res.cookie('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/login
 */
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  try {
    if (!isAdminSetup()) {
      res.status(400).json({ error: 'Admin password not set yet. Please complete first-run setup.' });
      return;
    }

    const clientIp = getClientIp(req);

    // Check IP lockout (6 wrong attempts -> 10 minute lock stored in DB)
    const lockStatus = checkIpLock(clientIp);
    if (lockStatus.locked) {
      res.status(429).json({
        error: `Too many failed attempts. Access locked for ${lockStatus.remainingSeconds} seconds.`,
      });
      return;
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const storedHash = getSetting('admin_password_hash');
    const storedSalt = getSetting('admin_salt');

    const isValid = verifyPassword(password, storedHash, storedSalt);
    if (!isValid) {
      const attempt = recordFailedAttempt(clientIp);
      if (attempt.locked) {
        res.status(429).json({
          error: `Too many failed attempts. Access locked for ${attempt.remainingSeconds} seconds.`,
        });
        return;
      }
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Success -> reset failed attempts and generate secure session
    resetLoginAttempts(clientIp);
    const token = createSession(clientIp);

    res.cookie('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/logout
 */
apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  const token = req.cookies?.admin_session || (req as any).adminToken;
  if (token) {
    deleteSession(token);
  }
  res.clearCookie('admin_session');
  res.json({ success: true });
});

/**
 * GET /api/admin/me
 */
apiRouter.get('/admin/me', requireAdmin, (_req: Request, res: Response) => {
  res.json({ authenticated: true });
});

/**
 * GET /api/admin/reservations
 */
apiRouter.get('/admin/reservations', requireAdmin, (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    let query = 'SELECT * FROM reservations';
    const params: any[] = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY date DESC, time DESC';
    const reservations = db.prepare(query).all(...params);
    res.json(reservations);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/reservations/:id
 */
apiRouter.patch('/admin/reservations/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const nowIso = new Date().toISOString();
    const result = db
      .prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, nowIso, id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/reservations/:id
 */
apiRouter.delete('/admin/reservations/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/dishes
 */
apiRouter.post('/admin/dishes', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name_ar, name_fr, desc_ar, desc_fr, price, category, available, featured, sort_order, image } =
      req.body;

    if (!name_ar || !name_fr || !desc_ar || !desc_fr || price === undefined || !category) {
      res.status(400).json({ error: 'Missing required dish fields' });
      return;
    }

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO dishes (id, name_ar, name_fr, desc_ar, desc_fr, price, category, available, featured, sort_order, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      escapeHtml(name_ar),
      escapeHtml(name_fr),
      escapeHtml(desc_ar),
      escapeHtml(desc_fr),
      Number(price),
      escapeHtml(category),
      available ? 1 : 0,
      featured ? 1 : 0,
      Number(sort_order) || 0,
      image ? escapeHtml(image) : null,
      nowIso,
      nowIso
    );

    flushChatCache();
    res.status(201).json({ success: true, id });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/dishes/:id
 */
apiRouter.put('/admin/dishes/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name_ar, name_fr, desc_ar, desc_fr, price, category, available, featured, sort_order, image } =
      req.body;

    if (!name_ar || !name_fr || !desc_ar || !desc_fr || price === undefined || !category) {
      res.status(400).json({ error: 'Missing required dish fields' });
      return;
    }

    const nowIso = new Date().toISOString();

    const result = db
      .prepare(`
        UPDATE dishes
        SET name_ar = ?, name_fr = ?, desc_ar = ?, desc_fr = ?, price = ?, category = ?, available = ?, featured = ?, sort_order = ?, image = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        escapeHtml(name_ar),
        escapeHtml(name_fr),
        escapeHtml(desc_ar),
        escapeHtml(desc_fr),
        Number(price),
        escapeHtml(category),
        available ? 1 : 0,
        featured ? 1 : 0,
        Number(sort_order) || 0,
        image ? escapeHtml(image) : null,
        nowIso,
        id
      );

    if (result.changes === 0) {
      res.status(404).json({ error: 'Dish not found' });
      return;
    }

    flushChatCache();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/dishes/:id
 */
apiRouter.delete('/admin/dishes/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Dish not found' });
      return;
    }
    flushChatCache();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/dishes/:id/upload
 * Photo upload per dish:
 * - magic-bytes check
 * - rejects arbitrary extensions / disguised PHP scripts
 * - size cap
 * - re-encode to webp with sharp to strip EXIF
 * - failure keeps old image
 */
apiRouter.post(
  '/admin/dishes/:id/upload',
  requireAdmin,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file || !file.buffer) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      // Check dish existence
      const dish = db.prepare('SELECT id, image FROM dishes WHERE id = ?').get(id) as
        | { id: string; image: string | null }
        | undefined;
      if (!dish) {
        res.status(404).json({ error: 'Dish not found' });
        return;
      }

      // Validate magic bytes
      if (!isValidImageMagicBytes(file.buffer)) {
        res.status(400).json({ error: 'Invalid file format. Only authentic JPG, PNG, and WebP images are accepted.' });
        return;
      }

      // Process and re-encode with Sharp to strip EXIF and produce clean WebP
      const randomName = `${crypto.randomBytes(16).toString('hex')}.webp`;
      const outputPath = path.join(UPLOADS_DIR, randomName);

      try {
        await sharp(file.buffer)
          .rotate() // auto-orient based on EXIF before stripping
          .resize({ width: 1200, height: 900, fit: 'cover', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(outputPath);
      } catch (sharpErr) {
        // Failure keeps old image
        res.status(400).json({ error: 'Failed to process image file. Old image was preserved.' });
        return;
      }

      // Update dish with new image URL
      const imageUrl = `/uploads/${randomName}`;
      const nowIso = new Date().toISOString();
      db.prepare('UPDATE dishes SET image = ?, updated_at = ? WHERE id = ?').run(imageUrl, nowIso, id);

      flushChatCache();
      res.json({ success: true, imageUrl });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/admin/settings
 */
apiRouter.post('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    const allowedKeys = [
      'restaurant_name_fr',
      'restaurant_name_ar',
      'phone',
      'whatsapp',
      'tagline_fr',
      'tagline_ar',
      'hours_fr',
      'hours_ar',
      'opening_time',
      'closing_time',
      'address_fr',
      'address_ar',
      'hero_subtitle_fr',
      'hero_subtitle_ar',
      'theme_accent',
      'announcement_fr',
      'announcement_ar',
    ];

    for (const key of allowedKeys) {
      if (payload[key] !== undefined) {
        const val = String(payload[key]).trim().slice(0, 500);
        setSetting(key, escapeHtml(val));
      }
    }

    flushChatCache();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/change-password
 */
apiRouter.post('/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const currentToken = (req as any).adminToken;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Old and new passwords are required' });
      return;
    }

    const changed = changeAdminPassword(oldPassword, newPassword, currentToken);
    if (!changed) {
      res.status(401).json({ error: 'Incorrect old password' });
      return;
    }

    res.json({ success: true, message: 'Password updated. Other sessions terminated.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update password' });
  }
});

/**
 * POST /api/admin/backup
 */
apiRouter.post('/admin/backup', requireAdmin, (_req: Request, res: Response) => {
  try {
    const filename = createBackup();
    res.json({ success: true, filename, backups: listBackups() });
  } catch {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * GET /api/admin/backups
 */
apiRouter.get('/admin/backups', requireAdmin, (_req: Request, res: Response) => {
  try {
    res.json({ backups: listBackups() });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve backups' });
  }
});
