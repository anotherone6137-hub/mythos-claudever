// ===== BOOKS & QUOTES MODULE =====
// Books are stored in Firestore so they sync across all devices.
//
// Firestore structure:
//   books/{bookId}              ← metadata (title, author, pageCount, chunkCount)
//   books/{bookId}/chunks/{i}   ← { text, startPage, endPage }
//
// Each chunk is ~50KB of text (roughly 25-30 pages).
// A 400-page book = ~15 chunks — well within Firestore free tier.
// Page markers [p.N] are embedded in chunk text so we can show
// approximate page numbers in search results without storing per-page docs.
//
// Chunks are fetched from Firestore once per session per book,
// then cached in state.bookChunks[bookId] for instant re-search.

import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { state } from "./state.js";

const BOOKS_COL  = "books";
const CHUNK_SIZE = 50000; // ~50KB per chunk

// ===== LOAD BOOK LIST FROM FIRESTORE =====
export async function loadBooks() {
  try {
    const snap = await getDocs(collection(db, BOOKS_COL));
    state.books = [];
    snap.forEach(d => {
      // Only top-level book metadata docs (not subcollections)
      const data = d.data();
      if (data.title) state.books.push({ id: d.id, ...data });
    });
    state.books.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  } catch (e) {
    console.error("Failed to load books:", e);
  }
}

// ===== LOAD CHUNKS FOR A BOOK (with cache) =====
async function loadChunks(bookId) {
  if (state.bookChunks[bookId]) return state.bookChunks[bookId]; // already cached

  const snap   = await getDocs(collection(db, BOOKS_COL, bookId, "chunks"));
  const chunks = [];
  snap.forEach(d => chunks.push({ idx: parseInt(d.id), ...d.data() }));
  chunks.sort((a, b) => a.idx - b.idx);

  state.bookChunks[bookId] = chunks;
  return chunks;
}

