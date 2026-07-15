const PROGRESS_KEY = "wid_progress_v1";
const THEME_KEY = "wid_theme_v1";
const SOUND_KEY = "wid_sound_enabled_v1";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(aKey, bKey) {
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

const FREEZE_TOKEN_CAP = 2;
const FREEZE_TOKEN_EVERY = 7; // earn one every N-day streak milestone

export const BADGES = [
  { id: "streak-3", label: "First Steps", desc: "3-day streak", kind: "streak", threshold: 3 },
  { id: "streak-7", label: "One Week Strong", desc: "7-day streak", kind: "streak", threshold: 7 },
  { id: "streak-14", label: "Two Weeks In", desc: "14-day streak", kind: "streak", threshold: 14 },
  { id: "streak-30", label: "Habit Formed", desc: "30-day streak", kind: "streak", threshold: 30 },
  { id: "streak-60", label: "Two Months", desc: "60-day streak", kind: "streak", threshold: 60 },
  { id: "streak-100", label: "Century", desc: "100-day streak", kind: "streak", threshold: 100 },
  { id: "streak-365", label: "One Year", desc: "365-day streak", kind: "streak", threshold: 365 },
  { id: "total-50", label: "Half Century", desc: "50 workouts completed", kind: "total", threshold: 50 },
  { id: "total-200", label: "Dedicated", desc: "200 workouts completed", kind: "total", threshold: 200 },
  { id: "variety", label: "Well Rounded", desc: "Completed every category", kind: "variety" },
];

function defaultProgress() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    totalCompleted: 0,
    freezeTokens: 0,
    completions: [], // [{ date, exerciseId, category }]
    unlockedBadges: [], // badge ids
    lastBackupAt: null,
    backupBannerDismissedAt: null,
    firstOpenAt: Date.now(),
  };
}

export function getProgress() {
  const stored = readJSON(PROGRESS_KEY, null);
  if (!stored) {
    const fresh = defaultProgress();
    writeJSON(PROGRESS_KEY, fresh);
    return fresh;
  }
  return { ...defaultProgress(), ...stored };
}

function saveProgress(progress) {
  writeJSON(PROGRESS_KEY, progress);
  return progress;
}

export function getTodayStatus() {
  const progress = getProgress();
  const todayKey = toDateKey(new Date());
  return {
    doneToday: progress.lastCompletedDate === todayKey,
    progress,
  };
}

// Records today's completion, updating the streak, freeze tokens, totals,
// and any newly unlocked badges. Safe to call multiple times for the same
// day (only the first call per day changes anything).
export function completeToday(exercise) {
  const progress = getProgress();
  const todayKey = toDateKey(new Date());

  if (progress.lastCompletedDate === todayKey) {
    return { progress, newlyUnlocked: [] };
  }

  let gap = progress.lastCompletedDate ? daysBetween(progress.lastCompletedDate, todayKey) : 1;
  let usedFreeze = false;

  if (!progress.lastCompletedDate || gap === 1) {
    progress.currentStreak += 1;
  } else if (gap === 2 && progress.freezeTokens > 0) {
    progress.freezeTokens -= 1;
    progress.currentStreak += 1;
    usedFreeze = true;
  } else {
    progress.currentStreak = 1;
  }

  if (progress.currentStreak > 0 && progress.currentStreak % FREEZE_TOKEN_EVERY === 0) {
    progress.freezeTokens = Math.min(FREEZE_TOKEN_CAP, progress.freezeTokens + 1);
  }

  progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
  progress.lastCompletedDate = todayKey;
  progress.totalCompleted += 1;
  progress.completions.push({ date: todayKey, exerciseId: exercise.id, category: exercise.category });

  const newlyUnlocked = [];
  for (const badge of BADGES) {
    if (progress.unlockedBadges.includes(badge.id)) continue;
    const earned =
      (badge.kind === "streak" && progress.currentStreak >= badge.threshold) ||
      (badge.kind === "total" && progress.totalCompleted >= badge.threshold) ||
      (badge.kind === "variety" && hasAllCategories(progress.completions));
    if (earned) {
      progress.unlockedBadges.push(badge.id);
      newlyUnlocked.push(badge);
    }
  }

  saveProgress(progress);
  return { progress, newlyUnlocked, usedFreeze };
}

function hasAllCategories(completions) {
  const seen = new Set(completions.map((c) => c.category));
  return ["push", "pull", "legs", "core", "fullbody"].every((c) => seen.has(c));
}

export function dismissBackupBanner() {
  const progress = getProgress();
  progress.backupBannerDismissedAt = Date.now();
  saveProgress(progress);
}

export function markBackedUp() {
  const progress = getProgress();
  progress.lastBackupAt = Date.now();
  progress.backupBannerDismissedAt = Date.now();
  saveProgress(progress);
}

const BACKUP_REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const BACKUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-ask 3 days after a dismiss

export function shouldShowBackupBanner() {
  const progress = getProgress();
  const since = progress.lastBackupAt || progress.firstOpenAt;
  if (Date.now() - since < BACKUP_REMIND_AFTER_MS) return false;
  if (progress.backupBannerDismissedAt && Date.now() - progress.backupBannerDismissedAt < BACKUP_SNOOZE_MS) return false;
  return progress.totalCompleted > 0;
}

// ---- Export / import (backup) ----

export function exportBackupData() {
  const progress = getProgress();
  return {
    type: "work-it-daily-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
  };
}

export function importBackupData(data) {
  if (!data || data.type !== "work-it-daily-backup" || !data.progress) {
    throw new Error("That doesn't look like a Work It Daily backup file.");
  }
  saveProgress({ ...defaultProgress(), ...data.progress });
  return true;
}

// ---- Preferences ----

export function getSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) === "true";
}

export function setSoundEnabled(value) {
  localStorage.setItem(SOUND_KEY, value ? "true" : "false");
}

export function getThemePref() {
  return readJSON(THEME_KEY, {});
}

export function setThemePref(pref) {
  writeJSON(THEME_KEY, pref);
}
