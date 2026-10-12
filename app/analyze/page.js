import { redirect } from 'next/navigation';
import { analysisAuthorized } from '../../lib/analysis-auth';
import { transaction } from '../../lib/db';
import { trialStats } from '../../lib/analytics.mjs';
import Dashboard from './dashboard';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {title:'Analyze Data · Sound of Memory'};
export default async function AnalysisPage() {
 if (!(await analysisAuthorized())) redirect('/analyze/login');
 const data=await transaction(async db=>{
 const sessions=(await db.query('SELECT id,age,gender,location,started_at,completed_at,status FROM sessions ORDER BY started_at DESC',[])).rows.map(s=>{
 let location;try{location=JSON.parse(s.location);}catch{}
 return {...s,location:undefined,country:location?.country || 'Unknown'};
 });
 const rounds=(await db.query('SELECT trial_id,sequence,response_ms,outcome,digit_ms,volume FROM trial_rounds',[])).rows;
 const trials=(await db.query('SELECT id,session_id,scenario,status FROM trials ORDER BY position',[])).rows.map(t=>trialStats(t,rounds.filter(r=>r.trial_id===t.id)));
 const legacy=(await db.query('SELECT session_id,sequence,response_ms,outcome,digit_ms FROM rounds',[])).rows;
 const legacyTrials=sessions.filter(s=>!trials.some(t=>t.session_id===s.id)).flatMap(s=>{
 const rows=legacy.filter(r=>r.session_id===s.id);return rows.length?[trialStats({id:`legacy-${s.id}`,session_id:s.id,scenario:'legacy',status:s.status},rows)]:[];
 });
 return {sessions,trials:[...trials,...legacyTrials],rounds:[...rounds,...legacy.map(r=>({...r,trial_id:`legacy-${r.session_id}`}))]};
 }, {readOnly:true});
 return <Dashboard data={data}/>;
}
