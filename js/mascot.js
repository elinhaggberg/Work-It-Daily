// A small pixel-art mascot rigged as separate SVG groups (body, left arm,
// right arm) so CSS keyframes can animate real limb movement — idle bob,
// cheer (arms up + jump), dance (arm swing + sway) — from one drawing
// instead of swapping between hand-drawn animation frames.

const MASCOT_SVG = `
<svg class="mascot-svg" width="100" height="130" viewBox="0 0 100 130" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
  <g class="mascot-arm-left">
    <rect x="18" y="46" width="10" height="20" class="mascot-limb" />
    <rect x="16" y="64" width="10" height="12" class="mascot-hand" />
  </g>
  <g class="mascot-arm-right">
    <rect x="72" y="46" width="10" height="20" class="mascot-limb" />
    <rect x="74" y="64" width="10" height="12" class="mascot-hand" />
  </g>
  <g class="mascot-body">
    <rect x="30" y="4" width="40" height="34" class="mascot-fill" />
    <rect x="40" y="18" width="6" height="7" class="mascot-eye" />
    <rect x="54" y="18" width="6" height="7" class="mascot-eye" />
    <rect x="32" y="40" width="36" height="38" class="mascot-fill" />
    <rect x="34" y="80" width="12" height="26" class="mascot-fill" />
    <rect x="54" y="80" width="12" height="26" class="mascot-fill" />
    <rect x="34" y="106" width="12" height="9" class="mascot-hand" />
    <rect x="54" y="106" width="12" height="9" class="mascot-hand" />
  </g>
</svg>`;

export function renderMascot(container, { mood = "idle", size = 96 } = {}) {
  const wrap = document.createElement("div");
  wrap.className = `mascot-wrap mood-${mood}`;
  wrap.style.width = `${size}px`;
  wrap.innerHTML = MASCOT_SVG;
  container.replaceChildren(wrap);
  return {
    el: wrap,
    setMood(next) {
      wrap.className = `mascot-wrap mood-${next}`;
    },
  };
}
