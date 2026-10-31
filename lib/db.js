import pg from 'pg';
import { matchingPrefixLength } from './experiment.mjs';
import { databaseConfig } from './database-config.mjs';

export function database() {
 if (!globalThis.memoryDatabasePool) {
  const pool = new pg.Pool(databaseConfig());
  pool.on('error', error => console.error('Database connection error:', error.code || error.name));
  globalThis.memoryDatabasePool = pool;
 }
 return globalThis.memoryDatabasePool;
}

export async function transaction(work, { readOnly = false } = {}) {
 const client = await database().connect();
 try {
  await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
  const result = await work(client);
  await client.query('COMMIT');
  return result;
 } catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
 } finally {
  client.release();
 }
}

export async function trialResults(sessionId, db = database()) {
 const { rows } = await db.query(`
  SELECT t.id, t.scenario, t.status, t.successful_rounds,
   COALESCE(MAX(length(r.sequence)) FILTER (WHERE r.outcome = 'correct'), 0) AS longest,
   COALESCE(AVG(r.response_ms) FILTER (WHERE r.outcome = 'correct'), 0) AS average,
   MAX(r.sequence) FILTER (WHERE r.outcome IN ('incorrect','timeout')) AS final_sequence,
   MAX(r.answer) FILTER (WHERE r.outcome IN ('incorrect','timeout')) AS final_answer,
   MAX(r.outcome) FILTER (WHERE r.outcome IN ('incorrect','timeout')) AS final_outcome
  FROM trials t LEFT JOIN trial_rounds r ON r.trial_id = t.id
  WHERE t.session_id = $1
  GROUP BY t.id ORDER BY t.position
 `, [sessionId]);
 return rows.map(t => ({
  id: t.id, scenario: t.scenario, status: t.status,
  successfulRounds: t.successful_rounds, longestSequence: t.longest, averageResponseMs: t.average,
  finalRound: t.final_outcome ? {
   matchingDigits: matchingPrefixLength(t.final_sequence,t.final_answer || ''),
   hasMismatch: matchingPrefixLength(t.final_sequence,t.final_answer || '') < (t.final_answer || '').length,
   outcome: t.final_outcome,
  } : null,
 }));
}
