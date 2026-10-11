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

Participants enter their name, age, and gender, then review the quiet-space and headphone reminder. Each round has a three-second countdown, starts at four random digits (0–9), and adds one digit after each success. The whole sequence stays visible while each digit flashes in order. Digit slots start at 500 ms and decrease by 25 ms after each success, with a 100 ms minimum (reached in round 17). Each slot highlights its digit for 80% of the interval, followed by a 20% gap (capped at 100 ms). Recall has a strict ten-second window. A wrong answer or timeout ends the test and shows results and confetti. No audio plays in this version.

## Data

The app creates `data/memory.sqlite` automatically. Both it and its SQLite WAL files are excluded from Git. The `sessions` table contains demographics, optional approximate IP-based location, user agent, timestamps, completion status, and successful-round count. The `rounds` table contains server-generated sequences, digit intervals in milliseconds, submitted answers, response times in milliseconds, outcomes, presentation timestamps, input events, visibility changes during recall, and submission/timeout events. Closing or reloading the page attempts to mark an active session abandoned; interrupted sessions remain inspectable even if that notification cannot arrive.

The browser contacts ipapi.co once to resolve its public IP and approximate city/region/country. Lookup failure does not prevent participation. Location is best-effort browser-reported data, not verified GPS. The participant form explains the stored information. Data stays in the local server database, except for the IP lookup request. Google Fonts supplies the optional display fonts, with local fallbacks.

Inspect results locally with a SQLite viewer, or with `sqlite3 data/memory.sqlite`. There is deliberately no unauthenticated results API. Back up the database with a SQLite-aware tool; do not commit participant data. This local prototype has no researcher login or consent-management workflow and is not yet configured for public deployment.

## Validation and future sound

`npm test` checks sequence matching and the timeout boundary. With the app running, `node tests/api-smoke.mjs http://localhost:3000` checks validation, round progression, retries, timeout scoring, and SQLite persistence, then deletes its synthetic participant records. `npm run build` validates the application build. The browser uses monotonic response timing; server scoring also checks an overall round ceiling. Browser scheduling can vary with inactive tabs or device load, and recorded digit timestamps help identify affected trials.

Timing constants and scoring live in `lib/experiment.mjs`. The presentation loop in `app/page.js` is the place to add an audio condition, initialized from the Begin Test button so browsers allow playback. Store that condition in sessions before comparing experimental groups.
