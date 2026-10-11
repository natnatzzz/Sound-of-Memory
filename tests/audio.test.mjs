import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../lib/scenarios.mjs';
import { ExperimentAudio } from '../lib/audio.mjs';

test('audio plays looped stimuli and stops sources; silence creates no context',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 const sources=[];
 let contexts=0;
 class Context {
  state='running';sampleRate=100;currentTime=0;destination={};
  constructor(){contexts++;}
  async resume(){}
  createBuffer(channels,length){assert.equal(channels,1);return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  async decodeAudioData(){return {duration:30};}
  close(){this.state='closed';}
 }
 globalThis.window={AudioContext:Context};
 globalThis.fetch=async path=>{assert.ok(SCENARIOS.some(s=>s.audio===path));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 try {
  const audio=new ExperimentAudio();
  await audio.prepare('silence');audio.start('silence',0);assert.equal(contexts,0);assert.equal(sources.length,0);
  await audio.prepare('white-noise');audio.start('white-noise',.4);assert.ok(sources[0].started);assert.ok(sources[0].loop);assert.ok(sources[0].buffer);
  const firstSource=audio.source;assert.equal(audio.start('white-noise',.4),false);assert.equal(audio.source,firstSource);assert.equal(sources.length,1);assert.equal(firstSource.stopped,undefined);
  audio.stop();assert.ok(sources[0].stopped);assert.equal(audio.source,null);
  await audio.prepare('conversation');audio.start('conversation',.4);assert.equal(sources[1].buffer.duration,30);assert.ok(sources[1].loop);
  audio.start('white-noise',.4);assert.ok(sources[1].stopped);
  for(const scenario of ['classical','pop','rock']) {
   await audio.prepare(scenario);audio.start(scenario,.4);assert.equal(audio.bufferScenario,scenario);assert.equal(sources.at(-1).buffer.duration,30);assert.ok(sources.at(-1).loop);
   const continuingSource=audio.source,sourceCount=sources.length;assert.equal(audio.start(scenario,.4),false);assert.equal(audio.source,continuingSource);assert.equal(sources.length,sourceCount);assert.equal(continuingSource.stopped,undefined);
  }
  audio.dispose();assert.ok(sources.at(-1).stopped);assert.equal(audio.context,null);
  const broken=new ExperimentAudio();globalThis.fetch=async()=>({ok:false});await assert.rejects(broken.prepare('conversation'),/could not load/);assert.equal(broken.source,null);broken.dispose();
  const blocked=new ExperimentAudio();await blocked.prepare('white-noise');blocked.context.state='suspended';assert.throws(()=>blocked.start('white-noise',.4),/interrupted/);blocked.dispose();
 }finally {globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});

test('countdown ding works in silence and stops without creating background audio',async()=>{
 const originalWindow=globalThis.window;
 let tone,peak,endTime;
 class Context {
  state='running';currentTime=10;destination={};
  async resume(){}
  createOscillator(){tone={frequency:{setValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(at){this.stopAt=at;}};return tone;}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(value){peak=value;},exponentialRampToValueAtTime(value,at){endTime=at;}},connect(){},disconnect(){}};}
  close(){}
 }
 globalThis.window={AudioContext:Context};
 try {
  const audio=new ExperimentAudio();await audio.prepare('silence',{countdown:true});audio.start('silence',0);audio.ding();
  assert.equal(audio.source,null);assert.ok(tone.started);assert.equal(peak,.08);assert.equal(tone.stopAt,10.3);assert.equal(endTime,10.28);
  tone.onended();assert.equal(audio.tones.size,0);assert.ok(tone.disconnected);
  audio.ding();audio.stop();assert.equal(audio.tones.size,0);assert.ok(tone.disconnected);audio.dispose();
 }finally{globalThis.window=originalWindow;}
});
