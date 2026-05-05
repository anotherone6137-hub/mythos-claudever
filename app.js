// ===== APP.JS — MAIN ENTRY POINT =====

import { onAuthReady, firebaseLogin, firebaseLogout } from "./firebase-config.js";
import { state }                                      from "./state.js";
import { loadCharacters }                             from "./characters.js";
import { loadAndBuildTree }                           from "./tree.js";
import { initNotes }                                  from "./notes.js";
import { loadNoteTypes, populateNoteTypeDropdown }    from "./templates.js";
import "./export.js";
import { loadBooks, renderBookList }                  from "./books.js";

// ===== TAB SWITCHER =====
window.switchTab = function(tab, btn) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
    v.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  const el = document.getElementById("tab-" + tab);
  if (el) {
    el.style.display = tab === "notes" || tab === "books" ? "flex" : "block";
    el.classList.add("active");
  }
  if (btn) btn.classList.add("active");

  if (tab === "tree")       loadAndBuildTree();
  if (tab === "notes")      initNotes();
  if (tab === "characters") { document.getElementById("listView").style.display = "block"; loadCharacters(); }
  if (tab === "books")      renderBookList();
};

// ===== THEME TOGGLE =====
window.toggleTheme = function() {
  const isLight = document.body.classList.toggle("light");
  document.getElementById("themeToggleBtn").textContent = isLight ? "🌙 Dark" : "☀️ Light";
  localStorage.setItem("mythos_theme", isLight ? "light" : "dark");
};

// ===== NOTES SIDEBAR TOGGLE =====
window.toggleNotesSidebar = function() {
  const sidebar   = document.getElementById("notesSidebar");
  const btn       = document.getElementById("sidebarToggleBtn");
  const collapsed = sidebar.classList.toggle("collapsed");
  btn.textContent = collapsed ? "▶" : "◀";
  btn.title       = collapsed ? "Show sidebar" : "Hide sidebar";
};

// ===== BOOKS SIDEBAR TOGGLE =====
window.toggleBooksSidebar = function() {
  const sidebar   = document.getElementById("booksSidebar");
  const btn       = document.getElementById("booksSidebarToggleBtn");
  const collapsed = sidebar.classList.toggle("collapsed");
  btn.textContent = collapsed ? "▶" : "◀";
  btn.title       = collapsed ? "Show sidebar" : "Hide sidebar";
};

// ===== AUTH UI =====
function showApp(user) {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appContent").style.display = "block";
  document.getElementById("userEmail").textContent    = user.email;
  document.getElementById("logoutBtn").style.display  = "inline-block";

  loadNoteTypes();
  populateNoteTypeDropdown();
  loadBooks();
  loadCharacters();
  initNotes();

  // Default to Home tab
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active"); v.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  const homeEl = document.getElementById("tab-home");
  if (homeEl) { homeEl.style.display = "block"; homeEl.classList.add("active"); }
  const homeBtn = document.getElementById("tab-btn-home");
  if (homeBtn) homeBtn.classList.add("active");
}

function showAuthScreen() {
  document.getElementById("authScreen").style.display = "flex";
  document.getElementById("appContent").style.display = "none";
  document.getElementById("logoutBtn").style.display  = "none";
  document.getElementById("userEmail").textContent    = "";
}

window.loginWithGoogle = async function() {
  try {
    document.getElementById("authError").textContent = "";
    await firebaseLogin();
  } catch (e) {
    document.getElementById("authError").textContent =
      e.code === "auth/popup-closed-by-user"
        ? "Sign-in cancelled."
        : "Sign-in failed: " + e.message;
  }
};

window.logOut = async function() {
  await firebaseLogout();
};

// ===== BOOT =====
// Restore theme
if (localStorage.getItem("mythos_theme") === "light") {
  document.body.classList.add("light");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = "🌙 Dark";
}

// Helper for books delete button
window.__currentBookId = () => state.currentBookId;

// ===== AUTHORISED EMAIL =====
// Only this account can access the app.
// Change this to your Google account email.
const AUTHORISED_EMAIL = "hogwartsalumini@gmail.com";

// Wait for Firebase auth to confirm before showing anything
onAuthReady(async user => {
  if (user) {
    if (user.email !== AUTHORISED_EMAIL) {
      // Wrong account — sign them out immediately and show error
      await firebaseLogout();
      document.getElementById("authScreen").style.display = "flex";
      document.getElementById("appContent").style.display = "none";
      document.getElementById("authError").textContent =
        "Access denied. This app is private.";
      return;
    }
    showApp(user);
  } else {
    showAuthScreen();
  }
});
