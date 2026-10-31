'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ConsentDialog from './consent-dialog';
import { validConsent } from '../lib/consent.mjs';
import { SCENARIOS, bestScenario, tiedBestTrials } from '../lib/scenarios.mjs';
import { GROUP_PAUSE_MS, groupingPauseMs } from '../lib/experiment.mjs';
import { ExperimentAudio } from '../lib/audio.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(path, body) {
 const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.'); return data;
}
function Wave({ small = false }) { return <div className={`wave ${small ? 'small' : ''}`} aria-hidden="true">{Array.from({length: 33}, (_,i) => <i key={i} style={{'--height': `${(18 + Math.sin(i * .75) ** 2 * 75).toFixed(2)}%`, '--delay': `${(i * .04).toFixed(2)}s`}} />)}</div>; }
function SequenceFeedback({ result }) {
 return <div className="sequence-feedback"><p className="end-reason">{result.outcome==='timeout'?'The answer window ended.':'The final sequence didn’t match.'}</p><dl><div><dt>Your sequence</dt><dd>{result.answer ? result.answer.split('').join(' ') : 'No answer entered'}</dd></div><div><dt>Correct sequence</dt><dd>{result.expected.split('').join(' ')}</dd></div></dl></div>;
}
export default function Home() {
 const [touchKeyboard,setTouchKeyboard]=useState(false);
 useEffect(()=>{
  const query=window.matchMedia('(pointer: coarse)');
  const update=()=>setTouchKeyboard(query.matches);
  update();query.addEventListener('change',update);
  return ()=>query.removeEventListener('change',update);
 },[]);
 const [trials,setTrials] = useState([]), [scenarioIndex,setScenarioIndex] = useState(0), [volume,setVolume] = useState(0.4), [audioChecked,setAudioChecked] = useState(false), [previewing,setPreviewing] = useState(false);
 const audio=useRef(null), previewTimer=useRef(null), nextRoundButton=useRef(null), nextScenarioButton=useRef(null);
 const scenario=SCENARIOS.find(s => s.id === trials[scenarioIndex]?.scenario) || SCENARIOS[scenarioIndex];
 const background=scenario.digitTones ? bestScenario(trials) : scenario;
 const trial=trials[scenarioIndex];
 const scenarioCount=trials.length || SCENARIOS.length;
 const tiedBest=tiedBestTrials(trials);
 const requiresAudioConfirmation=scenario.id!=='silence' && !trials.slice(0,scenarioIndex).some(t=>t.scenario!=='silence');
 const [screen,setScreen] = useState('home'), [modal,setModal] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
 const [consent,setConsent]=useState(null), [consentOpen,setConsentOpen]=useState(false);
 const consentLink=useRef(null);
 const [participant,setParticipant] = useState({name:'',age:'',gender:''});
 const [location,setLocation] = useState({status:'pending'}), [session,setSession] = useState(null);
 const [round,setRound] = useState(1), [length,setLength] = useState(4), [digit,setDigit] = useState('3'), [answer,setAnswer] = useState(''), [remaining,setRemaining] = useState(10), [result,setResult] = useState(null);
 const [sequence,setSequence] = useState(''), [activeDigit,setActiveDigit] = useState(-1), [digitMs,setDigitMs] = useState(400); const answerRef = useRef(''), events = useRef([]), inputStart = useRef(0), submitted = useRef(false), pending = useRef(null), runId = useRef(0), sessionRef = useRef(null), input = useRef(null), dialog = useRef(null), takeButton = useRef(null);
 useEffect(() => {
 if(!consent)return;
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), 4500);
 fetch('https://ipapi.co/json/', { signal:controller.signal }).then(r => { if(!r.ok) throw new Error(); return r.json(); }).then(d => setLocation(d.error ? {status:'unavailable'} : {status:'available',ip:d.ip,city:d.city,region:d.region,country:d.country_name})).catch(() => setLocation({status:'unavailable'})).finally(() => clearTimeout(timeout));
 return () => { controller.abort(); clearTimeout(timeout); };
 }, [consent]);
 useEffect(() => {
 if(modal && !consentOpen) { dialog.current?.showModal(); } else if(dialog.current?.open) { dialog.current.close(); if(!consentOpen)takeButton.current?.focus(); }
 if(modal && !consentOpen && consent)consentLink.current?.focus();
 }, [modal,consentOpen]);
 useEffect(() => {
 const handler = () => { audio.current?.stop(); if(sessionRef.current) navigator.sendBeacon('/api/finish', new Blob([JSON.stringify({sessionId:sessionRef.current})],{type:'application/json'})); };
 window.addEventListener('pagehide',handler);
 return () => { window.removeEventListener('pagehide',handler); runId.current++; clearTimeout(previewTimer.current);audio.current?.dispose(); };
 }, []);
 useEffect(() => {
 if(!busy) {
  if(screen === 'success') nextRoundButton.current?.focus();
  if(screen === 'scenario-complete') nextScenarioButton.current?.focus();
 }
 }, [screen, busy]);
 useEffect(() => {
 if(screen !== 'answer') return;
 if(!touchKeyboard)input.current?.focus();
 const timer = setInterval(() => { const elapsed = performance.now() - inputStart.current; setRemaining(Math.max(0,(10000 - elapsed)/1000)); if(elapsed >= 10000) submit(true); }, 40);
 const visibility = () => events.current.push({type:'visibility',state:document.visibilityState,atMs:performance.now()-inputStart.current});
 document.addEventListener('visibilitychange',visibility);
 return () => { clearInterval(timer); document.removeEventListener('visibilitychange',visibility); };
 }, [screen]);
 async function register(e) {
 e.preventDefault(); if(!validConsent(consent,participant)){setError('Please read and sign the informed consent before starting.');return;} setBusy(true);setError('');
 try { setResult(null);setTrials([]);setSession(null); const data = await api('sessions',{...participant,location,consent});setSession(data.id);sessionRef.current=data.id;setTrials(data.trials);setScenarioIndex(0);setAudioChecked(false);setModal(false);setScreen('ready'); }
 catch(e){setError(e.message);} finally{setBusy(false);}
 }
 function stopAudio() { clearTimeout(previewTimer.current);audio.current?.stop();setPreviewing(false); }
 async function previewAudio() {
  if(previewing){stopAudio();return;}
  setBusy(true);setError('');
  try {
   audio.current ||= new ExperimentAudio();
   await audio.current.prepare(background.id, {countdown:scenario.digitTones});audio.current.start(background.id,volume);setPreviewing(true);
   if(scenario.digitTones) for(let digit=0;digit<10;digit++) audio.current.digitTone(String(digit),320,volume,digit*.5 + (scenario.grouped ? Math.floor(digit/3)*GROUP_PAUSE_MS/1000 : 0));
   previewTimer.current=setTimeout(stopAudio,scenario.grouped ? 6500 : 5000);
  }catch(e){stopAudio();setError(e.message);}finally{setBusy(false);}
 }
 function nextScenario() {
  stopAudio();setScenarioIndex(i=>i+1);setRound(1);setLength(4);setDigitMs(400);setAudioChecked(false);setError('');setScreen('ready');
 }
 async function begin() {
 setBusy(true);setError(''); const token = ++runId.current;
 try {
 audio.current ||= new ExperimentAudio();
 await audio.current.prepare(background.id, { countdown: true });
 if(previewing) stopAudio();
 else clearTimeout(previewTimer.current);
 const data = await api('rounds',{sessionId:session,trialId:trial.id,action:'start',volume:scenario.id==='silence'?0:volume});
 const startedAudio=audio.current.start(background.id,volume);
 events.current=[{type:startedAudio?'audio-start':'audio-continue',scenario:scenario.id,volume:scenario.id==='silence'?0:volume,backgroundScenario:background.id,track:background.audio || null,at:Date.now()}];
 if(audio.current.context)audio.current.context.onstatechange=()=>events.current.push({type:'audio-state',state:audio.current.context.state,at:Date.now()});
 setRound(data.roundNumber);setLength(data.sequence.length);setDigitMs(data.digitMs);setSequence(data.sequence);setActiveDigit(-1);setBusy(false);
 for(let count=3;count>=1;count--) { if(token!==runId.current)return;setDigit(String(count));setScreen('countdown');audio.current.ding();events.current.push({type:'countdown-ding',number:count,at:Date.now()});await sleep(1000); }
 setScreen('sequence');

 for(let i=0;i<data.sequence.length;i++) {
 if(token!==runId.current)return;
 setActiveDigit(i); events.current.push({type:'digit',index:i,digit:data.sequence[i],digitMs:data.digitMs,at:Date.now()});
 // Keep the full sequence visible; flash each position in turn.
 const gapMs = Math.min(100, data.digitMs / 5);
 if(scenario.digitTones) audio.current.digitTone(data.sequence[i],data.digitMs-gapMs,volume);
 await sleep(data.digitMs - gapMs);setActiveDigit(-1);await sleep(gapMs);
 const pauseMs=groupingPauseMs(i,data.sequence.length,scenario.grouped);
 if(pauseMs) { events.current.push({type:'group-pause',afterIndex:i,durationMs:pauseMs,at:Date.now()});await sleep(pauseMs); }
 }
 if(token!==runId.current)return;
 answerRef.current='';setAnswer('');setRemaining(10);submitted.current=false;inputStart.current=performance.now();setScreen('answer');
 } catch(e) {stopAudio();setError(e.message);setBusy(false);}
 }
 function updateAnswer(value) {
  if(submitted.current)return;
  const next=value.replace(/[^0-9]/g,'').slice(0,length);
  answerRef.current=next;setAnswer(next);
  events.current.push({type:'input',value:next,atMs:performance.now()-inputStart.current});
 }
 async function submit(timeout=false) {
 if(submitted.current)return;submitted.current=true;
 if(timeout || answerRef.current!==sequence) {stopAudio();events.current.push({type:'audio-stop',at:Date.now()});}
 const responseMs = timeout ? Math.max(10000,performance.now()-inputStart.current) : performance.now()-inputStart.current;
 events.current.push({type:timeout?'timeout':'submit',atMs:responseMs});
 pending.current={sessionId:session,trialId:trial.id,roundNumber:round,action:'submit',answer:answerRef.current,responseMs,events:events.current};
 setScreen('saving');await saveRound();
 }
 async function saveRound() {
 setBusy(true);setError('');
 try {const data=await api('rounds',pending.current);setResult(data);setTrials(data.trials);if(data.outcome==='correct')setScreen('success');else {stopAudio();if(data.allCompleted){sessionRef.current=null;setScreen('complete');}else setScreen('scenario-complete');}}
 catch(e){stopAudio();setError(e.message);}finally{setBusy(false);}
 }
 function reset(){stopAudio();setConsent(null);setConsentOpen(false);setLocation({status:'pending'});setParticipant({name:'',age:'',gender:''});setTrials([]);setScenarioIndex(0);setAudioChecked(false);runId.current++;setSession(null);sessionRef.current=null;setResult(null);setError('');setScreen('home');}
 const testing = ['countdown','sequence','answer','saving','success'].includes(screen);
 return <main>
 <header><a className="brand" href="/" onClick={e=>{e.preventDefault();if(screen==='home')reset();}}><span className="brand-icon">≋</span> Sound of Numbers<span className="brand-dot">.</span></a><div className="header-actions"><span className="header-tag">A SCIENCE PROJECT BY NATALIE ZHAO</span>{screen==='home' && <Link className="analyze-link" href="/analyze/login">Analyze Data <span aria-hidden="true">↗</span></Link>}</div></header>
 {screen==='home' ? <>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="status-dot"/> THE MEMORY EXPERIMENT</span><h1>Small numbers.<br/>Big <em>memories.</em></h1><p className="intro">Memory is essential to learning, but does your study environment affect it at all?  This experiment will measure how well participants remember number sequences in silence and with different background noises.  The goal is to understand how sound affects short-term memory and help students choose the best study environments.</p><button ref={takeButton} className="primary" onClick={()=>{setError('');setModal(true);}}>Take the Test <span>↗</span></button><p className="micro">{SCENARIOS.length} sound scenarios. One memory experiment.</p></div><div className="hero-art"><span className="art-label">YOUR MIND, IN THE MOMENT</span><div className="number-orbit"><span className="floating one">7</span><span className="floating two">2</span><span className="floating three">9</span><div className="center-circle"><Wave/><span>remember the numbers</span></div></div><div className="art-footer"><span>01 — OBSERVE</span><span>02 — RECALL</span><span>03 — DISCOVER</span></div></div></section>
 <section className="how"><div className="section-heading"><span className="eyebrow">A LITTLE ABOUT THE TEST</span><h2>A moment of focus.<br/>A window into memory.</h2></div><div className="steps"><article><span className="step-number">01</span><h3>Watch the numbers</h3><p>Start with four random digits. Watch each digit flash.</p></article><article><span className="step-number">02</span><h3>Trust your memory</h3><p>Enter the digits in the same order. You have ten seconds to recall them.</p></article><article><span className="step-number">03</span><h3>Find your limit</h3><p>Each correct round adds a digit and speeds up.</p></article></div></section>
 <div className="note"><span>⌁</span><p><strong>A quiet space helps.</strong> Use headphones for all {SCENARIOS.length} scenarios and keep your device volume consistent. Each scenario runs until a missed sequence, then the next begins at four digits.</p></div>
 </> : <section className="test-wrap"><div className="test-top"><span className="eyebrow">{['complete','dashboard'].includes(screen)?'TEST COMPLETE':`${scenarioIndex+1} / ${scenarioCount} · ${scenario.label.toUpperCase()}`}</span><span className="pill">{testing?`ROUND ${round} · ${length} DIGITS`:'YOUR MEMORY, EXPLORED'}</span></div><div className={`test-card ${screen==='answer' && touchKeyboard?'mobile-answer-card':''}`}>
 {screen==='ready' && <><h1>Ready to focus?</h1><p>Hi {participant.name}. Before you begin:</p>{scenarioIndex===0 && <section className="focus-checklist" aria-label="Before you begin"><ul><li><strong>Find a quiet space.</strong><span>Choose somewhere you won’t be interrupted.</span></li><li><strong>Put on headphones.</strong><span>Use a pair if you have them, so you can hear each sound clearly.</span></li></ul></section>}{scenarioIndex===0 && <div className="instruction-box">Watch the full sequence as each digit flashes, then type it in order.<br/><strong>Complete all rounds in each of the {SCENARIOS.length} sound scenarios.</strong></div>}<div className="scenario-intro"><span className="eyebrow">SCENARIO {scenarioIndex+1} OF {scenarioCount}</span><h2>{scenario.label}</h2><p>{scenario.description}{scenario.digitTones && <> Selected background: {background.label}.</>} Each scenario starts fresh and ends after a wrong answer or timeout.</p>{scenario.id!=='silence' && <><label htmlFor="volume">Audio level: {Math.round(volume*100)}%</label><input id="volume" type="range" min="0.05" max="0.8" step="0.05" value={volume} disabled={busy} onChange={e=>{stopAudio();setVolume(Number(e.target.value));setAudioChecked(false);}}/><button className="secondary" disabled={busy} onClick={previewAudio}>{previewing?'Stop sound check':'Play sound check'}</button>{requiresAudioConfirmation && <label className="audio-confirm"><input type="checkbox" checked={audioChecked} onChange={e=>setAudioChecked(e.target.checked)}/> I can hear the audio clearly at a comfortable level.</label>}<p className="audio-note">Keep this level unchanged throughout the scenario. {scenario.id==='conversation'?'“Loud conversation” uses overlapping synthesized voices.':background.track?`Track: ${background.track} · ${background.artist || 'Kevin MacLeod'}.`:''}</p></>}</div><button className="primary" disabled={busy || (requiresAudioConfirmation && !audioChecked)} onClick={begin}>{busy?'Preparing…':'Begin scenario'} <span>→</span></button></>}
 {screen==='countdown' && <><p className="eyebrow">GET READY</p><div className="big-digit countdown-digit" aria-live="polite">{digit}</div><p>Take a breath. Focus on the sequence.</p></>}
 {screen==='sequence' && <><p className="eyebrow">WATCH & REMEMBER</p><div className="sequence-display" style={{'--digit-size': `${Math.max(22, Math.min(90, 480 / length))}px`}}>{sequence.split('').map((value,index)=><span key={index}>{scenario.grouped && index>0 && index%3===0 && <span className="digit-group-space" aria-hidden="true"/>}<span className={activeDigit===index?'sequence-digit active':'sequence-digit'}>{value}</span></span>)}</div><p>Keep the digits in order. Each digit flashes at a {digitMs} ms pace.{scenario.grouped && <> Pause between groups of three. Enter digits only.</>}</p></>}
 {screen==='answer' && <><p className="eyebrow">YOUR TURN</p><h1>What was the sequence?</h1><p>Enter all {length} digits in the same order.</p><form onSubmit={e=>{e.preventDefault();submit();}}><label className="sr-only" htmlFor="answer">Remembered sequence</label><input className="answer-input" id="answer" ref={input} value={answer} inputMode={touchKeyboard?'none':'numeric'} enterKeyHint="done" autoComplete="off" maxLength={length} placeholder={'·'.repeat(Math.min(length,12))} onPaste={e=>{e.preventDefault();events.current.push({type:'paste-blocked',atMs:performance.now()-inputStart.current});}} onChange={e=>updateAnswer(e.target.value)}/><div className="timer-track"><div style={{width:`${remaining*10}%`}}/></div><div className="timer-label"><span>{answer.length} / {length} digits</span><span role="timer">{remaining.toFixed(1)} seconds left</span></div>{touchKeyboard && <div className="answer-keypad" role="group" aria-label="Number pad">{['1','2','3','4','5','6','7','8','9','Clear','0','Delete'].map(key=><button type="button" key={key} aria-label={key==='Delete'?'Delete last digit':key==='Clear'?'Clear answer':key} onPointerDown={e=>e.preventDefault()} onClick={()=>updateAnswer(key==='Clear'?'':key==='Delete'?answerRef.current.slice(0,-1):answerRef.current+key)}>{key==='Delete'?'⌫':key}</button>)}</div>}<button className="primary" type="submit">Submit sequence <span>→</span></button></form></>}
 {screen==='saving' && <><Wave small/><h1>{error?'Let’s save your round.':'Saving your round…'}</h1><p>Your answer and timing have been kept while we save.</p>{error&&<button className="primary" disabled={busy} onClick={saveRound}>Retry saving</button>}</>}
 {screen==='success' && <><div className="round-icon">✓</div><span className="eyebrow">SEQUENCE COMPLETE</span><h1>Nicely remembered.</h1><p>You recalled {length} digits in {(result.averageResponseMs/1000).toFixed(1)} seconds on average across your successful rounds. Next up: {length+1} digits.</p><button ref={nextRoundButton} className="primary" disabled={busy} onClick={begin}>{busy?'Preparing…':'Next round'} <span>→</span></button></>}
 {screen==='scenario-complete' && <><div className="round-icon">✓</div><span className="eyebrow">SCENARIO {scenarioIndex+1} OF {scenarioCount} COMPLETE</span><h1>{scenario.label}: complete.</h1><p>You completed {result.successfulRounds} successful rounds. Your longest recalled sequence was {result.longestSequence} digits.</p><SequenceFeedback result={result}/><div className="instruction-box">Next: <strong>{SCENARIOS.find(s=>s.id===trials[scenarioIndex+1]?.scenario)?.label}</strong>.</div><button ref={nextScenarioButton} className="primary" onClick={nextScenario}>Next scenario <span>→</span></button></>}
 {screen==='complete' && <><div className="confetti" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{left:`${(i*29)%100}%`,'--delay':`${(i%8)*.13}s`,'--rotation':`${i*31}deg`,background:['#9badd0','#d5a578','#769384','#c8badb'][i%4]}}/>)}</div><div className="round-icon">✧</div><span className="eyebrow">TEST COMPLETE</span><h1>Thank you for<br/>making a memory.</h1><p>You completed all {scenarioCount} sound scenarios. Your results have been saved for Natalie Zhao’s memory experiment.</p><SequenceFeedback result={result}/><p className="instruction-box">Total test time: <strong>{Math.floor((result.totalTimeMs || 0) / 60000)} min {Math.floor((result.totalTimeMs || 0) / 1000) % 60} sec</strong><br/><small>Includes sound checks and breaks between rounds.</small></p><div className="dashboard-actions"><button className="primary" onClick={()=>setScreen('dashboard')}>View my results <span>→</span></button><button className="secondary" onClick={reset}>Return to main menu</button></div></>}
 {screen==='dashboard' && session && result && <>
 <span className="eyebrow">YOUR RESULTS DASHBOARD</span><h1>{participant.name}’s memory results</h1>
 <p>Results from your current test only. Returning to the main menu clears this dashboard for the next participant.</p>
 <dl className="participant-details"><div><dt>Participant</dt><dd>{participant.name}</dd></div><div><dt>Age</dt><dd>{participant.age}</dd></div><div><dt>Gender</dt><dd>{participant.gender}</dd></div></dl>
 <div className="results"><div><strong>{Math.max(0,...trials.map(t=>t.longestSequence))}</strong><span>Longest sequence · digits</span></div><div><strong>{trials.reduce((total,t)=>total+t.successfulRounds,0)}</strong><span>Successful rounds</span></div><div><strong>{Math.floor((result.totalTimeMs || 0)/60000)}:{String(Math.floor((result.totalTimeMs || 0)/1000)%60).padStart(2,'0')}</strong><span>Total test time</span></div></div>
 <section className="scenario-chart" aria-labelledby="scenario-chart-title"><h2 id="scenario-chart-title">Your recall by sound scenario</h2><p>Longest correctly recalled sequence in each scenario.</p>{trials.map(t=><div className="scenario-bar" key={t.id}><span>{SCENARIOS.find(s=>s.id===t.scenario).label}</span><div className="bar-track"><div style={{width:`${t.longestSequence/Math.max(1,...trials.map(t=>t.longestSequence))*100}%`}}/></div><strong>{t.longestSequence} digits</strong></div>)}</section>
 
 {tiedBest.length>0 && <section className="tied-results" aria-labelledby="tied-results-title"><h2 id="tied-results-title">Your tied best scenarios</h2><p>These scenarios tied at {tiedBest[0].longestSequence} digits in a fully correct sequence. Here’s how your final round in each began:</p><ul>{tiedBest.map(t=><li key={t.id}><strong>{SCENARIOS.find(s=>s.id===t.scenario)?.label}</strong><span>{t.finalRound ? <>{t.finalRound.matchingDigits} {t.finalRound.matchingDigits===1?'digit matched':'digits matched'} from the start {t.finalRound.hasMismatch?'before the first wrong digit':t.finalRound.outcome==='timeout'?'before time ran out':'before your answer ended'}.</> : 'Final-round details unavailable.'}</span></li>)}</ul><p className="dashboard-note">Partial matches describe the final round; they do not change your score.</p></section>}
 <div className="comparison"><table><caption>Your results by sound scenario</caption><thead><tr><th>Scenario</th><th>Longest sequence</th><th>Successful rounds</th><th>Average recall</th></tr></thead><tbody>{trials.map(t=><tr key={t.id}><th scope="row">{SCENARIOS.find(s=>s.id===t.scenario).label}</th><td>{t.longestSequence} digits</td><td>{t.successfulRounds}</td><td>{t.averageResponseMs?`${(t.averageResponseMs/1000).toFixed(1)}s`:'—'}</td></tr>)}</tbody></table></div>
 <p className="dashboard-note">Average recall includes successful rounds only. Total test time includes sound checks and breaks.</p>
 <div className="dashboard-actions"><button className="secondary" onClick={()=>setScreen('complete')}>Back to thank you</button><button className="primary" onClick={reset}>Return to main menu <span>↗</span></button></div>
 </>}
 {error && <p className="error" role="alert">{error}</p>}
 </div></section>}
 <footer><span>Sound of Numbers</span><span>Created by Natalie Zhao · A study in short-term memory</span><details className="music-credits"><summary>Music credits</summary><p>Music performed by <a href="https://incompetech.com/" target="_blank" rel="noreferrer">Kevin MacLeod (incompetech.com)</a> and <a href="https://ende.app/" target="_blank" rel="noreferrer">Sascha Ende (ende.app)</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">Creative Commons Attribution 4.0</a>. Music excerpts are trimmed to one minute, compressed to mono MP3, and faded at the boundaries. They loop during the test.</p><ul>{SCENARIOS.filter(s=>s.track).map(s=><li key={s.id}><a href={s.source} target="_blank" rel="noreferrer">{s.track}</a> — {s.artist || 'Kevin MacLeod'} · {s.label}{s.id==='classical'?' (composition by Erik Satie)':''}</li>)}</ul></details></footer>
 <dialog ref={dialog} onCancel={()=>setModal(false)}><button className="close" aria-label="Close participant form" onClick={()=>setModal(false)}>×</button><span className="eyebrow">BEFORE WE BEGIN</span><h2>A little about you.</h2><p>These details help us understand the results of the experiment.</p><form onSubmit={register}><label htmlFor="name">Name</label><input autoFocus id="name" required maxLength={100} autoComplete="name" value={participant.name} onChange={e=>{setParticipant({...participant,name:e.target.value});setConsent(null);}}/><div className="form-row"><div><label htmlFor="age">Age</label><input id="age" type="number" required min="1" max="120" step="1" value={participant.age} onChange={e=>{setParticipant({...participant,age:e.target.value});setConsent(null);}}/></div><div><label htmlFor="gender">Gender</label><select id="gender" required value={participant.gender} onChange={e=>setParticipant({...participant,gender:e.target.value})}><option value="">Select an option</option>{['Female','Male','Non-binary','Self-described','Prefer not to say'].map(g=><option key={g}>{g}</option>)}</select></div></div><section className="consent-summary" aria-labelledby="consent-summary-title"><h3 id="consent-summary-title">Informed consent</h3><p>Please read the participant information and digitally sign before starting. Participants under 18 need permission from a parent or legal guardian.</p><button ref={consentLink} type="button" className="consent-link" disabled={!participant.name.trim()||!Number.isInteger(Number(participant.age))||Number(participant.age)<1||Number(participant.age)>120||!participant.gender} onClick={()=>setConsentOpen(true)}>{consent?'Review and sign informed consent again':'Read and sign informed consent'}</button><p role="status">{consent?'✓ Consent given. You can start the test.':'Fill out your name, age, and gender, then sign the consent.'}</p></section>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy || !participant.name.trim() || !participant.gender || !validConsent(consent,participant)}>{busy?'Saving…':'Start Test'} <span>→</span></button></form></dialog>{consentOpen && <ConsentDialog participant={participant} onCancel={()=>setConsentOpen(false)} onSign={value=>{setConsent(value);setConsentOpen(false);setError('');}}/>}
 </main>;
}
