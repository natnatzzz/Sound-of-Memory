import nextEnv from '@next/env';
import { database, transaction } from '../lib/db.js';
nextEnv.loadEnvConfig(process.cwd());
try {
 const count=await transaction(async db=>{
  // Include legacy sessions created before consent records existed.
  const {rows}=await db.query(`SELECT s.id FROM sessions s LEFT JOIN consent_records c ON c.session_id=s.id
   WHERE COALESCE(c.expires_at,s.started_at::timestamptz + INTERVAL '1 year') <= CURRENT_TIMESTAMP FOR UPDATE OF s`);
  const ids=rows.map(row=>row.id);
  if(!ids.length)return 0;
  await db.query('DELETE FROM trial_rounds WHERE trial_id IN (SELECT id FROM trials WHERE session_id=ANY($1::text[]))',[ids]);
  await db.query('DELETE FROM trials WHERE session_id=ANY($1::text[])',[ids]);
  await db.query('DELETE FROM rounds WHERE session_id=ANY($1::text[])',[ids]);
  await db.query('DELETE FROM sessions WHERE id=ANY($1::text[])',[ids]);
  return ids.length;
 });
 console.log(`Deleted ${count} expired sessions and their responses and consent records.`);
} catch(error) {
 console.error('Retention cleanup failed:',error.code || error.name);process.exitCode=1;
} finally {await database().end();}
