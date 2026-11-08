// Draws an adventure as a little map: a winding road from start to goal with
// one dot per day, a landmark for every story chapter, and the themed
// avatar standing wherever you've got to. Everything is plain SVG built in
// code, so it needs no image files and works offline like the rest of the app.
//
// Only fixed markup is ever assigned as HTML here; anything that comes from
// an adventure file (place names and the like) goes in through textContent.

import { renderMascot } from "./mascot.js";

const NS = "http://www.w3.org/2000/svg";
const W = 320;
const H = 470;

// One winding road, bottom (start) to top (goal), used by every theme.
const ROAD =
  "M 52 440 C 52 402, 266 414, 266 372 C 266 332, 54 344, 54 302 C 54 262, 266 274, 266 232 " +
  "C 266 192, 54 204, 54 162 C 54 122, 258 134, 258 94 C 258 62, 196 52, 160 46";

const SCENES = {
  fantasy: {
    sky: ["#7dd3fc", "#d9f99d"],
    roadEdge: "#92400e",
    roadFill: "#fde68a",
    dotDone: "#16a34a",
    dotTodo: "#fffbeb",
    label: "#14532d",
    halo: "#ecfccb",
    start: "🏡",
  },
  space: {
    sky: ["#0b1026", "#3b0764"],
    roadEdge: "#312e81",
    roadFill: "#4f46e5",
    dotDone: "#fbbf24",
    dotTodo: "#a5b4fc",
    label: "#e0e7ff",
    halo: "#0b1026",
    start: "🌍",
  },
  historical: {
    sky: ["#f7e6bf", "#e2c48a"],
    roadEdge: "#7c2d12",
    roadFill: null,
    dotDone: "#b91c1c",
    dotTodo: "#fff7e0",
    label: "#3b2a14",
    halo: "#f7e6bf",
    start: "🏺",
  },
};

// Small deterministic generator so a map looks the same every time it's drawn.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tree(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="0" width="4" height="8" fill="#78350f"/><polygon points="0,-22 -11,2 11,2" fill="#15803d"/><polygon points="0,-30 -8,-10 8,-10" fill="#16a34a"/></g>`;
}

function decorFantasy() {
  return `
    <ellipse cx="60" cy="40" rx="30" ry="9" fill="#fff" opacity=".75"/><ellipse cx="82" cy="34" rx="20" ry="8" fill="#fff" opacity=".75"/>
    <ellipse cx="250" cy="70" rx="26" ry="8" fill="#fff" opacity=".6"/>
    <polygon points="0,150 40,70 80,150" fill="#94a3b8"/><polygon points="40,70 31,92 40,86 49,92" fill="#f8fafc"/>
    <polygon points="30,150 86,56 142,150" fill="#a8b2c1"/><polygon points="86,56 74,84 86,77 98,84" fill="#f8fafc"/>
    <path d="M0 470 L0 380 Q90 330 170 370 T320 350 L320 470 Z" fill="#86efac" opacity=".85"/>
    <path d="M0 470 L0 420 Q110 385 200 415 T320 400 L320 470 Z" fill="#4ade80" opacity=".9"/>
    ${tree(28, 250, 1)}${tree(292, 300, 1.1)}${tree(300, 130, .9)}${tree(20, 210, .8)}${tree(160, 330, .9)}${tree(160, 150, 1)}${tree(205, 140, .8)}${tree(112, 238, .9)}${tree(210, 412, .8)}`;
}

