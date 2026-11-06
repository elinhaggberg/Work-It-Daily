// Adventures: an optional story layer on top of the normal streak. Pick a
// length (7, 14 or 30 days) and a theme; every completed (or rescued) day
// takes you one step further along the route, with a short story snippet at
// each landmark and a unique badge for reaching the end.
//
// Progress itself is derived from the completions list (see storage.js), so
// nothing here knows about dates -- this file is just the content, plus the
// validation for adventures a person writes themselves or has an AI write.

export const THEMES = [
  { id: "fantasy", label: "Fantasy", icon: "🐉", blurb: "Dragons, castles and old magic" },
  { id: "space", label: "Space", icon: "🚀", blurb: "Moons, planets and the dark between" },
  { id: "historical", label: "Historical", icon: "🏛️", blurb: "Real journeys from the history books" },
];

export const ADVENTURE_LENGTHS = [7, 14, 30];

export const ADVENTURE_FORMAT = "work-it-daily-adventure";

// Each chapter is a landmark: reaching its `day` reveals its story snippet.
// The last chapter always sits on the final day and is the finale.
export const BUILT_IN_ADVENTURES = [
  // ---- Fantasy ----
  {
    id: "fantasy-7",
    theme: "fantasy",
    days: 7,
    title: "The Dragon's Pass",
    tagline: "Cross the mountains and face the dragon of Emberpeak.",
    intro:
      "The village bells ring: Emberpeak's dragon has woken, and only a traveler brave enough to cross the Ashen Pass can stop it. You shoulder your pack and take the first step.",
    chapters: [
      { day: 2, icon: "🌲", place: "Whispering Woods", text: "Wolves shadowed you through the Whispering Woods, but your steady pace carried you out the far side before dusk." },
      { day: 4, icon: "🌉", place: "Troll Bridge", text: "A troll demanded a toll at the old stone bridge. You answered his riddle in one breath and he waved you through, grumbling." },
      { day: 6, icon: "🏔️", place: "Foot of Emberpeak", text: "Smoke curled over the ridge. You made camp beneath the peak and slept lightly, boots on, sword close." },
      { day: 7, icon: "🐉", place: "The Dragon's Lair", text: "The dragon roared and the cavern shook, but you stood your ground and it blinked first. You overcame the fire-breathing dragon, and the valley is safe." },
    ],
    badge: { icon: "🐉", label: "Dragonbane", desc: "Faced the dragon of Emberpeak in 7 days." },
  },
  {
    id: "fantasy-14",
    theme: "fantasy",
    days: 14,
    title: "The Crystal Crown",
    tagline: "Reclaim the lost crown from the Sunken Castle.",
    intro:
      "The kingdom's Crystal Crown was swallowed by the Sunken Castle, and the land grows dim without it. The queen's envoy hands you a map and an empty lantern. Fourteen days, no more.",
    chapters: [
      { day: 3, icon: "🧙", place: "The Hermit's Hut", text: "An old hermit filled your lantern with starlight in exchange for a promise, and a very good soup." },
      { day: 6, icon: "🌿", place: "Thornwood Maze", text: "The thorns shifted to confuse you. You followed the lantern's steady glow and never took the same wrong turn twice." },
      { day: 9, icon: "🏰", place: "The Sunken Gates", text: "The castle rose from the marsh, green with moss. You waded through icy water and pushed the great doors open." },
      { day: 12, icon: "🗡️", place: "Hall of Echoes", text: "Stone knights lined the hall. One by one they bowed as you passed. The lantern had told them whose side you were on." },
      { day: 14, icon: "👑", place: "The Crystal Crown", text: "The crown blazed in your hands and the whole castle lit up like dawn. You carried it home, and the kingdom was bright again." },
    ],
    badge: { icon: "👑", label: "Crown Bearer", desc: "Recovered the Crystal Crown in 14 days." },
  },
  {
    id: "fantasy-30",
    theme: "fantasy",
    days: 30,
    title: "The Last Dawn",
    tagline: "Light five beacons before the long night falls.",
    intro:
      "The sun is failing. The old tales say five beacons, lit in order across the realm, will call the dawn back. You are the last beacon-keeper. Thirty days, five fires, one sunrise.",
    chapters: [
      { day: 5, icon: "🔥", place: "The First Beacon", text: "The first beacon caught on the third spark. Its flame climbed high, a small stubborn sunrise on the hill." },
      { day: 10, icon: "🌊", place: "Mistmere Crossing", text: "A faceless ferryman rowed you across the Mistmere. He asked for no coin, only that you keep the beacons burning." },
      { day: 15, icon: "🧊", place: "The Frozen Stair", text: "Ten thousand steps of ice. You counted every one, and at the top the third flame leapt up to meet you." },
      { day: 20, icon: "🌲", place: "Shadowfen Forest", text: "The trees whispered your name in a dozen voices. You kept walking, and the fourth beacon lit the dark like a promise." },
      { day: 25, icon: "🐲", place: "Cinder Hollow", text: "The last beacon sat in a dragon's den. The old beast knew the flame was kin and lowered its head to let you pass." },
      { day: 30, icon: "🌅", place: "The Last Dawn", text: "All five fires burned as one, and the sky cracked open with gold. You called the sun back, and the whole realm woke to morning." },
    ],
    badge: { icon: "🌅", label: "Dawnbringer", desc: "Lit all five beacons and called back the sun in 30 days." },
  },

  // ---- Space ----
  {
    id: "space-7",
    theme: "space",
    days: 7,
    title: "Mission: Moonbase",
    tagline: "Launch, land and switch on the first base on the Moon.",
    intro:
      "Mission control: all systems go. You are strapped into the capsule and the engines are humming. Seven days to reach the Moon and open Moonbase Alpha.",
    chapters: [
      { day: 2, icon: "🚀", place: "Liftoff", text: "Three, two, one. The engines roared and Earth fell away. You reached orbit with steady hands and a calm heart." },
      { day: 4, icon: "🛰️", place: "Orbital Docking", text: "You docked with the station on the first try. Mission control cheered so loudly you heard it through the static." },
      { day: 6, icon: "🌑", place: "Lunar Approach", text: "The Moon filled the window, gray and silent. You fired the landing thrusters and drifted down into the dust." },
      { day: 7, icon: "🏠", place: "Moonbase Alpha", text: "Your boot touched the lunar surface. You flipped the switch on Moonbase Alpha, the first light ever to shine on the Moon." },
    ],
    badge: { icon: "🌕", label: "Moonwalker", desc: "Opened Moonbase Alpha in 7 days." },
  },
  {
    id: "space-14",
    theme: "space",
    days: 14,
    title: "The Mars Run",
    tagline: "Cross the void and plant a flag on Mars.",
    intro:
      "Fuel loaded, crew asleep, except you. The Red Planet is fourteen days of hard burn away. You take the pilot's seat and set your course.",
    chapters: [
      { day: 3, icon: "☄️", place: "The Asteroid Field", text: "Rocks the size of cities tumbled past the window. You threaded the needle and never touched the brakes." },
      { day: 6, icon: "🔧", place: "Spacewalk Repair", text: "A micrometeor clipped the antenna. You floated out with a wrench and a lot of patience, and the signal came back." },
      { day: 9, icon: "📡", place: "The Silent Signal", text: "A mysterious beep echoed from deep space. You never found its source, but you answered it anyway." },
      { day: 12, icon: "🔴", place: "Mars Orbit", text: "Rust-red canyons rolled beneath you. The descent capsule shook like a tin can, and you held on." },
      { day: 14, icon: "🚩", place: "Olympus Landing", text: "You planted a flag at the foot of Olympus Mons, the tallest mountain in the solar system. Humanity has a new neighbor." },
    ],
    badge: { icon: "🔴", label: "Red Planet Pioneer", desc: "Landed on Mars in 14 days." },
  },
  {
    id: "space-30",
    theme: "space",
    days: 30,
    title: "Beyond the Rings",
    tagline: "Follow the planets all the way to the edge of the Sun's reach.",
    intro:
      "No one has gone this far. Your ship, the Meridian, has fuel for one trip out and no way back. Thirty days past every planet, to where the Sun is just another star.",
    chapters: [
      { day: 5, icon: "🪐", place: "Jupiter's Storm", text: "The Great Red Spot rolled by like a wall of fire. You rode the gravity around it and came out faster than you went in." },
      { day: 10, icon: "🧊", place: "Europa's Ice", text: "Beneath the cracked ice of Europa, something glowed. You logged it, smiled, and kept going." },
      { day: 15, icon: "💍", place: "The Rings of Saturn", text: "You glided through the rings, ice and dust glittering like a billion tiny stars. For a moment the ship was silent." },
      { day: 20, icon: "🌀", place: "Neptune's Winds", text: "Supersonic winds howled around the ship. You trimmed the sails of the solar panels and rode out the storm." },
      { day: 25, icon: "☄️", place: "The Kuiper Belt", text: "Frozen worlds drifted in the dark, each older than anything on Earth. You said hello to every single one." },
      { day: 30, icon: "✨", place: "The Edge of the Sun", text: "You crossed the heliopause. Behind you, the Sun was a bright star among many. You are further out than anyone has ever been." },
    ],
    badge: { icon: "🌌", label: "Edge Explorer", desc: "Reached the edge of the solar system in 30 days." },
  },

  // ---- Historical ----
  {
    id: "historical-7",
    theme: "historical",
    days: 7,
    title: "Race to Olympia",
    tagline: "Run from Athens to the very first Olympic Games.",
    intro:
      "776 BC. The first Olympic Games open in seven days, and your city needs a runner to carry its name to Olympia. You tighten your sandals and set off down the sacred road.",
    chapters: [
      { day: 2, icon: "🏛️", place: "The Sacred Road", text: "Pilgrims and merchants shared the dusty road with you. A shepherd offered figs and a blessing, and you took both." },
      { day: 4, icon: "⛰️", place: "The Isthmus", text: "You crossed the narrow land between two seas with salt wind in your face. Every step felt like the whole of Greece was watching." },
      { day: 6, icon: "🔥", place: "The Olympic Flame", text: "At the temple of Zeus the sacred flame was lit. A priest placed the torch in your hand and told you to run the last mile." },
      { day: 7, icon: "🏅", place: "The Stadium", text: "You burst into the stadium and the crowd rose as one. You crossed the line first, and a wreath of olive leaves was placed on your head." },
    ],
    badge: { icon: "🏅", label: "Laurel Runner", desc: "Reached Olympia in time for the first Games, in 7 days." },
  },
  {
    id: "historical-14",
    theme: "historical",
    days: 14,
    title: "The Silk Road",
    tagline: "Lead a caravan from Chang'an to the markets of Samarkand.",
    intro:
      "Chang'an, 700 AD. A caravan of silk, spices and tea is waiting for a guide who can lead it west across the world. Fourteen days to Samarkand, and the desert does not forgive mistakes.",
    chapters: [
      { day: 3, icon: "🏜️", place: "Edge of the Desert", text: "The last green field disappeared behind you. Ahead lay a sea of sand, and you walked into it with a steady pace." },
      { day: 6, icon: "🐪", place: "The Camel Caravan", text: "Forty camels, twelve merchants and one very opinionated cook. By nightfall you had them singing around the fire." },
      { day: 9, icon: "🏯", place: "Dunhuang Oasis", text: "Water at last. Under the painted caves of the oasis you traded silk for fresh supplies and a map of the mountains ahead." },
      { day: 12, icon: "⛰️", place: "The Pamir Pass", text: "Snow stung your eyes on the roof of the world. You tied the camels in a line and crossed one careful step at a time." },
      { day: 14, icon: "🕌", place: "Samarkand", text: "Blue domes rose over the city and the market rang with a hundred languages. Your caravan arrived without losing a single bolt of silk." },
    ],
    badge: { icon: "🐪", label: "Silk Road Trader", desc: "Guided a caravan to Samarkand in 14 days." },
  },
  {
    id: "historical-30",
    theme: "historical",
    days: 30,
    title: "Viking Voyage",
    tagline: "Sail west across the North Atlantic to the land beyond the horizon.",
    intro:
      "Norway, the year 985. Your longship is loaded and the new sail is tight. West lies Iceland, then Greenland, and rumors of a green land beyond. Thirty days across a cold and hungry sea.",
    chapters: [
      { day: 5, icon: "🌊", place: "The North Sea", text: "Grey swells rolled under the keel. The crew bailed, laughed and rowed, and by dawn the coast of Norway was gone." },
      { day: 10, icon: "🌋", place: "Iceland", text: "Black cliffs and steaming springs rose from the water. You restocked, repaired the hull and listened to the sagas by the fire." },
      { day: 15, icon: "🧊", place: "The Greenland Ice", text: "Icebergs the size of halls drifted past. You steered between them with a calm hand, and nobody dared to speak." },
      { day: 20, icon: "🌫️", place: "The Open Atlantic", text: "Fog swallowed the ship for three days. You navigated by the sun-stone and the flight of the seabirds, and the fog finally broke." },
      { day: 25, icon: "🐋", place: "The Whale Road", text: "A pod of whales escorted the longship for a day and a night, close enough to touch. Your crew called it a good omen." },
      { day: 30, icon: "🌲", place: "Vinland", text: "Tall trees and wild grapes lined a shore no one in your village had ever seen. You stepped onto the sand. You had crossed the ocean." },
    ],
    badge: { icon: "⛵", label: "Vinland Voyager", desc: "Crossed the North Atlantic in 30 days." },
  },
];

