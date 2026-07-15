import {
  getTodayStatus,
  BADGES,
  exportBackupData,
  importBackupData,
  markBackedUp,
  dismissBackupBanner,
  shouldShowBackupBanner,
} from "../storage.js";
import { pickExerciseForDate, CATEGORIES } from "../exercises.js";
import { renderMascot } from "../mascot.js";
import { openSheet } from "../sheet.js";
import { shareOrDownload, filenameFor } from "../share.js";
import { getTheme, setTheme } from "../theme.js";
import { unlockAudio } from "../audio.js";

export function renderToday(root, nav) {
  const tpl = document.getElementById("tpl-today");
  root.replaceChildren(tpl.content.cloneNode(true));

  const { doneToday, progress } = getTodayStatus();
  const { exercise, isChallengeDay } = pickExerciseForDate(new Date(), progress.currentStreak);

  renderMascot(root.querySelector("#mascot-slot"), { mood: doneToday ? "cheer" : "idle", size: 108 });

  root.querySelector("#current-streak").textContent = progress.currentStreak;
  root.querySelector("#longest-streak").textContent = progress.longestStreak;
  const freezeEl = root.querySelector("#freeze-tokens");
  freezeEl.textContent = "❄".repeat(progress.freezeTokens) || "—";
  freezeEl.title = `${progress.freezeTokens} streak freeze${progress.freezeTokens === 1 ? "" : "s"} saved — bridges one missed day`;

  const card = root.querySelector("#exercise-card");
  const category = CATEGORIES.find((c) => c.id === exercise.category);
  card.querySelector(".exercise-category").textContent = category ? category.label : exercise.category;
  card.querySelector(".exercise-name").textContent = exercise.name;
  card.querySelector(".exercise-amount").textContent =
    exercise.type === "timer" ? `${exercise.amount}s hold` : `${exercise.amount} reps`;
  card.querySelector(".exercise-description").textContent = exercise.description;

  const challengeBadge = root.querySelector("#challenge-banner");
  challengeBadge.classList.toggle("hidden", !isChallengeDay);

  const startBtn = root.querySelector("#start-btn");
  const doneState = root.querySelector("#done-state");
  if (doneToday) {
    startBtn.classList.add("hidden");
    doneState.classList.remove("hidden");
  } else {
    startBtn.classList.remove("hidden");
    doneState.classList.add("hidden");
    startBtn.addEventListener("click", () => {
      unlockAudio();
      nav.toPlayer();
    });
  }

  root.querySelector("#library-btn").addEventListener("click", () => nav.toLibrary());
  root.querySelector("#settings-btn").addEventListener("click", openSettingsMenu);
  renderBadgeShelf(root);
  root.querySelector("#badge-shelf").addEventListener("click", openBadgesSheet);

  const banner = root.querySelector("#backup-banner");
  if (shouldShowBackupBanner()) {
    banner.classList.remove("hidden");
    banner.querySelector("#backup-now-btn").addEventListener("click", async () => {
      await doExport();
      banner.classList.add("hidden");
    });
    banner.querySelector("#backup-dismiss-btn").addEventListener("click", () => {
      dismissBackupBanner();
      banner.classList.add("hidden");
    });
  }

  async function doExport() {
    const data = exportBackupData();
    await shareOrDownload(filenameFor("work-it-daily-backup"), JSON.stringify(data, null, 2));
    markBackedUp();
  }

  function renderBadgeShelf(root) {
    const shelf = root.querySelector("#badge-shelf");
    const unlocked = BADGES.filter((b) => progress.unlockedBadges.includes(b.id));
    shelf.querySelector(".badge-shelf-count").textContent = `${unlocked.length}/${BADGES.length}`;
  }

  function openSettingsMenu() {
    const sheet = openSheet("tpl-settings-menu");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector("#instructions-btn").addEventListener("click", () => {
      sheet.close();
      openInstructions();
    });
    sheet.el.querySelector("#customize-btn").addEventListener("click", () => {
      sheet.close();
      openCustomize();
    });
    sheet.el.querySelector("#export-all-btn").addEventListener("click", async () => {
      await doExport();
      sheet.close();
    });
    sheet.el.querySelector("#import-btn").addEventListener("click", () => {
      sheet.close();
      openImport();
    });
  }

  function openInstructions() {
    const sheet = openSheet("tpl-instructions");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
  }

  function openCustomize() {
    const sheet = openSheet("tpl-customize");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());

    const accentPicker = sheet.el.querySelector("#playful-accent-picker");
    const themeButtons = sheet.el.querySelectorAll(".theme-option");
    const swatchButtons = sheet.el.querySelectorAll(".swatch-btn");

    function renderActiveState() {
      const pref = getTheme();
      themeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.themeMode === pref.mode));
      swatchButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.accent === pref.playfulAccent));
      accentPicker.classList.toggle("hidden", pref.mode !== "playful");
    }

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setTheme({ ...getTheme(), mode: btn.dataset.themeMode });
        renderActiveState();
      });
    });
    swatchButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setTheme({ ...getTheme(), playfulAccent: btn.dataset.accent });
        renderActiveState();
      });
    });

    renderActiveState();
  }

  function openImport() {
    const sheet = openSheet("tpl-import");
    const fileInput = sheet.el.querySelector(".import-file-input");
    const messageEl = sheet.el.querySelector(".import-message");

    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".import-file-btn").addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      messageEl.classList.remove("error");

      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        messageEl.textContent = "That doesn't look like valid JSON.";
        messageEl.classList.add("error");
        return;
      }
      try {
        importBackupData(parsed);
        messageEl.textContent = "Backup restored.";
        setTimeout(() => {
          sheet.close();
          renderToday(root, nav);
        }, 900);
      } catch (err) {
        messageEl.textContent = err.message || "That doesn't look like a valid backup file.";
        messageEl.classList.add("error");
      }
    });
  }

  function openBadgesSheet() {
    const sheet = openSheet("tpl-badges");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    const list = sheet.el.querySelector("#badges-list");
    const itemTpl = document.getElementById("tpl-badge-item");
    const nodes = BADGES.map((badge) => {
      const node = itemTpl.content.cloneNode(true);
      const unlocked = progress.unlockedBadges.includes(badge.id);
      const item = node.querySelector(".badge-item");
      item.classList.toggle("locked", !unlocked);
      node.querySelector(".badge-label").textContent = badge.label;
      node.querySelector(".badge-desc").textContent = badge.desc;
      return node;
    });
    list.replaceChildren(...nodes);
  }
}
