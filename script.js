const canvas = document.getElementById("canvas");
const codePanel = document.getElementById("code");

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

/* CREAR TEXTO SOLO SI NO CLICKEAS UN ELEMENTO */
canvas.addEventListener("click", (e) => {
  if (e.target !== canvas) return;

  const newEl = {
    id: Date.now(),
    text: "Texto",
    x: e.offsetX,
    y: e.offsetY
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

    if (el.id === selectedId) {
      div.classList.add("selected");
    }

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";

    /* SELECCIONAR */
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedId = el.id;
      render();
    });

    /* EDITAR TEXTO */
    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const newText = prompt("Editar texto:", el.text);
      if (newText !== null) {
        el.text = newText;
        saveHistory();
        render();
      }
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

/* BORRAR */
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" && selectedId) {
    elements = elements.filter(el => el.id !== selectedId);
    selectedId = null;
    saveHistory();
    render();
  }

  /* UNDO */
  if (e.ctrlKey && e.key === "z") {
    undo();
  }

  /* REDO */
  if (e.ctrlKey && e.key === "y") {
    redo();
  }
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

/* GENERAR HTML */
function updateCode() {
  let html = "";

  elements.forEach(el => {
    html += `<p style="position:absolute; left:${el.x}px; top:${el.y}px;">${el.text}</p>\n`;
  });

  codePanel.textContent = html;
}

/* INIT */
saveHistory();
render();
