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
    navigator.serviceWorker
      .register("service-worker.js")
      .then((reg) => reg.update())
      .catch(() => {});
  });

  // A new service worker activates in the background (it already takes
  // over immediately via skipWaiting/clients.claim) but an already-open tab
  // keeps running the JS it loaded at open time regardless -- so it needs a
  // reload to actually pick up the new code. But reloading the instant that
  // happens would yank away whatever's on screen (the "App updated" notice
  // itself, or a workout in progress) at a moment the update has nothing to
  // do with. Instead, reload only once it's safe: right away if the tab is
  // already backgrounded, or the next time it gets backgrounded if it's in
  // front of you right now -- so it's simply fresh again by the time you
  // come back, the same as a normal reopen.
  let updatePending = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updatePending) return;
    updatePending = true;
    if (document.hidden) {
      window.location.reload();
    } else {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) window.location.reload();
      });
    }
  });
}
