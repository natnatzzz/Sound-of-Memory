import test from 'node:test';
import assert from 'node:assert/strict';
import { judge } from '../lib/experiment.mjs';
test('exact digits and order are required, including leading zeros',()=>{assert.equal(judge('01234','01234',9000),'correct');assert.equal(judge('01234','1234',9000),'incorrect');assert.equal(judge('11234','12134',9000),'incorrect');});
test('deadline ends recall even for a correct sequence',()=>{assert.equal(judge('12345','12345',9999),'correct');assert.equal(judge('12345','12345',10000),'timeout');assert.equal(judge('12345','',10000),'timeout');});

test('rounds add digits and accelerate to a 200ms floor',async()=>{
 const { roundSettings } = await import('../lib/experiment.mjs');
 assert.deepEqual(roundSettings(1),{digitCount:4,digitMs:400});
 assert.deepEqual(roundSettings(2),{digitCount:5,digitMs:350});
 assert.deepEqual(roundSettings(4),{digitCount:7,digitMs:250});
 assert.deepEqual(roundSettings(5),{digitCount:8,digitMs:200});
 assert.deepEqual(roundSettings(6),{digitCount:9,digitMs:200});
 assert.deepEqual(roundSettings(30),{digitCount:33,digitMs:200});
});
