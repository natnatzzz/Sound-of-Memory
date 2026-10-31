export const CONSENT_VERSION = '2026-10-31-v1';
export function validConsent(consent, participant) {
 return !!consent && consent.version === CONSENT_VERSION && consent.agreed === true &&
  consent.participantName === participant.name.trim() && Number(consent.participantAge) === Number(participant.age) &&
  typeof consent.signature === 'string' && consent.signature.trim().length > 0 && consent.signature.length <= 100 &&
  (Number(participant.age) < 18
   ? consent.role === 'guardian' && consent.participantAgreed === true
   : consent.role === 'participant' && consent.signature.trim() === participant.name.trim());
}
