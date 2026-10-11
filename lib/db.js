import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
let db;
export function database() {
 if (!db) {
  mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  db = new Database(path.join(process.cwd(), 'data', 'memory.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
   id TEXT PRIMARY KEY, name TEXT NOT NULL, age INTEGER NOT NULL, gender TEXT NOT NULL,
   location TEXT, user_agent TEXT, started_at TEXT NOT NULL, completed_at TEXT,
   status TEXT NOT NULL DEFAULT 'active', successful_rounds INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS rounds (
   id INTEGER PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), round_number INTEGER NOT NULL,
   sequence TEXT NOT NULL, digit_ms INTEGER NOT NULL DEFAULT 500, started_at INTEGER NOT NULL, answer TEXT, response_ms REAL,
   outcome TEXT, events TEXT, submitted_at TEXT, UNIQUE(session_id, round_number));`);
  if (!db.prepare('PRAGMA table_info(rounds)').all().some(column => column.name === 'digit_ms')) {
   db.exec('ALTER TABLE rounds ADD COLUMN digit_ms INTEGER NOT NULL DEFAULT 500');
  }
 }
 return db;
}
export function summary(id) {
 const session = database().prepare('SELECT status, successful_rounds FROM sessions WHERE id = ?').get(id);
 const stats = database().prepare("SELECT MAX(length(sequence)) AS longest, AVG(response_ms) AS average FROM rounds WHERE session_id = ? AND outcome = 'correct'").get(id);
 return { successfulRounds: session.successful_rounds, longestSequence: stats.longest || 0, averageResponseMs: stats.average || 0 };
}
