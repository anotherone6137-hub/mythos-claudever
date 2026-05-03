// ===== NOTES MODULE =====

import { state } from "./state.js";

// ===== STORAGE =====
export function saveNotesToStorage() {
  try { localStorage.setItem("mythos_notes", JSON.stringify(state.notes)); } catch (e) {}
}

function genNoteId() {
  return "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

// ===== CREATE NOTE =====
export function createNote() {
  const note = {
    id:      genNoteId(),
    title:   "Untitled Note",
    tags:    "",
    body:    "",
    updated: Date.now()
  };
  state.notes.unshift(note);
  saveNotesToStorage();
  renderNoteList();
  openNote(note.id);
  setTimeout(() => document.getElementById("noteTitleInput").select(), 50);
}

// ===== OPEN NOTE =====
export function openNote(id) {
  state.currentNoteId = id;
  const note = state.notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById("noteTitleInput").value = note.title || "";
  document.getElementById("noteTagsInput").value  = note.tags  || "";
  document.getElementById("noteBody").value        = note.body  || "";

  // Restore note type dropdown
  state.currentNoteType = note.noteType || "";
  const sel = document.getElementById("noteTypeSelect");
  if (sel) sel.value = state.currentNoteType;

  updateNoteBacklinks(note.title);
  renderNoteList();
  if (state.previewMode) renderPreview();
}

// ===== AUTO SAVE =====
export function autoSaveNote() {
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => {
    if (!state.currentNoteId) return;
    const idx = state.notes.findIndex(n => n.id === state.currentNoteId);
    if (idx === -1) return;
    state.notes[idx].title    = document.getElementById("noteTitleInput").value || "Untitled";
    state.notes[idx].tags     = document.getElementById("noteTagsInput").value;
    state.notes[idx].body     = document.getElementById("noteBody").value;
    state.notes[idx].noteType = state.currentNoteType || "";
    state.notes[idx].updated  = Date.now();
    saveNotesToStorage();
    renderNoteList();
    updateNoteBacklinks(state.notes[idx].title);
    if (state.previewMode) renderPreview();
  }, 400);
}

// ===== DELETE NOTE =====
export function deleteCurrentNote() {
  if (!state.currentNoteId) return;
  if (!confirm("Delete this note?")) return;
  state.notes = state.notes.filter(n => n.id !== state.currentNoteId);
  state.currentNoteId = null;
  saveNotesToStorage();
  renderNoteList();
  document.getElementById("noteTitleInput").value = "";
  document.getElementById("noteTagsInput").value  = "";
  document.getElementById("noteBody").value        = "";
  document.getElementById("notePreview").innerHTML = "";
  document.getElementById("noteBacklinksList").textContent = "—";
  if (state.notes.length > 0) openNote(state.notes[0].id);
}

// ===== RENDER NOTE LIST =====
export function renderNoteList() {
  const q = (document.getElementById("noteSearch").value || "").toLowerCase();
  const filtered = state.notes.filter(n =>
    !q ||
    n.title.toLowerCase().includes(q) ||
    (n.body  || "").toLowerCase().includes(q) ||
    (n.tags  || "").toLowerCase().includes(q)
  );

  const container = document.getElementById("noteList");
  if (!filtered.length) {
    container.innerHTML = `<div style="color:#a89b8a; font-size:0.82rem; text-align:center; padding:20px;">No notes yet.<br>Click + New Note to start.</div>`;
    return;
  }
  container.innerHTML = filtered.map(note => `
    <div class="note-item ${note.id === state.currentNoteId ? "active" : ""}"
         onclick="window.openNote('${note.id}')">
      <div class="note-item-title">${note.title || "Untitled"}</div>
      <div class="note-item-meta">${
        note.tags
          ? note.tags.split(",").map(t => "#" + t.trim()).join(" ") + " · "
          : ""
      }${new Date(note.updated).toLocaleDateString()}</div>
    </div>
  `).join("");
}

