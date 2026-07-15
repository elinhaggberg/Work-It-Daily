# Work-It-Daily
One exercise per day, only with your body as weight – can you keep the streak going?

A calisthenics PWA with a rotating daily bodyweight exercise, streaks, streak
freezes, badges, and a weekly challenge day. All data stays on your device —
no account, no server.

## Features

- **One exercise a day** — a small calisthenics library (push / pull / legs /
  core / full body) rotates automatically, no setup needed.
- **Level** — Easy / Medium / Hard / Brutal, chosen on Day 1 and changeable
  anytime from Settings, scales every exercise's reps and hold times.
- **Streaks** — a current + longest streak counter, with a "streak freeze"
  earned every 7 days that automatically bridges a single missed day.
- **Weekly challenge** — every 7th day of an active streak swaps in a harder
  move from the challenge pool.
- **Calendar** — see every day you've done, missed, or had a freeze cover.
  Missed days can be saved retroactively with a harder makeup exercise (1.5×
  penalty) so they still count toward your streak.
- **Badges** — streak milestones, total workout counts, and a "tried every
  category" badge.
- **Exercise library** — browse every move with a short how-to description.
- **Local-only data** — everything lives in `localStorage`; export/import a
  JSON backup from the gear menu (the app nudges you every couple of weeks so
  you don't lose your streak).
- **Installable PWA** — add to your home screen for a full-screen, offline-
  capable app.

## Development

No build step — plain HTML/CSS/JS modules. Serve the folder with any static
file server, e.g. `python3 -m http.server`, and open `index.html`.
