// Run against an already started app: node tests/api-smoke.mjs http://127.0.0.1:3001
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
const base = process.argv[2] || 'http://127.0.0.1:3000';
const ids=[];
async function post(path,body){const r=await fetch(`${base}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()};}
try {
 assert.equal((await fetch(base)).status,200);
 assert.equal((await post('sessions',{name:'Test',age:0,gender:'Female'})).status,400);
 const s=await post('sessions',{name:'__API_SMOKE_TEST__',age:20,gender:'Prefer not to say',location:{status:'unavailable'}});assert.equal(s.status,200);ids.push(s.id);
 let r=await post('rounds',{sessionId:s.id,action:'start'});assert.match(r.sequence,/^\d{4}$/);
 const submission={sessionId:s.id,action:'submit',roundNumber:1,answer:r.sequence,responseMs:2500,events:[{type:'input',value:r.sequence,atMs:2400}]};
 let result=await post('rounds',submission);assert.equal(result.outcome,'correct');assert.equal(result.successfulRounds,1);
 assert.equal((await post('rounds',submission)).successfulRounds,1);
 r=await post('rounds',{sessionId:s.id,action:'start'});assert.equal(r.sequence.length,5);assert.equal(r.digitMs,475);
 const failure={sessionId:s.id,action:'submit',roundNumber:2,answer:'',responseMs:10000,events:[]};
 result=await post('rounds',failure);assert.equal(result.outcome,'timeout');assert.equal(result.longestSequence,4);
 assert.equal((await post('rounds',failure)).outcome,'timeout');
 assert.equal((await post('rounds',{sessionId:s.id,action:'start'})).status,409);
 const db=new Database('data/memory.sqlite');assert.equal(db.prepare('SELECT status FROM sessions WHERE id=?').get(s.id).status,'completed');assert.equal(db.prepare('SELECT COUNT(*) AS count FROM rounds WHERE session_id=?').get(s.id).count,2);db.close();
 console.log('PASS: landing page, validation, SQLite persistence, increasing rounds, timeout, and idempotent retry.');
} finally {
 const db=new Database('data/memory.sqlite');for(const id of ids){db.prepare('DELETE FROM rounds WHERE session_id=?').run(id);db.prepare('DELETE FROM sessions WHERE id=?').run(id);}db.close();
}
