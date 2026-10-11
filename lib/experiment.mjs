export function roundSettings(roundNumber) {
 return { digitCount: roundNumber + 3, digitMs: Math.max(200, 400 - (roundNumber - 1) * 50) };
}
export const ANSWER_MS = 10000;
export function judge(sequence, answer, elapsedMs) {
 return elapsedMs >= ANSWER_MS ? 'timeout' : answer === sequence ? 'correct' : 'incorrect';
}

export const GROUP_PAUSE_MS = 500;
export function groupingPauseMs(index, digitCount, grouped) {
 return grouped && (index + 1) % 3 === 0 && index < digitCount - 1 ? GROUP_PAUSE_MS : 0;
}
