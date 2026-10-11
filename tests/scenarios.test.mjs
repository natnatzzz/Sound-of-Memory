import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, bestScenario } from '../lib/scenarios.mjs';
const result=(scenario,longestSequence,successfulRounds,averageResponseMs)=>({scenario,status:'completed',longestSequence,successfulRounds,averageResponseMs});
test('scenario order and adaptive winner selection',()=>{
 assert.deepEqual(SCENARIOS.map(s=>s.id),['silence','white-noise','classical','pop','rock','conversation','dtmf','dtmf-grouped']);
 assert.equal(bestScenario([result('silence',5,2,100),result('rock',6,3,1000)]).id,'rock');
 assert.equal(bestScenario([result('pop',6,3,200),result('classical',6,3,100)]).id,'classical');
 assert.equal(bestScenario([result('rock',6,2,100),result('conversation',6,3,200)]).id,'conversation');
 assert.equal(bestScenario([result('pop',6,3,100),result('classical',6,3,100)]).id,'classical');
 assert.equal(bestScenario([result('dtmf',99,99,1),result('dtmf-grouped',100,100,1),result('white-noise',6,3,100)]).id,'white-noise');
 assert.equal(bestScenario([result('silence',0,0,0),result('white-noise',0,0,0)]).id,'silence');
});
