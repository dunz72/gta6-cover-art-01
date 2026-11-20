/* Neon Vice cover engine — draws multi-panel poster art on a 2D canvas.
   Pure canvas, no network, no fonts to load: system font stacks only.
   Every cover is original art: gradient skies, a sun disc, a skyline
   silhouette, white panel borders, bold lettering, grain and vignette. */

export const COVER_SIZES = [
  { id: "1080x1080", label: "Square 1080 x 1080", width: 1080, height: 1080 },
  { id: "1080x1350", label: "Portrait 1080 x 1350", width: 1080, height: 1350 },
  { id: "1920x1080", label: "Wide 1920 x 1080", width: 1920, height: 1080 },
];

export const COVER_LAYOUTS = [
  { id: "vice-grid", label: "Vice Grid" },
  { id: "hero-split", label: "Hero Split" },
  { id: "tilted-snaps", label: "Tilted Snaps" },
  { id: "full-bleed", label: "Full Bleed" },
];

export const COVER_GRADES = [
  { id: "sunset", label: "Sunset" },
  { id: "neon-nights", label: "Neon Nights" },
  { id: "vice-pink", label: "Vice Pink" },
  { id: "teal-dusk", label: "Teal Dusk" },
  { id: "golden-hour", label: "Golden Hour" },
];

const GRADE_SKIES = {
  "sunset": ["#1d0b3d", "#7b1e6e", "#ff2e88", "#ff7a18", "#ffc93c"],
  "neon-nights": ["#07031a", "#2a1a6e", "#7b5cff", "#ff2e88", "#2de2c5"],
  "vice-pink": ["#2b0533", "#7a0f5c", "#ff2e88", "#ff8fb3", "#ffd6e8"],
  "teal-dusk": ["#03161f", "#06414f", "#0e7c86", "#2de2c5", "#ffc93c"],
  "golden-hour": ["#160a2e", "#5c1a4d", "#c93a6e", "#ff7a18", "#ffe08a"],
};

const GRADE_WASHES = {
  "sunset": ["rgba(255,46,136,0.20)", "rgba(255,122,24,0.16)", "rgba(255,201,60,0.10)"],
  "neon-nights": ["rgba(123,92,255,0.22)", "rgba(255,46,136,0.16)", "rgba(45,226,197,0.12)"],
  "vice-pink": ["rgba(255,46,136,0.24)", "rgba(255,143,179,0.14)", "rgba(255,255,255,0.05)"],
  "teal-dusk": ["rgba(45,226,197,0.18)", "rgba(14,124,134,0.16)", "rgba(255,201,60,0.10)"],
  "golden-hour": ["rgba(255,122,24,0.22)", "rgba(255,201,60,0.16)", "rgba(255,255,255,0.06)"],
};

/* Deterministic pseudo-random so a cover renders the same every time. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sizeById(id) {
  return COVER_SIZES.find((s) => s.id === id) || COVER_SIZES[1];
}

/* Panel rects in normalised coordinates, with a tilt in degrees and the
   photo slot each panel reads. The title band is the strip the lettering
   sits in: "bottom" or "top". */
