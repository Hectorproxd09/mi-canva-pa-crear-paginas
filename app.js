/**
 * Estudio visual — lógica: pantallas, menú, fondos, productos, exportación HTML/CSS.
 */

const STORAGE_KEY = "visual-web-studio-state-v1";

/** @typedef {{ title: string; body: string; glass: boolean; blur: number; opacity: number }} ContentPanel */
/** @typedef {{ left: number; top: number; width: number }} LayoutBox */
/** @typedef {{ head: LayoutBox; panels: LayoutBox[]; products?: LayoutBox }} ScreenLayout */
/** @typedef {{ id: string; title: string; subtitle: string; bgColor: string; bgGradient: string; bgImageDataUrl: string | null; products: { name: string; price: string }[]; panels: ContentPanel[]; layout?: ScreenLayout | null }} Screen */
/** @typedef {{ id: string; label: string; targetScreenId: string }} MenuItem */
/** @typedef {{ stretch: boolean; paddingX: number; paddingY: number; gap: number; minWidth: number }} NavStyle */

/** @type {{ screens: Screen[]; menu: MenuItem[]; navStyle: NavStyle; layoutDragMode: boolean; previewScreenId: string; editScreenId: string; editMenuId: string | null; selectionDockFocus: "screen" | "menu" | "preview-block"; selectionDockBlock: { screenId: string; kind: "head" | "panel" | "products"; panelIndex?: number } | null }} */
let state = loadState() || defaultState();

function defaultNavStyle() {
  return { stretch: false, paddingX: 0.9, paddingY: 0.45, gap: 0.35, minWidth: 0 };
}

function normalizePanel(p) {
  return {
    title: p.title ?? "",
    body: p.body ?? "",
    glass: p.glass !== false,
    blur: typeof p.blur === "number" ? clamp(p.blur, 0, 48) : 12,
    opacity: typeof p.opacity === "number" ? clamp(p.opacity, 0, 1) : 0.22,
  };
}

function migrateState(st) {
  st.navStyle = { ...defaultNavStyle(), ...(st.navStyle || {}) };
  if (typeof st.layoutDragMode !== "boolean") st.layoutDragMode = false;
  if (!st.selectionDockFocus || !["screen", "menu", "preview-block"].includes(st.selectionDockFocus)) {
    st.selectionDockFocus = "screen";
  }
  if (st.selectionDockBlock === undefined) st.selectionDockBlock = null;
  st.screens.forEach((s) => {
    if (!Array.isArray(s.panels)) s.panels = [];
    s.panels = s.panels.map(normalizePanel);
    if (!s.layout || typeof s.layout !== "object") {
      delete s.layout;
    } else if (!Array.isArray(s.layout.panels)) {
      s.layout.panels = [];
    }
  });
  return st;
}

function defaultState() {
  return {
    navStyle: defaultNavStyle(),
    layoutDragMode: false,
    screens: [
      {
        id: "inicio",
        title: "Bienvenida",
        subtitle: "Toca los botones del menú para cambiar de pantalla. Edita cada pantalla en el panel derecho.",
        bgColor: "#1a1a2e",
        bgGradient: "linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
        bgImageDataUrl: null,
        panels: [
          {
            title: "Panel con efecto cristal",
            body: "Fondo semitransparente y desenfoque. Edita blur y opacidad en el panel derecho, o añade más paneles.",
            glass: true,
            blur: 14,
            opacity: 0.2,
          },
        ],
        products: [],
      },
      {
        id: "productos",
        title: "Productos",
        subtitle: "Ejemplo de tarjetas. Añade o edita productos en el panel.",
        bgColor: "#1b4332",
        bgGradient: "linear-gradient(145deg, #1b4332, #2d6a4f)",
        bgImageDataUrl: null,
        panels: [],
        products: [
          { name: "Plan Básico", price: "9 €/mes" },
          { name: "Plan Pro", price: "29 €/mes" },
        ],
      },
    ],
    menu: [
      { id: "m1", label: "Inicio", targetScreenId: "inicio" },
      { id: "m2", label: "Productos", targetScreenId: "productos" },
    ],
    previewScreenId: "inicio",
    editScreenId: "inicio",
    editMenuId: "m1",
    selectionDockFocus: "screen",
    selectionDockBlock: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.screens?.length) return null;
    if (!parsed.editMenuId && parsed.menu?.length) parsed.editMenuId = parsed.menu[0].id;
    return migrateState(parsed);
  } catch {
    return null;
  }
}

const MAX_UNDO = 80;
/** @type {string[]} */
let undoHist = [];
let undoPtr = -1;
let restoringUndo = false;
let persistHistTimer = 0;

function snapshotForUndo() {
  return JSON.stringify({
    screens: state.screens,
    menu: state.menu,
    navStyle: state.navStyle,
    layoutDragMode: state.layoutDragMode,
    previewScreenId: state.previewScreenId,
    editScreenId: state.editScreenId,
    editMenuId: state.editMenuId,
    selectionDockFocus: state.selectionDockFocus,
    selectionDockBlock: state.selectionDockBlock,
  });
}

function pushUndoHistory() {
  if (restoringUndo) return;
  const snap = snapshotForUndo();
  if (undoPtr >= 0 && undoHist[undoPtr] === snap) return;
  undoHist = undoHist.slice(0, undoPtr + 1);
  undoHist.push(snap);
  undoPtr = undoHist.length - 1;
  while (undoHist.length > MAX_UNDO) {
    undoHist.shift();
    undoPtr--;
  }
  updateUndoRedoButtons();
}

function applyUndoSnapshot(json) {
  restoringUndo = true;
  try {
    const o = JSON.parse(json);
    state.screens = o.screens;
    state.menu = o.menu;
    state.navStyle = { ...defaultNavStyle(), ...(o.navStyle || {}) };
    state.layoutDragMode = !!o.layoutDragMode;
    state.previewScreenId = o.previewScreenId;
    state.editScreenId = o.editScreenId;
    state.editMenuId = o.editMenuId;
    state.selectionDockFocus = o.selectionDockFocus ?? "screen";
    state.selectionDockBlock = o.selectionDockBlock ?? null;
    migrateState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    syncPreviewScale();
    updateUndoRedoButtons();
  } finally {
    restoringUndo = false;
  }
}

function undoAction() {
  if (undoPtr <= 0) return;
  undoPtr--;
  applyUndoSnapshot(undoHist[undoPtr]);
}

function redoAction() {
  if (undoPtr >= undoHist.length - 1) return;
  undoPtr++;
  applyUndoSnapshot(undoHist[undoPtr]);
}