// ===== BACKLINKS =====
export function updateNoteBacklinks(title) {
  if (!title) return;
  const refs     = state.notes.filter(n =>
    n.id !== state.currentNoteId && n.body && n.body.includes("[[" + title + "]]")
  );
  const charRefs = state.allCharacters.filter(c =>
    c.notes && c.notes.includes("[[" + title + "]]")
  );
  const all = [
    ...refs.map(n =>
      `<span class="link" onclick="window.openNote('${n.id}')">${n.title}</span>`
    ),
    ...charRefs.map(c =>
      `<span class="link" onclick="window.openCharacterPage('${c.name}')">${c.name}</span>`
    )
  ];
  document.getElementById("noteBacklinksList").innerHTML = all.length ? all.join(" · ") : "—";
}

// ===== MARKDOWN RENDERER =====
export function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g,   "<br>");

  // [[links]] — notes first, then characters, then ghost
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    const note = state.notes.find(n => n.title.toLowerCase() === name.toLowerCase());
    const char = state.allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (note) return `<span class="note-link" onclick="window.openNote('${note.id}')">${name}</span>`;
    if (char) return `<span class="note-link" onclick="window.openCharacterPage('${char.name}')">${name}</span>`;
    return `<span style="color:#ef9a9a; cursor:pointer;"
              onclick="window.createLinkedNote('${name}')"
              title="Click to create this note">[[${name}]]</span>`;
  });

  return "<p>" + html + "</p>";
}

function renderPreview() {
  document.getElementById("notePreview").innerHTML =
    renderMarkdown(document.getElementById("noteBody").value);
}

// ===== TOGGLE PREVIEW =====
export function togglePreview() {
  state.previewMode = !state.previewMode;
  const ta   = document.getElementById("noteBody");
  const prev = document.getElementById("notePreview");
  const btn  = document.getElementById("modeBtn");

  if (state.previewMode) {
    renderPreview();
    ta.style.display   = "none";
    prev.style.display = "block";
    btn.textContent    = "✏️ Edit";
    btn.classList.add("tb-btn-active");
  } else {
    ta.style.display   = "block";
    prev.style.display = "none";
    btn.textContent    = "👁 Preview";
    btn.classList.remove("tb-btn-active");
  }
}

// ===== MARKDOWN TOOLBAR INSERT =====
export function insertMd(before, after) {
  const ta    = document.getElementById("noteBody");
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.slice(start, end);
  ta.value    = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end);
  ta.selectionStart = start + before.length;
  ta.selectionEnd   = start + before.length + sel.length;
  ta.focus();
  autoSaveNote();
}

// ===== CREATE NOTE FROM [[LINK]] =====
export function createLinkedNote(title) {
  const note = { id: genNoteId(), title, tags: "", body: "", updated: Date.now() };
  state.notes.unshift(note);
  saveNotesToStorage();
  renderNoteList();
  openNote(note.id);
}

// ===== GRAPH VIEW =====
export function showGraphView() {
  document.getElementById("noteEditor").style.display = "none";
  document.getElementById("graphView").style.display  = "flex";
  renderGraph();
}

export function hideGraphView() {
  document.getElementById("graphView").style.display  = "none";
  document.getElementById("noteEditor").style.display = "flex";
}

