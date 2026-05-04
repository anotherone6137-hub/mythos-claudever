// ===== APP.JS — MAIN ENTRY POINT =====

import { onAuthReady, loginWithGoogle, logOut } from "./firebase-config.js";
import { loadCharacters }                        from "./characters.js";
import { loadAndBuildTree }                      from "./tree.js";
import { initNotes }                             from "./notes.js";
import { loadNoteTypes, populateNoteTypeDropdown } from "./templates.js";
import "./export.js";
import { loadBooks, renderBookList }             from "./books.js";

// ===== TAB SWITCHER =====
window.switchTab = function(tab, btn) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
    v.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  const el = document.getElementById("tab-" + tab);
  if (el) {
    el.style.display = tab === "notes" ? "flex" : "block";
    el.classList.add("active");
  }
  btn.classList.add("active");

  if (tab === "home")        { /* static, nothing to load */ }
  if (tab === "tree")        loadAndBuildTree();
  if (tab === "notes")       initNotes();
  if (tab === "characters")  { document.getElementById("listView").style.display = "block"; loadCharacters(); }
  if (tab === "books")       renderBookList();
};

// ===== THEME TOGGLE =====
window.toggleTheme = function() {
  const isLight = document.body.classList.toggle("light");
  document.getElementById("themeToggleBtn").textContent = isLight ? "🌙 Dark" : "☀️ Light";
  localStorage.setItem("mythos_theme", isLight ? "light" : "dark");
};

// ===== NOTES SIDEBAR TOGGLE =====
window.toggleNotesSidebar = function() {
  const sidebar = document.getElementById("notesSidebar");
  const btn     = document.getElementById("sidebarToggleBtn");
  const collapsed = sidebar.classList.toggle("collapsed");
  btn.textContent = collapsed ? "▶" : "◀";
  btn.title = collapsed ? "Show sidebar" : "Hide sidebar";
};

// ===== AUTH UI =====
function showApp(user) {
  document.getElementById("authScreen").style.display  = "none";
  document.getElementById("appContent").style.display  = "block";
  document.getElementById("userEmail").textContent     = user.email;
  document.getElementById("logoutBtn").style.display   = "inline-block";

  // Bootstrap
  loadNoteTypes();
  populateNoteTypeDropdown();
  loadBooks();
  loadCharacters();   // preload silently so Characters tab is instant
  initNotes();        // preload notes for backlinks + graph

  // Start on Home tab
  const homeTab = document.getElementById("tab-home");
  const charTab = document.getElementById("tab-characters");
  charTab.classList.remove("active");
  homeTab.classList.add("active");
  homeTab.style.display = "block";
  charTab.style.display = "none";
  document.getElementById("tab-btn-home").classList.add("active");
  document.getElementById("tab-btn-characters").classList.remove("active");
}

function showAuthScreen() {
  document.getElementById("authScreen").style.display  = "flex";
  document.getElementById("appContent").style.display  = "none";
  document.getElementById("logoutBtn").style.display   = "none";
  document.getElementById("userEmail").textContent     = "";
}

window.loginWithGoogle = async function() {
  try {
    document.getElementById("authError").textContent = "";
    await loginWithGoogle();
    // onAuthReady will fire and call showApp automatically
  } catch (e) {
    document.getElementById("authError").textContent =
      e.code === "auth/popup-closed-by-user"
        ? "Sign-in cancelled."
        : "Sign-in failed: " + e.message;
  }
};

window.logOut = async function() {
  await logOut();
  // onAuthReady will fire and call showAuthScreen automatically
};

// ===== BOOT — wait for Firebase to confirm auth state =====
// Restore saved theme preference
if (localStorage.getItem("mythos_theme") === "light") {
  document.body.classList.add("light");
  document.getElementById("themeToggleBtn").textContent = "🌙 Dark";
}

onAuthReady(user => {
  if (user) showApp(user);
  else      showAuthScreen();
});

window.__currentBookId = () => state.currentBookId;
