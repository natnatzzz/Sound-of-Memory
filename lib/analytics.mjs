export const ageBand = age => age < 13 ? 'Under 13' : age < 18 ? '13–17' : age < 25 ? '18–24' : age < 35 ? '25–34' : age < 50 ? '35–49' : '50+';
export const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
export function trialStats(trial, rounds) {
 const submitted=rounds.filter(r=>r.outcome), correct=submitted.filter(r=>r.outcome==='correct');
 return {...trial, rounds:rounds.length, submitted:submitted.length, correct:correct.length, longest:Math.max(0,...correct.map(r=>r.sequence.length)), recall:mean(correct.map(r=>r.response_ms).filter(Number.isFinite)), accuracy:submitted.length ? correct.length/submitted.length*100 : null};
}
export function aggregate(trials) {
 return {n:trials.length, participants:new Set(trials.map(t=>t.session_id)).size, longest:mean(trials.map(t=>t.longest)), correct:mean(trials.map(t=>t.correct)), recall:mean(trials.map(t=>t.recall).filter(Number.isFinite)), accuracy:trials.reduce((s,t)=>s+t.submitted,0) ? trials.reduce((s,t)=>s+t.correct,0)/trials.reduce((s,t)=>s+t.submitted,0)*100 : null};
}
export function pairedDifferences(trials, scenario) {
 return trials.filter(t=>t.scenario===scenario && t.status==='completed').flatMap(t=>{
 const baseline=trials.find(b=>b.session_id===t.session_id && b.scenario==='silence' && b.status==='completed');
 return baseline ? [t.longest-baseline.longest] : [];
 });
}
