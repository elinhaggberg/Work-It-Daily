// Difficulty is a continuous slider from 0 (Easy) to 3 (Brutal), with Medium
// and Hard sitting at 1 and 2. Chosen once on Day 1, changeable anytime from
// Settings > Set level. Landing between two named levels interpolates
// smoothly between them instead of forcing a jump straight to the next one.

export const LEVELS = [
  { id: "easy", label: "Easy", multiplier: 0.5, blurb: "Lighter reps and shorter holds" },
  { id: "medium", label: "Medium", multiplier: 1, blurb: "The standard challenge" },
  { id: "hard", label: "Hard", multiplier: 1.5, blurb: "Noticeably tougher" },
  { id: "brutal", label: "Brutal", multiplier: 2.5, blurb: "Not for the faint of heart" },
];

export const LEVEL_MIN = 0;
export const LEVEL_MAX = LEVELS.length - 1;
export const LEVEL_STEP = 0.1;
export const DEFAULT_LEVEL = 1; // Medium

// Lets old installs (which stored "easy"/"medium"/"hard"/"brutal" strings)
// keep their choice once this becomes a numeric slider position instead.
export const LEVEL_ID_TO_VALUE = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));

// Saving a missed day from the calendar costs extra on top of the normal
// level, so it's meaningfully harder than just doing today's move.
export const RESCUE_PENALTY_MULTIPLIER = 1.5;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Finds the two named levels a slider value sits between, and how far along
// that gap it is (0 = exactly on the lower one, 1 = exactly on the upper).
export function getLevelBounds(value) {
  const clamped = Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, value));
  const lowerIndex = Math.min(LEVELS.length - 2, Math.floor(clamped));
  return { lower: LEVELS[lowerIndex], upper: LEVELS[lowerIndex + 1], frac: clamped - lowerIndex };
}

// A compact label for a slider position — the named level it's on, or a
// "+"/"-" blend when it's sitting between two.
export function getLevelLabel(value) {
  const { lower, upper, frac } = getLevelBounds(value);
  if (frac <= 0.05) return lower.label;
  if (frac >= 0.95) return upper.label;
  if (frac < 0.45) return `${lower.label}+`;
  if (frac > 0.55) return `${upper.label}-`;
  return `${lower.label}/${upper.label}`;
}

function roundForType(amount, type) {
  return type === "timer" ? Math.max(5, Math.round(amount / 5) * 5) : Math.max(1, Math.round(amount));
}

// Most exercises scale by the flat level multiplier, which works well for
// endurance/high-rep moves (a plank or a set of squats scales smoothly with
// time or volume). It breaks down for near-maximal-strength, low-rep moves
// like pull-ups — going from 5 to 13 reps isn't "a bit harder," it's the
// difference between achievable and impossible for most people. Those
// exercises carry their own hand-tuned `levels` table instead, interpolated
// the same way as the flat multiplier so a slider between two named levels
// still lands somewhere reasonable. The rescue penalty still multiplies on
// top of either path for a missed-day makeup.
export function scaleAmount(exercise, levelValue, extraMultiplier = 1) {
  const { lower, upper, frac } = getLevelBounds(levelValue);
  const rawValue = exercise.levels
    ? lerp(exercise.levels[lower.id], exercise.levels[upper.id], frac)
    : exercise.amount * lerp(lower.multiplier, upper.multiplier, frac);
  return roundForType(rawValue * extraMultiplier, exercise.type);
}

// Returns a copy of the exercise with its amount scaled for the given level
// (and, for rescues, an extra penalty on top).
export function scaledExercise(exercise, levelValue, extraMultiplier = 1) {
  return { ...exercise, amount: scaleAmount(exercise, levelValue, extraMultiplier) };
}
