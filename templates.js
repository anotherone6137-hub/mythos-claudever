// ===== TEMPLATES MODULE =====

import { state } from "./state.js";
import { saveNotesToStorage, autoSaveNote } from "./notes.js";

// ===== DEFAULT BUILT-IN TYPES =====
const DEFAULT_NOTE_TYPES = [
  // Human Nature
  { id:"t_anger", emoji:"🔴", name:"Anger & Conflict Resolution", category:"Human Nature", tag:"theme/anger", obsidianLink:"Anger and Conflict Resolution",
    template:`# 🔴 Anger & Conflict Resolution\n\n**Tags:** #theme/anger\n**Related:** [[Achilles]] [[Hector]]\n\n---\n\n## Core Idea\n\n\n## Key Examples from the Text\n- \n\n## Quotes\n> \n\n## Analysis\n\n\n## Links to Other Themes\n- [[Mortality and Meaning]]\n- [[Justice Revenge and Forgiveness]]\n` },
  { id:"t_mortality", emoji:"⚰️", name:"Mortality & Meaning", category:"Human Nature", tag:"theme/mortality", obsidianLink:"Mortality and Meaning",
    template:`# ⚰️ Mortality & Meaning\n\n**Tags:** #theme/mortality\n\n---\n\n## Core Idea\n\n\n## Key Characters\n- [[Achilles]] — \n- [[Odysseus]] — \n\n## Key Moments\n\n\n## Analysis\n\n` },
  { id:"t_grief", emoji:"😢", name:"Grief & Loss", category:"Human Nature", tag:"theme/grief", obsidianLink:"Grief and Loss",
    template:`# 😢 Grief & Loss\n\n**Tags:** #theme/grief\n\n---\n\n## Core Idea\n\n\n## Key Examples\n- \n\n## Quotes\n> \n\n## Analysis\n\n` },
  { id:"t_cunning", emoji:"🧠", name:"Cunning vs Strength", category:"Human Nature", tag:"theme/cunning", obsidianLink:"Cunning vs Strength",
    template:`# 🧠 Cunning vs Strength\n\n**Tags:** #theme/cunning\n\n---\n\n## Core Tension\n\n\n## Achilles (Strength)\n- \n\n## Odysseus (Cunning)\n- \n\n## Analysis\n\n` },
  { id:"t_transform", emoji:"🐷", name:"Transformation & Monstrosity", category:"Human Nature", tag:"theme/transformation", obsidianLink:"Transformation and Monstrosity",
    template:`# 🐷 Transformation & Monstrosity\n\n**Tags:** #theme/transformation\n\n---\n\n## Core Idea\n\n\n## Key Examples\n- [[Circe]] — \n- \n\n## What Does It Symbolise?\n\n` },
  // Society & Power
  { id:"t_leadership", emoji:"👑", name:"Leadership & Decision-Making", category:"Society & Power", tag:"theme/leadership", obsidianLink:"Leadership and Decision-Making",
    template:`# 👑 Leadership & Decision-Making\n\n**Tags:** #theme/leadership\n\n---\n\n## Core Idea\n\n\n## Agamemnon vs Achilles\n- \n\n## Key Decisions & Consequences\n- \n\n## Analysis\n\n` },
  { id:"t_gender", emoji:"♀️", name:"Gender, Power & Agency", category:"Society & Power", tag:"theme/gender", obsidianLink:"Gender Power and Agency",
    template:`# ♀️ Gender, Power & Agency\n\n**Tags:** #theme/gender\n\n---\n\n## Core Idea\n\n\n## Female Characters\n- [[Helen]] — \n- [[Penelope]] — \n- [[Andromache]] — \n\n## Analysis\n\n` },
  { id:"t_hospitality", emoji:"🏛️", name:"Hospitality, Community & Stranger", category:"Society & Power", tag:"theme/hospitality", obsidianLink:"Hospitality Community and Stranger",
    template:`# 🏛️ Hospitality (Xenia)\n\n**Tags:** #theme/hospitality\n\n---\n\n## What is Xenia?\n\n\n## Examples of Xenia Honoured\n- \n\n## Examples of Xenia Violated\n- \n\n## Consequences\n\n` },
  { id:"t_time", emoji:"⏳", name:"Time, Patience & Speed", category:"Society & Power", tag:"theme/time", obsidianLink:"Time Patience and Speed",
    template:`# ⏳ Time, Patience & Speed\n\n**Tags:** #theme/time\n\n---\n\n## Core Idea\n\n\n## Odysseus (Patience)\n- \n\n## Achilles (Urgency)\n- \n\n## Analysis\n\n` },
  // War & Violence
  { id:"t_war", emoji:"⚔️", name:"War, Trauma & PTSD", category:"War & Violence", tag:"theme/war", obsidianLink:"War Trauma and PTSD",
    template:`# ⚔️ War, Trauma & PTSD\n\n**Tags:** #theme/war\n\n---\n\n## Core Idea\n\n\n## Modern Lens (PTSD)\n- \n\n## Key Moments\n- \n\n## Quotes\n> \n\n## Analysis\n\n` },
  // Identity & Relationships
  { id:"t_identity", emoji:"🏠", name:"Identity & Homecoming", category:"Identity & Relationships", tag:"theme/identity", obsidianLink:"Identity and Homecoming",
    template:`# 🏠 Identity & Homecoming\n\n**Tags:** #theme/identity\n\n---\n\n## Core Idea\n\n\n## Odysseus's Journey Home\n- \n\n## What Is Lost / Regained?\n- \n\n## Analysis\n\n` },
  { id:"t_loyalty", emoji:"💔", name:"Loyalty, Betrayal & Trust", category:"Identity & Relationships", tag:"theme/loyalty", obsidianLink:"Loyalty Betrayal and Trust",
    template:`# 💔 Loyalty, Betrayal & Trust\n\n**Tags:** #theme/loyalty\n\n---\n\n## Core Idea\n\n\n## Examples of Loyalty\n- [[Patroclus]] — \n- [[Penelope]] — \n\n## Examples of Betrayal\n- \n\n## Analysis\n\n` },
  { id:"t_storytelling", emoji:"📖", name:"Storytelling, Memory & Truth", category:"Identity & Relationships", tag:"theme/storytelling", obsidianLink:"Storytelling Memory and Truth",
    template:`# 📖 Storytelling, Memory & Truth\n\n**Tags:** #theme/storytelling\n\n---\n\n## Core Idea\n\n\n## How Is Memory Used?\n- \n\n## Unreliable Narrators / Distortions\n- \n\n## Analysis\n\n` },
  { id:"t_fathers", emoji:"👨‍👦", name:"Father–Son Relationships", category:"Identity & Relationships", tag:"theme/fathers-sons", obsidianLink:"Father-Son Relationships",
    template:`# 👨‍👦 Father–Son Relationships\n\n**Tags:** #theme/fathers-sons\n\n---\n\n## Core Pairs\n- [[Achilles]] & [[Peleus]]\n- [[Telemachus]] & [[Odysseus]]\n- [[Hector]] & [[Priam]]\n\n## Key Moments\n- \n\n## Analysis\n\n` },
  // Justice & Ethics
  { id:"t_justice", emoji:"⚖️", name:"Justice, Revenge & Forgiveness", category:"Justice & Ethics", tag:"theme/justice", obsidianLink:"Justice Revenge and Forgiveness",
    template:`# ⚖️ Justice, Revenge & Forgiveness\n\n**Tags:** #theme/justice\n\n---\n\n## Core Tension\n\n\n## Revenge vs Justice\n- [[Achilles]] — \n- [[Odysseus]] — \n\n## Forgiveness Moments\n- \n\n## Analysis\n\n` },
  // Comparative
  { id:"t_comparative", emoji:"⚔️🌊", name:"Achilles vs Odysseus", category:"Comparative", tag:"theme/comparative", obsidianLink:"Achilles vs Odysseus",
    template:`# ⚔️🌊 Achilles vs Odysseus\n\n**Tags:** #theme/comparative\n\n---\n\n## Achilles\n- Represents: \n- Key traits: \n- Arc: \n\n## Odysseus\n- Represents: \n- Key traits: \n- Arc: \n\n## Key Differences\n| Dimension | Achilles | Odysseus |\n|---|---|---|\n| Approach | Strength | Cunning |\n| Goal | Glory (κλέος) | Home (νόστος) |\n| Fatal flaw | | |\n\n## Analysis\n\n` },
  // General types
  { id:"t_character", emoji:"🏛️", name:"Character Study", category:"Characters", tag:"character/study", obsidianLink:"",
    template:`# 🏛️ Character Study: {{title}}\n\n**Tags:** #character/study\n**Type:** [[Characters]]\n\n---\n\n## Overview\n\n\n## Key Traits\n- \n\n## Role in the Epic\n- \n\n## Key Quotes\n> \n\n## Relationships\n- Parents: \n- Allies: \n- Enemies: \n\n## My Analysis\n\n` },
  { id:"t_passage", emoji:"📜", name:"Passage Analysis", category:"Close Reading", tag:"analysis/passage", obsidianLink:"",
    template:`# 📜 Passage Analysis\n\n**Tags:** #analysis/passage\n**Book / Line:** \n\n---\n\n## The Passage\n> \n\n## Context\n\n\n## Literary Devices\n- \n\n## Themes Linked\n- \n\n## My Interpretation\n\n` },
  { id:"t_essay", emoji:"✍️", name:"Essay Plan", category:"Academic", tag:"academic/essay", obsidianLink:"",
    template:`# ✍️ Essay Plan\n\n**Tags:** #academic/essay\n**Question:** \n\n---\n\n## Thesis\n\n\n## Argument 1\n- Evidence: \n- Analysis: \n\n## Argument 2\n- Evidence: \n- Analysis: \n\n## Argument 3\n- Evidence: \n- Analysis: \n\n## Conclusion\n\n` },
];

