import { pickExerciseForDate } from "./exercises.js";
import { scaleAmount, RESCUE_PENALTY_MULTIPLIER } from "./levels.js";

const PROGRESS_KEY = "wid_progress_v1";
const THEME_KEY = "wid_theme_v1";
const SOUND_KEY = "wid_sound_enabled_v1";
const LEVEL_KEY = "wid_level_v1";

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

function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

const FREEZE_TOKEN_CAP = 2;
const FREEZE_TOKEN_EVERY = 7; // earn one every N-day streak milestone

// Three tiers, each fancier than the last. Medals cover the first year or so
// of normal use; Cups mark each full year of an active streak; Elite badges
// are long-haul milestones for users who keep going well past year one.
export const BADGE_TIERS = [
  { id: "medal", label: "Badges", icon: "🏅" },
  { id: "cup", label: "Cups", icon: "🏆" },
  { id: "elite", label: "Elite", icon: "💎" },
];

export const BADGES = [
  // Medals
  { id: "streak-3", tier: "medal", label: "First Steps", desc: "3-day streak", kind: "streak", threshold: 3 },
  { id: "streak-7", tier: "medal", label: "One Week Strong", desc: "7-day streak", kind: "streak", threshold: 7 },
  { id: "streak-14", tier: "medal", label: "Two Weeks In", desc: "14-day streak", kind: "streak", threshold: 14 },
  { id: "streak-30", tier: "medal", label: "Habit Formed", desc: "30-day streak", kind: "streak", threshold: 30 },
  { id: "streak-60", tier: "medal", label: "Two Months", desc: "60-day streak", kind: "streak", threshold: 60 },
  { id: "streak-100", tier: "medal", label: "Century", desc: "100-day streak", kind: "streak", threshold: 100 },
  { id: "streak-365", tier: "medal", label: "One Year", desc: "365-day streak", kind: "streak", threshold: 365 },
  { id: "total-50", tier: "medal", label: "Half Century", desc: "50 workouts completed", kind: "total", threshold: 50 },
  { id: "total-200", tier: "medal", label: "Dedicated", desc: "200 workouts completed", kind: "total", threshold: 200 },
  { id: "variety", tier: "medal", label: "Well Rounded", desc: "Completed every category", kind: "variety" },

  // Cups — one per full year of an active streak
  { id: "cup-1", tier: "cup", label: "1 Year Cup", desc: "365-day streak", kind: "streak", threshold: 365 },
  { id: "cup-2", tier: "cup", label: "2 Year Cup", desc: "730-day streak", kind: "streak", threshold: 730 },
  { id: "cup-3", tier: "cup", label: "3 Year Cup", desc: "1095-day streak", kind: "streak", threshold: 1095 },
  { id: "cup-4", tier: "cup", label: "4 Year Cup", desc: "1460-day streak", kind: "streak", threshold: 1460 },
  { id: "cup-5", tier: "cup", label: "5 Year Cup", desc: "1825-day streak", kind: "streak", threshold: 1825 },

  // Elite — for the truly long haul
  { id: "elite-500", tier: "elite", label: "Iron Will", desc: "500-day streak", kind: "streak", threshold: 500 },
  { id: "elite-1000", tier: "elite", label: "Unbreakable", desc: "1000-day streak", kind: "streak", threshold: 1000 },
  { id: "elite-1500", tier: "elite", label: "Legend", desc: "1500-day streak", kind: "streak", threshold: 1500 },
  { id: "elite-2000", tier: "elite", label: "Mythic", desc: "2000-day streak", kind: "streak", threshold: 2000 },
  { id: "elite-total-1000", tier: "elite", label: "Iron Body", desc: "1000 workouts completed", kind: "total", threshold: 1000 },
];

// The home screen's badge counter tracks whichever tier isn't finished yet —
// once Medals hit 10/10 it "graduates" to counting Cups, then Elite. Nothing
// already earned is ever hidden or revoked; this only changes what the
// compact home-screen counter highlights next.
export function getActiveBadgeTier(unlockedBadges) {
  for (const tier of BADGE_TIERS) {
    const tierBadges = BADGES.filter((b) => b.tier === tier.id);
    const unlocked = tierBadges.filter((b) => unlockedBadges.includes(b.id)).length;
    if (unlocked < tierBadges.length) {
      return { ...tier, unlocked, total: tierBadges.length };
    }
  }
  const last = BADGE_TIERS[BADGE_TIERS.length - 1];
  const total = BADGES.filter((b) => b.tier === last.id).length;
  return { ...last, unlocked: total, total };
}

