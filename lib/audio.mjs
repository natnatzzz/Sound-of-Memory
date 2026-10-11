import { SCENARIOS } from './scenarios.mjs';
// One audio controller per participant. No microphone access is used.
export class ExperimentAudio {
 context = null;
 source = null;
 playingScenario = null;
 gain = null;
 buffer = null;
 bufferScenario = null;
 tones = new Set();
 async prepare(scenario, { countdown = false } = {}) {
  if (scenario === 'silence' && !countdown) { this.stop(); return; }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('This browser does not support test audio. Please use a current browser.');
  this.context ||= new AudioContext();
  await this.context.resume();
  if (this.context.state !== 'running') throw new Error('Audio is blocked. Allow sound in your browser and try again.');
  const definition = SCENARIOS.find(item => item.id === scenario);
  if (!definition) throw new Error('Unknown sound scenario.');
  if (definition.audio && this.bufferScenario !== scenario) {
   const response = await fetch(definition.audio);
   if (!response.ok) throw new Error(`${definition.label} audio could not load. Please try again.`);
   // Retain only the current recording to limit decoded audio memory usage.
   this.buffer = null;
   this.bufferScenario = null;
   const decoded = await this.context.decodeAudioData(await response.arrayBuffer());
   if (decoded.duration < 1) throw new Error(`${definition.label} audio is unavailable.`);
   this.buffer = decoded;
   this.bufferScenario = scenario;
  }
 }
 ding() {
  if (this.context?.state !== 'running') return;
  const oscillator = this.context.createOscillator();
  const envelope = this.context.createGain();
  const now = this.context.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, now);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.08, now + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  oscillator.connect(envelope);envelope.connect(this.context.destination);
  const tone = { oscillator, envelope };
  this.tones.add(tone);
  oscillator.onended = () => { oscillator.disconnect();envelope.disconnect();this.tones.delete(tone); };
  oscillator.start(now);oscillator.stop(now + 0.3);
 }
 start(scenario, volume) {
  if (this.source && this.playingScenario === scenario) {
   if (this.context?.state !== 'running') throw new Error('Audio was interrupted. Check your browser sound settings and try again.');
   return false;
  }
  this.stop();
  if (scenario === 'silence') return false;
  if (this.context?.state !== 'running') throw new Error('Audio was interrupted. Check your browser sound settings and try again.');
  const source = this.context.createBufferSource();
  if (scenario === 'white-noise') {
   const buffer = this.context.createBuffer(1, this.context.sampleRate * 4, this.context.sampleRate);
   const samples = buffer.getChannelData(0);
   for (let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*0.4;
   source.buffer=buffer;
  } else {
   if(this.bufferScenario!==scenario || !this.buffer) throw new Error('Prepare the scenario audio before starting.');
   source.buffer=this.buffer;
  }
  source.loop=true;
  this.gain=this.context.createGain();
  this.gain.gain.setValueAtTime(0,this.context.currentTime);
  this.gain.gain.linearRampToValueAtTime(volume,this.context.currentTime+.05);
  source.connect(this.gain);this.gain.connect(this.context.destination);source.start();this.source=source;this.playingScenario=scenario;return true;
 }
 stop() { for(const tone of this.tones){tone.oscillator.stop();tone.oscillator.disconnect();tone.envelope.disconnect();}this.tones.clear();this.playingScenario=null; if(this.source){this.source.stop();this.source.disconnect();this.source=null;} if(this.gain){this.gain.disconnect();this.gain=null;} }
 dispose() { this.stop();if(this.context){this.context.onstatechange=null;this.context.close();}this.context=null;this.buffer=null;this.bufferScenario=null; }
}
