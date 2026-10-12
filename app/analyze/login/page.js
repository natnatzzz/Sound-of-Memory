'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { unlockAnalysis } from '../actions';
export default function AnalysisLogin() {
 const [state, action, pending]=useActionState(unlockAnalysis,{error:''});
 return <main><header><Link className="brand" href="/">≋ sound of memory.</Link><Link className="secondary" href="/">Back to test</Link></header><section className="test-wrap"><div className="test-card"><span className="eyebrow">RESEARCH DASHBOARD</span><h1>Analyze Data</h1><p>Enter the password to view the experiment’s collected results.</p><form action={action} className="analysis-login"><label htmlFor="analysis-password">Password</label><input id="analysis-password" name="password" type="password" required autoFocus autoComplete="current-password" maxLength={200} aria-describedby={state.error?'password-error':undefined}/>{state.error&&<p id="password-error" className="error" role="alert">{state.error}</p>}<button className="primary" disabled={pending}>{pending?'Checking…':'Unlock dashboard'} <span>→</span></button></form></div></section></main>;
}