function defaultProgress() {
  return {
    completions: [], // [{ date, exerciseId, category, rescued }]
    unlockedBadges: [], // badge ids
    lastBackupAt: null,
    backupBannerDismissedAt: null,
    firstOpenAt: Date.now(),
  };
}

function loadRaw() {
  const stored = readJSON(PROGRESS_KEY, null);
  if (!stored) {
    const fresh = defaultProgress();
    writeJSON(PROGRESS_KEY, fresh);
    return fresh;
  }
  return { ...defaultProgress(), ...stored };
}

function saveRaw(progress) {
  writeJSON(PROGRESS_KEY, progress);
  return progress;
}

// The streak, longest streak, and available freeze tokens are derived from
// the completions list every time rather than stored as mutable counters —
// that's what lets "save a missed day" (retroactively inserting a
// completion anywhere in the past) just work, instead of needing to patch
// counters that were computed incrementally. Walks the account's full
// history day by day, replaying the same "streak continues / freeze bridges
// a gap / streak resets" logic that used to run inline at completion time.
function computeStreakStats(completions) {
  const doneDates = new Set(completions.map((c) => c.date));
  const bridgedDates = new Set();
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, freezeTokens: 0, bridgedDates };
  }

  const todayKey = toDateKey(new Date());
  const startKey = completions.reduce((min, c) => (c.date < min ? c.date : min), todayKey);
  // Don't walk into "today" until it's actually been completed — otherwise a
  // pending freeze token would silently pre-bridge a day that hasn't
  // happened yet, and the displayed streak would count a day not yet done.
  const endKey = doneDates.has(todayKey) ? todayKey : addDays(todayKey, -1);

  if (endKey < startKey) {
    return { currentStreak: 0, longestStreak: 0, freezeTokens: 0, bridgedDates };
  }

  let current = 0;
  let longest = 0;
  let freezeTokens = 0;
  let cursor = startKey;
  while (true) {
    if (doneDates.has(cursor)) {
      current += 1;
    } else if (freezeTokens > 0 && current > 0) {
      freezeTokens -= 1;
      bridgedDates.add(cursor);
      current += 1;
    } else {
      current = 0;
    }
    if (current > 0 && current % FREEZE_TOKEN_EVERY === 0) {
      freezeTokens = Math.min(FREEZE_TOKEN_CAP, freezeTokens + 1);
    }
    longest = Math.max(longest, current);
    if (cursor === endKey) break;
    cursor = addDays(cursor, 1);
  }

  return { currentStreak: current, longestStreak: longest, freezeTokens, bridgedDates };
}

function hasAllCategories(completions) {
  const seen = new Set(completions.map((c) => c.category));
  return ["push", "pull", "legs", "core", "fullbody"].every((c) => seen.has(c));
}

// Checks every badge against the current completions/streak state and
// unlocks any newly-earned ones (mutates progress.unlockedBadges in place).
function checkForNewBadges(progress, stats) {
  const newlyUnlocked = [];
  for (const badge of BADGES) {
    if (progress.unlockedBadges.includes(badge.id)) continue;
    const earned =
      (badge.kind === "streak" && stats.currentStreak >= badge.threshold) ||
      (badge.kind === "total" && progress.completions.length >= badge.threshold) ||
      (badge.kind === "variety" && hasAllCategories(progress.completions));
    if (earned) {
      progress.unlockedBadges.push(badge.id);
      newlyUnlocked.push(badge);
    }
  }
  return newlyUnlocked;
}

