import {
  getTodayStatus,
  BADGE_TIERS,
  getAllBadges,
  getMilestoneShelfInfo,
  exportBackupData,
  importBackupData,
  markBackedUp,
  dismissBackupBanner,
  shouldShowBackupBanner,
  resetAllData,
  getLevel,
  setLevel,
} from "../storage.js";
import { pickExerciseForDate, CATEGORIES } from "../exercises.js";
import { DEFAULT_LEVEL, scaledExercise, getLevelInfo } from "../levels.js";
import { renderMascot } from "../mascot.js";
import { openSheet } from "../sheet.js";
import { shareOrDownload, filenameFor } from "../share.js";
import { getTheme, setTheme, applyTheme } from "../theme.js";
import { unlockAudio } from "../audio.js";

export function renderToday(root, nav) {
  const tpl = document.getElementById("tpl-today");
  root.replaceChildren(tpl.content.cloneNode(true));

  const { doneToday, progress } = getTodayStatus();
  const level = getLevel() || DEFAULT_LEVEL;
  const { exercise: baseExercise, isChallengeDay } = pickExerciseForDate(new Date(), progress.currentStreak);
  const exercise = scaledExercise(baseExercise, level);

  renderMascot(root.querySelector("#mascot-slot"), { mood: doneToday ? "cheer" : "idle", size: 108 });

  root.querySelector("#current-streak").textContent = progress.currentStreak;
  root.querySelector("#longest-streak").textContent = progress.longestStreak;
  const freezeEl = root.querySelector("#freeze-tokens");
  freezeEl.textContent = "❄".repeat(progress.freezeTokens) || "—";
  freezeEl.title = `${progress.freezeTokens} streak freeze${progress.freezeTokens === 1 ? "" : "s"} saved — bridges one missed day`;

  const card = root.querySelector("#exercise-card");
  const category = CATEGORIES.find((c) => c.id === exercise.category);
  card.querySelector(".exercise-category").textContent = category ? category.label : exercise.category;
  card.querySelector(".exercise-level-tag").textContent = getLevelInfo(level).label;
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
  const calendarBtn = root.querySelector("#calendar-btn");
  calendarBtn.addEventListener("click", () => nav.toCalendar());
  const missedCount = progress.missedDates.length;
  if (missedCount > 0) {
    calendarBtn.classList.add("has-missed");
    calendarBtn.querySelector(".calendar-btn-label").textContent =
      `⚠️ ${missedCount} day${missedCount === 1 ? "" : "s"} to rescue`;
  }
  renderBadgeShelf(root);
  root.querySelector("#badge-shelf").addEventListener("click", openBadgesSheet);

  if (!getLevel()) {
    openLevelChooser();
  }

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
    const info = getMilestoneShelfInfo(progress.longestStreak, progress.unlockedBadges);
    shelf.querySelector(".badge-shelf-label").textContent = `${info.icon} ${info.label}`;
    shelf.querySelector(".badge-shelf-count").textContent = info.countText;
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
    sheet.el.querySelector("#set-level-btn").addEventListener("click", () => {
      sheet.close();
      openLevelChooser();
    });
    sheet.el.querySelector("#export-all-btn").addEventListener("click", async () => {
      await doExport();
      sheet.close();
    });
    sheet.el.querySelector("#import-btn").addEventListener("click", () => {
      sheet.close();
      openImport();
    });
    sheet.el.querySelector("#delete-all-btn").addEventListener("click", () => {
      sheet.close();
      openDeleteAllConfirm();
    });
  }

  function openLevelChooser() {
    const sheet = openSheet("tpl-level-chooser");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    const current = getLevel() || DEFAULT_LEVEL;
    const buttons = sheet.el.querySelectorAll(".level-option");
    buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.level === current));
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setLevel(btn.dataset.level);
        sheet.close();
        renderToday(root, nav);
      });
    });
  }

  function openDeleteAllConfirm() {
    const sheet = openSheet("tpl-confirm-delete-all");
    sheet.el.querySelector(".cancel-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".confirm-btn").addEventListener("click", () => {
      resetAllData();
      applyTheme();
      sheet.close();
      renderToday(root, nav);
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
    const sectionTpl = document.getElementById("tpl-badge-tier-section");
    const itemTpl = document.getElementById("tpl-badge-item");

    // A lookahead of 3 previews a few still-locked upcoming Cups/Elite badges
    // rather than the list quietly stopping at whatever's been earned so far.
    const allBadges = getAllBadges(progress.longestStreak, progress.totalCompleted, 3);

    const sections = BADGE_TIERS.map((tier) => {
      const tierBadges = allBadges.filter((b) => b.tier === tier.id);
      const unlockedCount = tierBadges.filter((b) => progress.unlockedBadges.includes(b.id)).length;

      const section = sectionTpl.content.cloneNode(true);
      section.querySelector(".badge-tier-title").textContent = `${tier.icon} ${tier.label}`;
      section.querySelector(".badge-tier-count").textContent = `${unlockedCount}/${tierBadges.length}`;

      const items = tierBadges.map((badge) => {
        const node = itemTpl.content.cloneNode(true);
        const unlocked = progress.unlockedBadges.includes(badge.id);
        const item = node.querySelector(".badge-item");
        item.classList.add(`tier-${tier.id}`);
        item.classList.toggle("locked", !unlocked);
        node.querySelector(".badge-icon").textContent = tier.icon;
        node.querySelector(".badge-label").textContent = badge.label;
        node.querySelector(".badge-desc").textContent = badge.desc;
        return node;
      });
      section.querySelector(".badge-tier-items").replaceChildren(...items);
      return section;
    });
    list.replaceChildren(...sections);
  }
}
