import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, bestScenario, randomizedScenarios } from '../lib/scenarios.mjs';
const result=(scenario,longestSequence,successfulRounds,averageResponseMs)=>({scenario,status:'completed',longestSequence,successfulRounds,averageResponseMs});
test('scenario order and adaptive winner selection',()=>{
 assert.deepEqual(SCENARIOS.map(s=>s.id),['silence','white-noise','classical','rock','rap','conversation','dtmf','dtmf-grouped']);
 assert.equal(bestScenario([result('rap',7,4,100),result('rock',6,3,100)]).id,'rap');
 assert.equal(bestScenario([result('silence',5,2,100),result('rock',6,3,1000)]).id,'rock');
 assert.equal(bestScenario([result('rock',6,3,200),result('classical',6,3,100)]).id,'classical');
 assert.equal(bestScenario([result('rock',6,2,100),result('conversation',6,3,200)]).id,'conversation');
 assert.equal(bestScenario([result('rock',6,3,100),result('classical',6,3,100)]).id,'classical');
 assert.equal(bestScenario([result('dtmf',99,99,1),result('dtmf-grouped',100,100,1),result('white-noise',6,3,100)]).id,'white-noise');
 assert.equal(bestScenario([result('silence',0,0,0),result('white-noise',0,0,0)]).id,'silence');
});

test('shuffle keeps all base conditions once and adaptive conditions last without changing the catalog',()=>{
 const catalog=SCENARIOS.map(s=>s.id);
 const shuffled=randomizedScenarios(()=>0).map(s=>s.id);
 assert.deepEqual(shuffled.slice(0,6),[...catalog.slice(1,6),catalog[0]]);
 assert.deepEqual(shuffled.slice(6),['dtmf','dtmf-grouped']);
 assert.deepEqual([...shuffled].sort(),[...catalog].sort());
 assert.deepEqual(randomizedScenarios(()=>0.999).map(s=>s.id),catalog);
 assert.deepEqual(SCENARIOS.map(s=>s.id),catalog);
});

test('best ties use full sequence length and require at least two completed scenarios',async()=>{
 const {tiedBestTrials}=await import('../lib/scenarios.mjs');
 const trials=[result('silence',5,2,100),result('rock',5,2,200),result('rap',4,1,50)];
 assert.deepEqual(tiedBestTrials(trials).map(t=>t.scenario),['silence','rock']);
 assert.deepEqual(tiedBestTrials([trials[0],trials[2]]),[]);
 assert.deepEqual(tiedBestTrials([]),[]);
 assert.deepEqual(tiedBestTrials([trials[0],{...trials[1],status:'active'}]),[]);
});
