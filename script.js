const canvas = document.getElementById("canvas");

const htmlOut = document.getElementById("html-code");
const cssOut = document.getElementById("css-code");

let elements = [];
let selectedId = null;

/* CREAR */
function addElement(type) {
  elements.push({
    id: Date.now(),
    type,
    text: type === "button" ? "Botón" : "",
    x: 100,
    y: 100,
    width: 150,
    height: 80,
    size: 20,
    color: "#ffffff",
    link: ""
  });

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
      div.className = "element button";
      div.innerText = el.text;
    }

    if (el.type === "text") {
      div = document.createElement("div");
      div.className = "element text";
      div.innerText = el.text || "Texto";
    }

    if (el.type === "panel") {
      div = document.createElement("div");
      div.className = "element panel";
    }

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.width = el.width + "px";
    div.style.height = el.height + "px";
    div.style.fontSize = el.size + "px";
    div.style.color = el.color;

    if (el.id === selectedId) {
      div.classList.add("selected");

      const handle = document.createElement("div");
      handle.className = "handle";

      handle.onmousedown = (e) => {
        e.stopPropagation();

        const startX = e.clientX;
        const startW = el.width;
        const ratio = el.height / el.width;

        function resize(e2) {
          let dx = e2.clientX - startX;
          el.width = startW + dx;
          el.height = el.width * ratio;
          render();
        }

        function stop() {
          document.removeEventListener("mousemove", resize);
          document.removeEventListener("mouseup", stop);
        }

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stop);
      };

      div.appendChild(handle);
    }

    /* DRAG */
    div.onmousedown = (e) => {
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
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    };

    canvas.appendChild(div);
  });

  generateCode();
}

/* GENERAR HTML + CSS */
function generateCode() {
  let html = "";
  let css = "";

  elements.forEach((el, i) => {
    const cls = `el${i}`;

    if (el.type === "button") {
      html += `<a class="${cls}" href="${el.link}">${el.text}</a>\n`;
    } else {
      html += `<div class="${cls}">${el.type === "text" ? el.text : ""}</div>\n`;
    }

    css += `.${cls}{
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
  width:${el.width}px;
  height:${el.height}px;
  font-size:${el.size}px;
  color:${el.color};
}\n`;

    if (el.type === "panel") {
      css += `.${cls}{
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius:15px;
}\n`;
    }

    if (el.type === "button") {
      css += `.${cls}{
  background:white;
  color:black;
  padding:10px;
  border-radius:10px;
}\n`;
    }
  });

  htmlOut.textContent = html;
  cssOut.textContent = css;
}

/* INIT */
render();
