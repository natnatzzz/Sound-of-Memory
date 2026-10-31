import { randomInt } from 'node:crypto';
import { transaction, trialResults } from '../../../lib/db';
import { judge, roundSettings, ANSWER_MS, GROUP_PAUSE_MS } from '../../../lib/experiment.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
 try {
 const body = await request.json();
 return await transaction(async db => {
 // Serialize mutations for one participant so simultaneous retries score once.
 const session = (await db.query('SELECT * FROM sessions WHERE id=$1 FOR UPDATE',[body.sessionId])).rows[0];
 const trial = (await db.query('SELECT * FROM trials WHERE id=$1 AND session_id=$2',[body.trialId,body.sessionId])).rows[0];
 if (!session || !trial) return Response.json({ error:'Test scenario not found.' },{status:404});
 async function result(round) {
  const trials=await trialResults(session.id,db);
  const timing=(await db.query('SELECT started_at,completed_at FROM sessions WHERE id=$1',[session.id])).rows[0];
  const totalTimeMs=timing.completed_at ? Math.max(0,Date.parse(timing.completed_at)-Date.parse(timing.started_at)) : null;
  return {outcome:round.outcome,expected:round.sequence,answer:round.answer ?? '',...trials.find(t=>t.id===trial.id),trials,totalTimeMs,allCompleted:trials.every(t=>t.status==='completed')};
 }
 if (body.action==='submit' && Number.isInteger(body.roundNumber)) {
  const saved=(await db.query('SELECT * FROM trial_rounds WHERE trial_id=$1 AND round_number=$2',[trial.id,body.roundNumber])).rows[0];
  if(saved?.outcome)return Response.json(await result(saved));
 }
 if(session.status!=='active' || !['pending','active'].includes(trial.status))return Response.json({error:'This scenario is no longer active.'},{status:409});
 if((await db.query("SELECT id FROM trials WHERE session_id=$1 AND position<$2 AND status!='completed'",[session.id,trial.position])).rows[0])return Response.json({error:'Complete the earlier scenario first.'},{status:409});
 if(body.action==='start') {
  if(typeof body.volume!=='number' || !Number.isFinite(body.volume) || (trial.scenario==='silence' ? body.volume!==0 : body.volume<0.05 || body.volume>0.8))return Response.json({error:'Choose a valid audible volume before starting.'},{status:400});
  const number=trial.successful_rounds+1;
  const {digitCount,digitMs}=roundSettings(number);
  const previous=(await db.query('SELECT * FROM trial_rounds WHERE trial_id=$1 AND round_number=$2',[trial.id,number])).rows[0];
  const sequence=previous?.sequence || Array.from({length:digitCount},()=>randomInt(0,10)).join('');
  const interval=previous?.digit_ms || digitMs;
  if(previous)await db.query('UPDATE trial_rounds SET started_at=$1,volume=$2 WHERE id=$3',[Date.now(),body.volume,previous.id]);
  else await db.query('INSERT INTO trial_rounds (trial_id,round_number,sequence,digit_ms,started_at,volume) VALUES ($1,$2,$3,$4,$5,$6)',[trial.id,number,sequence,interval,Date.now(),body.volume]);
  await db.query("UPDATE trials SET status='active',started_at=COALESCE(started_at,$1) WHERE id=$2",[new Date().toISOString(),trial.id]);
  return Response.json({sequence,roundNumber:number,digitMs:interval,answerMs:ANSWER_MS,scenario:trial.scenario});
 }
 if(body.action!=='submit')return Response.json({error:'Unknown action.'},{status:400});
 const round=(await db.query('SELECT * FROM trial_rounds WHERE trial_id=$1 ORDER BY round_number DESC LIMIT 1',[trial.id])).rows[0];
 if(!round || round.outcome || body.roundNumber!==round.round_number)return Response.json({error:'There is no unanswered round.'},{status:409});
 const answer=typeof body.answer==='string'?body.answer.slice(0,1000):'';
 const elapsed=Number(body.responseMs);
 if(!Number.isFinite(elapsed)||elapsed<0||!Array.isArray(body.events)||body.events.length>2000)return Response.json({error:'Invalid round data.'},{status:400});
 let outcome=judge(round.sequence,answer,elapsed);
 if(Date.now()-Number(round.started_at)>3000+round.sequence.length*round.digit_ms+(trial.scenario==='dtmf-grouped' ? Math.floor((round.sequence.length-1)/3)*GROUP_PAUSE_MS : 0)+ANSWER_MS+2000)outcome='timeout';
 await db.query('UPDATE trial_rounds SET answer=$1,response_ms=$2,outcome=$3,events=$4,submitted_at=$5 WHERE id=$6',[answer,elapsed,outcome,JSON.stringify(body.events),new Date().toISOString(),round.id]);
 if(outcome==='correct') {
  await db.query('UPDATE trials SET successful_rounds=successful_rounds+1 WHERE id=$1',[trial.id]);
  await db.query('UPDATE sessions SET successful_rounds=successful_rounds+1 WHERE id=$1',[session.id]);
 } else {
  await db.query("UPDATE trials SET status='completed',completed_at=$1 WHERE id=$2",[new Date().toISOString(),trial.id]);
  if(!(await db.query("SELECT id FROM trials WHERE session_id=$1 AND status!='completed'",[session.id])).rows[0])await db.query("UPDATE sessions SET status='completed',completed_at=$1 WHERE id=$2",[new Date().toISOString(),session.id]);
 }
 return Response.json(await result({...round,answer,outcome}));
 });
 } catch(error) { console.error('Could not save round:', error.code || error.name); return Response.json({error:'Could not save this round. Please retry.'},{status:500});}
}
