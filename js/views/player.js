import {
  completeToday,
  saveDay,
  completeChallenge,
  completeChallengeForDate,
  getSoundEnabled,
  setSoundEnabled,
  getLevel,
  getTodayChallenge,
  getStreakBaseForDate,
  getExerciseForDate,
  toDateKey,
  getActiveAdventure,
} from "../storage.js";
import { THEMES } from "../adventures.js";
import { renderMascot } from "../mascot.js";
import { pickChallengeForDate } from "../exercises.js";
import { scaledExercise, DEFAULT_LEVEL, RESCUE_PENALTY_MULTIPLIER } from "../levels.js";
import { formatClock, formatDate } from "../util.js";
import * as audio from "../audio.js";
import { setWakeLockWanted } from "../wakelock.js";
import { ICON_PLAY, ICON_PAUSE, ICON_VOLUME_HIGH, ICON_VOLUME_XMARK } from "../icons.js";

const LEAD_IN_SECONDS = 3;
const WARNING_SECONDS = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * 54;

export function renderPlayer(root, nav, rescueDateKey = null, isChallenge = false, fromAdventure = false) {
  const levelValue = getLevel() ?? DEFAULT_LEVEL;

  let baseExercise;
  if (rescueDateKey && isChallenge) {
    const { exercise, isChallengeDay } = pickChallengeForDate(
      new Date(`${rescueDateKey}T00:00:00`),
      getStreakBaseForDate(rescueDateKey)
    );
    if (!isChallengeDay || !exercise) {
      // No longer eligible (already claimed, or this got opened stale) --
      // nothing to play, just head back rather than show a broken screen.
      nav.toCalendar();
      return;
    }
    baseExercise = exercise;
  } else if (rescueDateKey) {
    baseExercise = getExerciseForDate(rescueDateKey);
  } else if (isChallenge) {
    const { exercise, isChallengeDay } = getTodayChallenge();
    if (!isChallengeDay || !exercise) {
      // No longer eligible (streak changed, or this got opened stale) --
      // nothing to play, just head back rather than show a broken screen.
      nav.toToday();
      return;
    }
    baseExercise = exercise;
  } else {
    baseExercise = getExerciseForDate(toDateKey(new Date()));
  }
  const exercise = scaledExercise(baseExercise, levelValue, rescueDateKey ? RESCUE_PENALTY_MULTIPLIER : 1);

  // Started from the Adventure screen: the same exercise, dressed for the
  // story. Only today's regular exercise gets this, and only while the
  // adventure is still running (a stale link just plays normally).
  const adventureState = fromAdventure && !rescueDateKey && !isChallenge ? getActiveAdventure() : null;

  const tpl = document.getElementById("tpl-player");
  root.replaceChildren(tpl.content.cloneNode(true));

  const rescueBannerEl = root.querySelector("#rescue-banner");
  if (rescueDateKey && !isChallenge) {
    rescueBannerEl.textContent = `⚠️ Saving ${formatDate(`${rescueDateKey}T00:00:00`)} — ${RESCUE_PENALTY_MULTIPLIER}× penalty`;
    rescueBannerEl.classList.remove("hidden");
  }

  const challengeBannerEl = root.querySelector("#challenge-player-banner");
  if (isChallenge) {
    challengeBannerEl.textContent = rescueDateKey
      ? `⭐ Weekly challenge — rescuing ${formatDate(`${rescueDateKey}T00:00:00`)}'s bonus, ${RESCUE_PENALTY_MULTIPLIER}× penalty`
      : "⭐ Weekly challenge — bonus, on top of today's exercise";
    challengeBannerEl.classList.remove("hidden");
  }

  if (adventureState) applyAdventureFlair(root, adventureState);

  const exerciseNameEl = root.querySelector("#exercise-name");
  const bigNumberEl = root.querySelector("#big-number");
  const bigLabelEl = root.querySelector("#big-label");
  const countdownRingEl = root.querySelector("#countdown-ring");
  const countdownRingFillEl = root.querySelector("#countdown-ring-fill");
  const playPauseBtn = root.querySelector("#play-pause-btn");
  const doneBtn = root.querySelector("#done-btn");
  const exitBtn = root.querySelector(".back-btn");
  const soundToggleBtn = root.querySelector("#sound-toggle-btn");
  const totalTimerEl = root.querySelector("#total-timer");

  exerciseNameEl.textContent = exercise.name;

  const state = {
    phase: "countdown",
    countdownRemaining: LEAD_IN_SECONDS,
    remaining: exercise.type === "timer" ? exercise.amount : exercise.amount,
    totalElapsed: 0,
    running: false,
    started: false,
    // Reps exercises always end with a manual tap; a timer exercise reaches
    // this same manual-done state once its countdown hits zero, instead of
    // auto-finishing -- the countdown hitting 0 is a target, not a hard
    // stop, so the total clock above keeps running if they want to push on.
    timerDone: false,
  };

  let tickHandle = null;
  audio.setEnabled(getSoundEnabled());
  renderSoundToggle();
  render();

  playPauseBtn.addEventListener("click", togglePlay);
  doneBtn.addEventListener("click", finish);
  exitBtn.addEventListener("click", exit);
  soundToggleBtn.addEventListener("click", toggleSound);

  function togglePlay() {
    if (!state.started) {
      audio.unlockAudio();
      state.started = true;
    }
    state.running = !state.running;
    setWakeLockWanted(state.running);
    if (state.running) startTicking();
    else stopTicking();
    render();
  }

  function toggleSound() {
    const next = !audio.isEnabled();
    audio.setEnabled(next);
    setSoundEnabled(next);
    if (next) audio.unlockAudio();
    renderSoundToggle();
  }

  function renderSoundToggle() {
    const on = audio.isEnabled();
    soundToggleBtn.innerHTML = on ? ICON_VOLUME_HIGH : ICON_VOLUME_XMARK;
    soundToggleBtn.classList.toggle("active", on);
    soundToggleBtn.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
  }

  function startTicking() {
    if (tickHandle) return;
    tickHandle = setInterval(tick, 1000);
  }

  function stopTicking() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function tick() {
    state.totalElapsed += 1;

    if (state.phase === "countdown") {
      state.countdownRemaining -= 1;
      if (state.countdownRemaining <= 0) {
        audio.intervalStart();
        state.phase = "active";
      }
    } else if (exercise.type === "timer" && !state.timerDone) {
      state.remaining -= 1;
      if (state.remaining > 0) {
        if (state.remaining <= WARNING_SECONDS) audio.countdownTick();
      } else {
        state.remaining = 0;
        state.timerDone = true;
        audio.intervalEnd();
      }
    }
    render();
  }

  function finish() {
    stopTicking();
    setWakeLockWanted(false);
    audio.workoutComplete();

    if (rescueDateKey && isChallenge) {
      // Same "bonus extra" treatment as the live weekly challenge below --
      // it never touched the streak/badges even on the day it was meant for,
      // so rescuing it later doesn't either. Back to the calendar (where
      // this was launched from), not the daily finish screen.
      completeChallengeForDate(rescueDateKey, exercise);
      nav.toCalendar();
      return;
    }

    if (rescueDateKey) {
      const result = saveDay(rescueDateKey, levelValue);
      if (!result) {
        // Already saved (or no longer eligible) by the time this finished —
        // nothing to celebrate, just head back rather than show a broken screen.
        nav.toCalendar();
        return;
      }
      nav.toFinish({
        exercise: { ...result.exercise, amount: result.amount },
        totalSeconds: state.totalElapsed,
        progress: result.progress,
        newlyUnlocked: result.newlyUnlocked,
        usedFreeze: false,
        isFirstEver: result.progress.totalCompleted === 1,
        levelValue,
        isRescue: true,
        rescueDateKey,
        swapped: result.swapped,
        adventure: result.adventure,
        fromAdventure: false,
      });
      return;
    }

    if (isChallenge) {
      // A bonus extra, not the day's real completion -- no streak/badge
      // change to celebrate, so just head back rather than route through the
      // full finish screen built for the daily flow.
      completeChallenge(exercise);
      nav.toToday();
      return;
    }

    const result = completeToday(exercise);
    nav.toFinish({
      exercise,
      totalSeconds: state.totalElapsed,
      progress: result.progress,
      newlyUnlocked: result.newlyUnlocked,
      usedFreeze: result.usedFreeze,
      isFirstEver: result.progress.totalCompleted === 1,
      levelValue,
      swapped: result.swapped,
      adventure: result.adventure,
      fromAdventure: Boolean(adventureState),
    });
  }

  function exit() {
    stopTicking();
    setWakeLockWanted(false);
    if (rescueDateKey) nav.toCalendar();
    else if (adventureState) nav.toAdventure();
    else nav.toToday();
  }

  function render() {
    totalTimerEl.textContent = formatClock(state.totalElapsed);
    playPauseBtn.innerHTML = state.running ? ICON_PAUSE : ICON_PLAY;
    doneBtn.classList.toggle("hidden", exercise.type === "timer" ? !state.timerDone : false);

    if (!state.started && state.phase === "countdown") {
      countdownRingEl.classList.add("hidden");
      bigNumberEl.classList.remove("hidden");
      bigNumberEl.textContent = exercise.type === "timer" ? formatClock(exercise.amount) : String(exercise.amount);
      bigNumberEl.className = "big-number";
      bigLabelEl.textContent = exercise.type === "timer" ? "seconds — tap play to start" : "reps — tap play to start";
    } else if (state.phase === "countdown") {
      bigNumberEl.classList.add("hidden");
      countdownRingEl.classList.remove("hidden");
      const fraction = (LEAD_IN_SECONDS - state.countdownRemaining) / LEAD_IN_SECONDS;
      countdownRingFillEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
      bigLabelEl.textContent = "Get ready";
    } else if (exercise.type === "timer") {
      countdownRingEl.classList.add("hidden");
      bigNumberEl.classList.remove("hidden");
      bigNumberEl.textContent = formatClock(state.remaining);
      if (state.timerDone) {
        bigNumberEl.className = "big-number reps-mode";
        bigLabelEl.textContent = "time's up — tap done, or keep going for extra";
      } else {
        bigNumberEl.className = "big-number" + (state.remaining <= WARNING_SECONDS ? " countdown" : "");
        bigLabelEl.textContent = "seconds left";
      }
    } else {
      countdownRingEl.classList.add("hidden");
      bigNumberEl.classList.remove("hidden");
      bigNumberEl.textContent = String(exercise.amount);
      bigNumberEl.className = "big-number reps-mode";
      bigLabelEl.textContent = "reps — tap done when finished";
    }
  }
}

