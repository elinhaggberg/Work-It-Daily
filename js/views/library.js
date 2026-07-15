import { CATEGORIES, exercisesByCategory } from "../exercises.js";
import { openSheet } from "../sheet.js";

export function renderLibrary(root, nav) {
  const tpl = document.getElementById("tpl-library");
  root.replaceChildren(tpl.content.cloneNode(true));

  root.querySelector(".back-btn").addEventListener("click", () => nav.toToday());

  const listEl = root.querySelector("#library-list");
  const sectionTpl = document.getElementById("tpl-library-section");
  const itemTpl = document.getElementById("tpl-library-item");

  const sections = CATEGORIES.map((category) => {
    const section = sectionTpl.content.cloneNode(true);
    section.querySelector(".library-section-title").textContent = category.label;
    section.querySelector(".library-section-blurb").textContent = category.blurb;

    const items = exercisesByCategory(category.id).map((exercise) => {
      const item = itemTpl.content.cloneNode(true);
      item.querySelector(".card-title").textContent = exercise.name;
      const meta = exercise.type === "timer" ? `${exercise.amount}s hold` : `${exercise.amount} reps`;
      item.querySelector(".card-meta").textContent = `${meta} · ${exercise.difficulty}`;
      const card = item.querySelector(".drawer-item");
      if (exercise.challenge) card.classList.add("is-challenge");
      card.addEventListener("click", () => openDetail(exercise));
      return item;
    });
    section.querySelector(".library-section-items").replaceChildren(...items);
    return section;
  });
  listEl.replaceChildren(...sections);

  function openDetail(exercise) {
    const sheet = openSheet("tpl-exercise-detail");
    sheet.el.querySelector(".close-btn").addEventListener("click", () => sheet.close());
    sheet.el.querySelector(".exercise-detail-name").textContent = exercise.name;
    const meta = exercise.type === "timer" ? `${exercise.amount} second hold` : `${exercise.amount} reps`;
    sheet.el.querySelector(".exercise-detail-meta").textContent = `${meta} · ${exercise.difficulty}`;
    sheet.el.querySelector(".exercise-detail-desc").textContent = exercise.description;
  }
}
