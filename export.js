// ===== EXPORT MODULE =====

import { state } from "./state.js";

// ===== MODAL =====
export function showExportModal() {
  document.getElementById("exportNoteCount").textContent = state.notes.length + " notes in storage";
  document.getElementById("exportCharCount").textContent = state.allCharacters.length + " characters in Firebase";
  document.getElementById("exportModal").style.display  = "flex";
}

export function closeExportModal() {
  document.getElementById("exportModal").style.display = "none";
}

// ===== FORMAT NOTE AS OBSIDIAN MARKDOWN =====
function noteToMarkdown(note) {
  const tags = (note.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const frontmatter = [
    "---",
    `title: "${note.title || "Untitled"}"`,
    `updated: "${new Date(note.updated || Date.now()).toISOString().slice(0, 10)}"`,
    tags.length ? `tags: [${tags.map(t => '"' + t + '"').join(", ")}]` : "",
    "---"
  ].filter(Boolean).join("\n");
  return frontmatter + "\n\n" + (note.body || "");
}

// ===== FORMAT CHARACTER AS OBSIDIAN MARKDOWN =====
function characterToMarkdown(c) {
  const tags = c.tags || [];
  const frontmatter = [
    "---",
    `title: "${c.name}"`,
    `type: "${c.type || ""}"`,
    tags.length ? `tags: [${tags.map(t => '"' + t + '"').join(", ")}]` : "",
    c.image ? `image: "${c.image}"` : "",
    "---"
  ].filter(Boolean).join("\n");

  function relSection(heading, items, isComplicated = false) {
    if (!items || !items.length) return "";
    if (isComplicated)
      return `\n## ${heading}\n` + items.map(x =>
        `- [[${x.name}]]${x.note ? " — *" + x.note + "*" : ""}`
      ).join("\n");
    return `\n## ${heading}\n` + items.map(n => `- [[${n}]]`).join("\n");
  }

  const body = [
    `# ${c.name}`,
    "",
    relSection("Parents",                  c.parents),
    relSection("Children",                 c.children),
    relSection("Siblings",                 c.siblings),
    relSection("Spouse / Partner",         c.spouse),
    relSection("Other Relatives",          c.relatives),
    relSection("Friends & Allies",         c.friends),
    relSection("Enemies",                  c.enemies),
    relSection("Complicated Relationships", c.complicated, true),
    c.notes ? `\n## Notes\n\n${c.notes}` : ""
  ].filter(s => s !== undefined && s !== "").join("\n");

  return frontmatter + "\n\n" + body;
}

// ===== SAFE FILENAME =====
function safeName(name) {
  return (name || "Untitled").replace(/[/\\?%*:|"<>]/g, "-").trim();
}

// ===== DOWNLOAD SINGLE .md FILE =====
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== LOAD JSZIP ON DEMAND =====
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const s  = document.createElement("script");
    s.src    = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function downloadZip(zip, filename) {
  const blob = await zip.generateAsync({ type: "blob" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== EXPORT CURRENT NOTE =====
export function exportCurrentNote() {
  if (!state.currentNoteId) { alert("Open a note first."); return; }
  const note = state.notes.find(n => n.id === state.currentNoteId);
  if (!note) return;
  downloadFile(safeName(note.title) + ".md", noteToMarkdown(note));
}

// ===== EXPORT SINGLE CHARACTER (called from character page) =====
export function exportCharacterMd(name) {
  const c = state.allCharacters.find(x => x.name === name);
  if (!c) return;
  downloadFile(safeName(c.name) + ".md", characterToMarkdown(c));
}

// ===== EXPORT ALL NOTES (individual files) =====
export function exportAllNotes() {
  if (!state.notes.length) { alert("No notes to export."); return; }
  state.notes.forEach((note, i) => {
    setTimeout(() => downloadFile(safeName(note.title) + ".md", noteToMarkdown(note)), i * 120);
  });
  closeExportModal();
}

// ===== EXPORT ALL CHARACTERS (individual files) =====
export function exportAllCharacters() {
  if (!state.allCharacters.length) { alert("No characters loaded. Visit Characters tab first."); return; }
  state.allCharacters.forEach((c, i) => {
    setTimeout(() => downloadFile(safeName(c.name) + ".md", characterToMarkdown(c)), i * 120);
  });
  closeExportModal();
}

// ===== ZIP: NOTES =====
export async function exportNoteZip() {
  if (!state.notes.length) { alert("No notes to export."); return; }
  const JSZip  = await loadJSZip();
  const zip    = new JSZip();
  const folder = zip.folder("Mythos Notes");
  state.notes.forEach(note => folder.file(safeName(note.title) + ".md", noteToMarkdown(note)));
  await downloadZip(zip, "Mythos-Notes.zip");
  closeExportModal();
}

// ===== ZIP: CHARACTERS =====
export async function exportCharZip() {
  if (!state.allCharacters.length) { alert("No characters. Visit Characters tab first."); return; }
  const JSZip  = await loadJSZip();
  const zip    = new JSZip();
  const folder = zip.folder("Mythos Characters");
  state.allCharacters.forEach(c => folder.file(safeName(c.name) + ".md", characterToMarkdown(c)));
  await downloadZip(zip, "Mythos-Characters.zip");
  closeExportModal();
}

// ===== ZIP: FULL VAULT =====
export async function exportFullVault() {
  if (!state.notes.length && !state.allCharacters.length) { alert("Nothing to export yet."); return; }
  const JSZip = await loadJSZip();
  const zip   = new JSZip();

  if (state.notes.length) {
    const nf = zip.folder("Notes");
    state.notes.forEach(note => nf.file(safeName(note.title) + ".md", noteToMarkdown(note)));
  }
  if (state.allCharacters.length) {
    const cf = zip.folder("Characters");
    state.allCharacters.forEach(c => cf.file(safeName(c.name) + ".md", characterToMarkdown(c)));
  }

  const index = [
    "# Mythos Vault Index", "",
    "## Characters",
    ...state.allCharacters.map(c => `- [[${c.name}]]`),
    "",
    "## Notes",
    ...state.notes.map(n => `- [[${n.title}]]`)
  ].join("\n");
  zip.file("_Index.md", index);

  await downloadZip(zip, "Mythos-Vault.zip");
  closeExportModal();
}

// ===== EXPOSE TO WINDOW =====
window.showExportModal    = showExportModal;
window.closeExportModal   = closeExportModal;
window.exportCurrentNote  = exportCurrentNote;
window.exportCharacterMd  = exportCharacterMd;
window.exportAllNotes     = exportAllNotes;
window.exportAllCharacters = exportAllCharacters;
window.exportNoteZip      = exportNoteZip;
window.exportCharZip      = exportCharZip;
window.exportFullVault    = exportFullVault;