// Past days that are neither completed nor freeze-bridged — i.e. genuinely
// missed and still eligible to be saved from the calendar.
function getMissedDates(raw, stats) {
  const doneDates = new Set(raw.completions.map((c) => c.date));
  const firstOpenKey = toDateKey(new Date(raw.firstOpenAt));
  const todayKey = toDateKey(new Date());
  const missed = [];
  let cursor = firstOpenKey;
  while (cursor < todayKey) {
    if (!doneDates.has(cursor) && !stats.bridgedDates.has(cursor)) missed.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return missed;
}

export function getProgress() {
  const raw = loadRaw();
  const stats = computeStreakStats(raw.completions);
  return {
    ...raw,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    freezeTokens: stats.freezeTokens,
    bridgedDates: stats.bridgedDates,
    missedDates: getMissedDates(raw, stats),
    totalCompleted: raw.completions.length,
  };
}

export function getTodayStatus() {
  const progress = getProgress();
  const todayKey = toDateKey(new Date());
  return {
    doneToday: progress.completions.some((c) => c.date === todayKey),
    progress,
  };
}

// Records today's completion, updating the streak, freeze tokens, totals,
// and any newly unlocked badges. Safe to call multiple times for the same
// day (only the first call per day changes anything).
export function completeToday(exercise) {
  const raw = loadRaw();
  const todayKey = toDateKey(new Date());

  if (raw.completions.some((c) => c.date === todayKey)) {
    return { progress: getProgress(), newlyUnlocked: [], usedFreeze: false };
  }

  const yesterdayKey = addDays(todayKey, -1);
  const statsBefore = computeStreakStats(raw.completions);

  raw.completions.push({ date: todayKey, exerciseId: exercise.id, category: exercise.category, rescued: false });

  const statsAfter = computeStreakStats(raw.completions);
  const newlyUnlocked = checkForNewBadges(raw, statsAfter);
  saveRaw(raw);

  const usedFreeze = statsAfter.bridgedDates.has(yesterdayKey) && !statsBefore.bridgedDates.has(yesterdayKey);

  return { progress: getProgress(), newlyUnlocked, usedFreeze };
}

// Retroactively completes a past missed day with a harder makeup exercise,
// so it counts toward the streak instead of leaving a gap. Returns null if
// the day isn't eligible (already done, or not in the past).
export function saveDay(dateKey, level) {
  const raw = loadRaw();
  const todayKey = toDateKey(new Date());
  if (dateKey >= todayKey) return null;
  if (raw.completions.some((c) => c.date === dateKey)) return null;

  const { exercise } = pickExerciseForDate(new Date(`${dateKey}T00:00:00`), 0);
  const amount = scaleAmount(exercise, level, RESCUE_PENALTY_MULTIPLIER);

  raw.completions.push({ date: dateKey, exerciseId: exercise.id, category: exercise.category, rescued: true });

  const stats = computeStreakStats(raw.completions);
  const newlyUnlocked = checkForNewBadges(raw, stats);
  saveRaw(raw);

  return { progress: getProgress(), newlyUnlocked, exercise, amount };
}

export function dismissBackupBanner() {
  const raw = loadRaw();
  raw.backupBannerDismissedAt = Date.now();
  saveRaw(raw);
}

export function markBackedUp() {
  const raw = loadRaw();
  raw.lastBackupAt = Date.now();
  raw.backupBannerDismissedAt = Date.now();
  saveRaw(raw);
}

const BACKUP_REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const BACKUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-ask 3 days after a dismiss

export function shouldShowBackupBanner() {
  const raw = loadRaw();
  const since = raw.lastBackupAt || raw.firstOpenAt;
  if (Date.now() - since < BACKUP_REMIND_AFTER_MS) return false;
  if (raw.backupBannerDismissedAt && Date.now() - raw.backupBannerDismissedAt < BACKUP_SNOOZE_MS) return false;
  return raw.completions.length > 0;
}

// ---- Export / import (backup) ----

export function exportBackupData() {
  const raw = loadRaw();
  return {
    type: "work-it-daily-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    progress: raw,
    level: getLevel(),
  };
}

export function importBackupData(data) {
  if (!data || data.type !== "work-it-daily-backup" || !data.progress) {
    throw new Error("That doesn't look like a Work It Daily backup file.");
  }
  saveRaw({ ...defaultProgress(), ...data.progress });
  if (data.level) setLevel(data.level);
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

export function getLevel() {
  return localStorage.getItem(LEVEL_KEY) || null;
}

export function setLevel(id) {
  localStorage.setItem(LEVEL_KEY, id);
}

// Wipes every trace of this app's data — streaks, badges, backup timestamps,
// level, theme and sound prefs — back to a fresh install.
export function resetAllData() {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(SOUND_KEY);
  localStorage.removeItem(LEVEL_KEY);
}
