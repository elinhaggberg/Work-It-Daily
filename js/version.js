// Bump APP_VERSION and add a new entry (newest first) any time a shipped
// change would be worth a returning user knowing about. today.js shows the
// latest entry's notes once to anyone whose last-seen version doesn't match,
// then never again until the next bump.
export const APP_VERSION = "1.0.1";

export const CHANGELOG = [
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
