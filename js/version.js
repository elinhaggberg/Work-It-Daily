// Bump APP_VERSION and add a new entry (newest first) any time a shipped
// change would be worth a returning user knowing about. today.js shows the
// latest entry's notes once to anyone whose last-seen version doesn't match,
// then never again until the next bump.
export const APP_VERSION = "1.4.5";

export const CHANGELOG = [
  {
    version: "1.4.5",
    notes: [
      "Broke up the wall of text in the Instructions sheet's Badges section into shorter paragraphs",
    ],
  },
  {
    version: "1.4.4",
    notes: [
      "Clarified how streak freezes and saving missed days relate to each other in the Instructions sheet",
    ],
  },
  {
    version: "1.4.3",
    notes: [
      "\"Challenge a friend\" is now also available anytime from the gear menu, not just after your first 7-day streak",
    ],
  },
  {
    version: "1.4.2",
    notes: [
      "Copied workout summary headline is back to a date, like before",
      "First 7-day streak now unlocks a \"Challenge a friend\" share prompt",
    ],
  },
  {
    version: "1.4.1",
    notes: [
      "Copied workout summary redesigned as a Wordle-style share card — every line leads with an emoji, plus a new row when you've saved a missed day",
    ],
  },
  {
    version: "1.4.0",
    notes: [
      "Saving a missed day from the Calendar now takes you through the real countdown/timer/rep player, not a single tap — the day only counts once you've actually done the makeup exercise",
    ],
  },
  {
    version: "1.3.0",
    notes: [
      "Level is now a slider instead of 4 buttons — drag anywhere between Easy/Medium/Hard/Brutal to land in between them instead of jumping straight to the next one",
    ],
  },
  {
    version: "1.2.0",
    notes: [
      "Brutal now hits real \"most people can't do this\" targets — 50 push-ups, 50 squats, a 2:30 plank, 30 burpees, 25 pull-ups — with a believable Hard step in between, tuned from real feedback",
    ],
  },
  {
    version: "1.1.0",
    notes: [
      "Pull-ups, chin-ups, archer/diamond/pike push-ups, towel rows, and pistol squats now use hand-tuned targets per level instead of a flat multiplier, so Brutal asks for a realistic number instead of an impossible one",
      "The copied workout summary now includes which level you were on",
    ],
  },
  {
    version: "1.0.1",
    notes: [
      "The \"App updated\" notice you're reading right now — you'll get a short note like this after future updates too",
    ],
  },
  {
    version: "1.0.0",
    notes: [
      "Wider difficulty levels — a bigger gap between Easy, Medium, Hard, and Brutal",
      "Fixed jump squats' rep count so it scales properly across levels",
    ],
  },
];
