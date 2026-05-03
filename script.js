const canvas = document.getElementById("canvas");
const codePanel = document.getElementById("code");

const inputs = {
  text: document.getElementById("prop-text"),
  size: document.getElementById("prop-size"),
  color: document.getElementById("prop-color"),
  bg: document.getElementById("prop-bg"),
  font: document.getElementById("prop-font"),
  link: document.getElementById("prop-link")
};

let elements = [];
let selectedId = null;

let history = [];
let historyIndex = -1;

function saveHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(elements));
  historyIndex++;
}

/* CREAR ELEMENTOS */
function addElement(type) {
  const el = {
    id: Date.now(),
    type,
    text: type === "button" ? "Botón" : "Texto",
    x: 100,
    y: 100,
    size: 20,
    color: "#000",
    bg: type === "panel" ? "#ddd" : "transparent",
    font: "Arial",
    link: ""
  };

  elements.push(el);
  saveHistory();
  render();
}

/* RENDER */
function render() {
  canvas.innerHTML = "";

  elements.forEach(el => {
    let div;

    if (el.type === "button") {
      div = document.createElement("a");
      div.href = el.link || "#";
    } else {
      div = document.createElement("div");
    }

    div.className = "element";
    div.innerText = el.text;

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.fontSize = el.size + "px";
    div.style.color = el.color;
    div.style.background = el.bg;
    div.style.fontFamily = el.font;

    if (el.type === "panel") {
      div.style.width = "150px";
      div.style.height = "100px";
    }

    if (el.id === selectedId) div.classList.add("selected");

    div.onclick = (e) => {
      e.stopPropagation();
      selectedId = el.id;
      updatePanel();
      render();
    };

    makeDraggable(div, el);
    canvas.appendChild(div);
  });

  updateCode();
}

/* DRAG */
function makeDraggable(element, data) {
  let offsetX, offsetY, isDragging = false;

  element.onmousedown = (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    isDragging = true;
    selectedId = data.id;
    updatePanel();
  };

  document.onmousemove = (e) => {
    if (!isDragging) return;

    data.x = e.clientX - canvas.offsetLeft - offsetX;
    data.y = e.clientY - canvas.offsetTop - offsetY;

    render();
  };

  document.onmouseup = () => {
    if (isDragging) saveHistory();
    isDragging = false;
  };
}

/* PANEL */
function updatePanel() {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  inputs.text.value = el.text;
  inputs.size.value = el.size;
  inputs.color.value = el.color;
  inputs.bg.value = el.bg;
  inputs.font.value = el.font;
  inputs.link.value = el.link;
}

/* INPUTS */
Object.keys(inputs).forEach(key => {
  inputs[key].addEventListener("input", () => {
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;

    el[key] = inputs[key].value;
    render();
  });
});

/* DELETE */
function deleteElement() {
  elements = elements.filter(e => e.id !== selectedId);
  selectedId = null;
  saveHistory();
  render();
}

/* UNDO/REDO */
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

/* HTML OUTPUT */
function updateCode() {
  let html = "";

  elements.forEach(el => {
    if (el.type === "button") {
      html += `<a href="${el.link}" style="position:absolute; left:${el.x}px; top:${el.y}px; font-size:${el.size}px; color:${el.color}; font-family:${el.font};">${el.text}</a>\n`;
    } else {
      html += `<div style="position:absolute; left:${el.x}px; top:${el.y}px; font-size:${el.size}px; color:${el.color}; background:${el.bg}; font-family:${el.font};">${el.text}</div>\n`;
    }
  });

  codePanel.textContent = html;
}

/* INIT */
saveHistory();
render();
