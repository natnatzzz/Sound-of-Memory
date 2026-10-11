import { randomInt } from 'node:crypto';
import { database, summary } from '../../../lib/db';
import { judge, roundSettings, ANSWER_MS } from '../../../lib/experiment.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
 const body = await request.json();
 const db = database();
 const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(body.sessionId);
 if (session && body.action === 'submit' && Number.isInteger(body.roundNumber)) {
 const saved = db.prepare('SELECT * FROM rounds WHERE session_id=? AND round_number=?').get(session.id,body.roundNumber);
 if (saved?.outcome) return Response.json({ outcome:saved.outcome, expected:saved.sequence, ...summary(session.id) });
 }
 if (!session || session.status !== 'active') return Response.json({ error: 'This test is no longer active.' }, { status: 409 });
 if (body.action === 'start') {
 const number = session.successful_rounds + 1; const { digitCount, digitMs } = roundSettings(number);
 const previous = db.prepare('SELECT * FROM rounds WHERE session_id = ? AND round_number = ?').get(session.id, number);
 if (previous && !previous.outcome) {
 db.prepare('UPDATE rounds SET started_at=? WHERE id=?').run(Date.now(),previous.id);
 return Response.json({ sequence:previous.sequence,roundNumber:number,digitMs:previous.digit_ms,answerMs:ANSWER_MS });
 }
 const sequence = Array.from({ length: digitCount }, () => randomInt(0,10)).join('');
 db.prepare('INSERT INTO rounds (session_id,round_number,sequence,digit_ms,started_at) VALUES (?,?,?,?,?)').run(session.id, number, sequence, digitMs, Date.now());
 return Response.json({ sequence, roundNumber: number, digitMs, answerMs: ANSWER_MS });
 }
 if (body.action !== 'submit') return Response.json({ error: 'Unknown action.' }, { status: 400 });
 const round = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number DESC LIMIT 1').get(session.id);
 if (!round || round.outcome || body.roundNumber !== round.round_number) return Response.json({ error: 'There is no unanswered round.' }, { status: 409 });
 const answer = typeof body.answer === 'string' ? body.answer.slice(0,1000) : '';
 const elapsed = Number(body.responseMs);
 if (!Number.isFinite(elapsed) || elapsed < 0 || !Array.isArray(body.events) || body.events.length > 2000) return Response.json({ error: 'Invalid round data.' }, { status: 400 });
 let outcome = judge(round.sequence, answer, elapsed);
 // Enforce a server-side ceiling as well as the browser's precise response timer.
 if (Date.now() - round.started_at > 3000 + round.sequence.length * round.digit_ms + ANSWER_MS + 2000) outcome = 'timeout';
 db.transaction(() => {
 db.prepare('UPDATE rounds SET answer=?,response_ms=?,outcome=?,events=?,submitted_at=? WHERE id=?').run(answer,elapsed,outcome,JSON.stringify(body.events),new Date().toISOString(),round.id);
 if (outcome === 'correct') db.prepare('UPDATE sessions SET successful_rounds=successful_rounds+1 WHERE id=?').run(session.id);
 else db.prepare("UPDATE sessions SET status='completed',completed_at=? WHERE id=?").run(new Date().toISOString(),session.id);
 })();
 return Response.json({ outcome, expected: round.sequence, ...summary(session.id) });
 } catch { return Response.json({ error: 'Could not save this round. Please retry.' }, { status: 500 }); }
}
