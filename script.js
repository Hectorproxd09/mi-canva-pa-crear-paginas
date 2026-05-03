const canvas = document.getElementById("canvas");

const inputs = {
  text: document.getElementById("prop-text"),
  size: document.getElementById("prop-size"),
  color: document.getElementById("prop-color"),
  link: document.getElementById("prop-link")
};

const htmlOut = document.getElementById("html-code");
const cssOut = document.getElementById("css-code");

/* ESTADO */
let elements = [];
let selectedId = null;

let background = {
  type: null,
  url: ""
};

/* HISTORIAL */
let history = [];
let historyIndex = -1;

function saveHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(elements));
  historyIndex++;
}

/* =========================
   BACKGROUND
========================= */
function setBackground() {
  const url = document.getElementById("bg-url").value.trim();
  if (!url) return;

  background.type = url.match(/\.(mp4|webm|ogg)$/i) ? "video" : "image";
  background.url = url;

  render();
}

/* =========================
   DESELECCIÓN
========================= */
canvas.addEventListener("click", (e) => {
  if (e.target === canvas) {
    selectedId = null;
    render();
  }
});

/* =========================
   CREAR
========================= */
function addElement(type) {
  let link = "";

  if (type === "button") {
    link = prompt("Link del botón:", "https://") || "";
  }

  elements.push({
    id: Date.now(),
    type,
    text: type === "button" ? "Botón" : "Texto",
    x: 100,
    y: 100,
    width: 150,
    height: 80,
    size: 20,
    color: "#000000",
    link,
    z: elements.length // 🔥 capa
  });

  saveHistory();
  render();
}

/* =========================
   RENDER
========================= */
function render() {
  canvas.innerHTML = "";

  /* BACKGROUND */
  if (background.type === "video") {
    const video = document.createElement("video");
    video.src = background.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.className = "bg-video";
    canvas.appendChild(video);
    canvas.style.background = "none";
  } else if (background.type === "image") {
    canvas.style.background = `url(${background.url}) center/cover no-repeat`;
  } else {
    canvas.style.background = "white";
  }

  /* ORDEN POR Z */
  elements.sort((a,b) => a.z - b.z);

  elements.forEach(el => {
    let div;

    if (el.type === "button") {
      div = document.createElement("a");
      div.href = el.link || "#";
      div.className = "element button";
    } else {
      div = document.createElement("div");
      div.className = "element " + el.type;
    }

    div.innerText = el.text;

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.zIndex = el.z;

    if (el.type !== "panel") {
      div.style.fontSize = el.size + "px";
      div.style.color = el.color;
      div.style.background = "transparent";
    }

    if (el.type === "panel") {
      div.style.width = el.width + "px";
      div.style.height = el.height + "px";
    }

    /* SELECCIÓN */
    if (el.id === selectedId) {
      div.classList.add("selected");
      addHandles(div, el);
    }

    /* DOBLE CLICK */
    div.ondblclick = (e) => {
      e.stopPropagation();
      const txt = prompt("Editar texto:", el.text);
      if (txt !== null) {
        el.text = txt;
        saveHistory();
        render();
      }
    };

    /* CLICK (traer al frente) */
    div.onclick = (e) => {
      e.stopPropagation();

      selectedId = el.id;

      // 🔥 subir capa
      el.z = Math.max(...elements.map(e => e.z)) + 1;

      updatePanel();
      saveHistory();
      render();
    };

    /* DRAG */
    div.onmousedown = (e) => {
      e.preventDefault();

      const offsetX = e.offsetX;
      const offsetY = e.offsetY;

      selectedId = el.id;

      function move(e2) {
        el.x = e2.clientX - canvas.offsetLeft - offsetX;
        el.y = e2.clientY - canvas.offsetTop - offsetY;
        render();
      }

      function stop() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
        saveHistory();
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    };

    canvas.appendChild(div);
  });

  generateCode();
}

/* =========================
   HANDLES
========================= */
function addHandles(div, el) {
  const positions = ["br","tr","bl","tl","r","l","t","b"];

  positions.forEach(pos => {
    const h = document.createElement("div");
    h.className = "handle " + pos;

    h.onmousedown = (e) => {
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;

      const startW = el.width;
      const startH = el.height;
      const startSize = el.size;

      function resize(e2) {
        let dx = e2.clientX - startX;
        let dy = e2.clientY - startY;

        if (el.type === "panel") {
          if (pos.includes("r")) el.width = startW + dx;
          if (pos.includes("l")) el.width = startW - dx;
          if (pos.includes("b")) el.height = startH + dy;
          if (pos.includes("t")) el.height = startH - dy;
        }

        if (el.type !== "panel") {
          el.size = Math.max(10, startSize + dx * 0.3);
        }

        render();
      }

      function stop() {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stop);
        saveHistory();
      }

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stop);
    };

    div.appendChild(h);
  });
}

/* =========================
   PROPIEDADES
========================= */
function updatePanel() {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  inputs.text.value = el.text;
  inputs.size.value = el.size;
  inputs.color.value = el.color;
  inputs.link.value = el.link;
}

/* INPUTS */
Object.keys(inputs).forEach(k => {
  inputs[k].oninput = () => {
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;

    el[k] = inputs[k].value;
    saveHistory();
    render();
  };
});

/* =========================
   ELIMINAR
========================= */
function deleteElement() {
  if (!selectedId) return;

  elements = elements.filter(e => e.id !== selectedId);
  selectedId = null;

  saveHistory();
  render();
}

/* =========================
   UNDO / REDO
========================= */
function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  elements = JSON.parse(history[historyIndex]);
  render();
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  elements = JSON.parse(history[historyIndex]);
  render();
}

/* =========================
   GENERAR CÓDIGO
========================= */
function generateCode() {
  let html = "";
  let css = "";

  elements.forEach((el, i) => {
    const c = "el" + i;

    if (el.type === "button") {
      html += `<a class="${c}" href="${el.link}">${el.text}</a>\n`;
    } else {
      html += `<div class="${c}">${el.type === "text" ? el.text : ""}</div>\n`;
    }

    css += `.${c}{
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
  z-index:${el.z};
}\n`;

    if (el.type === "panel") {
      css += `.${c}{
  width:${el.width}px;
  height:${el.height}px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}\n`;
    }

    if (el.type !== "panel") {
      css += `.${c}{
  font-size:${el.size}px;
  color:${el.color};
}\n`;
    }
  });

  htmlOut.textContent = html;
  cssOut.textContent = css;
}

/* INIT */
saveHistory();
render();
