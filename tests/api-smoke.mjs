// Run against an already started app: node tests/api-smoke.mjs http://127.0.0.1:3001
import assert from 'node:assert/strict';
import { CONSENT_VERSION } from '../lib/consent.mjs';
import { SCENARIOS } from '../lib/scenarios.mjs';
import nextEnv from '@next/env';
import { database, transaction } from '../lib/db.js';
import { databaseConfig } from '../lib/database-config.mjs';
nextEnv.loadEnvConfig(process.cwd());
if (process.env.K_SERVICE) throw new Error('Run smoke tests locally against DEV only.');
databaseConfig();
const base=process.argv[2] || 'http://127.0.0.1:3000';
const ids=[];
const db=database();
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname), 'Smoke tests require a local app.');
async function post(path,body){const r=await fetch(`${base}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {httpStatus:r.status,...await r.json()};}
const participant={name:'__API_SMOKE_TEST__',age:20,gender:'Prefer not to say',location:{status:'unavailable'},consent:{version:CONSENT_VERSION,participantName:'__API_SMOKE_TEST__',participantAge:20,signature:'__API_SMOKE_TEST__',role:'participant',agreed:true,participantAgreed:true}};
try {
 assert.equal((await fetch(base)).status,200);
 for(const scenario of SCENARIOS.filter(s=>s.audio)) {
 const asset=await fetch(`${base}${scenario.audio}`);assert.equal(asset.status,200);assert.ok((await asset.arrayBuffer()).byteLength>100000);
 }
 assert.equal((await post('sessions',{...participant,age:0})).httpStatus,400);
 assert.equal((await post('sessions',{...participant,consent:null})).httpStatus,400);
 const session=await post('sessions',participant);assert.equal(session.httpStatus,200);ids.push(session.id);
 const savedConsent=(await db.query('SELECT version,signature,signer_role,participant_agreed,signed_at,expires_at FROM consent_records WHERE session_id=$1',[session.id])).rows[0];
 assert.equal(savedConsent.version,CONSENT_VERSION);assert.equal(savedConsent.signature,participant.name);assert.ok(savedConsent.participant_agreed);assert.ok(savedConsent.expires_at>savedConsent.signed_at);
 assert.deepEqual(session.trials.slice(0,6).map(t=>t.scenario).sort(),SCENARIOS.filter(s=>!s.digitTones).map(s=>s.id).sort());
 assert.deepEqual(session.trials.slice(6).map(t=>t.scenario),['dtmf','dtmf-grouped']);
 const start=(trial,volume)=>post('rounds',{sessionId:session.id,trialId:trial.id,action:'start',volume});
 assert.equal((await start(session.trials[1],.4)).httpStatus,409);
 let final;
 for(const [index,trial] of session.trials.entries()) {
  const volume=trial.scenario==='silence'?0:.4;
  if(trial.scenario!=='silence')assert.equal((await start(trial,0)).httpStatus,400);
  let r=await start(trial,volume);assert.equal(r.httpStatus,200);assert.match(r.sequence,/^\d{4}$/);assert.equal(r.digitMs,400);assert.equal(r.roundNumber,1);
  const restarted=await start(trial,volume);assert.equal(restarted.sequence,r.sequence);assert.equal(restarted.roundNumber,1);
  const submission={sessionId:session.id,trialId:trial.id,action:'submit',roundNumber:1,answer:r.sequence,responseMs:2500,events:[{type:'audio-start',scenario:trial.scenario,volume}]};
  const submissions=await Promise.all([post('rounds',submission),post('rounds',submission)]);
  assert.ok(submissions.every(result=>result.outcome==='correct' && result.successfulRounds===1 && result.answer===r.sequence));
  let result=submissions[0];
  const retries=await Promise.all([post('rounds',submission),post('rounds',submission)]);
  assert.ok(retries.every(result=>result.outcome==='correct' && result.successfulRounds===1));
  r=await start(trial,volume);assert.equal(r.sequence.length,5);assert.equal(r.digitMs,350);
  const failure={...submission,roundNumber:2,answer:'',responseMs:10000,events:[]};
  result=await post('rounds',failure);assert.equal(result.outcome,'timeout');assert.equal(result.longestSequence,4);assert.equal(result.answer,'');assert.equal(result.expected,r.sequence);assert.deepEqual(result.finalRound,{matchingDigits:0,hasMismatch:false,outcome:'timeout'});
  assert.equal(result.allCompleted,index===SCENARIOS.length-1);
  const repeatedFailure=await post('rounds',failure);assert.equal(repeatedFailure.outcome,'timeout');assert.equal(repeatedFailure.answer,'');assert.equal(repeatedFailure.expected,r.sequence);
  assert.equal((await start(trial,volume)).httpStatus,409);
  final=result;
 }
 assert.equal(final.trials.length,SCENARIOS.length);assert.ok(final.trials.every(t=>t.successfulRounds===1 && t.status==='completed'));
 assert.equal((await db.query('SELECT status, successful_rounds FROM sessions WHERE id=$1',[session.id])).rows[0].status,'completed');
 assert.equal((await db.query('SELECT successful_rounds FROM sessions WHERE id=$1',[session.id])).rows[0].successful_rounds,SCENARIOS.length);
 const rows=(await db.query('SELECT r.*,t.scenario FROM trial_rounds r JOIN trials t ON t.id=r.trial_id WHERE t.session_id=$1',[session.id])).rows;
 assert.equal(rows.length,SCENARIOS.length*2);assert.ok(rows.every(r=>r.volume===(r.scenario==='silence'?0:.4)));
 const abandoned=await post('sessions',participant);ids.push(abandoned.id);await post('finish',{sessionId:abandoned.id});
 assert.equal((await post('rounds',{sessionId:abandoned.id,trialId:abandoned.trials[0].id,action:'start',volume:abandoned.trials[0].scenario==='silence'?0:.4})).httpStatus,409);
 assert.ok((await db.query('SELECT status FROM trials WHERE session_id=$1',[abandoned.id])).rows.every(t=>t.status==='abandoned'));
 // BIGINT millisecond timestamps must still enforce the server-side deadline.
 const expired=await post('sessions',participant);ids.push(expired.id);
 const expiredTrial=expired.trials[0];
 const expiredRound=await post('rounds',{sessionId:expired.id,trialId:expiredTrial.id,action:'start',volume:expiredTrial.scenario==='silence'?0:.4});
 await db.query('UPDATE trial_rounds SET started_at=$1 WHERE trial_id=$2',[Date.now()-60000,expiredTrial.id]);
 assert.equal((await post('rounds',{sessionId:expired.id,trialId:expiredTrial.id,action:'submit',roundNumber:1,answer:expiredRound.sequence,responseMs:100,events:[]})).outcome,'timeout');
 const originalName=(await db.query('SELECT name FROM sessions WHERE id=$1',[expired.id])).rows[0].name;
 await assert.rejects(transaction(async client=>{
  await client.query('UPDATE sessions SET name=$1 WHERE id=$2',['__ROLLBACK_CHECK__',expired.id]);
  throw new Error('Intentional rollback');
 }), /Intentional rollback/);
 assert.equal((await db.query('SELECT name FROM sessions WHERE id=$1',[expired.id])).rows[0].name,originalName);
 console.log('PASS: all scenarios, PostgreSQL persistence, concurrent submissions, restart/retry behavior, server deadline, rollback, abandonment, and audio assets.');
} finally {
 try {
  await transaction(async client => {
   for (const id of ids) {
    await client.query('DELETE FROM trial_rounds WHERE trial_id IN (SELECT id FROM trials WHERE session_id=$1)',[id]);
    await client.query('DELETE FROM trials WHERE session_id=$1',[id]);
    await client.query('DELETE FROM rounds WHERE session_id=$1',[id]);
    await client.query('DELETE FROM sessions WHERE id=$1',[id]);
   }
  });
 } finally { await db.end(); }
}