export function getBuiltInAdventure(id) {
  return BUILT_IN_ADVENTURES.find((a) => a.id === id) || null;
}

// ---- Custom adventures: validation + template ----

const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function requireText(value, max, label) {
  const text = clean(value, max);
  if (!text) throw new Error(`"${label}" is missing.`);
  return text;
}

// Turns a parsed JSON object into a trusted adventure, or throws an Error
// whose message says what's wrong in plain words (shown to the person
// importing it). Everything is trimmed and length-capped, because these
// strings come from a file or an AI chat and end up on screen.
export function parseAdventure(data) {
  if (!data || typeof data !== "object" || data.type !== ADVENTURE_FORMAT) {
    throw new Error("That doesn't look like a Work It Daily adventure file.");
  }

  const title = requireText(data.title, 60, "title");
  const theme = THEMES.some((t) => t.id === data.theme) ? data.theme : null;
  if (!theme) throw new Error(`"theme" must be one of: ${THEMES.map((t) => t.id).join(", ")}.`);

  const days = Number(data.days);
  if (!ADVENTURE_LENGTHS.includes(days)) throw new Error(`"days" must be one of: ${ADVENTURE_LENGTHS.join(", ")}.`);

  if (!Array.isArray(data.chapters) || data.chapters.length === 0 || data.chapters.length > 8) {
    throw new Error('"chapters" needs between 1 and 8 entries.');
  }
  const chapters = data.chapters
    .map((c, i) => {
      if (!c || typeof c !== "object") throw new Error(`Chapter ${i + 1} is not an object.`);
      const day = Number(c.day);
      if (!Number.isInteger(day) || day < 1 || day > days) {
        throw new Error(`Chapter ${i + 1}: "day" must be a whole number from 1 to ${days}.`);
      }
      return {
        day,
        icon: requireText(c.icon, 8, `chapter ${i + 1} icon`),
        place: requireText(c.place, 40, `chapter ${i + 1} place`),
        text: requireText(c.text, 300, `chapter ${i + 1} text`),
      };
    })
    .sort((a, b) => a.day - b.day);

  if (new Set(chapters.map((c) => c.day)).size !== chapters.length) {
    throw new Error("Two chapters share the same day.");
  }
  if (chapters[chapters.length - 1].day !== days) {
    throw new Error(`The last chapter must be on day ${days}: that's the finale.`);
  }

  const badge = data.badge && typeof data.badge === "object" ? data.badge : {};
  return {
    title,
    theme,
    days,
    tagline: clean(data.tagline, 120),
    intro: clean(data.intro, 400),
    chapters,
    badge: {
      icon: requireText(badge.icon, 8, "badge icon"),
      label: requireText(badge.label, 40, "badge label"),
      desc: clean(badge.desc, 120) || `Completed ${title}.`,
    },
  };
}

