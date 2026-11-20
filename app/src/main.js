/* Neon Vice editor — wires the controls to the cover engine.
   Photos stay on the machine: FileReader and local sample files only. */

import {
  COVER_SIZES,
  COVER_LAYOUTS,
  COVER_GRADES,
  drawCover,
  layoutPanels,
  renderCoverCanvas,
  sizeById,
} from "./cover.js";

const canvas = document.getElementById("coverCanvas");
const ctx = canvas.getContext("2d");
const statusLine = document.getElementById("statusLine");

const state = {
  layout: "vice-grid",
  grade: "sunset",
  size: "1080x1350",
  title: "NEON VICE",
  subtitle: "sunset run",
  tag: "OCEAN DRIVE \u2022 2026",
  fillOne: false,
  grain: true,
  borders: true,
  photos: [
    { image: null, name: "", crop: { zoom: 1, x: 0, y: 0 } },
    { image: null, name: "", crop: { zoom: 1, x: 0, y: 0 } },
    { image: null, name: "", crop: { zoom: 1, x: 0, y: 0 } },
    { image: null, name: "", crop: { zoom: 1, x: 0, y: 0 } },
  ],
};

let activePanel = 0;
let redrawQueued = false;
let readyResolve = null;
window.neonViceReady = new Promise((resolve) => { readyResolve = resolve; });

function loadedPhotoCount() {
  return state.photos.filter((p) => p.image).length;
}

function activeSlot() {
  if (state.fillOne) return 0;
  const info = layoutPanels(state.layout, canvas.width, canvas.height);
  const panel = info.panels[activePanel] || info.panels[0];
  return panel.slot;
}

function queueRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawCover(ctx, canvas.width, canvas.height, state);
  });
}

function redrawNow() {
  drawCover(ctx, canvas.width, canvas.height, state);
}

function setStatus(text) {
  statusLine.textContent = text;
}

function applySizeToCanvas() {
  const size = sizeById(state.size);
  canvas.width = size.width;
  canvas.height = size.height;
  redrawNow();
}

/* ---------- photo slots ---------- */

const slotsBox = document.getElementById("photoSlots");

function buildPhotoSlots() {
  slotsBox.innerHTML = "";
  state.photos.forEach((photo, index) => {
    const slot = document.createElement("div");
    slot.className = "photo-slot" + (photo.image ? " filled" : "");
    slot.id = `photoSlot${index}`;
    const name = document.createElement("div");
    name.className = "slot-name" + (photo.image ? " on" : "");
    name.textContent = photo.image ? `Photo ${index + 1} \u2022 ${photo.name}` : `Photo ${index + 1} \u2022 empty`;
    slot.appendChild(name);
    if (photo.image) {
      const thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.alt = `Photo ${index + 1} thumbnail`;
      thumb.src = photo.image.src;
      slot.appendChild(thumb);
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("aria-label", `Choose photo ${index + 1}`);
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) loadPhotoFile(input.files[0], index);
      input.value = "";
    });
    slot.appendChild(input);
    slotsBox.appendChild(slot);
  });
}

function loadPhotoImage(img, name, slotIndex) {
  state.photos[slotIndex] = {
    image: img,
    name,
    crop: { zoom: 1, x: 0, y: 0 },
  };
  buildPhotoSlots();
  syncCropControls();
  queueRedraw();
  setStatus(`${loadedPhotoCount()} photo${loadedPhotoCount() === 1 ? "" : "s"} loaded \u2014 pick a layout, tweak the crop, export.`);
}

function loadPhotoFile(file, slotIndex) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => loadPhotoImage(img, file.name, slotIndex);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadSample(url, name, slotIndex) {
  return fetch(url)
    .then((res) => res.blob())
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => { loadPhotoImage(img, name, slotIndex); resolve(); };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

/* ---------- crop controls ---------- */

const zoomSlider = document.getElementById("zoomSlider");
const xSlider = document.getElementById("xSlider");
const ySlider = document.getElementById("ySlider");
const zoomVal = document.getElementById("zoomVal");
const xVal = document.getElementById("xVal");
const yVal = document.getElementById("yVal");
const cropHelp = document.getElementById("cropHelp");

function syncCropControls() {
  const photo = state.photos[activeSlot()];
  const crop = photo.crop;
  zoomSlider.value = Math.round(crop.zoom * 100);
  xSlider.value = Math.round(crop.x * 100);
  ySlider.value = Math.round(crop.y * 100);
  zoomVal.textContent = `${Math.round(crop.zoom * 100)}%`;
  xVal.textContent = `${Math.round(crop.x * 100)}`;
  yVal.textContent = `${Math.round(crop.y * 100)}`;
  cropHelp.textContent = `Panel ${activePanel + 1} \u2014 photo ${activeSlot() + 1} \u2014 drag the photo on the canvas or use the sliders.`;
}

zoomSlider.addEventListener("input", () => {
  state.photos[activeSlot()].crop.zoom = zoomSlider.value / 100;
  syncCropControls();
  queueRedraw();
});
xSlider.addEventListener("input", () => {
  state.photos[activeSlot()].crop.x = xSlider.value / 100;
  syncCropControls();
  queueRedraw();
});
ySlider.addEventListener("input", () => {
  state.photos[activeSlot()].crop.y = ySlider.value / 100;
  syncCropControls();
  queueRedraw();
});
document.getElementById("resetCropBtn").addEventListener("click", () => {
  state.photos[activeSlot()].crop = { zoom: 1, x: 0, y: 0 };
  syncCropControls();
  queueRedraw();
});

/* ---------- canvas picking and dragging ---------- */

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(point) {
  const info = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = info.panels.length - 1; i >= 0; i--) {
    const p = info.panels[i];
    if (point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h) return i;
  }
  return 0;
}

