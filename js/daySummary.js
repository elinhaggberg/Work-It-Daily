import { getProgress, getStreakAsOf, getLevel } from "./storage.js";
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
  lines.push(`💪 ${exercise.name} · ${amountText}`);
  lines.push(`🎚️ ${getLevelLabel(level)}`);
  lines.push(`🔥 ${currentStreak} day streak`);
  if (completion.rescued) lines.push("✅ Saved");
  return lines.join("\n");
}

// Shared "view + copy" sheet for a single completed day's summary, used
// from both Home (today, once done) and the Calendar (any past day).
export function openDaySummarySheet(dateKey) {
  const summaryText = buildDaySummaryText(dateKey);
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
