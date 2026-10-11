export const SCENARIOS = [
 { id: 'silence', label: 'No sound', description: 'Complete the test without background audio.' },
 { id: 'white-noise', label: 'White noise', description: 'Complete the test with a steady background hiss.' },
 { id: 'classical', label: 'Classical music', description: 'Complete the test with classical piano music.', audio: '/audio/classical.mp3', track: 'Gymnopedie No. 1', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100787' },
 { id: 'pop', label: 'Pop music', description: 'Complete the test with upbeat instrumental pop music.', audio: '/audio/pop.mp3', track: 'Life of Riley', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054' },
 { id: 'rock', label: 'Rock music', description: 'Complete the test with instrumental rock music.', audio: '/audio/rock.mp3', track: 'Welcome to the Show', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100013' },
 { id: 'conversation', label: 'Loud conversation', description: 'Complete the test with overlapping voices in the background.', audio: '/audio/conversation.mp3' },
 { id: 'dtmf', digitTones: true, label: 'Best scenario + digit tones', description: 'Repeat your best sound scenario with a matching telephone keypad tone for each digit.' },
 { id: 'dtmf-grouped', digitTones: true, grouped: true, label: 'Best scenario + grouped digit tones', description: 'Repeat your best sound scenario with keypad tones and digits grouped in threes. Dashes mark a half-second pause between groups; enter digits only.' },
];

// Full ties retain the order of the first six scenarios.
export function bestScenario(results) {
 const candidates = SCENARIOS.filter(s => !s.digitTones).map(s => results.find(t => t.scenario === s.id && t.status === 'completed')).filter(Boolean);
 candidates.sort((a,b) => b.longestSequence-a.longestSequence || b.successfulRounds-a.successfulRounds || (a.averageResponseMs || Infinity)-(b.averageResponseMs || Infinity));
 return SCENARIOS.find(s => s.id === candidates[0]?.scenario) || SCENARIOS[0];
}
