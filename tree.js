// ===== FAMILY TREE MODULE =====

import { getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { state } from "./state.js";
import { typeColors, typeEmoji } from "./utils.js";

// ===== LOAD DATA + BUILD TREE =====
export async function loadAndBuildTree() {
  if (!state.allCharacters.length) {
    const snap = await getDocs(collection(db, "characters"));
    state.allCharacters = [];
    snap.forEach(d => state.allCharacters.push({ id: d.id, ...d.data() }));
  }

  const sel = document.getElementById("treeFocusSelect");
  sel.innerHTML = '<option value="all">🌍 Full Tree</option>';
  state.allCharacters.forEach(c => {
    const o = document.createElement("option");
    o.value = c.name;
    o.textContent = `${typeEmoji(c.type)} ${c.name}`;
    sel.appendChild(o);
  });

  buildTree();
}

// ===== BUILD / REBUILD TREE =====
export function buildTree() {
  const focus     = document.getElementById("treeFocusSelect").value;
  const relFilter = document.getElementById("treeRelFilter").value;
  const characters = focus === "all" ? state.allCharacters : getRelatedChars(focus);

  const nodeNames = new Set(characters.map(c => c.name));
  const nodes     = [];
  const edges     = [];
  const edgeSet   = new Set();

  function addEdge(from, to, opts) {
    const key  = `${opts.relType}:${from}:${to}`;
    const keyR = `${opts.relType}:${to}:${from}`;
    if (edgeSet.has(key) || edgeSet.has(keyR)) return;
    edgeSet.add(key);
    edges.push({ from, to, ...opts });
  }

  characters.forEach(c => {
    const col     = typeColors[c.type] || "#b0bec5";
    const isFocus = focus !== "all" && c.name === focus;

    nodes.push({
      id:    c.name,
      label: c.name,
      color: {
        background: col,
        border:     isFocus ? "#e2b96f" : "#0f3460",
        highlight:  { background: "#e2b96f", border: "#e2b96f" }
      },
      font: {
        color:       "#ffffff",
        size:        14,
        face:        "Arial",
        bold:        true,
        strokeWidth: 3,
        strokeColor: "#000000",
        vadjust:     c.image ? 44 : 0
      },
      shape:       c.image ? "circularImage" : "ellipse",
      image:       c.image || undefined,
      size:        isFocus ? 36 : 26,
      borderWidth: isFocus ? 4 : 2,
      title:       `${c.name} (${c.type || "Unknown"})`
    });

    // Parent → Child  (gold solid arrow)
    (c.children || []).forEach(child => {
      if (nodeNames.has(child)) {
        addEdge(c.name, child, {
          relType: "parent",
          arrows:  { to: { enabled: true, scaleFactor: 0.8 } },
          color:   { color: "#e2b96f", opacity: 0.9 },
          width:   2,
          smooth:  { type: "cubicBezier", forceDirection: "vertical", roundness: 0.3 },
          dashes:  false,
          title:   "Parent → Child"
        });
      }
    });

    // Siblings  (pink dashed)
    if (relFilter === "all" || relFilter === "spouse" || relFilter === "family") {
      (c.siblings || []).forEach(sib => {
        if (nodeNames.has(sib)) {
          addEdge(c.name, sib, {
            relType: "sibling",
            arrows:  { to: { enabled: false } },
            color:   { color: "#f48fb1", opacity: 0.85 },
            width:   1.5,
            dashes:  [5, 5],
            smooth:  { type: "horizontal" },
            title:   "Siblings"
          });
        }
      });
    }

    // Spouse  (teal solid)
    if (relFilter === "all" || relFilter === "spouse") {
      (c.spouse || []).forEach(sp => {
        if (nodeNames.has(sp)) {
          addEdge(c.name, sp, {
            relType: "spouse",
            arrows:  { to: { enabled: false } },
            color:   { color: "#80cbc4", opacity: 0.9 },
            width:   2.5,
            dashes:  false,
            smooth:  { type: "horizontal" },
            title:   "Spouse / Partner"
          });
        }
      });
    }

    if (relFilter === "all") {
      // Enemies  (red dotted)
      (c.enemies || []).forEach(en => {
        if (nodeNames.has(en)) {
          addEdge(c.name, en, {
            relType: "enemy",
            arrows:  { to: { enabled: false } },
            color:   { color: "#ef5350", opacity: 0.8 },
            width:   1.5,
            dashes:  [3, 7],
            smooth:  { type: "horizontal" },
            title:   "Enemies"
          });
        }
      });

      // Friends  (green long dashes)
      (c.friends || []).forEach(fr => {
        if (nodeNames.has(fr)) {
          addEdge(c.name, fr, {
            relType: "friend",
            arrows:  { to: { enabled: false } },
            color:   { color: "#aed581", opacity: 0.8 },
            width:   1.5,
            dashes:  [8, 4],
            smooth:  { type: "horizontal" },
            title:   "Friends / Allies"
          });
        }
      });

      // Complicated  (purple fine dots)
      (c.complicated || []).forEach(x => {
        if (nodeNames.has(x.name)) {
          addEdge(c.name, x.name, {
            relType: "complicated",
            arrows:  { to: { enabled: false } },
            color:   { color: "#ce93d8", opacity: 0.8 },
            width:   1.5,
            dashes:  [2, 6],
            smooth:  { type: "dynamic" },
            title:   x.note ? `Complicated: ${x.note}` : "Complicated"
          });
        }
      });
    }
  });

  // Destroy old network instance
  if (state.networkInstance) {
    state.networkInstance.destroy();
    state.networkInstance = null;
  }

  const container = document.getElementById("familyTreeNetwork");
  const visData   = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges)
  };

  const options = {
    layout: {
      hierarchical: {
        enabled:          true,
        direction:        "UD",
        sortMethod:       "directed",
        levelSeparation:  120,
        nodeSpacing:      150,
        treeSpacing:      180,
        blockShifting:    true,
        edgeMinimization: true
      }
    },
    physics:     { enabled: false },
    interaction: { zoomView: true, dragView: true, hover: true, tooltipDelay: 150 },
    nodes:       { margin: 10 }
  };

  state.networkInstance = new vis.Network(container, visData, options);
  state.networkInstance.on("click", params => {
    if (params.nodes.length > 0) window.openCharacterPage(params.nodes[0]);
  });
}

// ===== TOGGLE LEGEND =====
export function toggleLegend() {
  const panel = document.getElementById("legendPanel");
  const btn   = document.querySelector("[onclick='window.toggleLegend()']");
  if (panel.style.display === "none") {
    panel.style.display = "block";
    if (btn) btn.textContent = "✖ Hide Legend";
  } else {
    panel.style.display = "none";
    if (btn) btn.textContent = "📖 Show Legend";
  }
}

// ===== HELPER: get all characters related to a focus node =====
function getRelatedChars(name) {
  const result = new Set([name]);
  const queue  = [name];
  while (queue.length) {
    const n = queue.shift();
    const c = state.allCharacters.find(x => x.name === n);
    if (!c) continue;
    const related = [
      ...(c.parents     || []),
      ...(c.children    || []),
      ...(c.siblings    || []),
      ...(c.spouse      || []),
      ...(c.friends     || []),
      ...(c.enemies     || []),
      ...(c.relatives   || []),
      ...(c.complicated || []).map(x => x.name)
    ];
    related.forEach(r => {
      if (r && !result.has(r)) { result.add(r); queue.push(r); }
    });
  }
  return state.allCharacters.filter(c => result.has(c.name));
}

// ===== EXPOSE TO WINDOW =====
window.buildTree    = buildTree;
window.toggleLegend = toggleLegend;
