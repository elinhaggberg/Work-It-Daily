import { pickExerciseForDate, pickChallengeForDate } from "./exercises.js";
import { scaleAmount, RESCUE_PENALTY_MULTIPLIER, LEVEL_ID_TO_VALUE } from "./levels.js";

const PROGRESS_KEY = "wid_progress_v1";
const THEME_KEY = "wid_theme_v1";
const SOUND_KEY = "wid_sound_enabled_v1";
const LEVEL_KEY = "wid_level_v1";
const LAST_SEEN_VERSION_KEY = "wid_last_seen_version_v1";

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

// Four tiers, each fancier (and rarer) than the last. Milestones, Cups, and
// Elite badges are all generated from the current streak/total rather than
// a hardcoded list, so there's always a next one waiting no matter how many
// years someone keeps going. Bonus is the only fixed, one-time set.
export const BADGE_TIERS = [
  { id: "milestone", label: "Milestones", icon: "🎖️" },
  { id: "cup", label: "Cups", icon: "🏆" },
  { id: "elite", label: "Elite", icon: "💎" },
  { id: "bonus", label: "Bonus", icon: "🏅" },
];

// One-time extras — not tied to the yearly rhythm, so they don't need to be
// perpetual the way Milestones/Cups/Elite do.
export const BADGES = [
  { id: "total-50", tier: "bonus", label: "Half Century", desc: "50 workouts completed", kind: "total", threshold: 50 },
  { id: "total-200", tier: "bonus", label: "Dedicated", desc: "200 workouts completed", kind: "total", threshold: 200 },
  { id: "variety", tier: "bonus", label: "Well Rounded", desc: "Completed every category", kind: "variety" },
];

const CUP_INTERVAL_DAYS = 365; // one Cup per full year of streak, forever
const ELITE_STREAK_INTERVAL_DAYS = 500; // an Elite streak badge every 500 days, forever
const ELITE_TOTAL_INTERVAL = 1000; // an Elite badge every 1000 workouts, forever

// A handful of curated names for the badges most people will actually reach;
// falls back to a plain "{n}-Day Streak" style label past that so the
// sequence never runs out of things to call itself.
const ELITE_STREAK_NAMES = ["Iron Will", "Unbreakable", "Legend", "Mythic", "Titan", "Eternal", "Immortal", "Transcendent"];
const ELITE_TOTAL_NAMES = ["Iron Body", "Forged", "Relentless"];

// Nine within-year checkpoints, spaced the way the original one-time medal
// set was (dense early, spreading out later), reused every year so there's
// always a short-term goal a few weeks out — not just one big payoff at the
// end of the year. The Cup at day 365 rounds each year out to exactly 10.
export const MILESTONE_OFFSETS = [
  { days: 3, name: "Quick Start" },
  { days: 7, name: "One Week In" },
  { days: 14, name: "Two Weeks Strong" },
  { days: 30, name: "One Month In" },
  { days: 60, name: "Two Months In" },
  { days: 100, name: "Century Mark" },
  { days: 150, name: "Halfway Through" },
  { days: 250, name: "Home Stretch" },
  { days: 300, name: "Final Push" },
];

// Generates every Milestone badge for every year up through the one
// currently in progress (plus `extraYears` more for a sheet preview), so a
// fresh batch of 9 becomes available right as each new year starts instead
// of the streak-badge rhythm only ever happening once.
function generateMilestoneBadges(longestStreak, extraYears = 0) {
  const yearsToGenerate = Math.floor(longestStreak / CUP_INTERVAL_DAYS) + 1 + extraYears;
  const badges = [];
  for (let year = 1; year <= yearsToGenerate; year++) {
    for (const offset of MILESTONE_OFFSETS) {
      const threshold = (year - 1) * CUP_INTERVAL_DAYS + offset.days;
      badges.push({
        id: `milestone-${threshold}`,
        tier: "milestone",
        label: `${offset.name} · Year ${year}`,
        desc: `${threshold}-day streak`,
        kind: "streak",
        threshold,
      });
    }
  }
  return badges;
}

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

// The full set of badges relevant right now: the fixed Bonus set plus every
// Milestone/Cup/Elite badge generated up through what's achievable, with a
// small lookahead so the sheet can preview upcoming ones.
export function getAllBadges(longestStreak, totalCompleted, lookahead = 1) {
  // Milestones already generate 9 per year, so previewing extra years ahead
  // at the same lookahead as Cups/Elite would pile on dozens of locked
  // entries — capped at 1 extra year regardless of what's passed in.
  const milestoneLookahead = Math.min(lookahead, 1);
  return [
    ...BADGES,
    ...generateMilestoneBadges(longestStreak, milestoneLookahead),
    ...generateCupBadges(longestStreak, lookahead),
    ...generateEliteStreakBadges(longestStreak, lookahead),
    ...generateEliteTotalBadges(totalCompleted, lookahead),
  ];
}

// The home screen's compact badge counter tracks Milestones for whichever
// year of the streak is currently in progress — it genuinely resets to
// 0/9 at the start of every new year (nothing earned is lost; last year's
// milestones stay visible in the full Badges sheet), so there's always a
// short-term goal a few weeks out, indefinitely.
export function getMilestoneShelfInfo(longestStreak, unlockedBadges) {
  const year = Math.floor(longestStreak / CUP_INTERVAL_DAYS) + 1;
  const yearIds = MILESTONE_OFFSETS.map((o) => `milestone-${(year - 1) * CUP_INTERVAL_DAYS + o.days}`);
  const unlocked = yearIds.filter((id) => unlockedBadges.includes(id)).length;
  return { icon: "🎖️", label: `Year ${year} Milestones`, countText: `${unlocked}/${MILESTONE_OFFSETS.length}` };
}

