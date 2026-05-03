// ===== CHARACTERS MODULE =====

import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { state } from "./state.js";
import { typeEmoji, parseList, parseComplicated, serializeComplicated } from "./utils.js";

// ===== PARSE [[links]] INTO CLICKABLE SPANS =====
function parseLinks(text) {
  if (!text) return "";
  return text.replace(/\[\[(.*?)\]\]/g, (_, p1) =>
    `<span class="link" onclick="window.openCharacterPage('${p1}')">${p1}</span>`
  );
}

// ===== BACK TO LIST =====
export function backToList() {
  document.getElementById("listView").style.display = "block";
  document.getElementById("pageView").style.display = "none";
  document.getElementById("editView").style.display = "none";
  loadCharacters();
}

// ===== ADD CHARACTER =====
export async function addCharacter() {
  try {
    const name = document.getElementById("name").value.trim();
    if (!name) { alert("Please enter a name."); return; }

    const data = {
      name,
      type:       document.getElementById("type").value,
      image:      document.getElementById("image").value.trim(),
      tags:       parseList(document.getElementById("tags").value),
      parents:    parseList(document.getElementById("parents").value),
      children:   parseList(document.getElementById("children").value),
      siblings:   parseList(document.getElementById("siblings").value),
      spouse:     parseList(document.getElementById("spouse").value),
      friends:    parseList(document.getElementById("friends").value),
      enemies:    parseList(document.getElementById("enemies").value),
      relatives:  parseList(document.getElementById("relatives").value),
      complicated: parseComplicated(document.getElementById("complicated").value),
      notes:      document.getElementById("notes").value.trim()
    };

    await addDoc(collection(db, "characters"), data);

    ["name","image","tags","parents","children","siblings","spouse",
     "friends","enemies","relatives","complicated","notes"]
      .forEach(id => document.getElementById(id).value = "");
    document.getElementById("type").value = "";

    alert(`✅ ${name} saved!`);
    loadCharacters();
  } catch (e) {
    alert("Error: " + e.message);
    console.error(e);
  }
}

// ===== LOAD ALL CHARACTERS FROM FIREBASE =====
export async function loadCharacters() {
  const container = document.getElementById("characters");
  container.innerHTML = '<div class="empty-state">Loading...</div>';
  try {
    const snap = await getDocs(collection(db, "characters"));
    state.allCharacters = [];
    snap.forEach(d => state.allCharacters.push({ id: d.id, ...d.data() }));
    buildTagFilterBar();
    renderCards(state.allCharacters);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ===== TAG FILTER BAR =====
function buildTagFilterBar() {
  const allTags = new Set();
  state.allCharacters.forEach(c => (c.tags || []).forEach(t => allTags.add(t)));
  const bar = document.getElementById("tagFilterBar");
  bar.innerHTML = "";
  if (!allTags.size) return;
  allTags.forEach(tag => {
    const pill = document.createElement("span");
    pill.className = "tag-pill" + (state.activeTagFilter === tag ? " active" : "");
    pill.textContent = "#" + tag;
    pill.onclick = () => {
      state.activeTagFilter = state.activeTagFilter === tag ? null : tag;
      buildTagFilterBar();
      filterCards();
    };
    bar.appendChild(pill);
  });
}

// ===== RENDER CARD GRID =====
export function renderCards(chars) {
  const container = document.getElementById("characters");
  if (!chars.length) {
    container.innerHTML = '<div class="empty-state">No characters found. 🏛️</div>';
    return;
  }
  container.innerHTML = "";
  chars.forEach(data => {
    const div = document.createElement("div");
    div.className = "card";

    const avatarHTML = data.image
      ? `<img class="card-avatar" src="${data.image}" onerror="this.style.display='none'">`
      : `<div class="card-avatar-placeholder">${typeEmoji(data.type)}</div>`;

    const tagsHTML = (data.tags || []).length
      ? `<div class="card-tags">${data.tags.map(t => `<span class="card-tag">#${t}</span>`).join("")}</div>`
      : "";

    div.innerHTML = `
      ${avatarHTML}
      <h3>${data.name}</h3>
      <span class="type-badge">${data.type || "Unknown"}</span>
      <p>${data.notes ? data.notes.replace(/\[\[.*?\]\]/g, "").slice(0, 50) + "..." : "No notes yet."}</p>
      ${tagsHTML}`;

    div.onclick = () => openCharacterPage(data.name);
    container.appendChild(div);
  });
}

// ===== FILTER CARDS =====
export function filterCards() {
  const q = (document.getElementById("searchInput").value || "").toLowerCase();
  const typeF = document.getElementById("typeFilter").value;
  const result = state.allCharacters.filter(c => {
    const matchQ = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.notes || "").toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q));
    const matchType = !typeF || c.type === typeF;
    const matchTag = !state.activeTagFilter || (c.tags || []).includes(state.activeTagFilter);
    return matchQ && matchType && matchTag;
  });
  renderCards(result);
}

