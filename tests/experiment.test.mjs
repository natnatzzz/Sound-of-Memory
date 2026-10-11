import test from 'node:test';
import assert from 'node:assert/strict';
import { judge } from '../lib/experiment.mjs';
test('exact digits and order are required, including leading zeros',()=>{assert.equal(judge('01234','01234',9000),'correct');assert.equal(judge('01234','1234',9000),'incorrect');assert.equal(judge('11234','12134',9000),'incorrect');});
test('deadline ends recall even for a correct sequence',()=>{assert.equal(judge('12345','12345',9999),'correct');assert.equal(judge('12345','12345',10000),'timeout');assert.equal(judge('12345','',10000),'timeout');});

test('rounds add digits and accelerate to a 100ms floor',async()=>{
 const { roundSettings } = await import('../lib/experiment.mjs');
 assert.deepEqual(roundSettings(1),{digitCount:4,digitMs:500});
 assert.deepEqual(roundSettings(2),{digitCount:5,digitMs:475});
 assert.deepEqual(roundSettings(16),{digitCount:19,digitMs:125});
 assert.deepEqual(roundSettings(17),{digitCount:20,digitMs:100});
 assert.deepEqual(roundSettings(30),{digitCount:33,digitMs:100});
});
