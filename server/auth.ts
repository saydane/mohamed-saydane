import crypto from 'crypto';
import { db, getSetting, setSetting } from './db.ts';

const SCRYPT_KEYLEN = 64;
const MAX_LOGIN_ATTEMPTS = 6;
const LOCKOUT_MINUTES = 10;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;
const SESSION_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface HashResult {
  hash: string;
  salt: string;
}

/**
 * Hash a password using scrypt with a unique random salt
 */
export function hashPassword(password: string): HashResult {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verify password with scrypt and crypto.timingSafeEqual
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    const storedBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Hash a session token with SHA-256 before storing or querying
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if an IP address is currently locked out
 */
export function checkIpLock(ip: string): { locked: boolean; remainingSeconds: number } {
  const row = db.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?').get(ip) as
    | { fail_count: number; locked_until: number }
    | undefined;

  if (!row) {
    return { locked: false, remainingSeconds: 0 };
  }

  const now = Date.now();
  if (row.locked_until > now) {
    const remainingSeconds = Math.ceil((row.locked_until - now) / 1000);
    return { locked: true, remainingSeconds };
  }

  // If lockout expired, reset fail count
  if (row.locked_until > 0 && row.locked_until <= now) {
    db.prepare('UPDATE login_attempts SET fail_count = 0, locked_until = 0 WHERE ip = ?').run(ip);
  }

  return { locked: false, remainingSeconds: 0 };
}

/**
 * Record a failed login attempt; lock if threshold reached (6 tries)
 */
export function recordFailedAttempt(ip: string): { locked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const row = db.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?').get(ip) as
    | { fail_count: number; locked_until: number }
    | undefined;

  let failCount = 1;
  let lockedUntil = 0;

  if (row) {
    if (row.locked_until > now) {
      // Already locked
      return { locked: true, remainingSeconds: Math.ceil((row.locked_until - now) / 1000) };
    }
    failCount = row.fail_count + 1;
  }

  if (failCount >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_MS;
    db.prepare(
      'INSERT OR REPLACE INTO login_attempts (ip, fail_count, locked_until, last_attempt) VALUES (?, ?, ?, ?)'
    ).run(ip, failCount, lockedUntil, now);
    return { locked: true, remainingSeconds: LOCKOUT_MINUTES * 60 };
  }

  db.prepare(
    'INSERT OR REPLACE INTO login_attempts (ip, fail_count, locked_until, last_attempt) VALUES (?, ?, ?, ?)'
  ).run(ip, failCount, lockedUntil, now);

  return { locked: false, remainingSeconds: 0 };
}

/**
 * Reset failed attempts upon successful login
 */
export function resetLoginAttempts(ip: string): void {
  db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
}

/**
 * Check if admin password has been initialized
 */
export function isAdminSetup(): boolean {
  const hash = getSetting('admin_password_hash');
  return !!hash && hash.trim().length > 0;
}

/**
 * Set initial admin password (min 8 chars)
 */
export function setupAdminPassword(password: string): boolean {
  if (isAdminSetup()) {
    return false; // Already setup
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const { hash, salt } = hashPassword(password);
  setSetting('admin_password_hash', hash);
  setSetting('admin_salt', salt);
  return true;
}

/**
 * Change admin password (requires old password, terminates all other sessions)
 */
export function changeAdminPassword(oldPassword: string, newPassword: string, currentSessionToken: string): boolean {
  const currentHash = getSetting('admin_password_hash');
  const currentSalt = getSetting('admin_salt');
  if (!currentHash || !currentSalt) {
    throw new Error('Admin not configured');
  }
  if (!verifyPassword(oldPassword, currentHash, currentSalt)) {
    return false;
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  const { hash, salt } = hashPassword(newPassword);
  setSetting('admin_password_hash', hash);
  setSetting('admin_salt', salt);

  // Terminate all other sessions except current
  const currentHashToken = hashToken(currentSessionToken);
  db.prepare('DELETE FROM sessions WHERE token_hash != ?').run(currentHashToken);
  return true;
}

/**
 * Create a new secure session token
 */
export function createSession(ip?: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS).toISOString();

  db.prepare('INSERT INTO sessions (token_hash, created_at, expires_at, ip) VALUES (?, ?, ?, ?)').run(
    tokenHash,
    now.toISOString(),
    expiresAt,
    ip || null
  );

  return rawToken;
}

/**
 * Verify a session token
 */
export function verifySession(rawToken: string): boolean {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();

  const session = db
    .prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(tokenHash, nowIso);

  return !!session;
}

/**
 * Delete a session (logout)
 */
export function deleteSession(rawToken: string): void {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}
