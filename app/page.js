'use client';
import { useEffect, useRef, useState } from 'react';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(path, body) {
 const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.'); return data;
}
function Wave({ small = false }) { return <div className={`wave ${small ? 'small' : ''}`} aria-hidden="true">{Array.from({length: 33}, (_,i) => <i key={i} style={{'--height': `${18 + Math.sin(i * .75) ** 2 * 75}%`, '--delay': `${i * .04}s`}} />)}</div>; }
export default function Home() {
 const [screen,setScreen] = useState('home'), [modal,setModal] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
 const [participant,setParticipant] = useState({name:'',age:'',gender:''});
 const [location,setLocation] = useState({status:'pending'}), [session,setSession] = useState(null);
 const [round,setRound] = useState(1), [length,setLength] = useState(4), [digit,setDigit] = useState('3'), [answer,setAnswer] = useState(''), [remaining,setRemaining] = useState(10), [result,setResult] = useState(null);
 const [sequence,setSequence] = useState(''), [activeDigit,setActiveDigit] = useState(-1), [digitMs,setDigitMs] = useState(500); const answerRef = useRef(''), events = useRef([]), inputStart = useRef(0), submitted = useRef(false), pending = useRef(null), runId = useRef(0), sessionRef = useRef(null), input = useRef(null), dialog = useRef(null), takeButton = useRef(null);
 useEffect(() => {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), 4500);
 fetch('https://ipapi.co/json/', { signal:controller.signal }).then(r => { if(!r.ok) throw new Error(); return r.json(); }).then(d => setLocation(d.error ? {status:'unavailable'} : {status:'available',ip:d.ip,city:d.city,region:d.region,country:d.country_name})).catch(() => setLocation({status:'unavailable'})).finally(() => clearTimeout(timeout));
 return () => { controller.abort(); clearTimeout(timeout); };
 }, []);
 useEffect(() => {
 if(modal) { dialog.current?.showModal(); } else if(dialog.current?.open) { dialog.current.close(); takeButton.current?.focus(); }
 }, [modal]);
 useEffect(() => {
 const handler = () => { if(sessionRef.current) navigator.sendBeacon('/api/finish', new Blob([JSON.stringify({sessionId:sessionRef.current})],{type:'application/json'})); };
 window.addEventListener('pagehide',handler);
 return () => { window.removeEventListener('pagehide',handler); runId.current++; };
 }, []);
 useEffect(() => {
 if(screen !== 'answer') return;
 input.current?.focus();
 const timer = setInterval(() => { const elapsed = performance.now() - inputStart.current; setRemaining(Math.max(0,(10000 - elapsed)/1000)); if(elapsed >= 10000) submit(true); }, 40);
 const visibility = () => events.current.push({type:'visibility',state:document.visibilityState,atMs:performance.now()-inputStart.current});
 document.addEventListener('visibilitychange',visibility);
 return () => { clearInterval(timer); document.removeEventListener('visibilitychange',visibility); };
 }, [screen]);
 async function register(e) {
 e.preventDefault(); setBusy(true);setError('');
 try { const data = await api('sessions',{...participant,location});setSession(data.id);sessionRef.current=data.id;setModal(false);setScreen('ready'); }
 catch(e){setError(e.message);} finally{setBusy(false);}
 }
 async function begin() {
 setBusy(true);setError(''); const token = ++runId.current;
 try {
 const data = await api('rounds',{sessionId:session,action:'start'});
 setRound(data.roundNumber);setLength(data.sequence.length);setDigitMs(data.digitMs);setSequence(data.sequence);setActiveDigit(-1);setBusy(false);
 for(let count=3;count>=1;count--) { if(token!==runId.current)return;setDigit(String(count));setScreen('countdown');await sleep(1000); }
 setScreen('sequence');
 events.current = [];
 for(let i=0;i<data.sequence.length;i++) {
 if(token!==runId.current)return;
 setActiveDigit(i); events.current.push({type:'digit',index:i,digit:data.sequence[i],digitMs:data.digitMs,at:Date.now()});
 // Keep the full sequence visible; flash each position in turn.
 const gapMs = Math.min(100, data.digitMs / 5); await sleep(data.digitMs - gapMs);setActiveDigit(-1);await sleep(gapMs);
 }
 if(token!==runId.current)return;
 answerRef.current='';setAnswer('');setRemaining(10);submitted.current=false;inputStart.current=performance.now();setScreen('answer');
 } catch(e) {setError(e.message);setBusy(false);}
 }
 async function submit(timeout=false) {
 if(submitted.current)return;submitted.current=true;
 const responseMs = timeout ? Math.max(10000,performance.now()-inputStart.current) : performance.now()-inputStart.current;
 events.current.push({type:timeout?'timeout':'submit',atMs:responseMs});
 pending.current={sessionId:session,roundNumber:round,action:'submit',answer:answerRef.current,responseMs,events:events.current};
 setScreen('saving');await saveRound();
 }
 async function saveRound() {
 setBusy(true);setError('');
 try {const data=await api('rounds',pending.current);setResult(data);if(data.outcome==='correct')setScreen('success');else{sessionRef.current=null;setScreen('complete');}}
 catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function reset(){runId.current++;setSession(null);sessionRef.current=null;setResult(null);setError('');setScreen('home');}
 const testing = ['countdown','sequence','answer','saving','success'].includes(screen);
 return <main>
 <header><a className="brand" href="/" onClick={e=>{e.preventDefault();if(screen==='home')reset();}}><span className="brand-icon">≋</span> sound of memory<span className="brand-dot">.</span></a><span className="header-tag">A SCIENCE PROJECT BY NATALIE ZHAO</span></header>
 {screen==='home' ? <>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="status-dot"/> THE MEMORY EXPERIMENT</span><h1>Small numbers.<br/>Big <em>memories.</em></h1><p className="intro">How much can you hold in your mind? Explore your short-term memory, one sequence at a time.</p><button ref={takeButton} className="primary" onClick={()=>{setError('');setModal(true);}}>Take the Test <span>↗</span></button><p className="micro">No preparation needed. Just a little focus.</p></div><div className="hero-art"><span className="art-label">YOUR MIND, IN THE MOMENT</span><div className="number-orbit"><span className="floating one">7</span><span className="floating two">2</span><span className="floating three">9</span><div className="center-circle"><Wave/><span>remember the rhythm</span></div></div><div className="art-footer"><span>01 — OBSERVE</span><span>02 — RECALL</span><span>03 — DISCOVER</span></div></div></section>
 <section className="how"><div className="section-heading"><span className="eyebrow">A LITTLE ABOUT THE TEST</span><h2>A moment of focus.<br/>A window into memory.</h2></div><div className="steps"><article><span className="step-number">01</span><h3>Watch the numbers</h3><p>Start with four random digits. Watch each digit flash at a 500 ms pace.</p></article><article><span className="step-number">02</span><h3>Trust your memory</h3><p>Enter the digits in the same order. You have ten seconds to recall them.</p></article><article><span className="step-number">03</span><h3>Find your limit</h3><p>Each correct round adds a digit and speeds up by 25 ms, down to 100 ms.</p></article></div></section>
 <div className="note"><span>⌁</span><p><strong>A quiet space helps.</strong> Headphones are recommended. This version is a visual test; sound will be added in a future experiment.</p></div>
 </> : <section className="test-wrap"><div className="test-top"><span className="eyebrow">SOUND OF MEMORY TEST</span><span className="pill">{testing?`ROUND ${round} · ${length} DIGITS`:'YOUR MEMORY, EXPLORED'}</span></div><div className="test-card">
 {screen==='ready' && <><div className="round-icon">♫</div><h1>Ready to focus?</h1><p>Hi {participant.name}. Find somewhere quiet and put on a pair of headphones if you have them.</p><div className="instruction-box">Watch the full sequence as each digit flashes, then type it in order.<br/>Four digits to start, at 500 ms per digit. Ten seconds to answer.<br/><strong>This version does not play sound yet.</strong></div><button className="primary" disabled={busy} onClick={begin}>{busy?'Preparing…':'Begin Test'} <span>→</span></button></>}
 {screen==='countdown' && <><p className="eyebrow">GET READY</p><div className="big-digit countdown-digit" aria-live="polite">{digit}</div><p>Take a breath. Focus on the sequence.</p></>}
 {screen==='sequence' && <><p className="eyebrow">WATCH & REMEMBER</p><div className="sequence-display" style={{'--digit-size': `${Math.max(22, Math.min(90, 480 / length))}px`}}>{sequence.split('').map((value,index)=><span key={index} className={activeDigit===index?'sequence-digit active':'sequence-digit'}>{value}</span>)}</div><p>Keep the digits in order. Each digit flashes at a {digitMs} ms pace.</p></>}
 {screen==='answer' && <><p className="eyebrow">YOUR TURN</p><h1>What was the sequence?</h1><p>Enter all {length} digits in the same order.</p><form onSubmit={e=>{e.preventDefault();submit();}}><label className="sr-only" htmlFor="answer">Remembered sequence</label><input className="answer-input" id="answer" ref={input} value={answer} inputMode="numeric" autoComplete="off" maxLength={length} placeholder={'·'.repeat(Math.min(length,12))} onPaste={e=>{e.preventDefault();events.current.push({type:'paste-blocked',atMs:performance.now()-inputStart.current});}} onChange={e=>{const value=e.target.value.replace(/[^0-9]/g,'');answerRef.current=value;setAnswer(value);events.current.push({type:'input',value,atMs:performance.now()-inputStart.current});}}/><div className="timer-track"><div style={{width:`${remaining*10}%`}}/></div><div className="timer-label"><span>{answer.length} / {length} digits</span><span role="timer">{remaining.toFixed(1)} seconds left</span></div><button className="primary" type="submit">Submit sequence <span>→</span></button></form></>}
 {screen==='saving' && <><Wave small/><h1>{error?'Let’s save your round.':'Saving your round…'}</h1><p>Your answer and timing have been kept while we save.</p>{error&&<button className="primary" disabled={busy} onClick={saveRound}>Retry saving</button>}</>}
 {screen==='success' && <><div className="round-icon">✓</div><span className="eyebrow">SEQUENCE COMPLETE</span><h1>Nicely remembered.</h1><p>You recalled {length} digits in {(result.averageResponseMs/1000).toFixed(1)} seconds on average across your successful rounds. Next up: {length+1} digits.</p><button className="primary" disabled={busy} onClick={begin}>{busy?'Preparing…':'Next round'} <span>→</span></button></>}
 {screen==='complete' && <><div className="confetti" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{left:`${(i*29)%100}%`,'--delay':`${(i%8)*.13}s`,'--rotation':`${i*31}deg`,background:['#9badd0','#d5a578','#769384','#c8badb'][i%4]}}/>)}</div><div className="round-icon">✧</div><span className="eyebrow">TEST COMPLETE</span><h1>Thank you for<br/>making a memory.</h1><p>Your participation helps Natalie Zhao explore short-term memory. Your results have been saved.</p><div className="results"><div><strong>{result.longestSequence}</strong><span>Longest sequence</span></div><div><strong>{result.successfulRounds}</strong><span>Successful rounds</span></div><div><strong>{result.averageResponseMs?`${(result.averageResponseMs/1000).toFixed(1)}s`:'—'}</strong><span>Average recall time</span></div></div><p className="end-reason">{result.outcome==='timeout'?'The ten-second answer window ended.':'The final sequence didn’t match.'} The sequence was <strong>{result.expected.split('').join(' ')}</strong>.</p><button className="primary" onClick={reset}>Return to main menu <span>↗</span></button></>}
 {error && <p className="error" role="alert">{error}</p>}
 </div></section>}
 <footer><span>Sound of Memory Test</span><span>Created by Natalie Zhao · A study in short-term memory</span></footer>
 <dialog ref={dialog} onCancel={()=>setModal(false)}><button className="close" aria-label="Close participant form" onClick={()=>setModal(false)}>×</button><span className="eyebrow">BEFORE WE BEGIN</span><h2>A little about you.</h2><p>These details help us understand the results of the experiment.</p><form onSubmit={register}><label htmlFor="name">Name</label><input autoFocus id="name" required maxLength={100} autoComplete="name" value={participant.name} onChange={e=>setParticipant({...participant,name:e.target.value})}/><div className="form-row"><div><label htmlFor="age">Age</label><input id="age" type="number" required min="1" max="120" step="1" value={participant.age} onChange={e=>setParticipant({...participant,age:e.target.value})}/></div><div><label htmlFor="gender">Gender</label><select id="gender" required value={participant.gender} onChange={e=>setParticipant({...participant,gender:e.target.value})}><option value="">Select an option</option>{['Female','Male','Non-binary','Self-described','Prefer not to say'].map(g=><option key={g}>{g}</option>)}</select></div></div><div className="privacy"><strong>For this science project</strong><p>We store your name, age, gender, answers, timing, and approximate IP-based location locally. Your browser contacts ipapi.co to look up that location; no precise GPS is used.</p><span>Location: {location.status==='available'?`${location.city || location.region}, ${location.country}`:location.status==='pending'?'checking…':'unavailable — you can still participate'}</span></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy || !participant.name.trim()}>{busy?'Saving…':'Start Test'} <span>→</span></button></form></dialog>
 </main>;
}