export function layoutPanels(layoutId, width, height) {
  const band = height * 0.22;
  const gap = Math.max(6, Math.round(width * 0.012));
  const photoArea = { x: gap, y: gap, w: width - gap * 2, h: height - band - gap };
  if (layoutId === "hero-split") {
    const left = photoArea.w * 0.62;
    return {
      band: "bottom",
      panels: [
        { x: photoArea.x, y: photoArea.y, w: left - gap / 2, h: photoArea.h, tilt: 0, slot: 0 },
        { x: photoArea.x + left + gap / 2, y: photoArea.y, w: photoArea.w - left - gap / 2, h: photoArea.h / 2 - gap / 2, tilt: 0, slot: 1 },
        { x: photoArea.x + left + gap / 2, y: photoArea.y + photoArea.h / 2 + gap / 2, w: photoArea.w - left - gap / 2, h: photoArea.h / 2 - gap / 2, tilt: 0, slot: 2 },
      ],
    };
  }
  if (layoutId === "tilted-snaps") {
    return {
      band: "top",
      panels: [
        { x: width * 0.06, y: height * 0.30, w: width * 0.52, h: height * 0.42, tilt: -4, slot: 0 },
        { x: width * 0.55, y: height * 0.26, w: width * 0.38, h: height * 0.30, tilt: 5, slot: 1 },
        { x: width * 0.48, y: height * 0.60, w: width * 0.44, h: height * 0.30, tilt: -3, slot: 2 },
      ],
    };
  }
  if (layoutId === "full-bleed") {
    return {
      band: "bottom",
      panels: [
        { x: 0, y: 0, w: width, h: height, tilt: 0, slot: 0 },
      ],
    };
  }
  const halfW = photoArea.w / 2;
  const halfH = photoArea.h / 2;
  return {
    band: "bottom",
    panels: [
      { x: photoArea.x, y: photoArea.y, w: halfW - gap / 2, h: halfH - gap / 2, tilt: 0, slot: 0 },
      { x: photoArea.x + halfW + gap / 2, y: photoArea.y, w: halfW - gap / 2, h: halfH - gap / 2, tilt: 0, slot: 1 },
      { x: photoArea.x, y: photoArea.y + halfH + gap / 2, w: halfW - gap / 2, h: halfH - gap / 2, tilt: 0, slot: 2 },
      { x: photoArea.x + halfW + gap / 2, y: photoArea.y + halfH + gap / 2, w: halfW - gap / 2, h: halfH - gap / 2, tilt: 0, slot: 3 },
    ],
  };
}

export function titleBandRect(layoutId, width, height) {
  const band = height * 0.22;
  const info = layoutPanels(layoutId, width, height);
  if (info.band === "top") return { x: 0, y: 0, w: width, h: height * 0.24 };
  return { x: 0, y: height - band, w: width, h: band };
}

