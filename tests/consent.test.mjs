import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_VERSION, validConsent } from '../lib/consent.mjs';
const participant={name:'Test Person',age:18};
const consent={version:CONSENT_VERSION,participantName:'Test Person',participantAge:18,signature:'Test Person',role:'participant',agreed:true,participantAgreed:true};
test('adult consent requires current statement, matching participant, signature and agreement',()=>{
 assert.ok(validConsent(consent,participant));
 for(const patch of [{version:'old'},{signature:''},{signature:'Another person'},{agreed:false},{participantAge:17},{participantName:'Other'},{role:'guardian'}]) assert.equal(validConsent({...consent,...patch},participant),false);
 assert.equal(validConsent(null,participant),false);
 assert.equal(validConsent(consent,{...participant,name:'Changed'}),false);
});
test('minor requires guardian signature and participant agreement',()=>{
 const child={name:'Test Child',age:13};
 const permission={...consent,participantName:child.name,participantAge:13,signature:'Test Guardian',role:'guardian'};
 assert.ok(validConsent(permission,child));
 assert.equal(validConsent({...permission,role:'participant'},child),false);
 assert.equal(validConsent({...permission,participantAgreed:false},child),false);
 assert.equal(validConsent({...permission,signature:' '},child),false);
});