// What gets exported when sharing a finished adventure (built-in or custom).
export function adventureToFile(adventure) {
  return {
    type: ADVENTURE_FORMAT,
    version: 1,
    title: adventure.title,
    theme: adventure.theme,
    days: adventure.days,
    tagline: adventure.tagline,
    intro: adventure.intro,
    chapters: adventure.chapters.map(({ day, icon, place, text }) => ({ day, icon, place, text })),
    badge: { ...adventure.badge },
  };
}

const AI_RULES = [
  "This file describes an adventure for the Work It Daily app: a story that moves forward one step for every day of exercise.",
  "To make your own: replace the example values below. Keep every key name exactly as it is and keep the result valid JSON.",
  "Rules: \"days\" must be 7, 14 or 30. \"theme\" must be fantasy, space or historical (it picks the map and avatar style).",
  "Give 3 to 6 chapters, each on its own \"day\" between 1 and \"days\". The LAST chapter must be on day = \"days\": it is the finale, and finishing it earns the badge.",
  "Write each chapter \"text\" in second person and past tense (\"You ...\"), 1 to 2 sentences, under 250 characters. \"icon\" is a single emoji; \"place\" is a short place name.",
  "\"intro\" is shown when the adventure starts. \"badge\" is the trophy for finishing: one emoji, a short label and a one-line description.",
  "If you are an AI assistant: reply with only the finished JSON, nothing else.",
];