let drag = null;
canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  activePanel = panelAt(point);
  const info = layoutPanels(state.layout, canvas.width, canvas.height);
  const panel = info.panels[activePanel];
  drag = { startX: point.x, startY: point.y, panel, crop: { ...state.photos[activeSlot()].crop } };
  canvas.setPointerCapture(event.pointerId);
  syncCropControls();
});
canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const photo = state.photos[activeSlot()];
  const dx = (point.x - drag.startX) / (drag.panel.w * 0.25);
  const dy = (point.y - drag.startY) / (drag.panel.h * 0.25);
  photo.crop.x = Math.max(-1, Math.min(1, drag.crop.x + dx));
  photo.crop.y = Math.max(-1, Math.min(1, drag.crop.y + dy));
  syncCropControls();
  queueRedraw();
});
canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

/* ---------- caption ---------- */

document.getElementById("titleInput").addEventListener("input", (e) => {
  state.title = e.target.value;
  queueRedraw();
});
document.getElementById("subtitleInput").addEventListener("input", (e) => {
  state.subtitle = e.target.value;
  queueRedraw();
});
document.getElementById("tagInput").addEventListener("input", (e) => {
  state.tag = e.target.value;
  queueRedraw();
});

/* ---------- layout, grade, size chips ---------- */

function buildChips(boxId, items, current, onPick) {
  const box = document.getElementById(boxId);
  box.innerHTML = "";
  items.forEach((item) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (item.id === current ? " active" : "");
    chip.textContent = item.label;
    chip.addEventListener("click", () => {
      onPick(item.id);
      buildChips(boxId, items, item.id, onPick);
    });
    box.appendChild(chip);
  });
}

function refreshLookChips() {
  buildChips("layoutGrid", COVER_LAYOUTS, state.layout, (id) => {
    state.layout = id;
    activePanel = 0;
    syncCropControls();
    queueRedraw();
  });
  buildChips("gradeGrid", COVER_GRADES, state.grade, (id) => {
    state.grade = id;
    queueRedraw();
  });
}

function refreshSizeChips() {
  document.querySelectorAll(".size-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.size === state.size);
  });
}

document.querySelectorAll(".size-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.size = chip.dataset.size;
    refreshSizeChips();
    applySizeToCanvas();
  });
});

/* ---------- fill modes, samples, toggles ---------- */

document.getElementById("fillOneBtn").addEventListener("click", () => {
  state.fillOne = true;
  syncCropControls();
  queueRedraw();
  setStatus("One photo now fills every panel.");
});
document.getElementById("fillEachBtn").addEventListener("click", () => {
  state.fillOne = false;
  syncCropControls();
  queueRedraw();
  setStatus("Each panel uses its own photo slot.");
});
document.getElementById("sampleBoulevardBtn").addEventListener("click", () => {
  loadSample("samples/boulevard.jpg", "boulevard.jpg", 0);
});
document.getElementById("sampleCarBtn").addEventListener("click", () => {
  loadSample("samples/car-dusk.jpg", "car-dusk.jpg", 1);
});
document.getElementById("grainToggle").addEventListener("change", (e) => {
  state.grain = e.target.checked;
  queueRedraw();
});
document.getElementById("borderToggle").addEventListener("change", (e) => {
  state.borders = e.target.checked;
  queueRedraw();
});
document.getElementById("shuffleBtn").addEventListener("click", () => {
  const layouts = COVER_LAYOUTS.map((l) => l.id);
  const grades = COVER_GRADES.map((g) => g.id);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  refreshLookChips();
  queueRedraw();
  setStatus(`Shuffled: ${state.layout} + ${state.grade}.`);
});

/* ---------- export ---------- */

function downloadCover(sizeId) {
  const size = sizeById(sizeId || state.size);
  const cover = renderCoverCanvas(state, size.id);
  return new Promise((resolve) => {
    cover.toBlob((blob) => {
      if (!blob) { setStatus("Export failed \u2014 try again."); resolve(null); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `neon-vice-${state.layout}-${state.grade}-${size.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Exported ${size.width} x ${size.height} PNG \u2014 check your downloads.`);
      resolve(blob);
    }, "image/png");
  });
}

document.getElementById("exportBtn").addEventListener("click", () => downloadCover());
document.getElementById("exportBtn2").addEventListener("click", () => downloadCover());

/* Automation hook for the maker's own screenshot run: returns a PNG data URL. */
window.neonViceExport = function exportCoverDataUrl(sizeId) {
  const cover = renderCoverCanvas(state, sizeId || state.size);
  return cover.toDataURL("image/png");
};
window.neonViceState = state;

/* ---------- boot ---------- */

buildPhotoSlots();
refreshLookChips();
refreshSizeChips();
syncCropControls();
applySizeToCanvas();
Promise.all([
  loadSample("samples/boulevard.jpg", "boulevard.jpg", 0),
  loadSample("samples/car-dusk.jpg", "car-dusk.jpg", 1),
]).then(() => {
  setStatus("2 sample photos loaded \u2014 swap in your own, pick a layout, export.");
  if (readyResolve) readyResolve();
}).catch(() => {
  setStatus("Samples did not load \u2014 add your own photo to begin.");
  if (readyResolve) readyResolve();
});
