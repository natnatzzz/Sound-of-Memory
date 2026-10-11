export function roundSettings(roundNumber) {
 return { digitCount: roundNumber + 3, digitMs: Math.max(50, 400 - (roundNumber - 1) * 50) };
}
export const ANSWER_MS = 10000;
export function judge(sequence, answer, elapsedMs) {
 return elapsedMs >= ANSWER_MS ? 'timeout' : answer === sequence ? 'correct' : 'incorrect';
}