function defaultProgress() {
  return {
    completions: [], // [{ date, exerciseId, category, rescued }]
    challengeCompletions: [], // [{ date, exerciseId, category }] -- the optional weekly bonus
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
function computeStreakStats(completions, asOfKey = toDateKey(new Date())) {
  const doneDates = new Set(completions.map((c) => c.date));
  const bridgedDates = new Set();
  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, freezeTokens: 0, bridgedDates };
  }

  const startKey = completions.reduce((min, c) => (c.date < min ? c.date : min), asOfKey);
  // Don't walk into "today" until it's actually been completed — otherwise a
  // pending freeze token would silently pre-bridge a day that hasn't
  // happened yet, and the displayed streak would count a day not yet done.
  // (For a past asOfKey this is moot -- it's always already either done or not.)
  const endKey = doneDates.has(asOfKey) ? asOfKey : addDays(asOfKey, -1);

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

// What the streak counter read as of a given day, rather than today --
// lets a past day's summary show the streak it actually contributed to at
// the time, not today's (possibly since-broken) streak.
export function getStreakAsOf(dateKey) {
  const raw = loadRaw();
  const stats = computeStreakStats(raw.completions, dateKey);
  return { currentStreak: stats.currentStreak, longestStreak: stats.longestStreak };
}

export function getTodayStatus() {
  const progress = getProgress();
  const todayKey = toDateKey(new Date());
  return {
    doneToday: progress.completions.some((c) => c.date === todayKey),
    challengeDoneToday: progress.challengeCompletions.some((c) => c.date === todayKey),
    progress,
  };
}

// The streak value used to decide whether today is eligible for the bonus
// "weekly challenge" exercise (every 7th day of an active streak). Pinned to
// yesterday's streak so it stays stable for the whole day regardless of
// whether today's own exercise has already been completed -- otherwise
// completing today's regular exercise first would bump the streak to
// already include today and silently take the bonus off the table before
// it had even been attempted.
export function getStreakBaseForToday() {
  const raw = loadRaw();
  const todayKey = toDateKey(new Date());
  return computeStreakStats(raw.completions, addDays(todayKey, -1)).currentStreak;
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

// Records the optional weekly bonus challenge exercise for today. Kept
// entirely separate from the regular completions list -- it never touches
// the streak, freezes, or badges, since it's extra credit on top of (never
// instead of) today's real exercise. Safe to call multiple times; only the
// first call per day does anything.
export function completeChallenge(exercise) {
  const raw = loadRaw();
  const todayKey = toDateKey(new Date());
  if (raw.challengeCompletions.some((c) => c.date === todayKey)) return null;

  const streakBase = computeStreakStats(raw.completions, addDays(todayKey, -1)).currentStreak;
  const { isChallengeDay } = pickChallengeForDate(new Date(), streakBase);
  if (!isChallengeDay) return null;

  raw.challengeCompletions.push({ date: todayKey, exerciseId: exercise.id, category: exercise.category });
  saveRaw(raw);
  return getProgress();
}

// Retroactively completes a past missed day with a harder makeup exercise,
// so it counts toward the streak instead of leaving a gap. Returns null if
// the day isn't eligible (already done, or not in the past).
export function saveDay(dateKey, level) {
  const raw = loadRaw();
  const todayKey = toDateKey(new Date());
  if (dateKey >= todayKey) return null;
  if (raw.completions.some((c) => c.date === dateKey)) return null;

  const exercise = pickExerciseForDate(new Date(`${dateKey}T00:00:00`));
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
    theme: getThemePref(),
    soundEnabled: getSoundEnabled(),
  };
}

export function importBackupData(data) {
  if (!data || data.type !== "work-it-daily-backup" || !data.progress) {
    throw new Error("That doesn't look like a Work It Daily backup file.");
  }
  saveRaw({ ...defaultProgress(), ...data.progress });
  if (data.level !== undefined && data.level !== null) setLevel(data.level);
  // Theme and sound are single current-state preferences, not part of the
  // progress blob, so a full backup restore applies them directly rather
  // than merging -- that's what "restore my backup" means for a device's
  // preferences.
  if (data.theme) setThemePref(data.theme);
  if (typeof data.soundEnabled === "boolean") setSoundEnabled(data.soundEnabled);
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

// Returns a slider position (0-3), or null if never set. Older installs
// stored a named id ("easy"/"medium"/"hard"/"brutal") instead of a number —
// those still resolve correctly to their equivalent position.
export function getLevel() {
  const raw = localStorage.getItem(LEVEL_KEY);
  if (raw === null) return null;
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && raw.trim() !== "") return asNumber;
  return LEVEL_ID_TO_VALUE[raw] ?? null;
}

export function setLevel(value) {
  localStorage.setItem(LEVEL_KEY, String(value));
}

// Tracks which app version this device has already seen the "what's new"
// notice for — stored entirely separately from progress data, so an app
// update (or resetting this) can never touch streaks, badges, or history.
export function getLastSeenVersion() {
  return localStorage.getItem(LAST_SEEN_VERSION_KEY) || null;
}

export function setLastSeenVersion(version) {
  localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
}

const ONBOARDING_SEEN_KEY = "wid_onboarding_seen_v1";

export function getOnboardingSeen() {
  return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
}

export function setOnboardingSeen() {
  localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}

// Wipes every trace of this app's data — streaks, badges, backup timestamps,
// level, theme and sound prefs — back to a fresh install.
export function resetAllData() {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(SOUND_KEY);
  localStorage.removeItem(LEVEL_KEY);
  localStorage.removeItem(LAST_SEEN_VERSION_KEY);
}
