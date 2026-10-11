import { randomInt } from 'node:crypto';
import { database, trialSummary, trialResults } from '../../../lib/db';
import { judge, roundSettings, ANSWER_MS } from '../../../lib/experiment.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
 const body = await request.json();
 const db = database();
 const session = db.prepare('SELECT * FROM sessions WHERE id=?').get(body.sessionId);
 const trial = db.prepare('SELECT * FROM trials WHERE id=? AND session_id=?').get(body.trialId,body.sessionId);
 if (!session || !trial) return Response.json({ error:'Test scenario not found.' },{status:404});
 function result(round) {
  const trials=trialResults(session.id);
  return {outcome:round.outcome,expected:round.sequence,...trialSummary(trial.id),trials,allCompleted:trials.every(t=>t.status==='completed')};
 }
 if (body.action==='submit' && Number.isInteger(body.roundNumber)) {
  const saved=db.prepare('SELECT * FROM trial_rounds WHERE trial_id=? AND round_number=?').get(trial.id,body.roundNumber);
  if(saved?.outcome)return Response.json(result(saved));
 }
 if(session.status!=='active' || !['pending','active'].includes(trial.status))return Response.json({error:'This scenario is no longer active.'},{status:409});
 if(db.prepare("SELECT id FROM trials WHERE session_id=? AND position<? AND status!='completed'").get(session.id,trial.position))return Response.json({error:'Complete the earlier scenario first.'},{status:409});
 if(body.action==='start') {
  if(typeof body.volume!=='number' || !Number.isFinite(body.volume) || (trial.scenario==='silence' ? body.volume!==0 : body.volume<0.05 || body.volume>0.8))return Response.json({error:'Choose a valid audible volume before starting.'},{status:400});
  const number=trial.successful_rounds+1;
  const {digitCount,digitMs}=roundSettings(number);
  const previous=db.prepare('SELECT * FROM trial_rounds WHERE trial_id=? AND round_number=?').get(trial.id,number);
  const sequence=previous?.sequence || Array.from({length:digitCount},()=>randomInt(0,10)).join('');
  const interval=previous?.digit_ms || digitMs;
  db.transaction(()=>{
   if(previous)db.prepare('UPDATE trial_rounds SET started_at=?,volume=? WHERE id=?').run(Date.now(),body.volume,previous.id);
   else db.prepare('INSERT INTO trial_rounds (trial_id,round_number,sequence,digit_ms,started_at,volume) VALUES (?,?,?,?,?,?)').run(trial.id,number,sequence,interval,Date.now(),body.volume);
   db.prepare("UPDATE trials SET status='active',started_at=COALESCE(started_at,?) WHERE id=?").run(new Date().toISOString(),trial.id);
  })();
  return Response.json({sequence,roundNumber:number,digitMs:interval,answerMs:ANSWER_MS,scenario:trial.scenario});
 }
 if(body.action!=='submit')return Response.json({error:'Unknown action.'},{status:400});
 const round=db.prepare('SELECT * FROM trial_rounds WHERE trial_id=? ORDER BY round_number DESC LIMIT 1').get(trial.id);
 if(!round || round.outcome || body.roundNumber!==round.round_number)return Response.json({error:'There is no unanswered round.'},{status:409});
 const answer=typeof body.answer==='string'?body.answer.slice(0,1000):'';
 const elapsed=Number(body.responseMs);
 if(!Number.isFinite(elapsed)||elapsed<0||!Array.isArray(body.events)||body.events.length>2000)return Response.json({error:'Invalid round data.'},{status:400});
 let outcome=judge(round.sequence,answer,elapsed);
 if(Date.now()-round.started_at>3000+round.sequence.length*round.digit_ms+ANSWER_MS+2000)outcome='timeout';
 db.transaction(()=>{
  db.prepare('UPDATE trial_rounds SET answer=?,response_ms=?,outcome=?,events=?,submitted_at=? WHERE id=?').run(answer,elapsed,outcome,JSON.stringify(body.events),new Date().toISOString(),round.id);
  if(outcome==='correct') {
   db.prepare('UPDATE trials SET successful_rounds=successful_rounds+1 WHERE id=?').run(trial.id);
   db.prepare('UPDATE sessions SET successful_rounds=successful_rounds+1 WHERE id=?').run(session.id);
  } else {
   db.prepare("UPDATE trials SET status='completed',completed_at=? WHERE id=?").run(new Date().toISOString(),trial.id);
   if(!db.prepare("SELECT id FROM trials WHERE session_id=? AND status!='completed'").get(session.id))db.prepare("UPDATE sessions SET status='completed',completed_at=? WHERE id=?").run(new Date().toISOString(),session.id);
  }
 })();
 return Response.json(result({...round,outcome}));
 } catch {return Response.json({error:'Could not save this round. Please retry.'},{status:500});}
}