function renderGraph() {
  const canvas  = document.getElementById("graphCanvas");
  canvas.innerHTML = "";

  const nodeMap = {};
  const edges   = [];

  state.notes.forEach(n => {
    nodeMap[n.title] = { id: n.title, label: n.title, type: "note", noteId: n.id };
  });
  state.allCharacters.forEach(c => {
    if (!nodeMap[c.name]) nodeMap[c.name] = { id: c.name, label: c.name, type: "char", charName: c.name };
  });

  const linkSet = new Set();

  // Links from notes
  state.notes.forEach(n => {
    const matches = (n.body || "").match(/\[\[([^\]]+)\]\]/g) || [];
    matches.forEach(m => {
      const target = m.slice(2, -2);
      if (target !== n.title) {
        const key = n.title + "→" + target;
        if (!linkSet.has(key)) { linkSet.add(key); edges.push({ from: n.title, to: target }); }
        if (!nodeMap[target]) nodeMap[target] = { id: target, label: target, type: "ghost" };
      }
    });
  });

  // Links from character notes
  state.allCharacters.forEach(c => {
    const matches = (c.notes || "").match(/\[\[([^\]]+)\]\]/g) || [];
    matches.forEach(m => {
      const target = m.slice(2, -2);
      if (target !== c.name) {
        const key = c.name + "→" + target;
        if (!linkSet.has(key)) { linkSet.add(key); edges.push({ from: c.name, to: target }); }
        if (!nodeMap[target]) nodeMap[target] = { id: target, label: target, type: "ghost" };
      }
    });
  });

  const nodes = Object.values(nodeMap);
  if (!nodes.length) {
    canvas.innerHTML = `<div style="color:#a89b8a; text-align:center; padding-top:80px; font-size:0.9rem;">
      No notes yet.<br>Create notes and use [[links]] to build the graph.</div>`;
    return;
  }

  const visNodes = nodes.map(n => ({
    id:    n.id,
    label: n.label,
    color: {
      background: n.type === "char" ? "#4fc3f7" : n.type === "ghost" ? "#3a3a4a" : "#e2b96f",
      border:     n.type === "ghost" ? "#555" : "#1a1a2e",
      highlight:  { background: "#e2b96f", border: "#fff" }
    },
    font:  { color: "#ffffff", size: 13, face: "Arial", bold: true, strokeWidth: 2, strokeColor: "#000" },
    size:  n.type === "ghost" ? 12 : 18,
    shape: "dot",
    title: n.type === "char" ? "Character: " + n.label : "Note: " + n.label
  }));

  const visEdges = edges
    .filter(e => nodeMap[e.from] && nodeMap[e.to])
    .map(e => ({
      from:   e.from,
      to:     e.to,
      color:  { color: "#e2b96f55", opacity: 0.6 },
      width:  1,
      smooth: { type: "continuous" }
    }));

  if (state.graphNetwork) { state.graphNetwork.destroy(); state.graphNetwork = null; }

  state.graphNetwork = new vis.Network(
    canvas,
    { nodes: new vis.DataSet(visNodes), edges: new vis.DataSet(visEdges) },
    {
      layout:      { randomSeed: 42 },
      physics:     {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -40, springLength: 100 },
        stabilization: { iterations: 150 }
      },
      interaction: { zoomView: true, dragView: true, hover: true, tooltipDelay: 150 },
      nodes:       { margin: 8 }
    }
  );

  state.graphNetwork.on("click", params => {
    if (!params.nodes.length) return;
    const clicked = params.nodes[0];
    const node    = nodeMap[clicked];
    if (!node) return;
    if (node.type === "char")  { window.openCharacterPage(node.charName); return; }
    if (node.noteId)           { hideGraphView(); openNote(node.noteId); }
    else if (node.type === "ghost") { hideGraphView(); createLinkedNote(clicked); }
  });
}

// ===== INIT NOTES =====
export function initNotes() {
  renderNoteList();
  if (state.notes.length > 0) openNote(state.notes[0].id);
}

// ===== EXPOSE TO WINDOW =====
window.createNote       = createNote;
window.openNote         = openNote;
window.autoSaveNote     = autoSaveNote;
window.deleteCurrentNote = deleteCurrentNote;
window.renderNoteList   = renderNoteList;
window.togglePreview    = togglePreview;
window.insertMd         = insertMd;
window.createLinkedNote = createLinkedNote;
window.showGraphView    = showGraphView;
window.hideGraphView    = hideGraphView;
