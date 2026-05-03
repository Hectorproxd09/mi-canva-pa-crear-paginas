const canvas = document.getElementById("canvas");
const codePanel = document.getElementById("code");

let elements = [];

/* CREAR TEXTO */
canvas.addEventListener("click", (e) => {
  const newEl = {
    id: Date.now(),
    text: "Texto",
    x: e.offsetX,
    y: e.offsetY
  };

  elements.push(newEl);
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

    makeDraggable(div, el);

    canvas.appendChild(div);
  });

  updateCode();
}

/* DRAG */
function makeDraggable(element, data) {
  let offsetX, offsetY, isDragging = false;

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    data.x = e.clientX - canvas.offsetLeft - offsetX;
    data.y = e.clientY - canvas.offsetTop - offsetY;

    render();
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

/* GENERAR HTML */
function updateCode() {
  let html = "";

  elements.forEach(el => {
    html += `<p style="position:absolute; left:${el.x}px; top:${el.y}px;">${el.text}</p>\n`;
  });

  codePanel.textContent = html;
}
