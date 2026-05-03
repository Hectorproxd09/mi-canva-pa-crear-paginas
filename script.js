const canvas = document.getElementById("canvas");
const codePanel = document.getElementById("code");

/* PROPS */
const inputText = document.getElementById("prop-text");
const inputSize = document.getElementById("prop-size");
const inputColor = document.getElementById("prop-color");

let elements = [];
let selectedId = null;

/* HISTORIAL */
let history = [];
let historyIndex = -1;

function saveHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(elements));
  historyIndex++;
}

/* CREAR */
canvas.addEventListener("click", (e) => {
  if (e.target !== canvas) return;

  const newEl = {
    id: Date.now(),
    text: "Texto",
    x: e.offsetX,
    y: e.offsetY,
    size: 20,
    color: "#000000"
  };

  elements.push(newEl);
  saveHistory();
  render();
});

/* RENDER */
function render() {
  canvas.innerHTML = "";

  elements.forEach(el => {
    const div = document.createElement("div");
    div.className = "element";
    div.innerText = el.text;

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.fontSize = el.size + "px";
    div.style.color = el.color;

    if (el.id === selectedId) {
      div.classList.add("selected");
    }

    /* SELECCION */
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedId = el.id;
      updatePanel();
      render();
    });

    makeDraggable(div, el);
    canvas.appendChild(div);
  });

  updateCode();
}

/* DRAG */
function makeDraggable(element, data) {
  let offsetX, offsetY, isDragging = false;

  element.addEventListener("mousedown", (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    isDragging = true;
    selectedId = data.id;
    updatePanel();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    data.x = e.clientX - canvas.offsetLeft - offsetX;
    data.y = e.clientY - canvas.offsetTop - offsetY;

    render();
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) saveHistory();
    isDragging = false;
  });
}

/* PANEL PROPIEDADES */
function updatePanel() {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  inputText.value = el.text;
  inputSize.value = el.size;
  inputColor.value = el.color;
}

/* INPUTS */
inputText.addEventListener("input", () => {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  el.text = inputText.value;
  render();
});

inputSize.addEventListener("input", () => {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  el.size = inputSize.value;
  render();
});

inputColor.addEventListener("input", () => {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  el.color = inputColor.value;
  render();
});

/* BORRAR */
function deleteElement() {
  if (!selectedId) return;
  elements = elements.filter(e => e.id !== selectedId);
  selectedId = null;
  saveHistory();
  render();
}

/* TECLAS */
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete") deleteElement();

  if (e.ctrlKey && e.key === "z") undo();
  if (e.ctrlKey && e.key === "y") redo();
});

/* UNDO */
function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  elements = JSON.parse(history[historyIndex]);
  render();
}

/* REDO */
function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  elements = JSON.parse(history[historyIndex]);
  render();
}

/* HTML */
function updateCode() {
  let html = "";

  elements.forEach(el => {
    html += `<p style="position:absolute; left:${el.x}px; top:${el.y}px; font-size:${el.size}px; color:${el.color};">${el.text}</p>\n`;
  });

  codePanel.textContent = html;
}

/* INIT */
saveHistory();
render();
