import { randomUUID } from 'node:crypto';
import { transaction, trialResults } from '../../../lib/db';
import { SCENARIOS } from '../../../lib/scenarios.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
 const { name, age, gender, location } = await request.json();
 if (typeof name !== 'string' || !name.trim() || name.length > 100 || !Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120 || !['Female','Male','Non-binary','Self-described','Prefer not to say'].includes(gender)) return Response.json({ error: 'Please enter a name, valid age, and gender.' }, { status: 400 });
 const id = randomUUID();
 // The browser supplies an optional IP-based lookup; no precise GPS is requested.
 const safeLocation = location && typeof location === 'object' ? JSON.stringify({ ip: String(location.ip || '').slice(0,64), city: String(location.city || '').slice(0,100), region: String(location.region || '').slice(0,100), country: String(location.country || '').slice(0,100), status: String(location.status || 'unavailable').slice(0,40) }) : null;
 const trials = await transaction(async db => {
  await db.query('INSERT INTO sessions (id,name,age,gender,location,user_agent,started_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,name.trim(),Number(age),gender,safeLocation,request.headers.get('user-agent'),new Date().toISOString()]);
  for (const [position,scenario] of SCENARIOS.entries()) {
   await db.query('INSERT INTO trials (id,session_id,scenario,position) VALUES ($1,$2,$3,$4)', [randomUUID(),id,scenario.id,position]);
  }
  return trialResults(id,db);
 });
 return Response.json({ id, trials });
 } catch(error) { console.error('Could not create participant session:', error.code || error.name); return Response.json({ error: 'Could not save participant details. Please try again.' }, { status: 500 }); }
}
