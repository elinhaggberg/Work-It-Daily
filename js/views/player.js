import { getTodayStatus, completeToday, getSoundEnabled, setSoundEnabled, getLevel } from "../storage.js";
import { pickExerciseForDate } from "../exercises.js";
import { scaledExercise, DEFAULT_LEVEL } from "../levels.js";
import { formatClock } from "../util.js";
import * as audio from "../audio.js";
import { setWakeLockWanted } from "../wakelock.js";
import { ICON_PLAY, ICON_PAUSE, ICON_VOLUME_HIGH, ICON_VOLUME_XMARK } from "../icons.js";

const LEAD_IN_SECONDS = 3;
const WARNING_SECONDS = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * 54;

export function renderPlayer(root, nav) {
  const { progress } = getTodayStatus();
  const { exercise: baseExercise } = pickExerciseForDate(new Date(), progress.currentStreak);
  const levelValue = getLevel() ?? DEFAULT_LEVEL;
  const exercise = scaledExercise(baseExercise, levelValue);

  const tpl = document.getElementById("tpl-player");
  root.replaceChildren(tpl.content.cloneNode(true));

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
  doneBtn.classList.toggle("hidden", exercise.type !== "reps");

  const state = {
    phase: "countdown",
    countdownRemaining: LEAD_IN_SECONDS,
    remaining: exercise.type === "timer" ? exercise.amount : exercise.amount,
    totalElapsed: 0,
    running: false,
    started: false,
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
    } else if (exercise.type === "timer") {
      state.remaining -= 1;
      if (state.remaining > 0) {
        if (state.remaining <= WARNING_SECONDS) audio.countdownTick();
      } else {
        finish();
        return;
      }
    }
    render();
  }

  function finish() {
    stopTicking();
    setWakeLockWanted(false);
    audio.workoutComplete();
    const result = completeToday(exercise);
    nav.toFinish({
      exercise,
      totalSeconds: state.totalElapsed,
      progress: result.progress,
      newlyUnlocked: result.newlyUnlocked,
      usedFreeze: result.usedFreeze,
      isFirstEver: result.progress.totalCompleted === 1,
      levelValue,
    });
  }

  function exit() {
    stopTicking();
    setWakeLockWanted(false);
    nav.toToday();
  }

  function render() {
    totalTimerEl.textContent = formatClock(state.totalElapsed);
    playPauseBtn.innerHTML = state.running ? ICON_PAUSE : ICON_PLAY;

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
      bigNumberEl.className = "big-number" + (state.remaining <= WARNING_SECONDS ? " countdown" : "");
      bigLabelEl.textContent = "seconds left";
    } else {
      countdownRingEl.classList.add("hidden");
      bigNumberEl.classList.remove("hidden");
      bigNumberEl.textContent = String(exercise.amount);
      bigNumberEl.className = "big-number reps-mode";
      bigLabelEl.textContent = "reps — tap done when finished";
    }
  }
}