function updateUndoRedoButtons() {
  const u = document.getElementById("btn-undo");
  const r = document.getElementById("btn-redo");
  if (u) u.disabled = undoPtr <= 0;
  if (r) r.disabled = undoPtr >= undoHist.length - 1;
}

function initUndoHistory() {
  undoHist = [snapshotForUndo()];
  undoPtr = 0;
  updateUndoRedoButtons();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (restoringUndo) return;
  clearTimeout(persistHistTimer);
  persistHistTimer = setTimeout(() => pushUndoHistory(), 420);
}

/** Alinea la vista previa embebida al mismo ancho lógico que `window` (como pantalla completa), escalado al marco */
function syncPreviewScale() {
  const outer = document.getElementById("preview-outer");
  const frame = document.getElementById("preview-root");
  const scaleInner = document.getElementById("preview-scale-inner");
  const wrap = frame?.querySelector(".preview-scale-wrap");
  const note = document.getElementById("preview-scale-note");
  if (!frame || !scaleInner || !wrap) return;

  const isFs = document.fullscreenElement === outer;
  if (note) note.hidden = isFs;

  if (isFs) {
    scaleInner.style.width = "";
    scaleInner.style.transform = "";
    scaleInner.style.transformOrigin = "";
    scaleInner.style.marginLeft = "";
    scaleInner.style.marginRight = "";
    wrap.style.width = "";
    wrap.style.minHeight = "";
    wrap.style.height = "";
    return;
  }

  const refW = Math.max(360, window.innerWidth);
  const avail = Math.max(1, frame.clientWidth - 2);
  const s = Math.min(1, avail / refW);

  scaleInner.style.width = `${refW}px`;
  scaleInner.style.transformOrigin = "top left";
  scaleInner.style.transform = `scale(${s})`;
  const visualW = refW * s;
  wrap.style.width = `${visualW}px`;
  wrap.style.marginLeft = "auto";
  wrap.style.marginRight = "auto";

  requestAnimationFrame(() => {
    const br = scaleInner.getBoundingClientRect();
    wrap.style.minHeight = `${Math.ceil(br.height)}px`;
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "pantalla";
}

function screenById(id) {
  return state.screens.find((s) => s.id === id);
}

function uniqueScreenId(base) {
  let id = base;
  let n = 2;
  while (state.screens.some((s) => s.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function initDefaultScreenLayout(s) {
  /** @type {ScreenLayout} */
  const L = {
    head: { left: 4, top: 8, width: 90 },
    panels: (s.panels || []).map((_, i) => ({ left: 4, top: 26 + i * 22, width: 72 })),
    products: s.products?.length ? { left: 4, top: 58, width: 92 } : undefined,
  };
  s.layout = L;
}

function ensureScreenLayoutSync(s) {
  if (!s.layout) return;
  if (!s.layout.head || typeof s.layout.head.left !== "number") {
    s.layout.head = { left: 4, top: 8, width: 90 };
  }
  if (!Array.isArray(s.layout.panels)) s.layout.panels = [];
  const n = s.panels?.length || 0;
  while (s.layout.panels.length < n) {
    const i = s.layout.panels.length;
    s.layout.panels.push({ left: 4, top: 28 + i * 22, width: 70 });
  }
  while (s.layout.panels.length > n) s.layout.panels.pop();
  if (s.products?.length) {
    if (!s.layout.products) s.layout.products = { left: 4, top: 62, width: 92 };
  } else {
    delete s.layout.products;
  }
}

/** Estilos de caja en línea para HTML/CSS exportado */
function boxGeomInline(box) {
  if (!box) return "";
  const w = box.width != null ? box.width : 88;
  return `position:absolute;left:${box.left}%;top:${box.top}%;width:${w}%;box-sizing:border-box;`;
}

function applyLayoutToEl(el, box) {
  if (!box) return;
  el.style.position = "absolute";
  el.style.left = `${box.left}%`;
  el.style.top = `${box.top}%`;
  el.style.width = `${box.width != null ? box.width : 88}%`;
  el.style.boxSizing = "border-box";
}

function clearLayoutEl(el) {
  el.style.position = "";
  el.style.left = "";
  el.style.top = "";
  el.style.width = "";
  el.style.boxSizing = "";
}

function applyNavStyleToElement(nav) {
  const ns = state.navStyle;
  nav.style.gap = `${ns.gap}rem`;
  nav.classList.toggle("nav-stretch", ns.stretch);
  nav.querySelectorAll("button").forEach((btn) => {
    btn.style.padding = `${ns.paddingY}rem ${ns.paddingX}rem`;
    if (ns.stretch) {
      btn.style.flex = "1 1 0";
      btn.style.minWidth = ns.minWidth > 0 ? `${ns.minWidth}px` : "0";
    } else {
      btn.style.flex = "";
      btn.style.minWidth = ns.minWidth > 0 ? `${ns.minWidth}px` : "";
    }
  });
}

function buildPanelPreviewElement(pan) {
  const el = document.createElement("section");
  el.className = "content-panel" + (pan.glass ? "" : " panel-solid");
  const op = clamp(pan.opacity, 0, 1);
  const blur = clamp(pan.blur, 0, 48);
  if (pan.glass) {
    el.style.background = `rgba(12, 18, 28, ${op})`;
    el.style.backdropFilter = `blur(${blur}px)`;
    el.style.webkitBackdropFilter = `blur(${blur}px)`;
    el.style.border = "1px solid rgba(255, 255, 255, 0.15)";
  }
  const h3 = document.createElement("h3");
  h3.textContent = pan.title;
  const p = document.createElement("p");
  p.textContent = pan.body;
  el.appendChild(h3);
  el.appendChild(p);
  return el;
}

function renderContentPanelsPreview(inner, s) {
  if (!s.panels?.length) return;
  if (s.layout) {
    ensureScreenLayoutSync(s);
    s.panels.forEach((pan, i) => {
      const el = buildPanelPreviewElement(pan);
      el.dataset.dragLayout = "panel";
      el.dataset.dragIndex = String(i);
      applyLayoutToEl(el, s.layout.panels[i]);
      inner.appendChild(el);
    });
  } else {
    const wrap = document.createElement("div");
    wrap.className = "content-panels";
    s.panels.forEach((pan) => wrap.appendChild(buildPanelPreviewElement(pan)));
    inner.appendChild(wrap);
  }
}

function bindLayoutDragForScreen(inner, s) {
  if (!s.layout) return;
  inner.querySelectorAll("[data-drag-layout]").forEach((el) => {
    el.classList.toggle("layout-drag-target", !!state.layoutDragMode);

    el.addEventListener(
      "pointerdown",
      (e) => {
        if (!state.layoutDragMode || !s.layout) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        ensureScreenLayoutSync(s);
        const key = el.dataset.dragLayout;
        const idx = el.dataset.dragIndex;
        /** @type {LayoutBox | undefined} */
        let box;
        if (key === "head") box = s.layout.head;
        else if (key === "products") box = s.layout.products;
        else if (key === "panel" && idx != null) box = s.layout.panels[+idx];
        if (!box) return;

        state.selectionDockFocus = "preview-block";
        state.selectionDockBlock = {
          screenId: s.id,
          kind: key === "head" ? "head" : key === "products" ? "products" : "panel",
          panelIndex: key === "panel" && idx != null ? +idx : undefined,
        };
        renderSelectionDock();

        const elRect = el.getBoundingClientRect();
        const grabX = e.clientX - elRect.left;
        const grabY = e.clientY - elRect.top;
        const capId = e.pointerId;

        function scaleFactorsForInner() {
          const r = inner.getBoundingClientRect();
          const ow = Math.max(inner.offsetWidth, 1);
          const oh = Math.max(inner.offsetHeight, 1);
          return { sx: r.width / ow, sy: r.height / oh, r };
        }

        const sf0 = scaleFactorsForInner();
        const grabLayoutX = grabX / sf0.sx;
        const grabLayoutY = grabY / sf0.sy;

        function applyFromPointer(clientX, clientY) {
          const { sx, sy, r } = scaleFactorsForInner();
          const x = (clientX - r.left) / sx - grabLayoutX;
          const y = (clientY - r.top) / sy - grabLayoutY;
          const w = Math.max(inner.offsetWidth, 1);
          const h = Math.max(inner.offsetHeight, 1);
          box.left = clamp((x / w) * 100, 0, 100);
          box.top = clamp((y / h) * 100, 0, 100);
          applyLayoutToEl(el, box);
        }

        let finished = false;
        function teardown() {
          if (finished) return;
          finished = true;
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUpDoc);
          document.removeEventListener("pointercancel", onUpDoc);
          try {
            el.releasePointerCapture(capId);
          } catch (_) {
            /* ignore */
          }
          document.body.style.cursor = "";
          persist();
          pushUndoHistory();
        }

        function onMove(ev) {
          if (!state.layoutDragMode || finished) return;
          ev.preventDefault();
          applyFromPointer(ev.clientX, ev.clientY);
        }

        function onUpDoc() {
          teardown();
        }

        document.body.style.cursor = "grabbing";
        try {
          el.setPointerCapture(capId);
        } catch (_) {
          /* sin captura seguimos con listeners en document */
        }
        document.addEventListener("pointermove", onMove, { passive: false });
        document.addEventListener("pointerup", onUpDoc);
        document.addEventListener("pointercancel", onUpDoc);
      },
      { passive: false }
    );
  });
}

function syncLayoutDragToolbarLabel() {
  const btn = document.getElementById("btn-layout-drag-mode");
  if (btn) btn.textContent = state.layoutDragMode ? "Modo arrastre: on" : "Modo arrastre: off";
}

function renderSelectionDock() {
  const body = document.getElementById("selection-dock-body");
  if (!body) return;
  const focus = state.selectionDockFocus || "screen";
  let html = "";

  if (focus === "screen") {
    const s = screenById(state.editScreenId);
    if (s) {
      const nPan = s.panels?.length ?? 0;
      const nProd = s.products?.length ?? 0;
      const free = s.layout ? `<p class="selection-dock-badge">Posición libre</p>` : "";
      html = `<p class="selection-dock-title">Pantalla en edición</p>
<p class="selection-dock-main">${escapeHtml(s.title)}</p>
<p class="selection-dock-meta">ID <code>${escapeHtml(s.id)}</code></p>
<p class="selection-dock-meta">${nPan} panel(es) · ${nProd} producto(s)</p>${free}`;
    }
  } else if (focus === "menu") {
    const m = state.menu.find((x) => x.id === state.editMenuId);
    if (m) {
      html = `<p class="selection-dock-title">Enlace del menú</p>
<p class="selection-dock-main">${escapeHtml(m.label)}</p>
<p class="selection-dock-meta">Destino <code>${escapeHtml(m.targetScreenId)}</code></p>`;
    }
  } else if (focus === "preview-block" && state.selectionDockBlock) {
    const b = state.selectionDockBlock;
    const labels = { head: "Cabecera (título y subtítulo)", panel: "Panel de contenido", products: "Cuadrícula de productos" };
    const scr = screenById(b.screenId);
    let extra = "";
    if (b.kind === "panel" && scr && b.panelIndex != null && scr.panels[b.panelIndex]) {
      extra = `<p class="selection-dock-meta">“${escapeHtml(scr.panels[b.panelIndex].title)}”</p>`;
    }
    const idxLine =
      b.kind === "panel" && b.panelIndex != null ? `<p class="selection-dock-meta">Panel n.º ${b.panelIndex + 1}</p>` : "";
    html = `<p class="selection-dock-title">Bloque en vista previa</p>
<p class="selection-dock-main">${labels[b.kind] || b.kind}</p>${idxLine}${extra}
<p class="selection-dock-meta">Pantalla <code>${escapeHtml(b.screenId)}</code></p>`;
  }

  if (!html) {
    html = `<p class="hint" style="margin:0">Selecciona una pantalla o un enlace en las listas de arriba, o un bloque con el modo arrastre.</p>`;
  }
  body.innerHTML = html;
}

/* ---------- Render lists ---------- */

function renderScreenList() {
  const ul = document.getElementById("screen-list");
  ul.innerHTML = "";
  state.screens.forEach((s) => {
    const li = document.createElement("li");
    li.className = "list-item" + (state.editScreenId === s.id ? " active" : "");
    li.innerHTML = `<span title="${escapeAttr(s.title)}">${escapeHtml(s.title)} <small style="opacity:.6">(${escapeHtml(s.id)})</small></span>`;
    li.addEventListener("click", () => {
      state.selectionDockFocus = "screen";
      state.selectionDockBlock = null;
      state.editScreenId = s.id;
      state.previewScreenId = s.id;
      renderAll();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn";
    del.setAttribute("aria-label", "Eliminar pantalla");
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.screens.length <= 1) return;
      state.screens = state.screens.filter((x) => x.id !== s.id);
      state.menu = state.menu.map((m) =>
        m.targetScreenId === s.id ? { ...m, targetScreenId: state.screens[0].id } : m
      );
      if (state.previewScreenId === s.id) state.previewScreenId = state.screens[0].id;
      if (state.editScreenId === s.id) state.editScreenId = state.screens[0].id;
      renderAll();
      persist();
    });
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function renderMenuList() {
  const ul = document.getElementById("menu-list");
  ul.innerHTML = "";
  state.menu.forEach((m) => {
    const li = document.createElement("li");
    li.className = "list-item" + (state.editMenuId === m.id ? " active" : "");
    const active = state.previewScreenId === m.targetScreenId;
    const span = document.createElement("span");
    span.innerHTML = `${escapeHtml(m.label)} → <small style="opacity:.8">${escapeHtml(m.targetScreenId)}</small>`;
    span.addEventListener("click", () => {
      state.selectionDockFocus = "menu";
      state.selectionDockBlock = null;
      state.editMenuId = m.id;
      renderAll();
    });
    li.appendChild(span);
    const go = document.createElement("button");
    go.type = "button";
    go.className = "icon-btn";
    go.title = "Ir en vista previa";
    go.textContent = active ? "●" : "○";
    go.style.color = active ? "var(--success)" : "";
    go.addEventListener("click", (e) => {
      e.stopPropagation();
      state.previewScreenId = m.targetScreenId;
      state.selectionDockFocus = "screen";
      state.selectionDockBlock = null;
      state.editScreenId = m.targetScreenId;
      renderAll();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn";
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.menu.length <= 1) return;
      const removed = m.id;
      state.menu = state.menu.filter((x) => x.id !== m.id);
      if (state.editMenuId === removed) state.editMenuId = state.menu[0]?.id ?? null;
      renderAll();
      persist();
    });
    li.appendChild(go);
    li.appendChild(del);
    ul.appendChild(li);
  });
  fillMenuEditPanel();
}

function fillMenuEditPanel() {
  const panel = document.getElementById("menu-edit-panel");
  const labelInp = document.getElementById("menu-edit-label");
  const targetSel = document.getElementById("menu-edit-target");
  const m = state.menu.find((x) => x.id === state.editMenuId);
  if (!m) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  labelInp.value = m.label;
  targetSel.innerHTML = state.screens
    .map((s) => `<option value="${escapeAttr(s.id)}" ${s.id === m.targetScreenId ? "selected" : ""}>${escapeHtml(s.title)} (${escapeHtml(s.id)})</option>`)
    .join("");
}

function bindMenuEditPanel() {
  const labelInp = document.getElementById("menu-edit-label");
  const targetSel = document.getElementById("menu-edit-target");
  const apply = () => {
    const m = state.menu.find((x) => x.id === state.editMenuId);
    if (!m) return;
    m.label = labelInp.value || "Enlace";
    m.targetScreenId = targetSel.value;
    renderMenuList();
    renderPreview();
    persist();
  };
  labelInp.addEventListener("input", apply);
  targetSel.addEventListener("change", apply);
}

function updatePreviewLabel() {
  const el = document.getElementById("preview-active-label");
  const s = screenById(state.previewScreenId);
  el.textContent = s ? `Activa: ${s.id}` : "";
}

/* ---------- Preview ---------- */

function screenBackgroundStyle(s) {
  const parts = [];
  if (s.bgGradient) parts.push(s.bgGradient);
  else parts.push(s.bgColor);
  const img =
    s.bgImageDataUrl || ("bgImageUrl" in s && s.bgImageUrl ? String(s.bgImageUrl) : null);
  if (img) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url(${img})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: s.bgColor,
    };
  }
  return {
    background: parts[0],
    backgroundColor: s.bgColor,
  };
}

function applyBgToEl(el, s) {
  const st = screenBackgroundStyle(s);
  el.style.background = "";
  el.style.backgroundImage = "";
  el.style.backgroundSize = "";
  el.style.backgroundPosition = "";
  el.style.backgroundColor = "";
  Object.assign(el.style, st);
}

function renderPreview() {
  const root = document.getElementById("preview-root");
  root.innerHTML = "";

  const inner = document.createElement("div");
  inner.className = "preview-inner";

  const nav = document.createElement("nav");
  nav.className = "site-nav";
  state.menu.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = m.label;
    if (m.targetScreenId === state.previewScreenId) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      state.previewScreenId = m.targetScreenId;
      state.selectionDockFocus = "screen";
      state.selectionDockBlock = null;
      state.editScreenId = m.targetScreenId;
      renderAll();
    });
    nav.appendChild(btn);
  });
  applyNavStyleToElement(nav);
  inner.appendChild(nav);

  state.screens.forEach((s) => {
    const section = document.createElement("section");
    section.className = "screen" + (s.id === state.previewScreenId ? " is-visible" : "");
    section.dataset.screenId = s.id;
    applyBgToEl(section, s);

    const screenInner = document.createElement("div");
    screenInner.className = "screen-inner";
    if (s.layout) {
      ensureScreenLayoutSync(s);
      screenInner.classList.add("screen-inner--free");
    }

    const head = document.createElement("header");
    head.className = "screen-head";
    if (s.layout) {
      head.dataset.dragLayout = "head";
      applyLayoutToEl(head, s.layout.head);
    }
    const h2 = document.createElement("h2");
    h2.textContent = s.title;
    const p = document.createElement("p");
    p.textContent = s.subtitle;
    head.appendChild(h2);
    head.appendChild(p);
    screenInner.appendChild(head);

    renderContentPanelsPreview(screenInner, s);

    if (s.products?.length) {
      const grid = document.createElement("div");
      grid.className = "product-grid";
      if (s.layout) {
        grid.dataset.dragLayout = "products";
        applyLayoutToEl(grid, s.layout.products);
      }
      s.products.forEach((pr) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.innerHTML = `<h3>${escapeHtml(pr.name)}</h3><p>${escapeHtml(pr.price)}</p>`;
        grid.appendChild(card);
      });
      screenInner.appendChild(grid);
    }

    section.appendChild(screenInner);
    inner.appendChild(section);

    bindLayoutDragForScreen(screenInner, s);
  });

  const scaleWrap = document.createElement("div");
  scaleWrap.className = "preview-scale-wrap";
  const scaleInner = document.createElement("div");
  scaleInner.className = "preview-scale-inner";
  scaleInner.id = "preview-scale-inner";
  scaleInner.appendChild(inner);
  scaleWrap.appendChild(scaleInner);
  root.appendChild(scaleWrap);

  updatePreviewLabel();
  syncLayoutDragToolbarLabel();
  requestAnimationFrame(() => {
    syncPreviewScale();
    requestAnimationFrame(() => syncPreviewScale());
  });
}

