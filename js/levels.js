// Difficulty levels scale every exercise's reps/hold time by a multiplier.
// Chosen once on Day 1, changeable anytime from Settings > Set level.

export const LEVELS = [
  { id: "easy", label: "Easy", multiplier: 0.5, blurb: "Lighter reps and shorter holds" },
  { id: "medium", label: "Medium", multiplier: 1, blurb: "The standard challenge" },
  { id: "hard", label: "Hard", multiplier: 1.5, blurb: "Noticeably tougher" },
  { id: "brutal", label: "Brutal", multiplier: 2.5, blurb: "Not for the faint of heart" },
];

export const DEFAULT_LEVEL = "medium";

// Saving a missed day from the calendar costs extra on top of the normal
// level multiplier, so it's meaningfully harder than just doing today's move.
export const RESCUE_PENALTY_MULTIPLIER = 1.5;

export function getLevelInfo(levelId) {
  return LEVELS.find((l) => l.id === levelId) || LEVELS.find((l) => l.id === DEFAULT_LEVEL);
}

function scaleValue(amount, type, multiplier) {
  const scaled = amount * multiplier;
  return type === "timer" ? Math.max(5, Math.round(scaled / 5) * 5) : Math.max(1, Math.round(scaled));
}

export function scaleAmount(exercise, levelId, extraMultiplier = 1) {
  const level = getLevelInfo(levelId);
  return scaleValue(exercise.amount, exercise.type, level.multiplier * extraMultiplier);
}

// Returns a copy of the exercise with its amount scaled for the given level
// (and, for rescues, an extra penalty on top).
export function scaledExercise(exercise, levelId, extraMultiplier = 1) {
  return { ...exercise, amount: scaleAmount(exercise, levelId, extraMultiplier) };
}
