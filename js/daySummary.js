import { getProgress, getStreakAsOf, getLevel, getAdventures, getActiveAdventure, getAdventureTrophies } from "./storage.js";
import { THEMES, adventureSummaryLines } from "./adventures.js";
import { getExercise } from "./exercises.js";
import { DEFAULT_LEVEL, scaleAmount, RESCUE_PENALTY_MULTIPLIER, getLevelLabel } from "./levels.js";
import { formatDate } from "./util.js";
import { openSheet } from "./sheet.js";

// Rebuilds the same Wordle-style share text as the finish screen, but from
// persisted data alone -- so it works for any already-completed day, not
// just the moment you just finished one. Skips fields that aren't
// reconstructable after the fact (which badges were *newly* unlocked that
// day, whether a freeze was used) since there's no historical record of
// those, only of what's true now.
export function buildDaySummaryText(dateKey) {
  const progress = getProgress();
  const completion = progress.completions.find((c) => c.date === dateKey);
  if (!completion) return null;

  const exercise = getExercise(completion.exerciseId);
  if (!exercise) return null;

  const level = getLevel() ?? DEFAULT_LEVEL;
  const amount = scaleAmount(exercise, level, completion.rescued ? RESCUE_PENALTY_MULTIPLIER : 1);
  const amountText = exercise.type === "timer" ? `${amount}s hold` : `${amount} reps`;
  const { currentStreak } = getStreakAsOf(dateKey);

  const lines = [`Work It Daily — ${formatDate(`${dateKey}T00:00:00`)}`];
  lines.push(`${completion.swapped ? "🔄" : "💪"} ${exercise.name} · ${amountText}`);
  lines.push(`🎚️ ${getLevelLabel(level)}`);
  lines.push(`🔥 ${currentStreak} day streak`);
  if (completion.adventure) {
    // Stamped on the completion at the time, so this still reads right after
    // the adventure has finished (or even been removed, in which case it's
    // simply left out).
    const adventure = getAdventures().find((a) => a.id === completion.adventure.adventureId);
    if (adventure) lines.push(...adventureSummaryLines(adventure, completion.adventure.step));
  }
  if (completion.rescued) lines.push("✅ Saved");
  return lines.join("\n");
}

// A ten-square bar, only ever full once the adventure is actually finished.
function progressBar(steps, total) {
  const filled = steps >= total ? 10 : Math.floor((steps / total) * 10);
  return "🟩".repeat(filled) + "⬜".repeat(10 - filled);
}

// A share card for the adventure itself, not any one day: where you are on
// the running adventure, and the trophies collected so far. Null when there's
// nothing to show yet.
export function buildAdventureSummaryText() {
  const lines = [`Work It Daily — ${formatDate(Date.now())}`];

  const active = getActiveAdventure();
  if (active) {
    const { adventure, steps, total, reached } = active;
    const theme = THEMES.find((t) => t.id === adventure.theme) || THEMES[0];
    lines.push(`${theme.icon} ${steps}/${total} ${adventure.title}`);
    lines.push(progressBar(steps, total));
    const latest = reached[reached.length - 1];
    if (latest) lines.push(`${latest.icon} ${latest.place}`);
  }

  const trophies = getAdventureTrophies();
  const all = getAdventures();
  const earned = all.filter((a) => trophies.some((t) => t.adventureId === a.id));
  if (earned.length > 0) {
    lines.push(`🏆 ${earned.length}/${all.length} trophies`);
    lines.push(earned.map((a) => a.badge.icon).join(" "));
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

// Same idea as buildDaySummaryText, but for the optional weekly-challenge
// exercise on a day that had one (live or rescued) -- kept as a separate
// summary rather than folded into the regular one since it's extra credit,
// not part of that day's streak-counting completion. The challenge itself
// only ever gets rescued alongside an already-rescued regular day (see
// completeChallengeForDate), so its penalty tracks that day's, not a flag of
// its own.
export function buildChallengeSummaryText(dateKey) {
  const progress = getProgress();
  const challengeCompletion = progress.challengeCompletions.find((c) => c.date === dateKey);
  if (!challengeCompletion) return null;

  const exercise = getExercise(challengeCompletion.exerciseId);
  if (!exercise) return null;

  const dayCompletion = progress.completions.find((c) => c.date === dateKey);
  const rescued = Boolean(dayCompletion && dayCompletion.rescued);

  const level = getLevel() ?? DEFAULT_LEVEL;
  const amount = scaleAmount(exercise, level, rescued ? RESCUE_PENALTY_MULTIPLIER : 1);
  const amountText = exercise.type === "timer" ? `${amount}s hold` : `${amount} reps`;

  const lines = [`Work It Daily — ${formatDate(`${dateKey}T00:00:00`)}`];
  lines.push(`⭐ Weekly challenge: ${exercise.name} · ${amountText}`);
  lines.push(`🎚️ ${getLevelLabel(level)}`);
  if (rescued) lines.push("✅ Saved");
  return lines.join("\n");
}

// Shared "view + copy" sheet wiring for both summary kinds below.
function openSummarySheet(summaryText) {
  if (!summaryText) return;

  const sheet = openSheet("tpl-day-summary");
  const el = sheet.el;
  el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
  el.querySelector(".day-summary-text").textContent = summaryText;

  const copyBtn = el.querySelector(".day-summary-copy-btn");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = "Copy summary"), 1600);
    } catch {
      copyBtn.textContent = "Couldn't copy";
      setTimeout(() => (copyBtn.textContent = "Copy summary"), 1600);
    }
  });
}

// Shared "view + copy" sheet for a single completed day's summary, used
// from both Home (today, once done) and the Calendar (any past day).
export function openDaySummarySheet(dateKey) {
  openSummarySheet(buildDaySummaryText(dateKey));
}

// Same sheet, for that day's weekly challenge instead of its regular
// exercise -- see buildChallengeSummaryText above.
export function openChallengeSummarySheet(dateKey) {
  openSummarySheet(buildChallengeSummaryText(dateKey));
}