// ===== LOAD PDF.JS FROM CDN =====
async function ensurePdfJs() {
  if (window.pdfjsLib) return;
  await new Promise((resolve, reject) => {
    const s  = document.createElement("script");
    s.src    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// ===== EXTRACT PAGES FROM PDF =====
async function extractPages(file, onProgress) {
  await ensurePdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages       = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text    = content.items
      .map(item => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text });
    if (onProgress) onProgress(i, pdf.numPages);
  }
  return pages;
}

// ===== BUILD CHUNKS FROM PAGES =====
// Joins pages with [p.N] markers, then splits at ~50KB boundaries
// trying to break on sentence endings rather than mid-word.
function buildChunks(pages) {
  // Build one long string with page markers
  const full = pages
    .map(p => `[p.${p.page}] ${p.text}`)
    .join(" ");

  const chunks = [];
  let pos = 0;

  while (pos < full.length) {
    let end = Math.min(pos + CHUNK_SIZE, full.length);

    // Try to break at a sentence boundary (. or \n) within last 500 chars
    if (end < full.length) {
      const window = full.slice(end - 500, end);
      const lastDot = Math.max(window.lastIndexOf(". "), window.lastIndexOf(".\n"));
      if (lastDot > 0) end = end - 500 + lastDot + 2;
    }

    const chunkText = full.slice(pos, end);

    // Figure out startPage and endPage from markers in this chunk
    const pageMatches = [...chunkText.matchAll(/\[p\.(\d+)\]/g)];
    const startPage   = pageMatches.length ? parseInt(pageMatches[0][1]) : null;
    const endPage     = pageMatches.length ? parseInt(pageMatches[pageMatches.length - 1][1]) : null;

    chunks.push({ text: chunkText, startPage, endPage });
    pos = end;
  }

  return chunks;
}

// ===== SAVE BOOK TO FIRESTORE =====
async function saveBookToFirestore(book, chunks) {
  const { id, ...meta } = book;
  await setDoc(doc(db, BOOKS_COL, id), meta);

  // Use batched writes — Firestore allows 500 ops per batch
  const BATCH_LIMIT = 490;
  for (let i = 0; i < chunks.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const slice = chunks.slice(i, i + BATCH_LIMIT);
    slice.forEach((chunk, j) => {
      const ref = doc(db, BOOKS_COL, id, "chunks", String(i + j));
      batch.set(ref, {
        idx:       i + j,
        text:      chunk.text,
        startPage: chunk.startPage,
        endPage:   chunk.endPage
      });
    });
    await batch.commit();
  }
}

// ===== DELETE BOOK FROM FIRESTORE =====
async function deleteBookFromFirestore(bookId) {
  // Delete all chunks first
  const snap = await getDocs(collection(db, BOOKS_COL, bookId, "chunks"));
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
  // Then delete the metadata doc
  await deleteDoc(doc(db, BOOKS_COL, bookId));
}

// ===== RENDER BOOK LIST =====
export function renderBookList() {
  const container = document.getElementById("bookList");
  if (!state.books.length) {
    container.innerHTML = `<div style="color:#a89b8a; font-size:0.82rem; text-align:center; padding:24px 10px;">
      No books yet.<br>Click <b style="color:#e2b96f;">+ Add Book</b> to upload a PDF.</div>`;
    return;
  }
  container.innerHTML = state.books.map(b => `
    <div class="book-item ${state.currentBookId === b.id ? "active" : ""}"
         onclick="window.openBook('${b.id}')">
      <div class="book-item-title">${b.title}</div>
      <div class="book-item-meta">${b.author ? b.author + " · " : ""}${b.pageCount} pages · ${b.chunkCount} chunks</div>
    </div>
  `).join("");
}

// ===== OPEN BOOK =====
export async function openBook(id) {
  state.currentBookId = id;
  renderBookList();

  const book = state.books.find(b => b.id === id);
  if (!book) return;

  document.getElementById("bookPlaceholder").style.display = "none";
  document.getElementById("bookReader").style.display      = "flex";
  document.getElementById("bookReaderTitle").textContent   = book.title;
  document.getElementById("bookPageInfo").textContent      =
    `${book.pageCount} pages · ${book.chunkCount} chunks · ${book.author || ""}`;
  document.getElementById("bookSearchInput").value         = "";
  document.getElementById("bookResults").innerHTML         = `
    <div style="color:#a89b8a; text-align:center; padding:30px; font-size:0.85rem;">
      Type to search within this book.
    </div>`;
  document.getElementById("bookResultCount").textContent   = "";
  document.getElementById("bookSearchInput").focus();
}

// ===== SEARCH WITHIN BOOK =====
export async function searchBook() {
  const q    = document.getElementById("bookSearchInput").value.trim();
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;

  const container = document.getElementById("bookResults");

  if (!q || q.length < 3) {
    container.innerHTML = `<div style="color:#a89b8a; text-align:center; padding:30px; font-size:0.85rem;">
      Type at least 3 characters to search.</div>`;
    document.getElementById("bookResultCount").textContent = "";
    return;
  }

  // Show loading if chunks aren't cached yet
  if (!state.bookChunks[state.currentBookId]) {
    container.innerHTML = `<div style="color:#e2b96f; text-align:center; padding:30px; font-size:0.85rem;">
      ⏳ Loading book from Firestore...</div>`;
  }

  const chunks = await loadChunks(state.currentBookId);
  const ql     = q.toLowerCase();
  const matches = [];

  chunks.forEach(chunk => {
    const tl  = chunk.text.toLowerCase();
    let idx   = 0;
    let count = 0;
    while ((idx = tl.indexOf(ql, idx)) !== -1 && count < 4) {
      // Extract ~300 chars of context
      const start   = Math.max(0, idx - 150);
      const end     = Math.min(chunk.text.length, idx + q.length + 150);
      const snippet = chunk.text.slice(start, end)
        .replace(/\[p\.\d+\]\s?/g, ""); // strip page markers from display

      // Find nearest page marker before this match position
      const before      = chunk.text.slice(0, idx);
      const pageMarkers = [...before.matchAll(/\[p\.(\d+)\]/g)];
      const nearestPage = pageMarkers.length
        ? parseInt(pageMarkers[pageMarkers.length - 1][1])
        : chunk.startPage;

      matches.push({ snippet, page: nearestPage, chunkIdx: chunk.idx });
      idx += q.length;
      count++;
    }
  });

  if (!matches.length) {
    container.innerHTML = `<div style="color:#a89b8a; text-align:center; padding:30px; font-size:0.85rem;">
      No results for "<b style="color:#e2b96f;">${escapeHtml(q)}</b>".</div>`;
    document.getElementById("bookResultCount").textContent = "0 results";
    return;
  }

  // Store matches in a temporary window array for add/copy buttons
  window.__bookMatches = matches;

  container.innerHTML = matches.map((m, i) => `
    <div class="quote-result">
      <div class="quote-page-badge">~p. ${m.page}</div>
      <div class="quote-snippet">${highlightMatch(m.snippet, q)}</div>
      <div class="quote-actions">
        <button class="quote-add-btn"  onclick="window.addQuoteToNote(${i}, '${escapeAttr(book.title)}')">📝 Add to Note</button>
        <button class="quote-copy-btn" onclick="window.copyQuote(${i}, '${escapeAttr(book.title)}')">📋 Copy</button>
      </div>
    </div>
  `).join("");

  document.getElementById("bookResultCount").textContent =
    `${matches.length} result${matches.length !== 1 ? "s" : ""}`;
}

// ===== HIGHLIGHT MATCH =====
function highlightMatch(snippet, q) {
  const escaped = escapeHtml(snippet);
  const regex   = new RegExp("(" + escapeRegex(escapeHtml(q)) + ")", "gi");
  return escaped.replace(regex,
    `<mark style="background:#e2b96f; color:#1a1a2e; border-radius:2px; padding:0 2px;">$1</mark>`);
}

// ===== ADD QUOTE TO NOTE =====
export function addQuoteToNote(i, bookTitle) {
  const match = (window.__bookMatches || [])[i];
  if (!match) return;

  const formatted = `\n\n> ${match.snippet.trim()}\n\n*— ${bookTitle}, ~p. ${match.page}*\n\n`;

  // Switch to Notes tab
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active"); v.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  const notesTab = document.getElementById("tab-notes");
  notesTab.style.display = "flex";
  notesTab.classList.add("active");
  document.getElementById("tab-btn-notes").classList.add("active");

  const ta = document.getElementById("noteBody");
  if (!ta) return;

  if (!state.currentNoteId) {
    window.createNote();
    setTimeout(() => {
      document.getElementById("noteBody").value += formatted;
      window.autoSaveNote();
    }, 150);
  } else {
    const pos = ta.selectionStart || ta.value.length;
    ta.value  = ta.value.slice(0, pos) + formatted + ta.value.slice(pos);
    ta.selectionStart = ta.selectionEnd = pos + formatted.length;
    window.autoSaveNote();
  }

  // Flash confirmation
  const btn = document.querySelectorAll(".quote-add-btn")[i];
  if (btn) {
    btn.textContent = "✅ Added!";
    btn.style.background = "#a5d6a7";
    setTimeout(() => { btn.textContent = "📝 Add to Note"; btn.style.background = ""; }, 2000);
  }
}

// ===== COPY QUOTE =====
export function copyQuote(i, bookTitle) {
  const match = (window.__bookMatches || [])[i];
  if (!match) return;
  const text = `"${match.snippet.trim()}"\n\n— ${bookTitle}, ~p. ${match.page}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelectorAll(".quote-copy-btn")[i];
    if (btn) {
      btn.textContent = "✅ Copied!";
      setTimeout(() => { btn.textContent = "📋 Copy"; }, 2000);
    }
  });
}

// ===== DELETE BOOK =====
export async function deleteBook(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;
  if (!confirm(`Delete "${book.title}"?\nThis removes all ${book.chunkCount} chunks from Firestore.`)) return;

  const statusEl = document.getElementById("bookPageInfo");
  if (statusEl) statusEl.textContent = "Deleting...";

  try {
    await deleteBookFromFirestore(id);
    delete state.bookChunks[id];
    state.books        = state.books.filter(b => b.id !== id);
    state.currentBookId = null;
    renderBookList();
    document.getElementById("bookPlaceholder").style.display = "flex";
    document.getElementById("bookReader").style.display      = "none";
  } catch (e) {
    alert("Error deleting: " + e.message);
  }
}

// ===== SHOW / CLOSE ADD BOOK MODAL =====
export function showAddBookModal() {
  document.getElementById("addBookModal").style.display      = "flex";
  document.getElementById("bookTitleInput").value            = "";
  document.getElementById("bookAuthorInput").value           = "";
  document.getElementById("bookFileInput").value             = "";
  document.getElementById("bookUploadStatus").textContent    = "";
  document.getElementById("bookUploadBtn").disabled          = false;
}

export function closeAddBookModal() {
  document.getElementById("addBookModal").style.display = "none";
}

// ===== UPLOAD & PROCESS =====
export async function uploadBook() {
  const title  = document.getElementById("bookTitleInput").value.trim();
  const author = document.getElementById("bookAuthorInput").value.trim();
  const file   = document.getElementById("bookFileInput").files[0];

  if (!title) { alert("Please enter a book title."); return; }
  if (!file)  { alert("Please select a PDF file."); return; }

  const statusEl = document.getElementById("bookUploadStatus");
  const btn      = document.getElementById("bookUploadBtn");
  btn.disabled   = true;

  try {
    statusEl.innerHTML = `<span style="color:#e2b96f;">⏳ Loading PDF reader...</span>`;
    await ensurePdfJs();

    statusEl.innerHTML = `<span style="color:#e2b96f;">📄 Extracting text — page 0 / ?</span>`;
    const pages = await extractPages(file, (cur, total) => {
      statusEl.innerHTML = `<span style="color:#e2b96f;">📄 Extracting — page ${cur} / ${total}</span>`;
    });

    statusEl.innerHTML = `<span style="color:#e2b96f;">✂️ Building chunks...</span>`;
    const chunks = buildChunks(pages);

    const book = {
      id:         "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      title,
      author,
      pageCount:  pages.length,
      chunkCount: chunks.length,
      addedAt:    Date.now()
    };

    statusEl.innerHTML = `<span style="color:#e2b96f;">☁️ Saving to Firestore (${chunks.length} chunks)...</span>`;
    await saveBookToFirestore(book, chunks);

    // Cache chunks locally for this session so first search is instant
    state.bookChunks[book.id] = chunks.map((c, i) => ({ idx: i, ...c }));

    state.books.unshift(book);
    renderBookList();
    closeAddBookModal();
    openBook(book.id);
  } catch (e) {
    statusEl.innerHTML = `<span style="color:#ef9a9a;">❌ Error: ${e.message}</span>`;
    console.error(e);
    btn.disabled = false;
  }
}

// ===== UTILS =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===== EXPOSE TO WINDOW =====
window.openBook          = openBook;
window.searchBook        = searchBook;
window.addQuoteToNote    = addQuoteToNote;
window.copyQuote         = copyQuote;
window.deleteBook        = deleteBook;
window.showAddBookModal  = showAddBookModal;
window.closeAddBookModal = closeAddBookModal;
window.uploadBook        = uploadBook;
