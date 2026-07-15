import { renderToday } from "./views/today.js";
import { renderPlayer } from "./views/player.js";
import { renderFinish } from "./views/finish.js";
import { renderLibrary } from "./views/library.js";
import { applyTheme } from "./theme.js";

applyTheme();

const root = document.getElementById("app");
let pendingFinishResult = null;

const nav = {
  toToday: () => {
    location.hash = "#/today";
  },
  toPlayer: () => {
    location.hash = "#/play";
  },
  toFinish: (result) => {
    pendingFinishResult = result;
    location.hash = "#/finish";
  },
  toLibrary: () => {
    location.hash = "#/library";
  },
};

function route() {
  const hash = location.hash || "#/today";
  const view = hash.replace(/^#\//, "").split("/")[0];

  switch (view) {
    case "play":
      renderPlayer(root, nav);
      break;
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
