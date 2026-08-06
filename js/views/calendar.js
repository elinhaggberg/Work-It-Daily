import { getProgress, toDateKey, getLevel, addDays, getStreakBaseForDate, isChallengeDateKey } from "../storage.js";
import { getExercise, pickExerciseForDate, pickChallengeForDate } from "../exercises.js";
import { DEFAULT_LEVEL, scaleAmount, RESCUE_PENALTY_MULTIPLIER, getLevelLabel } from "../levels.js";
import { openSheet } from "../sheet.js";
import { unlockAudio } from "../audio.js";
import { openDaySummarySheet } from "../daySummary.js";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// JS getDay() is Sunday-first (0-6); this rotates it to Monday-first (0-6)
// to match the weekday label row.
function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function formatLongDate(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// The same makeup exercise saveDay() will assign for this date — the base
// daily-pool rotation (a rescue is already harder via the penalty
// multiplier, so it doesn't also roll the bonus weekly challenge).
function makeupExerciseFor(dateKey) {
  return pickExerciseForDate(new Date(`${dateKey}T00:00:00`));
}

export function renderCalendar(root, nav) {
  const tpl = document.getElementById("tpl-calendar");
  root.replaceChildren(tpl.content.cloneNode(true));
  root.querySelector(".back-btn").addEventListener("click", () => nav.toToday());

  const monthLabelEl = root.querySelector("#calendar-month-label");
  const gridEl = root.querySelector("#calendar-grid");
  const prevBtn = root.querySelector("#calendar-prev-btn");
  const nextBtn = root.querySelector("#calendar-next-btn");

  const weekdayRow = root.querySelector("#calendar-weekdays");
  weekdayRow.replaceChildren(
    ...WEEKDAY_LABELS.map((label) => {
      const el = document.createElement("span");
      el.textContent = label;
      return el;
    })
  );

  const today = new Date();
  const viewState = { year: today.getFullYear(), month: today.getMonth() };

  prevBtn.addEventListener("click", () => {
    viewState.month -= 1;
    if (viewState.month < 0) {
      viewState.month = 11;
      viewState.year -= 1;
    }
    draw();
  });
  nextBtn.addEventListener("click", () => {
    if (nextBtn.disabled) return;
    viewState.month += 1;
    if (viewState.month > 11) {
      viewState.month = 0;
      viewState.year += 1;
    }
    draw();
  });

  draw();

  function draw() {
    const progress = getProgress();
    const completionsByDate = new Map(progress.completions.map((c) => [c.date, c]));
    const challengeCompletionsByDate = new Map(progress.challengeCompletions.map((c) => [c.date, c]));
    const firstOpenKey = toDateKey(new Date(progress.firstOpenAt));
    const todayKey = toDateKey(today);

    const isCurrentMonth = viewState.year === today.getFullYear() && viewState.month === today.getMonth();
    nextBtn.disabled = isCurrentMonth;
    nextBtn.classList.toggle("disabled", isCurrentMonth);

    const monthStart = new Date(viewState.year, viewState.month, 1);
    monthLabelEl.textContent = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const daysInMonth = new Date(viewState.year, viewState.month + 1, 0).getDate();
    const leadingBlanks = mondayIndex(monthStart);

    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push(document.createElement("span"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(viewState.year, viewState.month, day);
      const dateKey = toDateKey(cellDate);
      const completion = completionsByDate.get(dateKey);
      const isBridged = progress.bridgedDates.has(dateKey);
      const isBeforeAccount = dateKey < firstOpenKey;
      const isFuture = dateKey > todayKey;
      // Only yesterday is still within its one-day grace window to be
      // rescued -- anything older that's neither done nor frozen already
      // had its chance and is permanently missed (see saveDay/getLostDates).
      const isRescuable = dateKey === addDays(todayKey, -1);
      const isLost = progress.lostDates.includes(dateKey);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day";
      if (dateKey === todayKey) cell.classList.add("is-today");

      const dayNum = document.createElement("span");
      dayNum.className = "calendar-day-num";
      dayNum.textContent = String(day);
      cell.appendChild(dayNum);

      const dotsRow = document.createElement("span");
      dotsRow.className = "calendar-day-dots";
      cell.appendChild(dotsRow);

      const dot = document.createElement("span");
      dot.className = "calendar-day-dot";
      dotsRow.appendChild(dot);

      // A finished weekly challenge gets its own dot (any date, live or
      // rescued) so it's visible alongside the day's regular-exercise dot
      // rather than overwriting it. The grayed "pending" marker is scoped to
      // exactly the cases the day-info/save-day sheets below can actually act
      // on -- still missed, or already rescued but not yet claimed -- so a
      // live-completed day whose live challenge was simply skipped doesn't
      // show a dot promising an action that isn't there.
      const challengeDot = document.createElement("span");
      challengeDot.className = "calendar-day-challenge-dot";
      if (challengeCompletionsByDate.has(dateKey)) {
        challengeDot.classList.add("is-challenge-done");
      } else if (isRescuable && (!completion || completion.rescued) && isChallengeDateKey(dateKey)) {
        challengeDot.classList.add("is-challenge-pending");
      }
      dotsRow.appendChild(challengeDot);

      if (completion) {
        cell.classList.add(completion.rescued ? "is-rescued" : "is-done");
        cell.addEventListener("click", () =>
          openDayInfoSheet(dateKey, completion, false, false, challengeCompletionsByDate.has(dateKey))
        );
      } else if (isBridged) {
        cell.classList.add("is-frozen");
        cell.addEventListener("click", () => openDayInfoSheet(dateKey, null, true));
      } else if (isFuture || isBeforeAccount) {
        cell.classList.add("is-blank");
        cell.disabled = true;
      } else if (dateKey === todayKey) {
        // Today hasn't concluded yet, so it isn't "missed" — today's
        // exercise is still doable from Home. Nothing to do here yet.
        cell.disabled = true;
      } else if (isRescuable) {
        cell.classList.add("is-missed");
        cell.addEventListener("click", () => openSaveDaySheet(dateKey));
      } else if (isLost) {
        cell.classList.add("is-lost");
        cell.addEventListener("click", () => openDayInfoSheet(dateKey, null, false, true));
      } else {
        // Still today's date's own yesterday-window hasn't closed for this
        // date yet in the stats replay (e.g. right at the boundary) -- rare,
        // but leave it inert rather than guessing at a status.
        cell.disabled = true;
      }

      cells.push(cell);
    }

    gridEl.replaceChildren(...cells);
  }

  function openDayInfoSheet(dateKey, completion, isBridged, isLost, challengeDone) {
    const sheet = openSheet("tpl-day-info");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".day-info-date").textContent = formatLongDate(dateKey);

    const statusEl = sheet.el.querySelector(".day-info-status");
    if (completion) {
      const exercise = getExercise(completion.exerciseId);
      const label = exercise ? exercise.name : "an exercise";
      statusEl.textContent = completion.rescued ? `✅ Saved retroactively — ${label}` : `✅ Done — ${label}`;

      const actions = sheet.el.querySelector(".day-info-actions");
      actions.classList.remove("hidden");
      actions.querySelector(".day-info-summary-btn").addEventListener("click", () => {
        sheet.close();
        openDaySummarySheet(dateKey);
      });

      // Only a rescued day can be missing its weekly challenge this way -- a
      // live-completed day's challenge (if any) was already offered on Home
      // that same day, so there's nothing left to hand back here.
      if (completion.rescued && !challengeDone && isChallengeDateKey(dateKey)) {
        const challengeActions = sheet.el.querySelector(".day-info-challenge-actions");
        challengeActions.classList.remove("hidden");
        challengeActions.querySelector(".day-info-challenge-btn").addEventListener("click", () => {
          sheet.close();
          openSaveChallengeSheet(dateKey);
        });
      }
    } else if (isBridged) {
      statusEl.textContent = "❄ Covered by a streak freeze";
    } else if (isLost) {
      statusEl.textContent = "✕ Missed — its one day to be rescued or frozen already passed";
    }
  }

  function openSaveDaySheet(dateKey) {
    const sheet = openSheet("tpl-save-day");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".save-day-cancel-btn").addEventListener("click", () => sheet.close());

    const level = getLevel() ?? DEFAULT_LEVEL;
    const exercise = makeupExerciseFor(dateKey);
    const amount = scaleAmount(exercise, level, RESCUE_PENALTY_MULTIPLIER);
    const amountText = exercise.type === "timer" ? `${amount}s hold` : `${amount} reps`;

    sheet.el.querySelector(".save-day-date").textContent = formatLongDate(dateKey);
    sheet.el.querySelector(".save-day-exercise").textContent = `${exercise.name} — ${amountText}`;
    sheet.el.querySelector(".save-day-penalty").textContent =
      `${RESCUE_PENALTY_MULTIPLIER}× penalty on top of your normal ${getLevelLabel(level)} amount.`;

    // Actually doing the makeup exercise happens in the real player (same as
    // today's exercise) rather than a single tap here — saveDay() only gets
    // called once that playthrough finishes.
    sheet.el.querySelector(".save-day-start-btn").addEventListener("click", () => {
      unlockAudio();
      sheet.close();
      nav.toPlayer(dateKey);
    });
  }

  function openSaveChallengeSheet(dateKey) {
    const sheet = openSheet("tpl-save-day-challenge");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".save-day-cancel-btn").addEventListener("click", () => sheet.close());

    const level = getLevel() ?? DEFAULT_LEVEL;
    const streakBase = getStreakBaseForDate(dateKey);
    const { exercise } = pickChallengeForDate(new Date(`${dateKey}T00:00:00`), streakBase);
    const amount = scaleAmount(exercise, level, RESCUE_PENALTY_MULTIPLIER);
    const amountText = exercise.type === "timer" ? `${amount}s hold` : `${amount} reps`;

    sheet.el.querySelector(".save-challenge-date").textContent = formatLongDate(dateKey);
    sheet.el.querySelector(".save-challenge-exercise").textContent = `${exercise.name} — ${amountText}`;
    sheet.el.querySelector(".save-day-penalty").textContent =
      `${RESCUE_PENALTY_MULTIPLIER}× penalty on top of your normal ${getLevelLabel(level)} amount.`;

    sheet.el.querySelector(".save-day-start-btn").addEventListener("click", () => {
      unlockAudio();
      sheet.close();
      nav.toChallengePlayer(dateKey);
    });
  }
}
