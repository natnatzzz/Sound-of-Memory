'use client';
import { useEffect, useRef, useState } from 'react';
import { CONSENT_VERSION } from '../lib/consent.mjs';
import { consentSections, adultAgreement, guardianAgreement } from '../lib/consent-statement.mjs';
export default function ConsentDialog({ participant, onCancel, onSign }) {
 const dialog=useRef(null);
 const minor=Number(participant.age)<18;
 const [signature,setSignature]=useState(minor?'':participant.name);
 const [agreed,setAgreed]=useState(false), [participantAgreed,setParticipantAgreed]=useState(false);
 useEffect(()=>{dialog.current.showModal();},[]);
 function sign(e) {
  e.preventDefault();
  onSign({version:CONSENT_VERSION,participantName:participant.name.trim(),participantAge:Number(participant.age),signature:signature.trim(),role:minor?'guardian':'participant',agreed,participantAgreed:minor?participantAgreed:true});
 }
 return <dialog ref={dialog} className="consent-dialog" aria-labelledby="consent-title" onCancel={e=>{e.preventDefault();onCancel();}}>
 <button type="button" className="close" aria-label="Close informed consent" onClick={onCancel}>×</button>
 <span className="eyebrow">INFORMED CONSENT</span><h2 id="consent-title">Sound of Numbers: Participant Information and Consent</h2>
 <div className="consent-copy">{consentSections.map((section,index)=>section.heading?<h3 key={index}>{section.text}</h3>:<p key={index}>{section.text}</p>)}
 <h3>{minor?'Parent or Legal Guardian Permission — Required for Participants Under 18':'Participant Consent — Ages 18 and Older'}</h3>
 <p>{minor?guardianAgreement:adultAgreement}</p>
 </div>
 <form onSubmit={sign} className="consent-signature">
 <p>Participant: <strong>{participant.name}</strong> · Age {participant.age}</p>
 <label htmlFor="consent-signature">{minor?'Parent or legal guardian’s full name (digital signature)':'Your full name (digital signature)'}</label>
 <input id="consent-signature" value={signature} onChange={e=>setSignature(e.target.value)} required maxLength={100} autoComplete="name"/>
 <label className="consent-check"><input type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>{minor?'I am this participant’s parent or legal guardian, and I give permission for my child to participate.':'I have read the statement and agree to participate.'} Typing my name and selecting “Sign and agree” records my digital signature.</span></label>
 {minor&&<label className="consent-check"><input type="checkbox" required checked={participantAgreed} onChange={e=>setParticipantAgreed(e.target.checked)}/><span>Participant agreement: I understand what I will do and want to participate. I can stop at any time.</span></label>}
 <div className="consent-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" disabled={!signature.trim()||!agreed||(minor?!participantAgreed:signature.trim()!==participant.name.trim())}>Sign and agree</button></div>
 <p className="consent-version">Consent version {CONSENT_VERSION}. Your signature and signing time are saved when you start the test.</p>
 </form></dialog>;
}
