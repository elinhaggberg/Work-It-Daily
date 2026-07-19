import { getProgress, toDateKey, getLevel } from "../storage.js";
import { getExercise, pickExerciseForDate } from "../exercises.js";
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
// daily-pool rotation, ignoring streak/challenge logic (a rescue is already
// harder via the penalty multiplier, so it doesn't also roll a challenge move).
function makeupExerciseFor(dateKey) {
  const { exercise } = pickExerciseForDate(new Date(`${dateKey}T00:00:00`), 0);
  return exercise;
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

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day";
      if (dateKey === todayKey) cell.classList.add("is-today");

      const dayNum = document.createElement("span");
      dayNum.className = "calendar-day-num";
      dayNum.textContent = String(day);
      cell.appendChild(dayNum);

      const dot = document.createElement("span");
      dot.className = "calendar-day-dot";
      cell.appendChild(dot);

      if (completion) {
        cell.classList.add(completion.rescued ? "is-rescued" : "is-done");
        cell.addEventListener("click", () => openDayInfoSheet(dateKey, completion, false));
      } else if (isBridged) {
        cell.classList.add("is-frozen");
        cell.addEventListener("click", () => openDayInfoSheet(dateKey, null, true));
      } else if (isFuture || isBeforeAccount) {
        cell.classList.add("is-blank");
        cell.disabled = true;
      } else {
        cell.classList.add("is-missed");
        cell.addEventListener("click", () => openSaveDaySheet(dateKey));
      }

      cells.push(cell);
    }

    gridEl.replaceChildren(...cells);
  }

  function openDayInfoSheet(dateKey, completion, isBridged) {
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
    } else if (isBridged) {
      statusEl.textContent = "❄ Covered by a streak freeze";
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
}
