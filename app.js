/**
 * Estudio visual — lógica: pantallas, menú, fondos, productos, exportación HTML/CSS.
 */

const STORAGE_KEY = "visual-web-studio-state-v1";

/** @typedef {{ id: string; title: string; subtitle: string; bgColor: string; bgGradient: string; bgImageDataUrl: string | null; products: { name: string; price: string }[] }} Screen */
/** @typedef {{ id: string; label: string; targetScreenId: string }} MenuItem */

/** @type {{ screens: Screen[]; menu: MenuItem[]; previewScreenId: string; editScreenId: string; editMenuId: string | null }} */
let state = loadState() || defaultState();

function defaultState() {
  return {
    screens: [
      {
        id: "inicio",
        title: "Bienvenida",
        subtitle: "Toca los botones del menú para cambiar de pantalla. Edita cada pantalla en el panel derecho.",
        bgColor: "#1a1a2e",
        bgGradient: "linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
        bgImageDataUrl: null,
        products: [],
      },
      {
        id: "productos",
        title: "Productos",
        subtitle: "Ejemplo de tarjetas. Añade o edita productos en el panel.",
        bgColor: "#1b4332",
        bgGradient: "linear-gradient(145deg, #1b4332, #2d6a4f)",
        bgImageDataUrl: null,
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
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.screens?.length) return null;
    if (!parsed.editMenuId && parsed.menu?.length) parsed.editMenuId = parsed.menu[0].id;
    return parsed;
  } catch {
    return null;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

/* ---------- Render lists ---------- */

function renderScreenList() {
  const ul = document.getElementById("screen-list");
  ul.innerHTML = "";
  state.screens.forEach((s) => {
    const li = document.createElement("li");
    li.className = "list-item" + (state.editScreenId === s.id ? " active" : "");
    li.innerHTML = `<span title="${escapeAttr(s.title)}">${escapeHtml(s.title)} <small style="opacity:.6">(${escapeHtml(s.id)})</small></span>`;
    li.addEventListener("click", () => {
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
      state.editMenuId = m.id;
      renderMenuList();
      fillMenuEditPanel();
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
      renderPreview();
      renderMenuList();
      updatePreviewLabel();
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
      renderPreview();
      renderMenuList();
      updatePreviewLabel();
    });
    nav.appendChild(btn);
  });
  inner.appendChild(nav);

  state.screens.forEach((s) => {
    const section = document.createElement("section");
    section.className = "screen" + (s.id === state.previewScreenId ? " is-visible" : "");
    section.dataset.screenId = s.id;
    applyBgToEl(section, s);

    const head = document.createElement("div");
    head.className = "screen-head";
    const h2 = document.createElement("h2");
    h2.textContent = s.title;
    const p = document.createElement("p");
    p.textContent = s.subtitle;
    head.appendChild(h2);
    head.appendChild(p);
    section.appendChild(head);

    if (s.products?.length) {
      const grid = document.createElement("div");
      grid.className = "product-grid";
      s.products.forEach((pr) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.innerHTML = `<h3>${escapeHtml(pr.name)}</h3><p>${escapeHtml(pr.price)}</p>`;
        grid.appendChild(card);
      });
      section.appendChild(grid);
    }

    inner.appendChild(section);
  });

  root.appendChild(inner);
  updatePreviewLabel();
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
  fillEditForm();
  persist();
});

let exportTab = "html";

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
      const productsBlock =
        s.products?.length > 0
          ? `
        <div class="product-grid">
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
        <div class="screen-inner">
          <header class="screen-head">
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.subtitle)}</p>
          </header>
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
  lines.push(`/* --- Navegación --- */
.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.85rem 1.25rem;
  background: var(--nav-bg);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-btn {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
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
}`);

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

function renderAll() {
  renderScreenList();
  renderMenuList();
  renderPreview();
  fillEditForm();
}

bindEditForm();
bindMenuEditPanel();
renderAll();
