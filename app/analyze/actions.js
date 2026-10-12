'use server';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const deriveKey = promisify(scrypt);
import { redirect } from 'next/navigation';
import { grantAnalysisAccess, revokeAnalysisAccess } from '../../lib/analysis-auth';
export async function unlockAnalysis(previousState, formData) {
 const password=formData.get('password');
 const [salt, hash] = (process.env.ANALYSIS_PASSWORD_HASH || '').split(':');
 if (typeof password !== 'string' || password.length > 200 || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return {error:'Incorrect password. Please try again.'};
 const expected=Buffer.from(hash, 'hex');
 const supplied=await deriveKey(password, salt, 64);
 if (!timingSafeEqual(supplied, expected)) return {error:'Incorrect password. Please try again.'};
 await grantAnalysisAccess();
 redirect('/analyze');
}
export async function lockAnalysis() {
 await revokeAnalysisAccess();
 redirect('/analyze/login');
}
