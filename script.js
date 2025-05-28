let layers = [];
let activeLayer = null;
let drawing = false;
let ctx = null;
let penType = "pen";
let strokeColor = "#000000";
let zoomLevel = 1;
let textMode = false;

window.onload = () => {
  addLayer();
  initColorPicker();
  document.getElementById('penSelect').addEventListener('change', e => penType = e.target.value);
  document.getElementById('bgUpload').addEventListener('change', handleBackgroundUpload);
};

function getPosWithPressure(e) {
  const isTouch = e.touches && e.touches.length > 0;
  const event = isTouch ? e.touches[0] : e;
  const pressure = e.pressure || 0.5;
  return { x: event.clientX, y: event.clientY, pressure };
}

function setPenStyle(ctx, penType, pressure = 1.0) {
  ctx.globalAlpha = 1.0;
  switch (penType) {
    case 'pen': ctx.lineWidth = 2 * pressure; break;
    case 'marker': ctx.lineWidth = 8 * pressure; ctx.globalAlpha = 0.5; break;
    case 'airbrush': ctx.lineWidth = 1 + pressure; ctx.globalAlpha = 0.3 * pressure; break;
    case 'brushpen': ctx.lineWidth = 10 * pressure; ctx.lineCap = 'butt'; break;
    case 'pencil': ctx.lineWidth = 1.5 * pressure; ctx.globalAlpha = 0.8; break;
    case 'highlighter': ctx.lineWidth = 20 * pressure; ctx.globalAlpha = 0.3; break;
    case 'watercolor': ctx.lineWidth = 12; ctx.globalAlpha = 0.05 + 0.2 * pressure; break;
    case 'spray': ctx.globalAlpha = 1.0; break;
    case 'eraser': ctx.lineWidth = 10; break;
  }
}

function startDraw(e) {
  e.preventDefault();
  if (penType === "text") return;
  drawing = true;
  const { x, y, pressure } = getPosWithPressure(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  setPenStyle(ctx, penType, pressure);
}

function draw(e) {
  if (!drawing || penType === "text") return;
  e.preventDefault();
  const { x, y, pressure } = getPosWithPressure(e);
  setPenStyle(ctx, penType, pressure);
  if (penType === "spray") {
    for (let i = 0; i < 10; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      ctx.fillStyle = strokeColor;
      ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
    }
  } else if (penType === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.strokeStyle = strokeColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function endDraw(e) {
  if (!drawing) return;
  e.preventDefault();
  ctx.closePath();
  drawing = false;
}

function addLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  canvas.classList.add('drawing-canvas');
  canvas.style.zIndex = layers.length;

  const container = document.getElementById('canvasContainer');
  container.appendChild(canvas);

  const context = canvas.getContext('2d');
  context.lineCap = "round";
  context.lineJoin = "round";

  canvas.addEventListener('pointerdown', startDraw);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('click', insertTextIfNeeded);

  const layer = { canvas, context, visible: true, opacity: 1.0 };
  layers.push(layer);
  activeLayer = layer;
  ctx = context;

  updateLayerList();
}

function removeLayer() {
  if (layers.length <= 1) return;
  const layer = layers.pop();
  layer.canvas.remove();
  activeLayer = layers[layers.length - 1];
  ctx = activeLayer.context;
  updateLayerList();
}

function updateLayerList() {
  const list = document.getElementById('layerList');
  list.innerHTML = '';
  layers.forEach((layer, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span onclick="activateLayer(${index})">레이어 ${index + 1}</span>
      <input type="range" min="0" max="1" step="0.01" value="${layer.opacity}"
        onchange="setLayerOpacity(${index}, this.value)" />
    `;
    li.draggable = true;
    li.ondragstart = (e) => e.dataTransfer.setData('text/plain', index);
    li.ondragover = (e) => e.preventDefault();
    li.ondrop = (e) => {
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      swapLayers(from, index);
    };
    list.appendChild(li);
  });
}

function activateLayer(index) {
  activeLayer = layers[index];
  ctx = activeLayer.context;
}

function setLayerOpacity(index, value) {
  const layer = layers[index];
  layer.opacity = parseFloat(value);
  layer.canvas.style.opacity = value;
}

function swapLayers(from, to) {
  const container = document.getElementById('canvasContainer');
  [layers[from], layers[to]] = [layers[to], layers[from]];
  container.innerHTML = '';
  layers.forEach((layer, i) => {
    layer.canvas.style.zIndex = i;
    container.appendChild(layer.canvas);
  });
  updateLayerList();
}

function initColorPicker() {
  const picker = document.getElementById('customColorPicker');
  picker.innerHTML = `
    <input type="color" id="baseColor" />
    <input type="text" id="hexColor" placeholder="#000000" maxlength="7" />
  `;
  const base = document.getElementById('baseColor');
  const hex = document.getElementById('hexColor');
  base.addEventListener('input', e => {
    strokeColor = e.target.value;
    hex.value = e.target.value;
  });
  hex.addEventListener('input', e => {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      strokeColor = val;
      base.value = val;
    }
  });
}

function handleBackgroundUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = img.width;
      bgCanvas.height = img.height;
      bgCanvas.style.position = 'absolute';
      bgCanvas.style.zIndex = 0;
      const bgCtx = bgCanvas.getContext('2d');
      bgCtx.drawImage(img, 0, 0);
      document.getElementById('canvasContainer').prepend(bgCanvas);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function activateTextMode() {
  textMode = true;
}

function insertTextIfNeeded(e) {
  if (!textMode) return;
  const text = document.getElementById('textInput').value;
  const x = e.offsetX;
  const y = e.offsetY;
  ctx.font = '20px Gowun Batang';
  ctx.fillStyle = strokeColor;
  ctx.fillText(text, x, y);
  textMode = false;
}

function zoomCanvas(factor) {
  zoomLevel *= factor;
  const container = document.getElementById('canvasContainer');
  container.style.transform = `scale(${zoomLevel})`;
}

function downloadImage() {
  const container = document.getElementById('canvasContainer');
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = container.offsetWidth;
  exportCanvas.height = container.offsetHeight;
  const exportCtx = exportCanvas.getContext('2d');

  layers.forEach((layer) => {
    exportCtx.globalAlpha = layer.opacity;
    exportCtx.drawImage(layer.canvas, 0, 0);
  });

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/png');
  link.download = '쭈의-스케치.png';
  link.click();
}
