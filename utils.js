// ===== SHARED UTILITIES =====

export const typeColors = {
  "God":     "#4fc3f7",
  "Goddess": "#4fc3f7",
  "Hero":    "#a5d6a7",
  "Demigod": "#a5d6a7",
  "Titan":   "#ef9a9a",
  "Monster": "#ffcc80",
  "Mortal":  "#ce93d8",
  "Other":   "#b0bec5",
  "":        "#b0bec5"
};

export function typeEmoji(t) {
  return {
    "God":     "⚡",
    "Goddess": "🌟",
    "Titan":   "🗿",
    "Hero":    "🛡️",
    "Monster": "🐉",
    "Mortal":  "🧑",
    "Demigod": "✨",
    "Other":   "📜"
  }[t] || "📜";
}

// "Thetis, Peleus" → ["Thetis", "Peleus"]
export function parseList(str) {
  return (str || "").split(",").map(s => s.trim()).filter(Boolean);
}

// "Patroclus: they were roommates, Hector" → [{name, note}, ...]
export function parseComplicated(str) {
  if (!str) return [];
  return str.split(",").map(s => {
    const [name, ...rest] = s.split(":");
    return { name: name.trim(), note: rest.join(":").trim() };
  }).filter(x => x.name);
}

// [{name, note}, ...] → "Patroclus: they were roommates, Hector"
export function serializeComplicated(arr) {
  return arr.map(x => x.note ? `${x.name}: ${x.note}` : x.name).join(", ");
}