// ===== OPEN CHARACTER PAGE =====
export async function openCharacterPage(name) {
  // Switch to characters tab visually
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
    v.style.display = "none";
  });
  const charTab = document.getElementById("tab-characters");
  charTab.style.display = "block";
  charTab.classList.add("active");
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-btn-characters").classList.add("active");

  document.getElementById("listView").style.display = "none";
  document.getElementById("pageView").style.display = "block";
  document.getElementById("editView").style.display = "none";

  const container = document.getElementById("characterDetails");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  // Ensure characters are loaded
  if (!state.allCharacters.length) {
    const snap = await getDocs(collection(db, "characters"));
    state.allCharacters = [];
    snap.forEach(d => state.allCharacters.push({ id: d.id, ...d.data() }));
  }

  const data = state.allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (!data) {
    container.innerHTML = `<div class="empty-state">Character "${name}" not found.</div>`;
    return;
  }
  state.currentDocId = data.id;

  const backlinks = state.allCharacters.filter(c =>
    c.notes && c.notes.includes(`[[${data.name}]]`) && c.name !== data.name
  );

  const avatarHTML = data.image
    ? `<img class="page-avatar" src="${data.image}" onerror="this.style.display='none'">`
    : `<div class="page-avatar-placeholder">${typeEmoji(data.type)}</div>`;

  const tagsHTML = (data.tags || []).length
    ? `<div class="page-tags">${data.tags.map(t => `<span class="page-tag">#${t}</span>`).join("")}</div>`
    : "";

  function relBlock(icon, label, items, isComplicated = false) {
    if (!items || !items.length) return "";
    const rows = isComplicated
      ? items.map(x => `
          <div class="rel-item">
            <span class="rel-link" onclick="window.openCharacterPage('${x.name}')">${x.name}</span>
            ${x.note ? `<span class="rel-note">${x.note.toUpperCase()}</span>` : ""}
          </div>`).join("")
      : items.map(n => `
          <div class="rel-item">
            <span class="rel-link" onclick="window.openCharacterPage('${n}')">${n}</span>
          </div>`).join("");
    return `<div class="rel-box"><label>${icon} ${label}</label>${rows}</div>`;
  }

  container.innerHTML = `
    <div class="page-header">
      ${avatarHTML}
      <div class="page-title">
        <h2>${data.name}</h2>
        <span class="type-badge">${data.type || "Unknown"}</span>
        ${tagsHTML}
        <div class="page-actions">
          <button class="btn-edit" onclick="window.editCharacter('${data.id}')">✏️ Edit</button>
          <button class="btn-delete" onclick="window.deleteCharacter('${data.id}')">🗑️ Delete</button>
          <button class="btn-edit" onclick="window.exportCharacterMd('${data.name}')">⬇ .md</button>
        </div>
      </div>
    </div>

    <div class="rel-grid">
      ${relBlock("👨‍👩‍👦", "Parents of the Character", data.parents)}
      ${relBlock("👶", "Children of the Character", data.children)}
      ${relBlock("🤝", "Siblings", data.siblings)}
      ${relBlock("💍", "Spouse / Partner", data.spouse)}
      ${relBlock("👥", "Other Relatives", data.relatives)}
      ${relBlock("⚔️", "Friends / Allies", data.friends)}
      ${relBlock("🔥", "Enemies", data.enemies)}
      ${relBlock("💬", "Complicated Relationship", data.complicated, true)}
    </div>

    ${data.notes ? `
      <div class="page-section">
        <label>📖 Notes</label>
        <div class="content">${parseLinks(data.notes)}</div>
      </div>` : ""}

    ${backlinks.length ? `
      <div class="backlinks-box">
        <label>🔗 Linked From</label>
        <p style="margin-top:6px">
          ${backlinks.map(b =>
            `<span class="link" onclick="window.openCharacterPage('${b.name}')">${b.name}</span>`
          ).join(", ")}
        </p>
      </div>` : ""}
  `;
}

