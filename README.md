# Sound of Memory Test

A Next.js memory experiment by Natalie Zhao, with a local SQLite database.

## Run locally

Use Node.js 20.19+ and run:

```sh
npm install
npm run dev
```

Open http://localhost:3000. If port 3000 is in use, run `npm run dev -- --port 3001` and open http://localhost:3001. For a production build, run `npm run build` followed by `npm start`.

## Experiment

Participants enter their name, age, and gender, then review the quiet-space and headphone reminder. Each round has a three-second countdown, starts at four random digits (0–9), and adds one digit after each success. The whole sequence stays visible while each digit flashes in order. Digit slots start at 400 ms and decrease by 50 ms after each success, with a 50 ms minimum (reached in round 8). Each slot highlights its digit for 80% of the interval, followed by a 20% gap (capped at 100 ms). Recall has a strict ten-second window. A wrong answer or timeout ends the current scenario; results and confetti appear after all scenarios finish. Participants complete that full progression separately for no sound, white noise, loud conversation, classical music, pop music, and rock music, in that order. Failure ends only the current scenario; all six must end before the session is marked complete. The final screen compares scenario results.

## Data

The app creates `data/memory.sqlite` automatically. Both it and its SQLite WAL files are excluded from Git. The `sessions` table contains demographics, optional approximate IP-based location, user agent, timestamps, completion status, and successful-round count. New tests use a `trials` table for scenario order, status, timestamps, and successful-round counts, plus a `trial_rounds` table for per-scenario rounds and playback volume. The original `rounds` table is retained for historical tests. These round tables contain server-generated sequences, digit intervals in milliseconds, submitted answers, response times in milliseconds, outcomes, presentation timestamps, input events, visibility changes during recall, and submission/timeout events. Closing or reloading the page attempts to mark an active session abandoned; interrupted sessions remain inspectable even if that notification cannot arrive.

The browser contacts ipapi.co once to resolve its public IP and approximate city/region/country. Lookup failure does not prevent participation. Location is best-effort browser-reported data, not verified GPS. The participant form explains the stored information. Data stays in the local server database, except for the IP lookup request. Google Fonts supplies the optional display fonts, with local fallbacks.

Inspect results locally with a SQLite viewer, or with `sqlite3 data/memory.sqlite`. There is deliberately no unauthenticated results API. Back up the database with a SQLite-aware tool; do not commit participant data. This local prototype has no researcher login or consent-management workflow and is not yet configured for public deployment.

## Audio

White noise is generated locally using Web Audio. Loud conversation is a bundled approximately 30-second MP3 of two overlapping synthesized English voices, generated with macOS Samantha and Daniel. It is a conversation distraction stimulus, not a recording of a real crowd. Replace `public/audio/conversation.mp3` with a licensed conversation recording if the experiment needs natural speech. Classical, pop, and rock use bundled instrumental recordings by Kevin MacLeod: “Gymnopedie No. 1” (composition by Erik Satie), “Life of Riley”, and “Welcome to the Show”, respectively. Source and Creative Commons Attribution 4.0 credits are in the app footer and `public/audio/README.md`. Music recordings are trimmed to the first minute, compressed to 64 kbps mono MP3 at 22,050 Hz (about 480 KB each), and have short fades at the boundaries. They loop continuously across all rounds of the scenario, including the successful-round screens. The audio controller caches only the current recording to limit decoded audio memory. Audio is bundled/generated locally; no microphone or external audio service is used.

Participants check audio and confirm that it is audible before each sound scenario. A volume slider is available before the scenario and stays fixed during its rounds; each round records the playback gain. All sound scenarios start at the same gain unless the participant adjusts it. Device volume and actual sound pressure cannot be measured by this app; “loud conversation” identifies the stimulus rather than a calibrated decibel level. Use consistent headphones and device volume for comparable trials.

Background sound begins at the first countdown and continues through presentation, recall, saving, and the successful-round screens. Advancing to the next round does not restart the track. It stops when the scenario ends, on errors, page exit, or unmount. Sound checks remain limited to five seconds. Browser autoplay permission is requested from the participant's button click. Audio load/permission failures prevent a sound round from starting; participants can retry. Audio starts, stops, and context state changes are recorded in round events. Every countdown number (3, 2, 1) plays the same soft 300 ms ding in every scenario. No-sound trials have these countdown cues only; digit presentation and recall have no background audio. Countdown cues are recorded in round events.

## Validation

`npm test` checks sequence matching, timeout, and speed progression. With the app running, `node tests/api-smoke.mjs http://localhost:3000` checks all six scenarios, enforced order, independent progression, audible-volume validation, retry behavior, completion, abandonment, all bundled audio assets, and SQLite persistence, then removes its synthetic participant records. `npm run build` validates the application build.

The browser uses monotonic response timing; server scoring also checks an overall round ceiling. Browser scheduling can vary with inactive tabs or device load, and recorded timestamps help identify affected trials. Scenario order is fixed as requested; it is recorded in `trials.position` for analysis of potential order effects.

Timing constants and scoring live in `lib/experiment.mjs`; scenario definitions are in `lib/scenarios.mjs`, and audio lifecycle logic is in `lib/audio.mjs`.
