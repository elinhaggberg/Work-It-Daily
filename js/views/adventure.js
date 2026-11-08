import {
  getAdventures,
  getActiveAdventure,
  startAdventure,
  abandonAdventure,
  getAdventureTrophies,
  importAdventure,
  removeCustomAdventure,
} from "../storage.js";
import {
  THEMES,
  ADVENTURE_LENGTHS,
  adventureToFile,
  buildAdventureTemplate,
  buildAdventurePrompt,
} from "../adventures.js";
import { renderAdventureMap } from "../adventureMap.js";
import { renderMascot } from "../mascot.js";
import { openSheet } from "../sheet.js";
import { shareOrDownload, filenameFor } from "../share.js";
import { formatDate } from "../util.js";

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const b = h("button", className, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
const isCustom = (adventure) => adventure.id.startsWith("custom-");
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "adventure";

// Remembered between visits within a session so coming back lands on the
// length you were last browsing.
let browsingLength = ADVENTURE_LENGTHS[0];

export function renderAdventure(root, nav) {
  const tpl = document.getElementById("tpl-adventure");
  root.replaceChildren(tpl.content.cloneNode(true));
  root.querySelector(".back-btn").addEventListener("click", () => nav.toToday());
  const body = root.querySelector("#adventure-body");

  draw();

  function draw() {
    const active = getActiveAdventure();
    body.replaceChildren(...(active ? activeView(active) : pickerView()));
  }

  function confirmSheet({ title, intro, note, confirmLabel, danger = false, onConfirm }) {
    const sheet = openSheet("tpl-adventure-confirm");
    sheet.el.querySelector(".confirm-title").textContent = title;
    sheet.el.querySelector(".adventure-confirm-intro").textContent = intro;
    const noteEl = sheet.el.querySelector(".adventure-confirm-note");
    noteEl.textContent = note || "";
    noteEl.classList.toggle("hidden", !note);
    const confirmBtn = sheet.el.querySelector(".confirm-btn");
    confirmBtn.textContent = confirmLabel;
    confirmBtn.classList.toggle("primary", !danger);
    confirmBtn.classList.toggle("danger", danger);
    sheet.el.querySelector(".cancel-btn").addEventListener("click", () => sheet.close());
    confirmBtn.addEventListener("click", () => {
      sheet.close();
      onConfirm();
    });
  }

  // ---- A running adventure: map, next landmark, story so far ----
  function activeView(state) {
    const { adventure, steps, total, reached, next } = state;
    const theme = themeOf(adventure.theme);
    const nodes = [];

    const header = h("div", "card adventure-header");
    const avatarSlot = h("div", "adventure-header-avatar");
    renderMascot(avatarSlot, { mood: "idle", size: 56, outfit: adventure.theme });
    const text = h("div", "adventure-header-text");
    text.append(h("p", "adventure-theme-chip", `${theme.icon} ${theme.label}`), h("h2", "adventure-title", adventure.title));
    if (adventure.tagline) text.append(h("p", "adventure-tagline", adventure.tagline));
    header.append(avatarSlot, text);
    nodes.push(header);

    const progress = h("div", "adventure-progress");
    progress.append(h("p", "adventure-progress-label", `${steps} of ${total} days`));
    const bar = h("div", "adventure-update-bar");
    const fill = h("span");
    fill.style.width = `${(steps / total) * 100}%`;
    bar.append(fill);
    progress.append(bar);
    if (next) {
      const left = next.day - steps;
      progress.append(h("p", "adventure-next", `Next: ${next.icon} ${next.place} in ${left} day${left === 1 ? "" : "s"}`));
    }
    if (steps === 0) {
      progress.append(h("p", "adventure-next", "Complete today's exercise to take your first step."));
    }
    nodes.push(progress);

    const mapCard = h("div", "adventure-map");
    nodes.push(mapCard);

    const journal = h("div", "adventure-journal");
    journal.append(h("h3", "adventure-section-title", "Story so far"));
    if (adventure.intro) {
      const entry = h("div", "adventure-entry");
      entry.append(h("p", "adventure-entry-place", "📜 The beginning"), h("p", "adventure-entry-text", adventure.intro));
      journal.append(entry);
    }
    for (const chapter of adventure.chapters) {
      const done = reached.includes(chapter);
      const entry = h("div", `adventure-entry${done ? "" : " is-locked"}`);
      if (done) {
        entry.append(
          h("p", "adventure-entry-place", `${chapter.icon} ${chapter.place}`),
          h("p", "adventure-entry-day", `Day ${chapter.day}`),
          h("p", "adventure-entry-text", chapter.text)
        );
      } else {
        entry.append(h("p", "adventure-entry-place", `🔒 Day ${chapter.day}`), h("p", "adventure-entry-text", "Keep going to uncover this part of the story."));
      }
      journal.append(entry);
    }
    nodes.push(journal);

    const actions = h("div", "adventure-actions");
    actions.append(
      button("Share adventure", "text-btn secondary", () => shareAdventure(adventure)),
      button("Leave adventure", "text-btn adventure-leave-btn", () =>
        confirmSheet({
          title: "Leave this adventure?",
          intro: `You'll lose your progress on ${adventure.title}. Your streak isn't affected, and you can start it again from day 1 any time.`,
          confirmLabel: "Leave adventure",
          danger: true,
          onConfirm: () => {
            abandonAdventure();
            draw();
          },
        })
      )
    );
    nodes.push(actions);
    nodes.push(trophyShelf());

    // The map needs to be in the document before it can measure its road.
    queueMicrotask(() => renderAdventureMap(mapCard, adventure, steps));
    return nodes;
  }

  // ---- No adventure yet: choose one ----
  function pickerView() {
    const nodes = [];
    const intro = h("div", "card adventure-intro");
    intro.append(
      h("h2", "adventure-title", "Choose your adventure"),
      h(
        "p",
        "adventure-tagline",
        "Pick a route. Every day you complete, or save from the Calendar, takes you one step further. It runs alongside your streak and never changes it."
      )
    );
    nodes.push(intro);

    const lengths = h("div", "adventure-lengths");
    for (const days of ADVENTURE_LENGTHS) {
      const b = button(`${days} days`, `adventure-length-btn${days === browsingLength ? " active" : ""}`, () => {
        browsingLength = days;
        draw();
      });
      lengths.append(b);
    }
    nodes.push(lengths);

    const trophies = getAdventureTrophies();
    const list = h("div", "adventure-list");
    for (const adventure of getAdventures().filter((a) => a.days === browsingLength)) list.append(adventureCard(adventure, trophies));
    nodes.push(list);
    nodes.push(trophyShelf());
    nodes.push(createYourOwn());
    return nodes;
  }

  function adventureCard(adventure, trophies) {
    const theme = themeOf(adventure.theme);
    const earned = trophies.find((t) => t.adventureId === adventure.id);
    const card = h("div", `card adventure-card theme-${adventure.theme}`);

    const main = h("button", "adventure-card-main");
    main.type = "button";
    const emblem = h("div", "adventure-card-emblem");
    renderMascot(emblem, { mood: "idle", size: 34, outfit: adventure.theme });
    const text = h("div", "adventure-card-text");
    const meta = h("p", "adventure-theme-chip", `${theme.icon} ${theme.label}${isCustom(adventure) ? " · Custom" : ""}`);
    text.append(meta, h("p", "adventure-card-title", adventure.title), h("p", "adventure-card-tagline", adventure.tagline));
    const trophy = h("span", `adventure-card-trophy${earned ? " is-earned" : ""}`, earned ? adventure.badge.icon : "🏆");
    trophy.title = earned ? `Trophy earned ${formatDate(`${earned.earnedDate}T00:00:00`)}` : "Trophy to win";
    main.append(emblem, text, trophy);
    main.addEventListener("click", () =>
      confirmSheet({
        title: `${theme.icon} ${adventure.title}`,
        intro: adventure.intro || adventure.tagline,
        note: `${adventure.days} days. It starts today, so if you've already done today's exercise, that's your first step.`,
        confirmLabel: "Begin adventure",
        onConfirm: () => {
          startAdventure(adventure.id);
          draw();
        },
      })
    );
    card.append(main);

    if (isCustom(adventure)) {
      const row = h("div", "adventure-card-actions");
      row.append(
        button("Share", "text-btn small", () => shareAdventure(adventure)),
        button("Remove", "text-btn small adventure-leave-btn", () =>
          confirmSheet({
            title: `Remove "${adventure.title}"?`,
            intro: "This deletes the custom adventure from this device. Anything you've shared stays shared.",
            confirmLabel: "Remove",
            danger: true,
            onConfirm: () => {
              removeCustomAdventure(adventure.id);
              draw();
            },
          })
        )
      );
      card.append(row);
    }
    return card;
  }

  function trophyShelf() {
    const trophies = getAdventureTrophies();
    const adventures = getAdventures();
    const earnedCount = adventures.filter((a) => trophies.some((t) => t.adventureId === a.id)).length;

    const shelf = h("div", "adventure-trophies");
    const head = h("div", "adventure-trophies-head");
    head.append(h("h3", "adventure-section-title", "Trophies"), h("span", "adventure-trophies-count", `${earnedCount}/${adventures.length}`));
    shelf.append(head);

    const grid = h("div", "adventure-trophy-grid");
    for (const adventure of adventures) {
      const earned = trophies.find((t) => t.adventureId === adventure.id);
      const item = h("div", `adventure-trophy-item${earned ? " is-earned" : ""}`);
      item.title = earned ? `${adventure.badge.label}: ${adventure.badge.desc}` : `Finish "${adventure.title}" to earn this`;
      item.append(
        h("span", "adventure-trophy-icon", earned ? adventure.badge.icon : "🔒"),
        h("span", "adventure-trophy-name", earned ? adventure.badge.label : `${themeOf(adventure.theme).label} · ${adventure.days}d`)
      );
      grid.append(item);
    }
    shelf.append(grid);
    return shelf;
  }

  // ---- Make your own / share ----
  function createYourOwn() {
    const card = h("div", "card adventure-own");
    card.append(
      h("h3", "adventure-section-title", "Create your own"),
      h(
        "p",
        "adventure-tagline",
        "Write an adventure yourself, or let an AI write one about anything you like. Fill in the template (or paste the AI prompt into a chat), then import the result. Your adventures can be shared as files too."
      )
    );
    const row = h("div", "adventure-own-actions");
    const copyBtn = button("Copy AI prompt", "text-btn secondary", async () => {
      try {
        await navigator.clipboard.writeText(buildAdventurePrompt());
        copyBtn.textContent = "Copied ✓";
      } catch {
        copyBtn.textContent = "Couldn't copy";
      }
      setTimeout(() => (copyBtn.textContent = "Copy AI prompt"), 1600);
    });
    row.append(
      copyBtn,
      button("Download template", "text-btn secondary", () =>
        shareOrDownload(filenameFor("work-it-daily-adventure-template"), JSON.stringify(buildAdventureTemplate(), null, 2))
      ),
      button("Import adventure", "text-btn primary", openImport)
    );
    card.append(row);
    return card;
  }

  function shareAdventure(adventure) {
    return shareOrDownload(filenameFor(`work-it-daily-${slug(adventure.title)}`), JSON.stringify(adventureToFile(adventure), null, 2));
  }

  function openImport() {
    const sheet = openSheet("tpl-adventure-import");
    const textEl = sheet.el.querySelector(".adventure-import-text");
    const fileInput = sheet.el.querySelector(".adventure-import-file");
    const messageEl = sheet.el.querySelector(".import-message");

    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".adventure-import-file-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (file) textEl.value = await file.text();
    });

    sheet.el.querySelector(".adventure-import-btn").addEventListener("click", () => {
      messageEl.classList.remove("error");
      let parsed;
      try {
        parsed = JSON.parse(textEl.value);
      } catch {
        messageEl.textContent = "That isn't valid JSON. Paste the whole adventure, from { to }.";
        messageEl.classList.add("error");
        return;
      }
      try {
        const adventure = importAdventure(parsed);
        browsingLength = adventure.days;
        messageEl.textContent = `Imported "${adventure.title}".`;
        setTimeout(() => {
          sheet.close();
          draw();
        }, 700);
      } catch (err) {
        messageEl.textContent = err.message || "That doesn't look like a valid adventure.";
        messageEl.classList.add("error");
      }
    });
  }
}
