import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
const COOKIE = 'memory-analysis-access';
// Shared by server bundles; restarting the server ends existing access sessions.
globalThis.memoryAnalysisSecret ||= randomBytes(32);
function signature(value) {
 return createHmac('sha256', globalThis.memoryAnalysisSecret).update(value).digest('hex');
}
export function validAnalysisToken(token) {
 if (typeof token !== 'string') return false;
 const [expires, sig, extra] = token.split('.');
 if (extra || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(sig || '') || Number(expires) <= Date.now()) return false;
 return timingSafeEqual(Buffer.from(sig), Buffer.from(signature(expires)));
}
export async function analysisAuthorized() {
 return validAnalysisToken((await cookies()).get(COOKIE)?.value);
}
export async function grantAnalysisAccess() {
 const expires=String(Date.now()+60*60*1000);
 (await cookies()).set(COOKIE, `${expires}.${signature(expires)}`, {httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', path:'/analyze', maxAge:3600});
}
export async function revokeAnalysisAccess() {
 (await cookies()).set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/analyze',maxAge:0});
}
