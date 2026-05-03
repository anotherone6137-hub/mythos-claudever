// ===== SHARED STATE =====
// All modules import this object and mutate it directly.
// This is the single source of truth across the whole app.

export const state = {
  // Characters
  allCharacters: [],
  currentDocId: null,
  activeTagFilter: null,
  networkInstance: null,

  // Notes
  notes: (() => {
    try { return JSON.parse(localStorage.getItem("mythos_notes") || "[]"); }
    catch (e) { return []; }
  })(),
  currentNoteId: null,
  previewMode: false,
  autoSaveTimer: null,
  currentNoteType: "",
  graphNetwork: null,
};