/* ---------- Edit form ---------- */

function fillEditForm() {
  const s = screenById(state.editScreenId);
  const hint = document.getElementById("edit-screen-hint");
  if (!s) {
    hint.textContent = "No hay pantalla seleccionada.";
    return;
  }
  hint.textContent = `Editando: ${s.id}`;

  const freeCb = document.getElementById("edit-free-layout");
  if (freeCb) freeCb.checked = !!s.layout;

  const idInput = document.getElementById("edit-id");
  const titleInput = document.getElementById("edit-title");
  const subInput = document.getElementById("edit-subtitle");
  const colorInput = document.getElementById("edit-bg-color");
  const gradInput = document.getElementById("edit-bg-gradient");
  const urlInput = document.getElementById("edit-bg-image-url");

  idInput.value = s.id;
  titleInput.value = s.title;
  subInput.value = s.subtitle;
  colorInput.value = toHexColor(s.bgColor);
  gradInput.value = s.bgGradient || "";
  urlInput.value = "";

  renderPanelBlockEditors();
  renderProductEditors();
}

function renderProductEditors() {
  const s = screenById(state.editScreenId);
  const ul = document.getElementById("product-editor-list");
  ul.innerHTML = "";
  if (!s) return;
  s.products.forEach((pr, idx) => {
    const li = document.createElement("li");
    li.className = "product-editor-item";
    li.innerHTML = `
      <div class="product-editor-head"><span>Producto ${idx + 1}</span><button type="button" class="icon-btn rm-prod" data-i="${idx}">×</button></div>
      <label>Nombre<input type="text" class="prod-name" data-i="${idx}" value="${escapeAttr(pr.name)}" /></label>
      <label>Precio / detalle<input type="text" class="prod-price" data-i="${idx}" value="${escapeAttr(pr.price)}" /></label>
    `;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".prod-name, .prod-price").forEach((inp) => {
    inp.addEventListener("input", onProductFieldInput);
  });
  ul.querySelectorAll(".rm-prod").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.getAttribute("data-i");
      s.products.splice(i, 1);
      renderProductEditors();
      renderPreview();
      persist();
    });
  });
}