// Themed backdrop, the dressed avatar, today's step on the route and how far
// the next landmark is. The theme class goes on the page root (app.js clears
// it on every navigation) so the CSS variables restyle the whole screen.
function applyAdventureFlair(root, state) {
  const { adventure, steps, total, next } = state;
  const theme = THEMES.find((t) => t.id === adventure.theme) || THEMES[0];
  root.classList.add("player-adventure", `theme-${adventure.theme}`);

  const avatar = root.querySelector("#adventure-player-avatar");
  avatar.classList.remove("hidden");
  renderMascot(avatar, { mood: "idle", size: 56, outfit: adventure.theme });

  const banner = root.querySelector("#adventure-player-banner");
  banner.textContent = `${theme.icon} ${adventure.title} · day ${steps + 1} of ${total}`;
  banner.classList.remove("hidden");

  const track = root.querySelector("#adventure-player-track");
  track.classList.remove("hidden");
  const landmarkDays = new Set(adventure.chapters.map((c) => c.day));
  for (let day = 1; day <= total; day++) {
    const segment = document.createElement("span");
    if (day <= steps) segment.className = "is-done";
    else if (day === steps + 1) segment.className = "is-today";
    if (landmarkDays.has(day)) segment.classList.add("is-landmark");
    track.append(segment);
  }

  if (next) {
    const left = next.day - steps;
    const nextEl = root.querySelector("#adventure-player-next");
    nextEl.textContent =
      left === 1 ? `Finish today to reach ${next.icon} ${next.place}!` : `${left} days to ${next.icon} ${next.place}`;
    nextEl.classList.remove("hidden");
  }
}
