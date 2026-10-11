// Run against an already started app: node tests/api-smoke.mjs http://127.0.0.1:3001
import assert from 'node:assert/strict';
import { SCENARIOS } from '../lib/scenarios.mjs';
import Database from 'better-sqlite3';
const base=process.argv[2] || 'http://127.0.0.1:3000';
const ids=[];
async function post(path,body){const r=await fetch(`${base}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {httpStatus:r.status,...await r.json()};}
const participant={name:'__API_SMOKE_TEST__',age:20,gender:'Prefer not to say',location:{status:'unavailable'}};
try {
 assert.equal((await fetch(base)).status,200);
 for(const scenario of SCENARIOS.filter(s=>s.audio)) {
 const asset=await fetch(`${base}${scenario.audio}`);assert.equal(asset.status,200);assert.ok((await asset.arrayBuffer()).byteLength>100000);
 }
 assert.equal((await post('sessions',{...participant,age:0})).httpStatus,400);
 const session=await post('sessions',participant);assert.equal(session.httpStatus,200);ids.push(session.id);
 assert.deepEqual(session.trials.map(t=>t.scenario),['silence','white-noise','conversation','classical','pop','rock']);
 const start=(trial,volume)=>post('rounds',{sessionId:session.id,trialId:trial.id,action:'start',volume});
 assert.equal((await start(session.trials[1],.4)).httpStatus,409);
 let final;
 for(const [index,trial] of session.trials.entries()) {
  const volume=index===0?0:.4;
  if(index>0)assert.equal((await start(trial,0)).httpStatus,400);
  let r=await start(trial,volume);assert.equal(r.httpStatus,200);assert.match(r.sequence,/^\d{4}$/);assert.equal(r.digitMs,400);assert.equal(r.roundNumber,1);
  const submission={sessionId:session.id,trialId:trial.id,action:'submit',roundNumber:1,answer:r.sequence,responseMs:2500,events:[{type:'audio-start',scenario:trial.scenario,volume}]};
  let result=await post('rounds',submission);assert.equal(result.outcome,'correct');assert.equal(result.successfulRounds,1);
  assert.equal((await post('rounds',submission)).successfulRounds,1);
  r=await start(trial,volume);assert.equal(r.sequence.length,5);assert.equal(r.digitMs,350);
  const failure={...submission,roundNumber:2,answer:'',responseMs:10000,events:[]};
  result=await post('rounds',failure);assert.equal(result.outcome,'timeout');assert.equal(result.longestSequence,4);
  assert.equal(result.allCompleted,index===SCENARIOS.length-1);
  assert.equal((await post('rounds',failure)).outcome,'timeout');
  assert.equal((await start(trial,volume)).httpStatus,409);
  final=result;
 }
 assert.equal(final.trials.length,SCENARIOS.length);assert.ok(final.trials.every(t=>t.successfulRounds===1 && t.status==='completed'));
 const db=new Database('data/memory.sqlite');
 assert.equal(db.prepare('SELECT status FROM sessions WHERE id=?').get(session.id).status,'completed');
 const rows=db.prepare('SELECT r.*,t.scenario FROM trial_rounds r JOIN trials t ON t.id=r.trial_id WHERE t.session_id=?').all(session.id);
 assert.equal(rows.length,SCENARIOS.length*2);assert.ok(rows.every(r=>r.volume===(r.scenario==='silence'?0:.4)));db.close();
 const abandoned=await post('sessions',participant);ids.push(abandoned.id);await post('finish',{sessionId:abandoned.id});
 assert.equal((await post('rounds',{sessionId:abandoned.id,trialId:abandoned.trials[0].id,action:'start',volume:0})).httpStatus,409);
 console.log('PASS: six scenarios, fresh round settings, enforced order, audible volume validation, per-scenario SQLite results, retries, full completion, abandonment, and all audio assets.');
} finally {
 const db=new Database('data/memory.sqlite');for(const id of ids){db.prepare('DELETE FROM trial_rounds WHERE trial_id IN (SELECT id FROM trials WHERE session_id=?)').run(id);db.prepare('DELETE FROM trials WHERE session_id=?').run(id);db.prepare('DELETE FROM rounds WHERE session_id=?').run(id);db.prepare('DELETE FROM sessions WHERE id=?').run(id);}db.close();
}
