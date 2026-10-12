import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,trialStats,pairedDifferences,ageBand} from '../lib/analytics.mjs';
test('analytics separates missing responses from unsuccessful recall and pools accuracy',()=>{
 const a=trialStats({session_id:'a'},[{sequence:'1234',outcome:'correct',response_ms:2000},{sequence:'12345',outcome:'incorrect',response_ms:3000},{sequence:'123456',outcome:null,response_ms:null}]);
 const b=trialStats({session_id:'b'},[{sequence:'1234',outcome:'timeout',response_ms:10000}]);
 assert.equal(a.longest,4);assert.equal(a.recall,2000);assert.equal(a.accuracy,50);assert.equal(a.rounds,3);assert.equal(a.submitted,2);
 assert.equal(b.longest,0);assert.equal(b.recall,null);
 const combined=aggregate([a,b]);assert.equal(combined.longest,2);assert.equal(combined.recall,2000);assert.ok(Math.abs(combined.accuracy-100/3)<1e-10);assert.equal(combined.participants,2);
 assert.equal(aggregate([]).longest,null);assert.equal(aggregate([]).accuracy,null);
});
test('silence comparisons pair within sessions and exclude incomplete conditions',()=>{
 const trials=[{session_id:'a',scenario:'silence',status:'completed',longest:5},{session_id:'a',scenario:'rock',status:'completed',longest:7},{session_id:'b',scenario:'rock',status:'completed',longest:9},{session_id:'c',scenario:'silence',status:'completed',longest:4},{session_id:'c',scenario:'rock',status:'active',longest:6}];
 assert.deepEqual(pairedDifferences(trials,'rock'),[2]);
 assert.equal(ageBand(12),'Under 13');assert.equal(ageBand(13),'13–17');assert.equal(ageBand(50),'50+');
});
