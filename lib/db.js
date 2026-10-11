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
  db.exec(`CREATE TABLE IF NOT EXISTS trials (
   id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), scenario TEXT NOT NULL,
   position INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', successful_rounds INTEGER NOT NULL DEFAULT 0,
   started_at TEXT, completed_at TEXT, UNIQUE(session_id,scenario));
   CREATE TABLE IF NOT EXISTS trial_rounds (
   id INTEGER PRIMARY KEY, trial_id TEXT NOT NULL REFERENCES trials(id), round_number INTEGER NOT NULL,
   sequence TEXT NOT NULL, digit_ms INTEGER NOT NULL, started_at INTEGER NOT NULL, volume REAL NOT NULL,
   answer TEXT, response_ms REAL, outcome TEXT, events TEXT, submitted_at TEXT, UNIQUE(trial_id,round_number));`);
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

export function trialSummary(id) {
 const trial=database().prepare('SELECT * FROM trials WHERE id=?').get(id);
 const stats=database().prepare("SELECT MAX(length(sequence)) AS longest, AVG(response_ms) AS average FROM trial_rounds WHERE trial_id=? AND outcome='correct'").get(id);
 return { id:trial.id, scenario:trial.scenario, status:trial.status, successfulRounds:trial.successful_rounds, longestSequence:stats.longest || 0, averageResponseMs:stats.average || 0 };
}
export function trialResults(sessionId) {
 return database().prepare('SELECT id FROM trials WHERE session_id=? ORDER BY position').all(sessionId).map(t=>trialSummary(t.id));
}
