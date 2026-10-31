export const SCENARIOS = [
 { id: 'silence', label: 'No sound', description: 'Complete the test without background audio.' },
 { id: 'white-noise', label: 'White noise', description: 'Complete the test with a steady background hiss.' },
 { id: 'classical', label: 'Classical music', description: 'Complete the test with classical piano music.', audio: '/audio/classical.mp3', track: 'Gymnopedie No. 1', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100787' },
 { id: 'rock', label: 'Pop / Rock music', description: 'Complete the test with instrumental rock music.', audio: '/audio/rock.mp3', track: 'Welcome to the Show', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100013' },
 { id: 'rap', label: 'Rap music', description: 'Complete the test with a hip-hop beat and clean rap vocals.', audio: '/audio/rap.mp3', track: 'Two Turntables And A Microphone', artist: 'Sascha Ende', source: 'https://ende.app/en/song/546-two-turntables-and-a-microphone' },
 { id: 'conversation', label: 'Loud conversation', description: 'Complete the test with overlapping voices in the background.', audio: '/audio/conversation.mp3' },
 { id: 'dtmf', digitTones: true, label: 'Best scenario + digit tones', description: 'Repeat your best sound scenario with a matching telephone keypad tone for each digit.' },
 { id: 'dtmf-grouped', digitTones: true, grouped: true, label: 'Best scenario + grouped digit tones', description: 'Repeat your best sound scenario with keypad tones and digits grouped in threes. Spaces separate the groups, with a half-second pause between them; enter digits only.' },
];

// Full ties retain the order of the base scenarios.
export function bestScenario(results) {
 const candidates = SCENARIOS.filter(s => !s.digitTones).map(s => results.find(t => t.scenario === s.id && t.status === 'completed')).filter(Boolean);
 candidates.sort((a,b) => b.longestSequence-a.longestSequence || b.successfulRounds-a.successfulRounds || (a.averageResponseMs || Infinity)-(b.averageResponseMs || Infinity));
 return SCENARIOS.find(s => s.id === candidates[0]?.scenario) || SCENARIOS[0];
}

// Choose once per session; persist this order in the trial positions.
export function randomizedScenarios(random = Math.random) {
 const base = SCENARIOS.filter(s => !s.digitTones);
 for (let i = base.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [base[i], base[j]] = [base[j], base[i]];
 }
 return [...base, ...SCENARIOS.filter(s => s.digitTones)];
}

export function tiedBestTrials(trials) {
 const completed=trials.filter(t=>t.status==='completed');
 const longest=Math.max(0,...completed.map(t=>t.longestSequence));
 const tied=completed.filter(t=>t.longestSequence===longest);
 return tied.length>1 ? tied : [];
}