// ===== EDIT CHARACTER =====
export function editCharacter(docId) {
  const data = state.allCharacters.find(c => c.id === docId);
  if (!data) return;
  state.currentDocId = docId;

  document.getElementById("editName").value      = data.name || "";
  document.getElementById("editType").value      = data.type || "";
  document.getElementById("editImage").value     = data.image || "";
  document.getElementById("editTags").value      = (data.tags || []).join(", ");
  document.getElementById("editParents").value   = (data.parents || []).join(", ");
  document.getElementById("editChildren").value  = (data.children || []).join(", ");
  document.getElementById("editSiblings").value  = (data.siblings || []).join(", ");
  document.getElementById("editSpouse").value    = (data.spouse || []).join(", ");
  document.getElementById("editFriends").value   = (data.friends || []).join(", ");
  document.getElementById("editEnemies").value   = (data.enemies || []).join(", ");
  document.getElementById("editRelatives").value = (data.relatives || []).join(", ");
  document.getElementById("editComplicated").value = serializeComplicated(data.complicated || []);
  document.getElementById("editNotes").value     = data.notes || "";

  document.getElementById("editBackBtn").onclick    = () => openCharacterPage(data.name);
  document.getElementById("editCancelBtn").onclick  = () => openCharacterPage(data.name);

  document.getElementById("listView").style.display = "none";
  document.getElementById("pageView").style.display = "none";
  document.getElementById("editView").style.display = "block";
}

// ===== SAVE EDIT =====
export async function saveEdit() {
  if (!state.currentDocId) return;
  try {
    const name = document.getElementById("editName").value.trim();
    if (!name) { alert("Name cannot be empty."); return; }

    const updated = {
      name,
      type:        document.getElementById("editType").value,
      image:       document.getElementById("editImage").value.trim(),
      tags:        parseList(document.getElementById("editTags").value),
      parents:     parseList(document.getElementById("editParents").value),
      children:    parseList(document.getElementById("editChildren").value),
      siblings:    parseList(document.getElementById("editSiblings").value),
      spouse:      parseList(document.getElementById("editSpouse").value),
      friends:     parseList(document.getElementById("editFriends").value),
      enemies:     parseList(document.getElementById("editEnemies").value),
      relatives:   parseList(document.getElementById("editRelatives").value),
      complicated: parseComplicated(document.getElementById("editComplicated").value),
      notes:       document.getElementById("editNotes").value.trim()
    };

    await updateDoc(doc(db, "characters", state.currentDocId), updated);
    state.allCharacters = state.allCharacters.map(c =>
      c.id === state.currentDocId ? { ...c, ...updated } : c
    );
    alert("✅ Saved!");
    openCharacterPage(name);
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// ===== DELETE CHARACTER =====
export async function deleteCharacter(docId) {
  if (!confirm("Delete this character?")) return;
  try {
    await deleteDoc(doc(db, "characters", docId));
    state.allCharacters = state.allCharacters.filter(c => c.id !== docId);
    alert("🗑️ Deleted.");
    backToList();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// ===== EXPOSE TO WINDOW (for HTML onclick attributes) =====
window.addCharacter       = addCharacter;
window.filterCards        = filterCards;
window.backToList         = backToList;
window.openCharacterPage  = openCharacterPage;
window.editCharacter      = editCharacter;
window.saveEdit           = saveEdit;
window.deleteCharacter    = deleteCharacter;
