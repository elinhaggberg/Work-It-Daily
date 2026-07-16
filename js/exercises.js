// A small calisthenics library: bodyweight-only moves grouped by the classic
// push / pull / legs / core / full-body split. Each entry drives both the
// daily picker and the library browser.
//
// type: "reps" (a rep target) or "timer" (a hold, counted down in seconds).
// challenge: pulled from a separate pool for weekly "challenge day" picks
// instead of the normal daily rotation, so streak milestones feel special.

export const CATEGORIES = [
  { id: "push", label: "Push", blurb: "Chest, shoulders, triceps" },
  { id: "pull", label: "Pull", blurb: "Back, biceps, grip" },
  { id: "legs", label: "Legs", blurb: "Quads, glutes, hamstrings" },
  { id: "core", label: "Core", blurb: "Abs, obliques, stability" },
  { id: "fullbody", label: "Full body", blurb: "Cardio & compound moves" },
];

export const EXERCISES = [
  // Push
  { id: "push-up", name: "Push-ups", category: "push", difficulty: "beginner", type: "reps", amount: 10,
    levels: { easy: 5, medium: 10, hard: 25, brutal: 50 },
    description: "Hands under shoulders, body in a straight line from head to heels. Lower your chest to the floor, then press back up." },
  { id: "incline-push-up", name: "Incline push-ups", category: "push", difficulty: "beginner", type: "reps", amount: 12,
    description: "Hands on a chair, step, or counter instead of the floor — the higher your hands, the easier the rep. Same straight-body form as a push-up." },
  { id: "pike-push-up", name: "Pike push-ups", category: "push", difficulty: "intermediate", type: "reps", amount: 8,
    levels: { easy: 4, medium: 8, hard: 20, brutal: 40 },
    description: "Hips high in an inverted-V, hands shoulder-width. Bend the elbows to lower your head toward the floor, then press back up — a shoulder-focused push-up." },
  { id: "diamond-push-up", name: "Diamond push-ups", category: "push", difficulty: "intermediate", type: "reps", amount: 8,
    levels: { easy: 4, medium: 8, hard: 20, brutal: 40 },
    description: "Hands together under your chest, thumbs and index fingers touching to form a diamond. Lower and press up — shifts the load onto the triceps." },
  { id: "chair-dip", name: "Chair dips", category: "push", difficulty: "intermediate", type: "reps", amount: 10,
    levels: { easy: 5, medium: 10, hard: 25, brutal: 50 },
    description: "Hands on the edge of a sturdy chair or step behind you, legs extended. Bend the elbows to lower your hips, then push back up." },
  { id: "archer-push-up", name: "Archer push-ups", category: "push", difficulty: "advanced", type: "reps", amount: 6,
    challenge: true, levels: { easy: 3, medium: 6, hard: 15, brutal: 30 },
    description: "Wide hand placement; lower toward one hand while the other arm stays straight, sliding out to the side. Alternate sides each rep." },

  // Pull
  { id: "reverse-snow-angel", name: "Reverse snow angels", category: "pull", difficulty: "beginner", type: "reps", amount: 12,
    description: "Lie face down, arms out to your sides. Squeeze your shoulder blades together to lift your arms and chest slightly off the floor." },
  { id: "table-row", name: "Table rows", category: "pull", difficulty: "beginner", type: "reps", amount: 10,
    description: "Lie under a sturdy table, grip the edge, and pull your chest up toward it, keeping your body straight, then lower with control." },
  { id: "doorframe-row", name: "Doorframe rows", category: "pull", difficulty: "intermediate", type: "reps", amount: 10,
    description: "Hold a doorframe edge, lean your weight back with straight arms, then pull your chest toward the frame and back out." },
  { id: "chin-up", name: "Chin-ups", category: "pull", difficulty: "intermediate", type: "reps", amount: 5,
    levels: { easy: 3, medium: 5, hard: 13, brutal: 25 },
    description: "Palms facing you on a bar, pull your chin over the bar, then lower under control. No bar? Sub in an extra set of doorframe rows." },
  { id: "pull-up", name: "Pull-ups", category: "pull", difficulty: "advanced", type: "reps", amount: 5,
    levels: { easy: 3, medium: 5, hard: 13, brutal: 25 },
    description: "Palms facing away on a bar, pull your chest toward the bar, then lower fully under control." },
  { id: "towel-row", name: "Towel rows", category: "pull", difficulty: "advanced", type: "reps", amount: 8,
    challenge: true, levels: { easy: 4, medium: 8, hard: 20, brutal: 40 },
    description: "Loop a towel around a sturdy anchor (railing, pole), grip both ends, and row your chest toward it — the give in the towel adds a grip and stability challenge." },

  // Legs
  { id: "squat", name: "Bodyweight squats", category: "legs", difficulty: "beginner", type: "reps", amount: 15,
    levels: { easy: 8, medium: 15, hard: 30, brutal: 50 },
    description: "Feet shoulder-width apart, sit your hips back and down like sitting into a chair, then drive back up through your heels." },
  { id: "glute-bridge", name: "Glute bridges", category: "legs", difficulty: "beginner", type: "reps", amount: 15,
    description: "Lie on your back, knees bent, feet flat. Squeeze your glutes to lift your hips into a straight line, then lower with control." },
  { id: "lunge", name: "Alternating lunges", category: "legs", difficulty: "beginner", type: "reps", amount: 12,
    description: "Step forward into a lunge until both knees hit ~90°, push back to standing, then alternate legs." },
  { id: "split-squat", name: "Bulgarian split squats", category: "legs", difficulty: "intermediate", type: "reps", amount: 10,
    description: "Rear foot up on a chair behind you, front leg does the work — bend the front knee to lower, then press back up. Split evenly between legs." },
  { id: "jump-squat", name: "Jump squats", category: "legs", difficulty: "intermediate", type: "reps", amount: 20,
    description: "Squat down, then explode upward into a jump, landing softly back into the squat." },
  { id: "pistol-progression", name: "Pistol squat progression", category: "legs", difficulty: "advanced", type: "reps", amount: 6,
    challenge: true, levels: { easy: 3, medium: 6, hard: 15, brutal: 30 },
    description: "Single-leg squat with the other leg extended forward — hold onto a doorframe or chair for balance as needed while you build the strength." },

  // Core
  { id: "plank", name: "Plank hold", category: "core", difficulty: "beginner", type: "timer", amount: 30,
    levels: { easy: 15, medium: 30, hard: 75, brutal: 150 },
    description: "Forearms and toes on the floor, body in a straight line from head to heels. Brace your core and hold." },
  { id: "bicycle-crunch", name: "Bicycle crunches", category: "core", difficulty: "beginner", type: "reps", amount: 20,
    description: "Lying on your back, bring opposite elbow to opposite knee in a pedaling motion, extending the other leg out." },
  { id: "leg-raise", name: "Leg raises", category: "core", difficulty: "intermediate", type: "reps", amount: 12,
    description: "Lying on your back, legs straight, lift them to vertical then lower slowly without letting your lower back arch off the floor." },
  { id: "side-plank", name: "Side plank", category: "core", difficulty: "intermediate", type: "timer", amount: 20,
    levels: { easy: 10, medium: 20, hard: 50, brutal: 100 },
    description: "Prop yourself on one forearm, body in a straight line, hips lifted. Hold, then switch sides for the same time." },
  { id: "hollow-hold", name: "Hollow body hold", category: "core", difficulty: "advanced", type: "timer", amount: 20,
    challenge: true, levels: { easy: 10, medium: 20, hard: 50, brutal: 100 },
    description: "Lie on your back, press your lower back into the floor, and lift shoulders and legs slightly off the ground into a shallow \"banana\" shape. Hold." },

  // Full body
  { id: "jumping-jack", name: "Jumping jacks", category: "fullbody", difficulty: "beginner", type: "reps", amount: 30,
    description: "Jump feet out while raising your arms overhead, then jump back to start. A good warm-up or cardio finisher." },
  { id: "mountain-climber", name: "Mountain climbers", category: "fullbody", difficulty: "beginner", type: "reps", amount: 20,
    description: "In a high plank, drive your knees toward your chest one at a time at a quick pace." },
  { id: "burpee", name: "Burpees", category: "fullbody", difficulty: "intermediate", type: "reps", amount: 8,
    levels: { easy: 4, medium: 8, hard: 16, brutal: 30 },
    description: "Drop into a squat, kick your feet back to a plank, do a push-up, jump feet back in, then jump up with arms overhead." },
  { id: "bear-crawl", name: "Bear crawl", category: "fullbody", difficulty: "advanced", type: "reps", amount: 20,
    challenge: true,
    description: "Hands and feet on the floor, knees hovering just above it. Crawl forward and back, moving opposite hand and foot together. Count each step." },
];

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || null;
}

export function exercisesByCategory(categoryId) {
  return EXERCISES.filter((e) => e.category === categoryId);
}

const DAILY_POOL = EXERCISES.filter((e) => !e.challenge);
const CHALLENGE_POOL = EXERCISES.filter((e) => e.challenge);

function dayIndex(date) {
  return Math.floor(date.getTime() / 86400000);
}

// Deterministic "today's exercise": a stable rotation seeded by the date, so
// it's the same all day regardless of reloads and doesn't need a server.
// Every 7th day of an active streak pulls from the harder challenge pool
// instead, as a weekly milestone move.
export function pickExerciseForDate(date, currentStreak) {
  const idx = dayIndex(date);
  const isChallengeDay = currentStreak > 0 && (currentStreak + 1) % 7 === 0;
  if (isChallengeDay && CHALLENGE_POOL.length > 0) {
    return { exercise: CHALLENGE_POOL[idx % CHALLENGE_POOL.length], isChallengeDay: true };
  }
  return { exercise: DAILY_POOL[idx % DAILY_POOL.length], isChallengeDay: false };
}
