const canvas = document.getElementById("canvas");
const codePanel = document.getElementById("code");

const inputs = {
  text: document.getElementById("prop-text"),
  size: document.getElementById("prop-size"),
  color: document.getElementById("prop-color"),
  bg: document.getElementById("prop-bg"),
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

/* BACKGROUND */
function setBackground() {
  const url = document.getElementById("bg-url").value;

  canvas.style.background = "none";

  if (url.endsWith(".mp4")) {
    canvas.innerHTML += `<video class="bg-video" autoplay loop muted src="${url}"></video>`;
  } else {
    canvas.style.background = `url(${url}) center/cover`;
  }
}

/* CREAR */
function addElement(type) {
  const el = {
    id: Date.now(),
    type,
    text: type === "button" ? "Botón" : "Texto",
    x: 100,
    y: 100,
    size: 20,
    width: 150,
    height: 100,
    color: "#000",
    bg: "#ddd",
    link: ""
  };

  elements.push(el);
  saveHistory();
  render();
}

/* RENDER */
function render() {
  canvas.innerHTML = canvas.querySelector(".bg-video")?.outerHTML || "";

  elements.forEach(el => {
    const div = document.createElement(el.type === "button" ? "a" : "div");

    div.className = "element";
    div.innerText = el.text;

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.fontSize = el.size + "px";
    div.style.color = el.color;
    div.style.background = el.bg;
    div.style.width = el.width + "px";
    div.style.height = el.height + "px";

    if (el.type === "button") div.href = el.link;

    if (el.id === selectedId) {
      div.classList.add("selected");

      /* HANDLE */
      const handle = document.createElement("div");
      handle.className = "handle";

      handle.addEventListener("mousedown", (e) => {
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;

        const startW = el.width;
        const startH = el.height;

        function resize(e2) {
          let dx = e2.clientX - startX;

          el.width = startW + dx;
          el.height = startH + dx * (startH / startW); // mantener proporción

          render();
        }

        function stop() {
          document.removeEventListener("mousemove", resize);
          document.removeEventListener("mouseup", stop);
          saveHistory();
        }

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stop);
      });

      div.appendChild(handle);
    }

    /* DRAG */
    let offsetX, offsetY;

    div.addEventListener("mousedown", (e) => {
      offsetX = e.offsetX;
      offsetY = e.offsetY;
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
    });

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedId = el.id;
      updatePanel();
      render();
    });

    canvas.appendChild(div);
  });

  updateCode();
}

/* PANEL */
function updatePanel() {
  const el = elements.find(e => e.id === selectedId);
  if (!el) return;

  inputs.text.value = el.text;
  inputs.size.value = el.size;
  inputs.color.value = el.color;
  inputs.bg.value = el.bg;
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

/* UNDO REDO */
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

/* HTML */
function updateCode() {
  let html = "";

  elements.forEach(el => {
    html += `<div style="position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px; font-size:${el.size}px; color:${el.color}; background:${el.bg};">${el.text}</div>\n`;
  });

  codePanel.textContent = html;
}

/* INIT */
saveHistory();
render();
