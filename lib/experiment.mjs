export function roundSettings(roundNumber) {
 return { digitCount: roundNumber + 3, digitMs: Math.max(100, 500 - (roundNumber - 1) * 25) };
}
export const ANSWER_MS = 10000;
export function judge(sequence, answer, elapsedMs) {
 return elapsedMs >= ANSWER_MS ? 'timeout' : answer === sequence ? 'correct' : 'incorrect';
}
