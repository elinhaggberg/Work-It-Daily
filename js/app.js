import { renderToday } from "./views/today.js";
import { renderPlayer } from "./views/player.js";
import { renderFinish } from "./views/finish.js";
import { renderLibrary } from "./views/library.js";
import { renderCalendar } from "./views/calendar.js";
import { applyTheme } from "./theme.js";

applyTheme();

const root = document.getElementById("app");
let pendingFinishResult = null;

const nav = {
  toToday: () => {
    location.hash = "#/today";
  },
  toPlayer: (rescueDateKey) => {
    location.hash = rescueDateKey ? `#/play/rescue/${rescueDateKey}` : "#/play";
  },
  toChallengePlayer: () => {
    location.hash = "#/play/challenge";
  },
  toFinish: (result) => {
    pendingFinishResult = result;
    location.hash = "#/finish";
  },
  toLibrary: () => {
    location.hash = "#/library";
  },
  toCalendar: () => {
    location.hash = "#/calendar";
  },
};

function route() {
  const hash = location.hash || "#/today";
  const view = hash.replace(/^#\//, "").split("/")[0];

  switch (view) {
    case "play": {
      const parts = hash.replace(/^#\//, "").split("/");
      const rescueDateKey = parts[1] === "rescue" ? parts[2] : null;
      const isChallenge = parts[1] === "challenge";
      renderPlayer(root, nav, rescueDateKey, isChallenge);
      break;
    }
    case "finish":
      if (!pendingFinishResult) {
        nav.toToday();
        return;
      }
      renderFinish(root, nav, pendingFinishResult);
      break;
    case "library":
      renderLibrary(root, nav);
      break;
    case "calendar":
      renderCalendar(root, nav);
      break;
    default:
      renderToday(root, nav);
  }
}

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