function renderPanelBlockEditors() {
  const s = screenById(state.editScreenId);
  const ul = document.getElementById("panel-blocks-editor-list");
  ul.innerHTML = "";
  if (!s) return;
  if (!Array.isArray(s.panels)) s.panels = [];
  s.panels.forEach((pan, idx) => {
    const li = document.createElement("li");
    li.className = "panel-block-editor-item";
    li.innerHTML = `
      <div class="panel-block-editor-head"><span>Panel ${idx + 1}</span><button type="button" class="icon-btn rm-panel" data-i="${idx}">×</button></div>
      <label class="field"><span>Título</span><input type="text" class="panel-title" data-i="${idx}" value="${escapeAttr(pan.title)}" /></label>
      <label class="field"><span>Texto</span><textarea class="panel-body" data-i="${idx}" rows="2"></textarea></label>
      <label class="field check-field"><span class="check-row"><input type="checkbox" class="panel-glass" data-i="${idx}" ${pan.glass ? "checked" : ""} /> Efecto cristal (transparente + difuminado)</span></label>
      <div class="panel-block-glass-opts" data-glass-opts="${idx}">
        <label>Desenfoque (blur) <output class="panel-blur-out" data-i="${idx}"></output><input type="range" class="panel-blur" data-i="${idx}" min="0" max="40" step="1" value="${pan.blur}" /></label>
        <label>Opacidad del fondo <output class="panel-op-out" data-i="${idx}"></output><input type="range" class="panel-op" data-i="${idx}" min="0.05" max="0.85" step="0.01" value="${pan.opacity}" /></label>
      </div>
    `;
    ul.appendChild(li);
    const ta = li.querySelector(".panel-body");
    if (ta) ta.value = pan.body;
  });

  ul.querySelectorAll(".panel-title").forEach((inp) => inp.addEventListener("input", onPanelFieldInput));
  ul.querySelectorAll(".panel-body").forEach((inp) => inp.addEventListener("input", onPanelFieldInput));
  ul.querySelectorAll(".panel-glass").forEach((inp) => inp.addEventListener("change", onPanelFieldInput));
  ul.querySelectorAll(".panel-blur, .panel-op").forEach((inp) => inp.addEventListener("input", onPanelFieldInput));

  s.panels.forEach((pan, idx) => {
    const blurOut = ul.querySelector(`.panel-blur-out[data-i="${idx}"]`);
    const opOut = ul.querySelector(`.panel-op-out[data-i="${idx}"]`);
    const glassOpts = ul.querySelector(`[data-glass-opts="${idx}"]`);
    const glassCb = ul.querySelector(`.panel-glass[data-i="${idx}"]`);
    if (blurOut) blurOut.textContent = String(pan.blur);
    if (opOut) opOut.textContent = pan.opacity.toFixed(2);
    if (glassOpts) glassOpts.style.opacity = pan.glass && glassCb?.checked !== false ? "1" : "0.45";
    if (glassOpts) glassOpts.style.pointerEvents = pan.glass ? "auto" : "none";
  });

  ul.querySelectorAll(".rm-panel").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.getAttribute("data-i");
      s.panels.splice(i, 1);
      renderPanelBlockEditors();
      renderPreview();
      persist();
    });
  });
}

