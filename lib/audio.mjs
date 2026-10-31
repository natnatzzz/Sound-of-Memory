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
 playbackSession = null;
 previousSessionType = null;
 async prepare(scenario, { countdown = false } = {}) {
  if (scenario === 'silence' && !countdown) { this.stop(); return; }
  // Treat test sounds as media playback on supporting phones (including iOS
  // silent mode). Request this synchronously during the participant's tap.
  try {
   const session = window.navigator?.audioSession;
   if (session && session.type !== 'playback') {
    const previous = session.type;
    session.type = 'playback';
    if (!this.playbackSession) { this.playbackSession = session; this.previousSessionType = previous; }
   }
  } catch { /* Older or restricted browsers keep their normal audio behavior. */ }
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
 digitTone(digit, durationMs, volume, delaySeconds = 0) {
  const frequencies = {0:[941,1336],1:[697,1209],2:[697,1336],3:[697,1477],4:[770,1209],5:[770,1336],6:[770,1477],7:[852,1209],8:[852,1336],9:[852,1477]}[digit];
  if (!frequencies) throw new Error('Invalid DTMF digit.');
  if (this.context?.state !== 'running') throw new Error('Audio was interrupted. Check your browser sound settings and try again.');
  const now = this.context.currentTime + delaySeconds;
  const duration = durationMs / 1000;
  for (const frequency of frequencies) {
   const oscillator = this.context.createOscillator();
   const envelope = this.context.createGain();
   oscillator.type = 'sine';oscillator.frequency.setValueAtTime(frequency, now);
   envelope.gain.setValueAtTime(0, now);
   envelope.gain.linearRampToValueAtTime(volume / 2, now + 0.005);
   envelope.gain.setValueAtTime(volume / 2, now + duration - 0.005);
   envelope.gain.linearRampToValueAtTime(0, now + duration);
   oscillator.connect(envelope);envelope.connect(this.context.destination);
   const tone = { oscillator, envelope };this.tones.add(tone);
   oscillator.onended = () => { oscillator.disconnect();envelope.disconnect();this.tones.delete(tone); };
   oscillator.start(now);oscillator.stop(now + duration);
  }
 }
 start(scenario, volume) {
  if (this.source && this.playingScenario === scenario) {
   if (this.context?.state !== 'running') throw new Error('Audio was interrupted. Check your browser sound settings and try again.');
   return false;
  }
  this.stop();
  if (scenario === 'silence') return false;
  if (this.context?.state !== 'running') throw new Error('Audio was interrupted. Check your browser sound settings and try again.');
  if (scenario === 'dtmf') { this.playingScenario=scenario;return true; }
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
 dispose() {
  try { if(this.playbackSession?.type==='playback')this.playbackSession.type=this.previousSessionType; } catch {}
  this.playbackSession=null;this.previousSessionType=null;
  this.stop();if(this.context){this.context.onstatechange=null;this.context.close();}this.context=null;this.buffer=null;this.bufferScenario=null; }
}
