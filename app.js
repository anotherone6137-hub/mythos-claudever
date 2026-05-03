// ===== APP.JS — MAIN ENTRY POINT =====
// Imports all modules (side effects run, window.xxx assignments happen)
// Then sets up tab switching and initializes the app.

import "./firebase-config.js";
import "./state.js";
import "./utils.js";
import { loadCharacters, backToList } from "./characters.js";
import { loadAndBuildTree }           from "./tree.js";
import { initNotes }                  from "./notes.js";
import { loadNoteTypes, populateNoteTypeDropdown } from "./templates.js";
import "./export.js";

// ===== TAB SWITCHER =====
window.switchTab = function(tab, btn) {
  // Hide all views
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
    v.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  // Show selected tab
  const el = document.getElementById("tab-" + tab);
  if (el) {
    el.style.display = tab === "notes" ? "flex" : "block";
    el.classList.add("active");
  }
  btn.classList.add("active");

  // Tab-specific init
  if (tab === "tree") {
    loadAndBuildTree();
  }
  if (tab === "notes") {
    initNotes();
  }
  if (tab === "characters") {
    document.getElementById("listView").style.display = "block";
    loadCharacters();
  }
};

// ===== BOOTSTRAP =====
// Load note types into state, then populate the dropdown
loadNoteTypes();
populateNoteTypeDropdown();

// Characters tab is active by default — load it
loadCharacters();

// Init notes (loads list + opens first note if any)
initNotes();
