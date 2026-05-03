const canvas = document.getElementById("canvas");

const htmlOut = document.getElementById("html-code");
const cssOut = document.getElementById("css-code");

let elements = [];
let selectedId = null;

/* CREAR */
function addElement(type) {
  let link = "";

  if (type === "button") {
    link = prompt("Ingresa el link del botón:", "https://");
  }

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
    link: link || ""
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

    /* TEXTO */
    if (el.type === "text" || el.type === "button") {
      div.style.fontSize = el.size + "px";
      div.style.color = el.color;
    }

    /* PANEL */
    if (el.type === "panel") {
      div.style.width = el.width + "px";
      div.style.height = el.height + "px";
    }

    /* SELECCIÓN */
    if (el.id === selectedId) {
      div.classList.add("selected");

      const handle = document.createElement("div");
      handle.className = "handle";

      handle.onmousedown = (e) => {
        e.stopPropagation();

        const startX = e.clientX;
        const startW = el.width;
        const startH = el.height;
        const startSize = el.size;

        function resize(e2) {
          let dx = e2.clientX - startX;

          if (el.type === "panel") {
            // libre
            el.width = startW + dx;
            el.height = startH + (e2.clientY - startX);
          }

          if (el.type === "text" || el.type === "button") {
            // cambia tamaño fuente
            el.size = Math.max(10, startSize + dx * 0.3);
          }

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
      e.preventDefault(); // 🔥 evita abrir link

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
    } else if (el.type === "text") {
      html += `<div class="${cls}">${el.text}</div>\n`;
    } else {
      html += `<div class="${cls}"></div>\n`;
    }

    css += `.${cls}{
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
}\n`;

    if (el.type === "panel") {
      css += `.${cls}{
  width:${el.width}px;
  height:${el.height}px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius:15px;
}\n`;
    }

    if (el.type === "text") {
      css += `.${cls}{
  font-size:${el.size}px;
  color:${el.color};
}\n`;
    }

    if (el.type === "button") {
      css += `.${cls}{
  font-size:${el.size}px;
  background:white;
  color:black;
  padding:10px;
  border-radius:10px;
  text-decoration:none;
}\n`;
    }
  });

  htmlOut.textContent = html;
  cssOut.textContent = css;
}

/* INIT */
render();
