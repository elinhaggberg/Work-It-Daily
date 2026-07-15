import { getThemePref, setThemePref } from "./storage.js";

export const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "playful", label: "Playful" },
];

export const PLAYFUL_SWATCHES = [
  { id: "meadow", label: "Meadow", accent: "#22c55e", accentText: "#ffffff" },
  { id: "lagoon", label: "Lagoon", accent: "#0ea5e9", accentText: "#ffffff" },
  { id: "mint", label: "Mint", accent: "#2dd4bf", accentText: "#0f2e2a" },
  { id: "violet", label: "Violet", accent: "#a78bfa", accentText: "#241c1c" },
  { id: "sunset", label: "Sunset", accent: "#fb923c", accentText: "#241c1c" },
];

const THEME_BG = { dark: "#0b0d0f", light: "#f6f7f9", playful: "#f2f7ee" };

const DEFAULT_PREF = { mode: "dark", playfulAccent: "meadow" };

export function getTheme() {
  return { ...DEFAULT_PREF, ...getThemePref() };
}

export function setTheme(pref) {
  setThemePref(pref);
  applyTheme();
}

export function applyTheme() {
  const pref = getTheme();
  const root = document.documentElement;
  root.dataset.theme = pref.mode;

  if (pref.mode === "playful") {
    const swatch = PLAYFUL_SWATCHES.find((s) => s.id === pref.playfulAccent) || PLAYFUL_SWATCHES[0];
    root.style.setProperty("--accent", swatch.accent);
    root.style.setProperty("--accent-text", swatch.accentText);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-text");
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", THEME_BG[pref.mode] || THEME_BG.dark);
}