function onPanelFieldInput(e) {
  const s = screenById(state.editScreenId);
  if (!s || !s.panels) return;
  const i = +e.target.getAttribute("data-i");
  const pan = s.panels[i];
  if (!pan) return;
  if (e.target.classList.contains("panel-title")) pan.title = e.target.value;
  else if (e.target.classList.contains("panel-body")) pan.body = e.target.value;
  else if (e.target.classList.contains("panel-glass")) {
    pan.glass = e.target.checked;
    const glassOpts = document.querySelector(`#panel-blocks-editor-list [data-glass-opts="${i}"]`);
    if (glassOpts) {
      glassOpts.style.opacity = pan.glass ? "1" : "0.45";
      glassOpts.style.pointerEvents = pan.glass ? "auto" : "none";
    }
  } else if (e.target.classList.contains("panel-blur")) {
    pan.blur = clamp(+e.target.value, 0, 48);
    const out = document.querySelector(`#panel-blocks-editor-list .panel-blur-out[data-i="${i}"]`);
    if (out) out.textContent = String(pan.blur);
  } else if (e.target.classList.contains("panel-op")) {
    pan.opacity = clamp(+e.target.value, 0, 1);
    const out = document.querySelector(`#panel-blocks-editor-list .panel-op-out[data-i="${i}"]`);
    if (out) out.textContent = pan.opacity.toFixed(2);
  }
  Object.assign(pan, normalizePanel(pan));
  renderPreview();
  persist();
}

