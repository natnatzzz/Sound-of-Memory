import { randomUUID } from 'node:crypto';
import { database, trialResults } from '../../../lib/db';
import { SCENARIOS } from '../../../lib/scenarios.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
 const { name, age, gender, location } = await request.json();
 if (typeof name !== 'string' || !name.trim() || name.length > 100 || !Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120 || !['Female','Male','Non-binary','Self-described','Prefer not to say'].includes(gender)) return Response.json({ error: 'Please enter a name, valid age, and gender.' }, { status: 400 });
 const id = randomUUID();
 // The browser supplies an optional IP-based lookup; no precise GPS is requested.
 const safeLocation = location && typeof location === 'object' ? JSON.stringify({ ip: String(location.ip || '').slice(0,64), city: String(location.city || '').slice(0,100), region: String(location.region || '').slice(0,100), country: String(location.country || '').slice(0,100), status: String(location.status || 'unavailable').slice(0,40) }) : null;
 const db=database();
 db.transaction(()=>{
 db.prepare('INSERT INTO sessions (id,name,age,gender,location,user_agent,started_at) VALUES (?,?,?,?,?,?,?)').run(id,name.trim(),Number(age),gender,safeLocation,request.headers.get('user-agent'),new Date().toISOString());
 SCENARIOS.forEach((scenario,position)=>db.prepare('INSERT INTO trials (id,session_id,scenario,position) VALUES (?,?,?,?)').run(randomUUID(),id,scenario.id,position));
 })();
 return Response.json({ id, trials:trialResults(id) });
 } catch(error) { console.error('Could not create participant session:', error); return Response.json({ error: 'Could not save participant details. Please try again.' }, { status: 500 }); }
}