// A fill-in-the-blanks file: valid as written, so it also works as an
// example, with instructions an AI (or a person) can follow.
export function buildAdventureTemplate() {
  return {
    type: ADVENTURE_FORMAT,
    version: 1,
    instructions: AI_RULES,
    title: "My Adventure",
    theme: "fantasy",
    days: 7,
    tagline: "One line that sells the adventure.",
    intro: "How the story begins, shown the moment you start.",
    chapters: [
      { day: 2, icon: "🌲", place: "First Landmark", text: "You reached the first landmark and something unexpected happened." },
      { day: 4, icon: "🌉", place: "Second Landmark", text: "A challenge blocked the way, and you found a clever way past it." },
      { day: 6, icon: "🏔️", place: "Third Landmark", text: "The goal came into sight, just one more push away." },
      { day: 7, icon: "🏆", place: "The Finale", text: "You made it. Describe the big moment here." },
    ],
    badge: { icon: "🏆", label: "Badge Name", desc: "What the badge is for." },
  };
}

// The same template as plain text to paste into an AI chat, with a request on top.
export function buildAdventurePrompt(topic = "") {
  const template = buildAdventureTemplate();
  const subject = topic ? ` about: ${topic}` : "";
  return (
    `Write a custom adventure${subject} for the Work It Daily app. Follow the rules in "instructions" and answer with only the JSON.\n\n` +
    JSON.stringify(template, null, 2)
  );
}