// ===== LOAD / SAVE NOTE TYPES =====
export function loadNoteTypes() {
  state.noteTypes = JSON.parse(localStorage.getItem("mythos_note_types") || "null") || DEFAULT_NOTE_TYPES;
}

function saveNoteTypes() {
  localStorage.setItem("mythos_note_types", JSON.stringify(state.noteTypes));
}

// ===== POPULATE DROPDOWN =====
export function populateNoteTypeDropdown() {
  const sel = document.getElementById("noteTypeSelect");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">📄 General Note</option>';

  const cats = {};
  state.noteTypes.forEach(t => { (cats[t.category] = cats[t.category] || []).push(t); });

  Object.entries(cats).forEach(([cat, types]) => {
    const grp = document.createElement("optgroup");
    grp.label = cat;
    types.forEach(t => {
      const opt = document.createElement("option");
      opt.value       = t.id;
      opt.textContent = `${t.emoji} ${t.name}`;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });

  sel.value = current;
}

// ===== ON TYPE CHANGE =====
export function onNoteTypeChange() {
  const sel    = document.getElementById("noteTypeSelect");
  const typeId = sel.value;
  if (!typeId) return;

  const type = state.noteTypes.find(t => t.id === typeId);
  if (!type) return;

  const body  = document.getElementById("noteBody").value.trim();
  const title = document.getElementById("noteTitleInput").value.trim();

  const confirmApply = !body || confirm("Apply template? This will replace the current note body.");
  if (!confirmApply) { sel.value = state.currentNoteType || ""; return; }

  const today  = new Date().toISOString().slice(0, 10);
  const filled = type.template
    .replace(/\{\{title\}\}/g, title || type.name)
    .replace(/\{\{tag\}\}/g,   type.tag)
    .replace(/\{\{date\}\}/g,  today);

  document.getElementById("noteBody").value = filled;

  // Auto-add tag
  const existingTags = document.getElementById("noteTagsInput").value.trim();
  if (type.tag && !existingTags.includes(type.tag)) {
    document.getElementById("noteTagsInput").value = existingTags
      ? existingTags + ", " + type.tag
      : type.tag;
  }

  state.currentNoteType = typeId;
  autoSaveNote();
}

// ===== TEMPLATE MANAGER =====
export function openTemplateManager() {
  renderNoteTypeList();
  document.getElementById("templateManagerModal").style.display = "flex";
}

export function closeTemplateManager() {
  document.getElementById("templateManagerModal").style.display = "none";
  populateNoteTypeDropdown();
}

function renderNoteTypeList() {
  const cats = {};
  state.noteTypes.forEach(t => { (cats[t.category] = cats[t.category] || []).push(t); });

  let html = "";
  Object.entries(cats).forEach(([cat, types]) => {
    html += `<div style="color:#a89b8a; font-size:0.72rem; text-transform:uppercase; letter-spacing:1px; margin:10px 0 5px; padding-left:4px;">${cat}</div>`;
    types.forEach(t => {
      html += `
        <div style="background:#1a1a2e; border:1px solid #0f3460; border-radius:10px; padding:11px 14px; display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.1rem;">${t.emoji}</span>
          <div style="flex:1;">
            <div style="color:#e0d7c6; font-size:0.88rem; font-weight:bold;">${t.name}</div>
            <div style="color:#a89b8a; font-size:0.72rem; margin-top:2px;">#${t.tag}${t.obsidianLink ? " · [["+t.obsidianLink+"]]" : ""}</div>
          </div>
          <button onclick="window.editNoteType('${t.id}')" style="background:#0f3460; color:#e2b96f; border:1px solid #e2b96f; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem;">✏️ Edit</button>
          <button onclick="window.deleteNoteType('${t.id}')" style="background:transparent; color:#c0392b; border:1px solid #c0392b; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:0.75rem;">🗑</button>
        </div>`;
    });
  });

  document.getElementById("noteTypeList").innerHTML =
    html || '<div style="color:#a89b8a; text-align:center; padding:20px;">No types yet.</div>';
}

export function addNoteType() {
  const emoji       = document.getElementById("nt_emoji").value.trim() || "📄";
  const name        = document.getElementById("nt_name").value.trim();
  const category    = document.getElementById("nt_category").value.trim() || "General";
  const tag         = document.getElementById("nt_tag").value.trim();
  const obsidianLink = document.getElementById("nt_obsidian_link").value.trim();
  const template    = document.getElementById("nt_template").value;

  if (!name) { alert("Please enter a name."); return; }

  const id = "t_" + name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"") + "_" + Date.now();
  state.noteTypes.push({ id, emoji, name, category, tag, obsidianLink, template });
  saveNoteTypes();
  renderNoteTypeList();
  ["nt_emoji","nt_name","nt_category","nt_tag","nt_obsidian_link","nt_template"]
    .forEach(id => document.getElementById(id).value = "");
}

export function editNoteType(id) {
  const t = state.noteTypes.find(x => x.id === id);
  if (!t) return;
  document.getElementById("edit_nt_id").value           = t.id;
  document.getElementById("edit_nt_emoji").value        = t.emoji || "";
  document.getElementById("edit_nt_name").value         = t.name  || "";
  document.getElementById("edit_nt_category").value     = t.category || "";
  document.getElementById("edit_nt_tag").value          = t.tag   || "";
  document.getElementById("edit_nt_obsidian_link").value = t.obsidianLink || "";
  document.getElementById("edit_nt_template").value     = t.template || "";
  document.getElementById("templateEditModal").style.display = "flex";
}

export function closeTemplateEdit() {
  document.getElementById("templateEditModal").style.display = "none";
}

export function saveTemplateEdit() {
  const id  = document.getElementById("edit_nt_id").value;
  const idx = state.noteTypes.findIndex(x => x.id === id);
  if (idx === -1) return;
  state.noteTypes[idx] = {
    id,
    emoji:        document.getElementById("edit_nt_emoji").value.trim(),
    name:         document.getElementById("edit_nt_name").value.trim(),
    category:     document.getElementById("edit_nt_category").value.trim(),
    tag:          document.getElementById("edit_nt_tag").value.trim(),
    obsidianLink: document.getElementById("edit_nt_obsidian_link").value.trim(),
    template:     document.getElementById("edit_nt_template").value
  };
  saveNoteTypes();
  closeTemplateEdit();
  renderNoteTypeList();
}

export function deleteNoteType(id) {
  if (!confirm("Delete this note type?")) return;
  state.noteTypes = state.noteTypes.filter(t => t.id !== id);
  saveNoteTypes();
  renderNoteTypeList();
}

// ===== EXPOSE TO WINDOW =====
window.onNoteTypeChange    = onNoteTypeChange;
window.openTemplateManager = openTemplateManager;
window.closeTemplateManager = closeTemplateManager;
window.addNoteType         = addNoteType;
window.editNoteType        = editNoteType;
window.closeTemplateEdit   = closeTemplateEdit;
window.saveTemplateEdit    = saveTemplateEdit;
window.deleteNoteType      = deleteNoteType;