function onProductFieldInput(e) {
  const s = screenById(state.editScreenId);
  if (!s) return;
  const i = +e.target.getAttribute("data-i");
  if (e.target.classList.contains("prod-name")) s.products[i].name = e.target.value;
  else s.products[i].price = e.target.value;
  renderPreview();
  renderScreenList();
  persist();
}

function bindEditForm() {
  const idInput = document.getElementById("edit-id");
  const titleInput = document.getElementById("edit-title");
  const subInput = document.getElementById("edit-subtitle");
  const colorInput = document.getElementById("edit-bg-color");
  const gradInput = document.getElementById("edit-bg-gradient");
  const urlInput = document.getElementById("edit-bg-image-url");
  const fileInput = document.getElementById("edit-bg-image-file");

  const apply = () => {
    const s = screenById(state.editScreenId);
    if (!s) return;
    const newId = slugify(idInput.value.trim() || s.id);
    if (newId !== s.id) {
      if (state.screens.some((x) => x.id === newId && x !== s)) {
        idInput.value = s.id;
        return;
      }
      const oldId = s.id;
      s.id = newId;
      state.menu.forEach((m) => {
        if (m.targetScreenId === oldId) m.targetScreenId = newId;
      });
      if (state.previewScreenId === oldId) state.previewScreenId = newId;
      state.editScreenId = newId;
    }
    s.title = titleInput.value;
    s.subtitle = subInput.value;
    s.bgColor = colorInput.value;
    s.bgGradient = gradInput.value.trim();
    renderPreview();
    renderScreenList();
    renderMenuList();
    persist();
  };

  idInput.addEventListener("change", apply);
  titleInput.addEventListener("input", apply);
  subInput.addEventListener("input", apply);
  colorInput.addEventListener("input", apply);
  gradInput.addEventListener("input", apply);

  urlInput.addEventListener("change", () => {
    const s = screenById(state.editScreenId);
    if (!s || !urlInput.value.trim()) return;
    s.bgImageDataUrl = null;
    s.bgImageUrl = urlInput.value.trim();
    applyBgFromUrl(s, urlInput.value.trim());
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const s = screenById(state.editScreenId);
      if (!s) return;
      s.bgImageDataUrl = reader.result;
      delete s.bgImageUrl;
      renderPreview();
      persist();
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  document.getElementById("btn-clear-bg-image").addEventListener("click", () => {
    const s = screenById(state.editScreenId);
    if (!s) return;
    s.bgImageDataUrl = null;
    delete s.bgImageUrl;
    urlInput.value = "";
    renderPreview();
    persist();
  });
}

function applyBgFromUrl(s, url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      s.bgImageDataUrl = c.toDataURL("image/jpeg", 0.85);
    } catch {
      s.bgImageUrl = url;
    }
    renderPreview();
    persist();
  };
  img.onerror = () => {
    s.bgImageUrl = url;
    renderPreview();
    persist();
  };
  img.src = url;
}

/* ---------- Add screen / menu ---------- */

document.getElementById("btn-add-screen").addEventListener("click", () => {
  const base = uniqueScreenId("pantalla");
  const n = state.screens.filter((x) => x.id.startsWith("pantalla")).length + 1;
  state.screens.push({
    id: base,
    title: `Pantalla ${n}`,
    subtitle: "Texto de esta pantalla.",
    bgColor: "#2b2d42",
    bgGradient: "linear-gradient(135deg, #2b2d42, #8d99ae)",
    bgImageDataUrl: null,
    panels: [],
    products: [],
  });
  state.editScreenId = base;
  state.previewScreenId = base;
  renderAll();
  persist();
});

document.getElementById("btn-add-menu").addEventListener("click", () => {
  const target = state.screens[0]?.id || "inicio";
  const id = "m" + Date.now();
  state.menu.push({
    id,
    label: "Nuevo",
    targetScreenId: target,
  });
  state.editMenuId = id;
  renderAll();
  persist();
});

document.getElementById("btn-add-panel-block").addEventListener("click", () => {
  const s = screenById(state.editScreenId);
  if (!s) return;
  if (!Array.isArray(s.panels)) s.panels = [];
  s.panels.push({
    title: "Nuevo panel",
    body: "Escribe aquí. Activa “cristal” para transparencia y blur.",
    glass: true,
    blur: 12,
    opacity: 0.22,
  });
  renderPanelBlockEditors();
  renderPreview();
  persist();
});

document.getElementById("btn-add-product").addEventListener("click", () => {
  const s = screenById(state.editScreenId);
  if (!s) return;
  s.products.push({ name: "Nuevo producto", price: "—" });
  renderProductEditors();
  renderPreview();
  persist();
});

/* ---------- Reference image quick apply ---------- */

document.getElementById("ref-image-file").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const s = screenById(state.editScreenId);
    if (!s) return;
    s.bgImageDataUrl = reader.result;
    renderPreview();
    persist();
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

/* ---------- Demo & export ---------- */

document.getElementById("btn-load-demo").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  renderAll();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  initUndoHistory();
});

let exportTab = "html";

function panelExportCombinedStyle(p, box) {
  const op = clamp(typeof p.opacity === "number" ? p.opacity : 0.22, 0, 1);
  const blur = clamp(typeof p.blur === "number" ? p.blur : 12, 0, 48);
  const glass = p.glass !== false;
  const geom = boxGeomInline(box || { left: 4, top: 30, width: 72 });
  const visual = glass
    ? `background:rgba(12,18,28,${op});backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);border:1px solid rgba(255,255,255,0.15);`
    : `background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);`;
  return ` style="${geom}${visual}"`;
}

function panelsHtmlForExport(s) {
  const esc = escapeHtml;
  if (!s.panels?.length) return "";
  if (s.layout) {
    ensureScreenLayoutSync(s);
    return s.panels
      .map((p, i) => {
        const attr = panelExportCombinedStyle(p, s.layout.panels[i]);
        return `          <section class="content-panel"${attr}>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.body)}</p>
          </section>`;
      })
      .join("\n");
  }
  const rows = s.panels
    .map((p) => {
      const op = clamp(typeof p.opacity === "number" ? p.opacity : 0.22, 0, 1);
      const blur = clamp(typeof p.blur === "number" ? p.blur : 12, 0, 48);
      const glass = p.glass !== false;
      const style = glass
        ? ` style="background: rgba(12, 18, 28, ${op}); backdrop-filter: blur(${blur}px); -webkit-backdrop-filter: blur(${blur}px); border: 1px solid rgba(255,255,255,0.15);"`
        : ` style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);"`;
      return `          <section class="content-panel"${style}>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.body)}</p>
          </section>`;
    })
    .join("\n");
  return `
        <div class="content-panels">
${rows}
        </div>`;
}

