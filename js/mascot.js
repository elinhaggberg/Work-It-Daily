// A small pixel-art mascot rigged as separate SVG groups (body, left arm,
// right arm) so CSS keyframes can animate real limb movement — idle bob,
// cheer (arms up + jump), dance (arm swing + sway) — from one drawing
// instead of swapping between hand-drawn animation frames.
//
// An optional `outfit` dresses it up for an adventure theme. Pieces are
// grouped by where they sit so they move with what they're attached to:
// `behind` (capes, backpacks) and `front` (hats, helmets) ride on the body,
// `hand` (a staff) rides on the right arm. The viewBox grows upward to make
// room for hats.

const OUTFITS = {
  fantasy: {
    viewBox: "0 -28 100 158",
    behind: `<rect x="26" y="40" width="48" height="46" fill="#dc2626" /><rect x="26" y="80" width="48" height="6" fill="#b91c1c" />`,
    front: `
      <rect x="46" y="40" width="8" height="5" fill="#fde047" />
      <rect x="22" y="0" width="56" height="6" fill="#5b21b6" />
      <rect x="32" y="-8" width="36" height="8" fill="#6d28d9" />
      <rect x="37" y="-16" width="26" height="8" fill="#6d28d9" />
      <rect x="42" y="-22" width="16" height="6" fill="#6d28d9" />
      <rect x="52" y="-27" width="9" height="5" fill="#6d28d9" />
      <rect x="47" y="-6" width="6" height="6" fill="#fde047" />`,
    hand: `<rect x="78" y="34" width="4" height="62" fill="#92400e" /><rect x="74" y="26" width="12" height="9" fill="#38bdf8" /><rect x="77" y="29" width="6" height="3" fill="#e0f2fe" />`,
  },
  space: {
    viewBox: "0 -20 100 150",
    behind: `<rect x="26" y="42" width="48" height="34" fill="#cbd5e1" /><rect x="26" y="42" width="48" height="5" fill="#94a3b8" />`,
    front: `
      <rect x="47" y="-14" width="5" height="12" fill="#e2e8f0" />
      <rect x="45" y="-18" width="9" height="6" fill="#ef4444" />
      <rect x="24" y="-2" width="52" height="6" fill="#e2e8f0" />
      <rect x="24" y="4" width="7" height="34" fill="#e2e8f0" />
      <rect x="69" y="4" width="7" height="34" fill="#e2e8f0" />
      <rect x="24" y="38" width="52" height="7" fill="#94a3b8" />
      <rect x="56" y="8" width="7" height="4" fill="#ffffff" opacity="0.7" />
      <rect x="40" y="50" width="20" height="12" fill="#1e293b" />
      <rect x="43" y="53" width="5" height="5" fill="#22c55e" />
      <rect x="52" y="53" width="5" height="5" fill="#f97316" />`,
    hand: "",
  },
  historical: {
    viewBox: "0 -16 100 146",
    behind: "",
    front: `
      <rect x="20" y="0" width="60" height="6" fill="#92400e" />
      <rect x="31" y="-12" width="38" height="12" fill="#b45309" />
      <rect x="31" y="-4" width="38" height="4" fill="#7c2d12" />
      <rect x="31" y="38" width="38" height="7" fill="#dc2626" />
      <rect x="56" y="45" width="9" height="20" fill="#dc2626" />
      <rect x="33" y="47" width="6" height="6" fill="#92400e" />
      <rect x="39" y="53" width="6" height="6" fill="#92400e" />
      <rect x="45" y="59" width="6" height="6" fill="#92400e" />
      <rect x="51" y="65" width="6" height="6" fill="#92400e" />
      <rect x="55" y="68" width="16" height="13" fill="#b45309" />
      <rect x="55" y="68" width="16" height="4" fill="#92400e" />`,
    hand: "",
  },
};

function mascotSvg(outfit) {
  const o = OUTFITS[outfit];
  const viewBox = o ? o.viewBox : "0 0 100 130";
  const height = o ? 130 - Number(o.viewBox.split(" ")[1]) : 130;
  return `
<svg class="mascot-svg" width="100" height="${height}" viewBox="${viewBox}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
  <g class="mascot-arm-left">
    <rect x="18" y="46" width="10" height="20" class="mascot-limb" />
    <rect x="16" y="64" width="10" height="12" class="mascot-hand" />
  </g>
  <g class="mascot-arm-right">
    <rect x="72" y="46" width="10" height="20" class="mascot-limb" />
    <rect x="74" y="64" width="10" height="12" class="mascot-hand" />
    ${o ? o.hand : ""}
  </g>
  <g class="mascot-body">
    ${o ? o.behind : ""}
    <rect x="30" y="4" width="40" height="34" class="mascot-fill" />
    <rect x="40" y="18" width="6" height="7" class="mascot-eye" />
    <rect x="54" y="18" width="6" height="7" class="mascot-eye" />
    <rect x="32" y="40" width="36" height="38" class="mascot-fill" />
    <rect x="34" y="80" width="12" height="26" class="mascot-fill" />
    <rect x="54" y="80" width="12" height="26" class="mascot-fill" />
    <rect x="34" y="106" width="12" height="9" class="mascot-hand" />
    <rect x="54" y="106" width="12" height="9" class="mascot-hand" />
    ${o ? o.front : ""}
  </g>
</svg>`;
}

export function renderMascot(container, { mood = "idle", size = 96, outfit = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = `mascot-wrap mood-${mood}`;
  wrap.style.width = `${size}px`;
  wrap.innerHTML = mascotSvg(outfit);
  container.replaceChildren(wrap);
  return {
    el: wrap,
    setMood(next) {
      wrap.className = `mascot-wrap mood-${next}`;
    },
  };
}
