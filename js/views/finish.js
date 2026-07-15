import { launchConfetti } from "../confetti.js";
import { renderMascot } from "../mascot.js";
import { getTheme, PLAYFUL_SWATCHES } from "../theme.js";
import { formatDate } from "../util.js";

function buildSummaryText({ exercise, progress, newlyUnlocked, usedFreeze }) {
  const amount = exercise.type === "timer" ? `${exercise.amount}s hold` : `${exercise.amount} reps`;
  const lines = [
    `Work It Daily — ${formatDate(Date.now())}`,
    `${exercise.name} (${amount})`,
    `🔥 ${progress.currentStreak} day streak (best: ${progress.longestStreak})`,
  ];
  if (usedFreeze) lines.push("❄ A streak freeze covered a missed day");
  for (const badge of newlyUnlocked) lines.push(`🏅 Badge unlocked: ${badge.label} (${badge.desc})`);
  return lines.join("\n");
}

export function renderFinish(root, nav, result) {
  const { exercise, progress, newlyUnlocked, usedFreeze, isFirstEver } = result;

  const tpl = document.getElementById("tpl-finish");
  root.replaceChildren(tpl.content.cloneNode(true));

  const canvas = root.querySelector("#confetti-canvas");
  const isPlayful = getTheme().mode === "playful";
  const confettiOptions = isPlayful ? { colors: PLAYFUL_SWATCHES.map((s) => s.accent) } : {};
  requestAnimationFrame(() => launchConfetti(canvas, confettiOptions));

  renderMascot(root.querySelector("#mascot-slot"), { mood: "cheer", size: 128 });

  root.querySelector("#finish-exercise-name").textContent = exercise.name;
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

  root.querySelector("#done-btn").addEventListener("click", () => nav.toToday());
}