function getExportedNavCss() {
  const ns = state.navStyle;
  const wrap = ns.stretch ? "nowrap" : "wrap";
  let navBtnExtra = "";
  if (ns.stretch) {
    navBtnExtra = `\n.nav-btn { flex: 1 1 0; min-width: ${ns.minWidth > 0 ? ns.minWidth + "px" : "0"}; }`;
  } else if (ns.minWidth > 0) {
    navBtnExtra = `\n.nav-btn { min-width: ${ns.minWidth}px; }`;
  }
  return `/* --- Navegación --- */
.site-nav {
  display: flex;
  flex-wrap: ${wrap};
  gap: ${ns.gap}rem;
  padding: 0.85rem 1.25rem;
  background: var(--nav-bg);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-btn {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: ${ns.paddingY}rem ${ns.paddingX}rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.nav-btn:hover { background: rgba(255, 255, 255, 0.12); }
.nav-btn.is-active {
  background: rgba(88, 166, 255, 0.35);
  border-color: rgba(88, 166, 255, 0.6);
}${navBtnExtra}`;
}

function buildExportedHtml() {
  const esc = escapeHtml;
  const navButtons = state.menu
    .map(
      (m) =>
        `          <button type="button" class="nav-btn" data-screen="${esc(m.targetScreenId)}">${esc(m.label)}</button>`
    )
    .join("\n");

  const screensHtml = state.screens
    .map((s) => {
      if (s.layout) ensureScreenLayoutSync(s);
      const innerClass = s.layout ? "screen-inner screen-inner--free" : "screen-inner";
      const headStyle = s.layout?.head ? ` style="${boxGeomInline(s.layout.head)}"` : "";
      const panelsBlock = panelsHtmlForExport(s);
      const gridOpen =
        s.products?.length > 0
          ? s.layout?.products
            ? `<div class="product-grid" style="${boxGeomInline(s.layout.products)}">`
            : `<div class="product-grid">`
          : "";
      const productsBlock =
        s.products?.length > 0
          ? `
        ${gridOpen}
${s.products
  .map(
    (p) => `          <article class="product-card">
            <h3>${esc(p.name)}</h3>
            <p>${esc(p.price)}</p>
          </article>`
  )
  .join("\n")}
        </div>`
          : "";
      return `      <!-- === Pantalla: ${esc(s.id)} === -->
      <section class="screen" id="screen-${esc(s.id)}" data-screen="${esc(s.id)}">
        <div class="${innerClass}">
          <header class="screen-head"${headStyle}>
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.subtitle)}</p>
          </header>
          ${panelsBlock}
          ${productsBlock}
        </div>
      </section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sitio exportado</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="site">
    <!-- === Navegación === -->
    <nav class="site-nav" aria-label="Principal">
${navButtons}
    </nav>

    <!-- === Contenido: pantallas === -->
    <main class="site-main">
${screensHtml}
    </main>
  </div>
  <script>
    (function () {
      var buttons = document.querySelectorAll(".nav-btn");
      var screens = document.querySelectorAll(".screen");
      function show(id) {
        screens.forEach(function (s) {
          var on = s.getAttribute("data-screen") === id;
          s.classList.toggle("is-active", on);
        });
        buttons.forEach(function (b) {
          var on = b.getAttribute("data-screen") === id;
          b.classList.toggle("is-active", on);
        });
      }
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          show(b.getAttribute("data-screen"));
        });
      });
      var first = document.querySelector(".nav-btn");
      if (first) show(first.getAttribute("data-screen"));
    })();
  </script>
</body>
</html>
`;
}

function buildExportedCss() {
  const lines = [];
  lines.push(`/* =============================================================================
   Sitio exportado — generado por Estudio visual
   Secciones: base, layout, navegación, pantallas, componentes
   ============================================================================= */`);
  lines.push("");
  lines.push(`/* --- Variables --- */
:root {
  --text: #f0f3f6;
  --nav-bg: rgba(0, 0, 0, 0.35);
  --card-bg: rgba(0, 0, 0, 0.35);
  --card-border: rgba(255, 255, 255, 0.12);
}`);
  lines.push("");
  lines.push(`/* --- Reset mínimo --- */
*,
*::before,
*::after { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: var(--text); }`);

  lines.push("");
  lines.push(`/* --- Layout del sitio --- */
.site { min-height: 100vh; display: flex; flex-direction: column; }
.site-main { flex: 1; position: relative; }`);

  lines.push("");
  lines.push(getExportedNavCss());

  lines.push("");
  lines.push(`/* --- Pantallas: visibilidad --- */
.screen {
  min-height: calc(100vh - 56px);
  display: none;
  flex-direction: column;
}
.screen.is-active { display: flex; }
.screen .screen-inner {
  flex: 1;
  padding: 2rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.screen .screen-inner.screen-inner--free {
  display: block;
  position: relative;
  min-height: calc(100vh - 56px);
  padding: 1.25rem;
  gap: 0;
}`);

  state.screens.forEach((s) => {
    const grad = s.bgGradient ? cssString(s.bgGradient) : "";
    const color = cssString(s.bgColor);
    const imgSrc = s.bgImageDataUrl || ("bgImageUrl" in s && s.bgImageUrl ? String(s.bgImageUrl) : "");
    let bgBlock;
    if (imgSrc) {
      const u = cssUrl(imgSrc);
      bgBlock = `background-image: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url(${u});
  background-size: cover;
  background-position: center;
  background-color: ${color};`;
    } else if (grad) {
      bgBlock = `background: ${grad};`;
    } else {
      bgBlock = `background-color: ${color};`;
    }
    lines.push("");
    lines.push(`/* --- Pantalla: ${s.id} (fondo) --- */
#screen-${s.id} {
  ${bgBlock}
}`);
  });

  lines.push("");
  lines.push(`/* --- Cabecera de pantalla --- */
.screen-head h2 {
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  margin: 0 0 0.5rem;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.4);
}
.screen-head p {
  max-width: 52ch;
  font-size: 1.05rem;
  opacity: 0.92;
  margin: 0;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.35);
}`);

  lines.push("");
  lines.push(`/* --- Paneles de contenido (estructura; fondos vía estilos en línea en HTML) --- */
.content-panels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 42rem;
}
.content-panel {
  border-radius: 14px;
  padding: 1rem 1.15rem;
}
.content-panel h3 {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
}
.content-panel p {
  margin: 0;
  font-size: 0.93rem;
  line-height: 1.45;
  white-space: pre-wrap;
}`);

  lines.push("");
  lines.push(`/* --- Tarjetas de producto --- */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.85rem;
}
.product-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 0.85rem;
  backdrop-filter: blur(6px);
}
.product-card h3 { margin: 0 0 0.35rem; font-size: 1rem; }
.product-card p { margin: 0; font-size: 0.85rem; opacity: 0.85; }`);

  return lines.join("\n");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function cssString(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Valor seguro para url("...") en CSS */
function cssUrl(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ") + '"';
}

function toHexColor(c) {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#1a1a2e";
  ctx.fillStyle = c;
  const out = ctx.fillStyle;
  if (typeof out === "string" && out.startsWith("#")) {
    if (out.length === 7) return out;
    if (out.length === 9) return out.slice(0, 7);
  }
  return "#1a1a2e";
}

document.getElementById("btn-export").addEventListener("click", () => {
  exportTab = "html";
  const modal = document.getElementById("export-modal");
  const ta = document.getElementById("export-textarea");
  ta.value = buildExportedHtml();
  modal.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === exportTab));
  modal.showModal();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    exportTab = tab.dataset.tab;
    const ta = document.getElementById("export-textarea");
    ta.value = exportTab === "html" ? buildExportedHtml() : buildExportedCss();
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === exportTab));
  });
});

