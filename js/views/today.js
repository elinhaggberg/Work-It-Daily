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
  getLastSeenVersion,
  setLastSeenVersion,
} from "../storage.js";
import { pickExerciseForDate, CATEGORIES } from "../exercises.js";
import { DEFAULT_LEVEL, LEVEL_MIN, LEVEL_MAX, LEVEL_STEP, scaledExercise, getLevelLabel } from "../levels.js";
import { APP_VERSION, CHANGELOG } from "../version.js";
import { renderMascot } from "../mascot.js";
import { openSheet } from "../sheet.js";
import { shareOrDownload, shareText, filenameFor } from "../share.js";
import { buildChallengeText } from "../challenge.js";
import { getTheme, setTheme, applyTheme } from "../theme.js";
import { unlockAudio } from "../audio.js";

export function renderToday(root, nav) {
  const tpl = document.getElementById("tpl-today");
  root.replaceChildren(tpl.content.cloneNode(true));

  const { doneToday, progress } = getTodayStatus();
  const { exercise: baseExercise, isChallengeDay } = pickExerciseForDate(new Date(), progress.currentStreak);

  renderMascot(root.querySelector("#mascot-slot"), { mood: doneToday ? "cheer" : "idle", size: 108 });

  root.querySelector("#current-streak").textContent = progress.currentStreak;
  root.querySelector("#longest-streak").textContent = progress.longestStreak;
  const freezeEl = root.querySelector("#freeze-tokens");
  freezeEl.textContent = "❄".repeat(progress.freezeTokens) || "—";
  freezeEl.title = `${progress.freezeTokens} streak freeze${progress.freezeTokens === 1 ? "" : "s"} saved — bridges one missed day`;

  const card = root.querySelector("#exercise-card");
  // Reused by the level slider so the card updates live as it's dragged,
  // not just on the next full render.
  function renderExerciseCard(levelValue) {
    const exercise = scaledExercise(baseExercise, levelValue);
    const category = CATEGORIES.find((c) => c.id === exercise.category);
    card.querySelector(".exercise-category").textContent = category ? category.label : exercise.category;
    card.querySelector(".exercise-level-tag").textContent = getLevelLabel(levelValue);
    card.querySelector(".exercise-name").textContent = exercise.name;
    card.querySelector(".exercise-amount").textContent =
      exercise.type === "timer" ? `${exercise.amount}s hold` : `${exercise.amount} reps`;
    card.querySelector(".exercise-description").textContent = exercise.description;
  }
  renderExerciseCard(getLevel() ?? DEFAULT_LEVEL);

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

  if (getLevel() === null) {
    openLevelChooser();
  }

  const lastSeenVersion = getLastSeenVersion();
  if (lastSeenVersion === null) {
    // First time this device has ever tracked a version — nothing to
    // announce, just start tracking silently from here on.
    setLastSeenVersion(APP_VERSION);
  } else if (lastSeenVersion !== APP_VERSION) {
    openAppUpdatedSheet();
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
    sheet.el.querySelector("#challenge-friend-menu-btn").addEventListener("click", async (e) => {
      const label = e.currentTarget.querySelector("span:last-child");
      const outcome = await shareText(buildChallengeText(progress.currentStreak));
      if (outcome === "shared" || outcome === "cancelled") {
        sheet.close();
        return;
      }
      label.textContent = outcome === "copied" ? "Copied ✓" : "Couldn't share";
      setTimeout(() => sheet.close(), 900);
    });
    sheet.el.querySelector("#export-all-btn").addEventListener("click", async () => {
      await doExport();
      sheet.close();
    });
    sheet.el.querySelector("#import-btn").addEventListener("click", () => {
      sheet.close();
      openImport();
    });
    sheet.el.querySelector("#workout-timer-link-btn").addEventListener("click", () => {
      sheet.close();
      openWorkoutTimerPromo();
    });
    sheet.el.querySelector("#delete-all-btn").addEventListener("click", () => {
      sheet.close();
      openDeleteAllConfirm();
    });
  }

  function openWorkoutTimerPromo() {
    const sheet = openSheet("tpl-promo-workout-timer");
    sheet.el.querySelector(".cancel-btn").addEventListener("click", () => sheet.close());
  }

  function openAppUpdatedSheet() {
    const sheet = openSheet("tpl-app-updated");
    const latest = CHANGELOG[0];
    sheet.el.querySelector(".app-updated-version").textContent = `Version ${latest.version}`;
    const list = sheet.el.querySelector(".app-updated-notes");
    list.replaceChildren(
      ...latest.notes.map((note) => {
        const li = document.createElement("li");
        li.textContent = note;
        return li;
      })
    );
    // Marked as seen as soon as it's shown (not just on an explicit button
    // tap) so dismissing via the backdrop doesn't leave it reappearing.
    setLastSeenVersion(APP_VERSION);
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector("#app-updated-ok-btn").addEventListener("click", () => sheet.close());
  }

  function openLevelChooser() {
    const sheet = openSheet("tpl-level-chooser");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());

    const slider = sheet.el.querySelector("#level-slider");
    const labelEl = sheet.el.querySelector("#level-slider-label");
    slider.min = LEVEL_MIN;
    slider.max = LEVEL_MAX;
    slider.step = LEVEL_STEP;

    const current = getLevel() ?? DEFAULT_LEVEL;
    slider.value = current;
    labelEl.textContent = getLevelLabel(current);

    // Saved and reflected on the actual card behind the sheet on every drag,
    // not just on close — so it's already correct however the sheet closes
    // (button tap or backdrop tap alike), no separate "confirm" step needed.
    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      setLevel(value);
      labelEl.textContent = getLevelLabel(value);
      renderExerciseCard(value);
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
