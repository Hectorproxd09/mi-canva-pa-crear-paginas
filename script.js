const canvas = document.getElementById("canvas");

const inputs = {
  text: document.getElementById("prop-text"),
  size: document.getElementById("prop-size"),
  color: document.getElementById("prop-color"),
  link: document.getElementById("prop-link")
};

const htmlOut = document.getElementById("html-code");
const cssOut = document.getElementById("css-code");

let elements = [];
let selectedId = null;

/* CREAR */
function addElement(type) {
  let link = "";

  if (type === "button") {
    link = prompt("Link del botón:", "https://");
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
    link
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
    } else {
      div = document.createElement("div");
      div.className = "element " + el.type;
    }

    div.innerText = el.text;

    div.style.left = el.x + "px";
    div.style.top = el.y + "px";

    if (el.type === "panel") {
      div.style.width = el.width + "px";
      div.style.height = el.height + "px";
    }

    if (el.type !== "panel") {
      div.style.fontSize = el.size + "px";
      div.style.color = el.color;
    }

    /* SELECCIÓN */
    if (el.id === selectedId) {
      div.classList.add("selected");
      addHandles(div, el);
    }

    /* DOBLE CLICK EDIT */
    div.ondblclick = (e) => {
      e.stopPropagation();
      const txt = prompt("Editar texto:", el.text);
      if (txt !== null) {
        el.text = txt;
        render();
      }
    };

    /* DRAG */
    div.onmousedown = (e) => {
      e.preventDefault();

      const offsetX = e.offsetX;
      const offsetY = e.offsetY;

      selectedId = el.id;
      updatePanel();

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

    div.onclick = (e) => {
      e.stopPropagation();
      selectedId = el.id;
      updatePanel();
      render();
    };

    canvas.appendChild(div);
  });

  generateCode();
}

/* HANDLES */
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
      }

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stop);
    };

    div.appendChild(h);
  });
}

/* PANEL */
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
    render();
  };
});

/* GENERAR */
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
render();
