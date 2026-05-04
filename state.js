// ===== SHARED STATE =====
// All modules import this object and mutate it directly.
// This is the single source of truth across the whole app.

export const state = {
  // Characters
  allCharacters: [],
  currentDocId: null,
  activeTagFilter: null,
  networkInstance: null,

  // Notes — populated from Firestore on load
  notes: [],
  currentNoteId: null,
  previewMode: false,
  autoSaveTimer: null,
  currentNoteType: "",
  graphNetwork: null,

  // Books
  books: [],
  currentBookId: null,
  bookChunks: {},      // { [bookId]: [{ text, startPage, endPage }] } — in-memory cache
};
