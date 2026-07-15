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

// Three tiers, each fancier than the last. Medals are a fixed, finite set
// covering the first year of normal use. Cups and Elite badges are generated
// from the current streak/total rather than a hardcoded list, so there's
// always a next one waiting no matter how many years someone keeps going —
// instead of the gamification going quiet after year one.
export const BADGE_TIERS = [
  { id: "medal", label: "Badges", icon: "🏅" },
  { id: "cup", label: "Cups", icon: "🏆" },
  { id: "elite", label: "Elite", icon: "💎" },
];

export const BADGES = [
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
];

const CUP_INTERVAL_DAYS = 365; // one Cup per full year of streak, forever
const ELITE_STREAK_INTERVAL_DAYS = 500; // an Elite streak badge every 500 days, forever
const ELITE_TOTAL_INTERVAL = 1000; // an Elite badge every 1000 workouts, forever

// A handful of curated names for the badges most people will actually reach;
// falls back to a plain "{n}-Day Streak" style label past that so the
// sequence never runs out of things to call itself.
const ELITE_STREAK_NAMES = ["Iron Will", "Unbreakable", "Legend", "Mythic", "Titan", "Eternal", "Immortal", "Transcendent"];
const ELITE_TOTAL_NAMES = ["Iron Body", "Forged", "Relentless"];

// Generates every badge in a perpetual, interval-based sequence up through
// the highest one achieved so far, plus `lookahead` more still-locked ones —
// so the badges sheet always previews what's coming next instead of the
// list quietly ending. `lookahead` of 1 (the default) is enough for the
// unlock check itself to catch a threshold the instant it's crossed.
function generateCupBadges(longestStreak, lookahead = 1) {
  const achieved = Math.floor(longestStreak / CUP_INTERVAL_DAYS);
  const badges = [];
  for (let n = 1; n <= achieved + lookahead; n++) {
    const threshold = n * CUP_INTERVAL_DAYS;
    badges.push({ id: `cup-${n}`, tier: "cup", label: `${n} Year Cup`, desc: `${threshold}-day streak`, kind: "streak", threshold });
  }
  return badges;
}

function generateEliteStreakBadges(longestStreak, lookahead = 1) {
  const achieved = Math.floor(longestStreak / ELITE_STREAK_INTERVAL_DAYS);
  const badges = [];
  for (let n = 1; n <= achieved + lookahead; n++) {
    const threshold = n * ELITE_STREAK_INTERVAL_DAYS;
    const label = ELITE_STREAK_NAMES[n - 1] || `${threshold}-Day Streak`;
    badges.push({ id: `elite-${threshold}`, tier: "elite", label, desc: `${threshold}-day streak`, kind: "streak", threshold });
  }
  return badges;
}

function generateEliteTotalBadges(totalCompleted, lookahead = 1) {
  const achieved = Math.floor(totalCompleted / ELITE_TOTAL_INTERVAL);
  const badges = [];
  for (let n = 1; n <= achieved + lookahead; n++) {
    const threshold = n * ELITE_TOTAL_INTERVAL;
    const label = ELITE_TOTAL_NAMES[n - 1] || `${threshold} Workouts`;
    badges.push({ id: `elite-total-${threshold}`, tier: "elite", label, desc: `${threshold} workouts completed`, kind: "total", threshold });
  }
  return badges;
}

// The full set of badges relevant right now: the fixed Medals plus every
// Cup/Elite badge generated up through what's achievable, with a small
// lookahead so the sheet can preview upcoming ones.
export function getAllBadges(longestStreak, totalCompleted, lookahead = 1) {
  return [
    ...BADGES,
    ...generateCupBadges(longestStreak, lookahead),
    ...generateEliteStreakBadges(longestStreak, lookahead),
    ...generateEliteTotalBadges(totalCompleted, lookahead),
  ];
}

// The home screen's compact badge counter shows Medal progress (X/10) until
// that's maxed out, then switches to an open-ended trophy count instead of
// freezing at a permanent "10/10" — there's no ceiling to hit anymore.
export function getBadgeShelfInfo(unlockedBadges) {
  const medalUnlocked = BADGES.filter((b) => unlockedBadges.includes(b.id)).length;
  if (medalUnlocked < BADGES.length) {
    return { icon: "🏅", label: "Badges", countText: `${medalUnlocked}/${BADGES.length}` };
  }
  const trophyCount = unlockedBadges.filter((id) => id.startsWith("cup-") || id.startsWith("elite-")).length;
  return { icon: "🏆", label: "Trophy case", countText: `${trophyCount}` };
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
  const candidates = getAllBadges(stats.currentStreak, progress.completions.length, 1);
  for (const badge of candidates) {
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