document.getElementById("btn-copy-export").addEventListener("click", async () => {
  const ta = document.getElementById("export-textarea");
  try {
    await navigator.clipboard.writeText(ta.value);
  } catch {
    ta.select();
    document.execCommand("copy");
  }
});

document.getElementById("btn-download-export").addEventListener("click", () => {
  const ta = document.getElementById("export-textarea");
  const isHtml = exportTab === "html";
  const blob = new Blob([ta.value], { type: isHtml ? "text/html" : "text/css" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = isHtml ? "index.html" : "styles.css";
  a.click();
  URL.revokeObjectURL(a.href);
});

function syncNavOutputs() {
  const ns = state.navStyle;
  const px = document.getElementById("nav-pad-x-out");
  const py = document.getElementById("nav-pad-y-out");
  const g = document.getElementById("nav-gap-out");
  const mw = document.getElementById("nav-minw-out");
  if (px) px.textContent = `${ns.paddingX} rem`;
  if (py) py.textContent = `${ns.paddingY} rem`;
  if (g) g.textContent = `${ns.gap} rem`;
  if (mw) mw.textContent = ns.minWidth > 0 ? `${ns.minWidth} px` : "auto";
}

function fillNavForm() {
  const ns = state.navStyle;
  const stretch = document.getElementById("nav-stretch");
  const padX = document.getElementById("nav-pad-x");
  const padY = document.getElementById("nav-pad-y");
  const gap = document.getElementById("nav-gap");
  const minw = document.getElementById("nav-minw");
  if (stretch) stretch.checked = ns.stretch;
  if (padX) padX.value = String(ns.paddingX);
  if (padY) padY.value = String(ns.paddingY);
  if (gap) gap.value = String(ns.gap);
  if (minw) minw.value = String(ns.minWidth);
  syncNavOutputs();
}

function bindNavForm() {
  const ns = () => state.navStyle;
  document.getElementById("nav-stretch").addEventListener("change", (e) => {
    ns().stretch = e.target.checked;
    renderPreview();
    persist();
  });
  document.getElementById("nav-pad-x").addEventListener("input", (e) => {
    ns().paddingX = parseFloat(e.target.value);
    syncNavOutputs();
    renderPreview();
    persist();
  });
  document.getElementById("nav-pad-y").addEventListener("input", (e) => {
    ns().paddingY = parseFloat(e.target.value);
    syncNavOutputs();
    renderPreview();
    persist();
  });
  document.getElementById("nav-gap").addEventListener("input", (e) => {
    ns().gap = parseFloat(e.target.value);
    syncNavOutputs();
    renderPreview();
    persist();
  });
  document.getElementById("nav-minw").addEventListener("input", (e) => {
    ns().minWidth = parseInt(e.target.value, 10) || 0;
    syncNavOutputs();
    renderPreview();
    persist();
  });
}

function bindPreviewFullscreen() {
  const outer = document.getElementById("preview-outer");
  const btn = document.getElementById("btn-preview-fullscreen");
  const hint = document.getElementById("preview-fullscreen-hint");
  if (!outer || !btn) return;

  function syncFsUi() {
    const on = document.fullscreenElement === outer;
    btn.textContent = on ? "Salir de pantalla completa" : "Pantalla completa";
    if (hint) hint.hidden = !on;
    syncPreviewScale();
  }

  btn.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === outer) {
        await document.exitFullscreen();
      } else {
        await outer.requestFullscreen();
      }
    } catch (err) {
      console.warn("Pantalla completa no disponible:", err);
    }
  });
  document.addEventListener("fullscreenchange", syncFsUi);
  syncFsUi();
}

function bindUndoRedo() {
  const u = document.getElementById("btn-undo");
  const r = document.getElementById("btn-redo");
  if (u) u.addEventListener("click", () => undoAction());
  if (r) r.addEventListener("click", () => redoAction());

  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.closest?.("input, textarea, [contenteditable=true]") || t.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undoAction();
    } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redoAction();
    }
  });

  window.addEventListener("resize", () => {
    syncPreviewScale();
  });
}

function bindFreeLayoutAndDrag() {
  const freeCb = document.getElementById("edit-free-layout");
  if (freeCb) {
    freeCb.addEventListener("change", (e) => {
      const s = screenById(state.editScreenId);
      if (!s) return;
      if (e.target.checked) {
        initDefaultScreenLayout(s);
        ensureScreenLayoutSync(s);
      } else {
        delete s.layout;
      }
      renderPreview();
      persist();
    });
  }
  const dragBtn = document.getElementById("btn-layout-drag-mode");
  if (dragBtn) {
    dragBtn.addEventListener("click", () => {
      state.layoutDragMode = !state.layoutDragMode;
      renderPreview();
      persist();
    });
  }
}

function renderAll() {
  renderScreenList();
  renderMenuList();
  renderPreview();
  fillEditForm();
  fillNavForm();
  renderSelectionDock();
}

bindEditForm();
bindMenuEditPanel();
bindNavForm();
bindPreviewFullscreen();
bindFreeLayoutAndDrag();
bindUndoRedo();
renderAll();
initUndoHistory();
