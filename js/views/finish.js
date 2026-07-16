import { launchConfetti } from "../confetti.js";
import { renderMascot } from "../mascot.js";
import { getTheme, PLAYFUL_SWATCHES } from "../theme.js";
import { formatDate } from "../util.js";
import { BADGE_TIERS } from "../storage.js";
import { getLevelLabel } from "../levels.js";

function tierIcon(badge) {
  return (BADGE_TIERS.find((t) => t.id === badge.tier) || BADGE_TIERS[0]).icon;
}

// Wordle-style share card: a title line (app name + streak "score"), then
// every following line leads with an emoji — no explanatory text needed to
// read it at a glance.
function buildSummaryText({ exercise, progress, newlyUnlocked, usedFreeze, levelValue, isRescue, rescueDateKey }) {
  const amount = exercise.type === "timer" ? `${exercise.amount}s hold` : `${exercise.amount} reps`;
  const levelLabel = getLevelLabel(levelValue);
  const isNewRecord = progress.currentStreak === progress.longestStreak && progress.longestStreak > 1;

  const lines = [`Work It Daily #${progress.currentStreak}`];
  lines.push(
    isRescue
      ? `💪 ${formatDate(`${rescueDateKey}T00:00:00`)} — ${exercise.name} · ${amount}`
      : `💪 ${exercise.name} · ${amount}`
  );
  lines.push(`🎚️ ${levelLabel}`);
  lines.push(`🔥 ${progress.currentStreak} day streak`);
  if (isNewRecord) lines.push("🏆 New Longest Streak!");
  if (usedFreeze) lines.push("❄️ Freeze Used");
  if (isRescue) lines.push("✅ Saved");
  for (const badge of newlyUnlocked) lines.push(`${tierIcon(badge)} ${badge.label}`);
  return lines.join("\n");
}

export function renderFinish(root, nav, result) {
  const { exercise, progress, newlyUnlocked, usedFreeze, isFirstEver, isRescue, rescueDateKey } = result;

  const tpl = document.getElementById("tpl-finish");
  root.replaceChildren(tpl.content.cloneNode(true));

  const canvas = root.querySelector("#confetti-canvas");
  const isPlayful = getTheme().mode === "playful";
  const confettiOptions = isPlayful ? { colors: PLAYFUL_SWATCHES.map((s) => s.accent) } : {};
  requestAnimationFrame(() => launchConfetti(canvas, confettiOptions));

  renderMascot(root.querySelector("#mascot-slot"), { mood: "cheer", size: 128 });

  root.querySelector("#finish-title").textContent = isRescue ? "Day saved!" : "Well done!";
  root.querySelector("#finish-exercise-name").textContent = isRescue
    ? `${formatDate(`${rescueDateKey}T00:00:00`)} — ${exercise.name}`
    : exercise.name;
  root.querySelector("#finish-streak").textContent = progress.currentStreak;
  root.querySelector("#finish-streak-label").textContent =
    progress.currentStreak === 1 ? "day streak — nice start!" : "day streak";

  const recordEl = root.querySelector("#new-record");
  recordEl.classList.toggle("hidden", progress.currentStreak !== progress.longestStreak || progress.longestStreak < 2);

  const freezeEl = root.querySelector("#freeze-used");
  freezeEl.classList.toggle("hidden", !usedFreeze);

  const badgeSection = root.querySelector("#badge-unlock-section");
  if (newlyUnlocked.length > 0) {
    const list = root.querySelector("#badge-unlock-list");
    const itemTpl = document.getElementById("tpl-badge-unlock-item");
    const nodes = newlyUnlocked.map((badge) => {
      const node = itemTpl.content.cloneNode(true);
      node.querySelector(".badge-item").classList.add(`tier-${badge.tier}`);
      node.querySelector(".badge-icon").textContent = tierIcon(badge);
      node.querySelector(".badge-label").textContent = badge.label;
      node.querySelector(".badge-desc").textContent = badge.desc;
      return node;
    });
    list.replaceChildren(...nodes);
    badgeSection.classList.remove("hidden");
  } else {
    badgeSection.classList.add("hidden");
  }

  root.querySelector("#day1-tip").classList.toggle("hidden", !isFirstEver);

  const summaryText = buildSummaryText(result);
  const copyBtn = root.querySelector("#copy-btn");
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

  const doneBtn = root.querySelector("#done-btn");
  doneBtn.textContent = isRescue ? "Back to calendar" : "Back to today";
  doneBtn.addEventListener("click", () => (isRescue ? nav.toCalendar() : nav.toToday()));
}