function decorSpace() {
  const rand = seeded(7);
  let stars = "";
  for (let i = 0; i < 70; i++) {
    const r = rand() < 0.12 ? 1.6 : 0.9;
    stars += `<circle cx="${(rand() * W).toFixed(1)}" cy="${(rand() * H).toFixed(1)}" r="${r}" fill="#fff" opacity="${(0.4 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return `
    <defs>
      <radialGradient id="pl1" cx=".35" cy=".3"><stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#b91c1c"/></radialGradient>
      <radialGradient id="pl2" cx=".35" cy=".3"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient>
    </defs>
    ${stars}
    <circle cx="300" cy="400" r="46" fill="url(#pl1)" opacity=".9"/><circle cx="286" cy="390" r="8" fill="#7f1d1d" opacity=".35"/>
    <g transform="rotate(-20 40 120)"><circle cx="40" cy="120" r="22" fill="url(#pl2)"/><ellipse cx="40" cy="120" rx="40" ry="8" fill="none" stroke="#fde68a" stroke-width="3" opacity=".8"/></g>
    <circle cx="272" cy="150" r="10" fill="#cbd5e1"/><circle cx="268" cy="147" r="3" fill="#94a3b8"/>
    <path d="M300 30 L240 62" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/><circle cx="302" cy="29" r="3" fill="#fff"/>`;
}

function decorHistorical() {
  return `
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="#7c2d12" stroke-width="2" opacity=".55" rx="6"/>
    <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="#7c2d12" stroke-width="1" opacity=".4" rx="4"/>
    <g opacity=".5" fill="none" stroke="#1e6091" stroke-width="2" stroke-linecap="round">
      <path d="M24 120 q6 -6 12 0 t12 0 t12 0"/><path d="M262 420 q6 -6 12 0 t12 0 t12 0"/><path d="M20 300 q6 -6 12 0 t12 0"/><path d="M250 190 q6 -6 12 0 t12 0 t12 0"/><path d="M110 430 q6 -6 12 0 t12 0 t12 0"/>
    </g>
    <g opacity=".55" fill="#92400e"><polygon points="150,300 168,268 186,300"/><polygon points="176,300 196,258 216,300"/><polygon points="120,120 138,92 156,120"/></g>
    <g transform="translate(50 86)" opacity=".7">
      <circle r="22" fill="none" stroke="#7c2d12" stroke-width="1.5"/>
      <polygon points="0,-22 5,-5 22,0 5,5 0,22 -5,5 -22,0 -5,-5" fill="#b91c1c"/>
      <text y="-26" text-anchor="middle" font-size="9" font-weight="700" fill="#7c2d12">N</text>
    </g>
    <text x="298" y="456" text-anchor="end" font-size="9" fill="#7c2d12" opacity=".6" font-style="italic">here be adventure</text>`;
}

const DECOR = { fantasy: decorFantasy, space: decorSpace, historical: decorHistorical };

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

// `steps` is how many days of the adventure are done. Returns nothing: the
// map is drawn straight into `container`.
export function renderAdventureMap(container, adventure, steps, { outfit = adventure.theme } = {}) {
  const scene = SCENES[adventure.theme] || SCENES.fantasy;
  const total = adventure.days;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "adventure-map-svg", role: "img", "aria-label": `Map of ${adventure.title}` });

  const gradId = `sky-${adventure.theme}`;
  const defs = el("defs");
  const grad = el("linearGradient", { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(el("stop", { offset: 0, "stop-color": scene.sky[0] }), el("stop", { offset: 1, "stop-color": scene.sky[1] }));
  defs.append(grad);
  svg.append(defs, el("rect", { width: W, height: H, fill: `url(#${gradId})` }));

  const decor = el("g");
  decor.innerHTML = (DECOR[adventure.theme] || decorFantasy)();
  svg.append(decor);

  // Road. Historical maps use a dotted explorer's route instead of a path.
  const roadBase = el("path", { d: ROAD, fill: "none", stroke: scene.roadEdge, "stroke-width": scene.roadFill ? 20 : 4, "stroke-linecap": "round" });
  if (!scene.roadFill) roadBase.setAttribute("stroke-dasharray", "1 9");
  svg.append(roadBase);
  if (scene.roadFill) svg.append(el("path", { d: ROAD, fill: "none", stroke: scene.roadFill, "stroke-width": 14, "stroke-linecap": "round" }));

  const route = el("path", { d: ROAD, fill: "none", stroke: scene.dotDone, "stroke-width": 5, "stroke-linecap": "round" });
  svg.append(route);
  container.replaceChildren(svg);

  // Positions are read off the real path, so dots sit exactly on the road.
  const length = route.getTotalLength();
  const at = (day) => route.getPointAtLength((day / total) * length);
  route.setAttribute("stroke-dasharray", `${((steps / total) * length).toFixed(1)} ${length.toFixed(1)}`);
  if (steps <= 0) route.setAttribute("stroke-opacity", "0");

  const chapterDays = new Set(adventure.chapters.map((c) => c.day));
  for (let day = 1; day < total; day++) {
    if (chapterDays.has(day)) continue;
    const p = at(day);
    svg.append(
      el("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3.4, fill: day <= steps ? scene.dotDone : scene.dotTodo, stroke: scene.roadEdge, "stroke-width": 1.2 })
    );
  }

  const start = at(0);
  svg.append(el("circle", { cx: start.x, cy: start.y, r: 15, fill: scene.dotTodo, stroke: scene.roadEdge, "stroke-width": 2 }));
  svg.append(el("text", { x: start.x, y: start.y + 6, "text-anchor": "middle", "font-size": 18 }, scene.start));

  for (const chapter of adventure.chapters) {
    const p = at(chapter.day);
    const reached = chapter.day <= steps;
    const isGoal = chapter.day === total;
    const g = el("g", { class: `adventure-landmark${reached ? " is-reached" : ""}${isGoal ? " is-goal" : ""}` });
    g.append(
      el("circle", {
        cx: p.x,
        cy: p.y,
        r: isGoal ? 20 : 16,
        fill: reached ? "#fde047" : scene.dotTodo,
        stroke: reached ? "#a16207" : scene.roadEdge,
        "stroke-width": isGoal ? 3 : 2,
        opacity: reached || isGoal ? 1 : 0.8,
      })
    );
    g.append(el("text", { x: p.x, y: p.y + (isGoal ? 8 : 6), "text-anchor": "middle", "font-size": isGoal ? 22 : 18, opacity: reached || isGoal ? 1 : 0.55 }, chapter.icon));

    const onRight = p.x < W / 2;
    const label = el(
      "text",
      {
        x: onRight ? p.x + (isGoal ? 25 : 21) : p.x - (isGoal ? 25 : 21),
        y: p.y + 3.5,
        "text-anchor": onRight ? "start" : "end",
        "font-size": 10,
        "font-weight": 700,
        fill: scene.label,
        stroke: scene.halo,
        "stroke-width": 3,
        "paint-order": "stroke",
        "stroke-linejoin": "round",
      },
      reached || isGoal ? chapter.place : `Day ${chapter.day}`
    );
    g.append(label);
    svg.append(g);
  }

  // The avatar stands at today's position, as an overlay so it can use the
  // same animated mascot as the rest of the app.
  const here = at(Math.min(steps, total));
  const avatar = document.createElement("div");
  avatar.className = "adventure-avatar";
  avatar.style.left = `${(here.x / W) * 100}%`;
  avatar.style.top = `${(here.y / H) * 100}%`;
  const slot = document.createElement("div");
  avatar.append(slot);
  container.append(avatar);
  renderMascot(slot, { mood: steps >= total ? "cheer" : "idle", size: 34, outfit });
}
