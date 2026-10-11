export const SCENARIOS = [
 { id: 'silence', label: 'No sound', description: 'Complete the test without background audio.' },
 { id: 'white-noise', label: 'White noise', description: 'Complete the test with a steady background hiss.' },
 { id: 'conversation', label: 'Loud conversation', description: 'Complete the test with overlapping voices in the background.', audio: '/audio/conversation.mp3' },
 { id: 'classical', label: 'Classical music', description: 'Complete the test with classical piano music.', audio: '/audio/classical.mp3', track: 'Gymnopedie No. 1', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100787' },
 { id: 'pop', label: 'Pop music', description: 'Complete the test with upbeat instrumental pop music.', audio: '/audio/pop.mp3', track: 'Life of Riley', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054' },
 { id: 'rock', label: 'Rock music', description: 'Complete the test with instrumental rock music.', audio: '/audio/rock.mp3', track: 'Welcome to the Show', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100013' },
];