function paintSky(ctx, width, height, gradeId) {
  const stops = GRADE_SKIES[gradeId] || GRADE_SKIES.sunset;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach((color, i) => sky.addColorStop(i / (stops.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

function paintSunDisc(ctx, cx, cy, radius) {
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.9);
  glow.addColorStop(0, "rgba(255,201,60,0.85)");
  glow.addColorStop(0.45, "rgba(255,122,24,0.45)");
  glow.addColorStop(1, "rgba(255,46,136,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 2, cy - radius * 2, radius * 4, radius * 4);
  const disc = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  disc.addColorStop(0, "#ffe08a");
  disc.addColorStop(0.55, "#ff7a18");
  disc.addColorStop(1, "#ff2e88");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(29,11,61,0.55)";
  const stripeGap = radius / 5;
  for (let i = 0; i < 3; i++) {
    const y = cy + radius * 0.12 + i * stripeGap;
    const half = Math.sqrt(Math.max(0, radius * radius - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, stripeGap * 0.28);
  }
}

function paintSkyline(ctx, width, baseY, height, seed) {
  const rand = seededRandom(seed);
  ctx.fillStyle = "rgba(16,6,32,0.88)";
  let x = 0;
  while (x < width) {
    const bw = width * (0.05 + rand() * 0.07);
    const bh = height * (0.05 + rand() * 0.11);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.5) {
      ctx.fillRect(x + bw * 0.3, baseY - bh - height * 0.05, bw * 0.18, height * 0.05);
    }
    ctx.fillStyle = "rgba(255,201,60,0.85)";
    const windows = Math.floor(rand() * 5);
    for (let i = 0; i < windows; i++) {
      ctx.fillRect(x + bw * (0.15 + rand() * 0.6), baseY - bh + height * (0.03 + rand() * 0.16), 3, 4);
    }
    ctx.fillStyle = "rgba(16,6,32,0.88)";
    x += bw + width * 0.008;
  }
}

/* Resolve the photo a panel shows. An empty slot falls back to the first
   loaded photo with a shifted crop, so a cover never shows a blank panel
   when the maker has loaded even one photo. */
export function photoForPanel(state, slot, panelIndex) {
  const direct = state.photos ? state.photos[slot] : null;
  if (direct && direct.image) return { photo: direct, crop: direct.crop };
  const first = (state.photos || []).find((p) => p && p.image);
  if (!first) return { photo: null, crop: null };
  const shift = panelIndex % 2 === 0 ? -0.3 : 0.3;
  return {
    photo: first,
    crop: { zoom: Math.max(1.15, (first.crop.zoom || 1) * 1.15), x: shift, y: 0 },
  };
}

/* Retro neon stripes for the tilted-snaps backdrop: glowing horizontal
   lines across the open sky so no corner of the cover stays empty. */
function paintNeonStripes(ctx, width, height, seed) {
  const rand = seededRandom(seed + 55);
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const y = height * (0.62 + i * 0.09) + rand() * height * 0.02;
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255,201,60,0.55)" : "rgba(45,226,197,0.5)";
    ctx.lineWidth = Math.max(2, height * 0.004);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(width * 0.05, y);
    ctx.lineTo(width * 0.95, y);
    ctx.stroke();
  }
  ctx.restore();
}

/* Cover-fit draw of one photo into a rect, with zoom and pan offsets.
   crop: { zoom (1..2.6), x (-1..1), y (-1..1) } as fractions. */
export function drawPhotoCover(ctx, img, rect, crop) {
  if (!img || !img.naturalWidth) return false;
  const zoom = (crop && crop.zoom) || 1;
  const ox = (crop && crop.x) || 0;
  const oy = (crop && crop.y) || 0;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w * 0.25;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h * 0.25;
  ctx.drawImage(img, dx, dy, dw, dh);
  return true;
}

function paintPlaceholderPanel(ctx, rect, seed) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, "#3d1560");
  grad.addColorStop(0.6, "#ff2e88");
  grad.addColorStop(1, "#ff7a18");
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  paintSunDisc(ctx, rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.22);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 ${Math.max(14, rect.w * 0.045)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("ADD A PHOTO", rect.x + rect.w / 2, rect.y + rect.h * 0.82);
}

function applyGradeWash(ctx, width, height, gradeId) {
  const stops = GRADE_WASHES[gradeId] || GRADE_WASHES.sunset;
  const wash = ctx.createLinearGradient(0, 0, width, height);
  stops.forEach((color, i) => wash.addColorStop(i / (stops.length - 1), color));
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawTitleBlock(ctx, band, state, width, height) {
  const title = (state.title || "NEON VICE").toUpperCase();
  const subtitle = state.subtitle || "";
  const tag = state.tag || "";
  const pad = Math.max(18, width * 0.04);
  const sunZone = Math.min(band.h * 0.95, width * 0.24);
  const titleSize = Math.min(
    band.h * 0.52,
    ((width - pad * 2 - sunZone) / Math.max(4, title.length)) * 1.9,
  );
  const cx = band.x + band.w - pad - Math.min(band.h * 0.36, width * 0.11);
  const cy = band.y + band.h * 0.5;
  paintSunDisc(ctx, cx, cy, Math.min(band.h * 0.30, width * 0.09));
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const fontStack = `"Arial Black", "Arial Bold", Impact, "Helvetica Neue", sans-serif`;
  ctx.font = `900 ${titleSize}px ${fontStack}`;
  try { ctx.letterSpacing = `${Math.max(1, titleSize * 0.02)}px`; } catch (err) { /* older canvas: no letter spacing */ }
  ctx.shadowColor = "rgba(255,46,136,0.9)";
  ctx.shadowBlur = titleSize * 0.22;
  ctx.shadowOffsetY = titleSize * 0.04;
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  ctx.strokeStyle = "#2b0533";
  ctx.lineJoin = "round";
  const titleY = band.y + band.h * 0.56;
  ctx.strokeText(title, band.x + pad, titleY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, band.x + pad, titleY);
  ctx.restore();
  if (subtitle) {
    ctx.save();
    ctx.font = `italic 700 ${Math.max(18, band.h * 0.20)}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffc93c";
    ctx.shadowColor = "rgba(255,122,24,0.95)";
    ctx.shadowBlur = 14;
    ctx.fillText(subtitle, band.x + pad + 4, band.y + band.h * 0.76);
    ctx.restore();
  }
  if (tag) {
    ctx.save();
    ctx.font = `700 ${Math.max(12, band.h * 0.11)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "right";
    try { ctx.letterSpacing = "3px"; } catch (err) { /* older canvas */ }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(tag.toUpperCase(), band.x + band.w - pad, band.y + band.h * 0.84);
    ctx.restore();
  }
}

function drawGrain(ctx, width, height, seed) {
  const rand = seededRandom(seed + 77);
  const count = Math.floor((width * height) / 900);
  ctx.save();
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * width, rand() * height, 1.4, 1.4);
  }
  ctx.restore();
}

function drawVignette(ctx, width, height) {
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(10,2,20,0.42)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/* Main entry: paint the whole cover onto ctx at the canvas's own size. */
export function drawCover(ctx, width, height, state) {
  const layoutId = state.layout || "vice-grid";
  const gradeId = state.grade || "sunset";
  paintSky(ctx, width, height, gradeId);
  const info = layoutPanels(layoutId, width, height);
  const band = titleBandRect(layoutId, width, height);
  if (layoutId === "tilted-snaps") {
    paintSunDisc(ctx, width * 0.5, height * 0.52, Math.min(width, height) * 0.20);
    paintNeonStripes(ctx, width, height, 31);
  }
  const gap = Math.max(6, Math.round(width * 0.012));
  info.panels.forEach((panel, index) => {
    const slot = state.fillOne ? 0 : panel.slot;
    const resolved = photoForPanel(state, slot, index);
    const photo = resolved.photo;
    ctx.save();
    if (panel.tilt) {
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate((panel.tilt * Math.PI) / 180);
      ctx.translate(-panel.w / 2, -panel.h / 2);
    } else {
      ctx.translate(panel.x, panel.y);
    }
    const local = { x: 0, y: 0, w: panel.w, h: panel.h };
    ctx.beginPath();
    ctx.rect(0, 0, panel.w, panel.h);
    ctx.clip();
    const drawn = photo && photo.image
      ? drawPhotoCover(ctx, photo.image, local, resolved.crop)
      : false;
    if (!drawn) paintPlaceholderPanel(ctx, local, 1000 + index * 131);
    ctx.restore();
    if (state.borders !== false && layoutId !== "full-bleed") {
      ctx.save();
      if (panel.tilt) {
        ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
        ctx.rotate((panel.tilt * Math.PI) / 180);
        ctx.translate(-panel.w / 2, -panel.h / 2);
      } else {
        ctx.translate(panel.x, panel.y);
      }
      ctx.lineWidth = Math.max(3, gap * 0.7);
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 12;
      ctx.strokeRect(0, 0, panel.w, panel.h);
      ctx.restore();
    }
  });
  if (layoutId === "full-bleed") {
    const scrim = ctx.createLinearGradient(0, height * 0.55, 0, height);
    scrim.addColorStop(0, "rgba(16,6,32,0)");
    scrim.addColorStop(1, "rgba(16,6,32,0.82)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);
  } else {
    paintSkyline(ctx, width, band.y + band.h, band.h, 4242);
  }
  applyGradeWash(ctx, width, height, gradeId);
  drawTitleBlock(ctx, band, state, width, height);
  if (state.grain !== false) drawGrain(ctx, width, height, 99);
  drawVignette(ctx, width, height);
}

/* Render a fresh offscreen canvas at the requested export size. */
export function renderCoverCanvas(state, sizeId) {
  const size = sizeById(sizeId);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  drawCover(ctx, size.width, size.height, state);
  return canvas;
}
