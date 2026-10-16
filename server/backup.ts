import path from 'path';
import fs from 'fs';
import { db } from './db.ts';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

/**
 * Creates an atomic backup using SQLite VACUUM INTO.
 * Excluding .env and wal/shm files.
 */
export function createBackup(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(/[ :]/g, '-');

  const backupFilename = `coeur-de-bouskoura-${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }

  // SQLite VACUUM INTO creates a single clean database snapshot
  db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);

  return backupFilename;
}

export function listBackups(): string[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sqlite') && !f.includes('wal') && !f.includes('shm'));
}
