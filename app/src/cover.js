// Neon Vice — cover renderer.
// Draws GTA-6-poster-style multi-panel cover art on a 2D canvas, entirely
// from original shapes and the user's own photos. No Rockstar artwork,
// logos or fonts are used anywhere: the sun disc, the title band and every
// grade tint are drawn from scratch in this file.
(function () {
  'use strict';

  // ---------------------------------------------------------------- grades
  // Each grade tints the photos (a canvas filter) and paints the title band.
  var GRADES = {
    sunset: {
      label: 'Sunset',
      photoFilter: 'saturate(1.25) contrast(1.06) sepia(0.22)',
      tintTop: 'rgba(255, 122, 24, 0.10)',
      tintBottom: 'rgba(214, 51, 108, 0.12)',
      band: ['#2b0a3d', '#c22a6d', '#ff7a18'],
      sun: ['#ffe66d', '#ffb347', '#ff5e78'],
      titleFill: '#fff6e8',
      titleStroke: '#2b0a3d',
      accent: '#ff7a18',
      panelLine: 'rgba(255, 122, 24, 0.55)'
    },
    neon: {
      label: 'Neon',
      photoFilter: 'saturate(1.65) contrast(1.14) hue-rotate(-12deg)',
      tintTop: 'rgba(255, 46, 166, 0.12)',
      tintBottom: 'rgba(0, 229, 255, 0.10)',
      band: ['#12002e', '#a4138a', '#00e5ff'],
      sun: ['#7df9ff', '#ff2ea6', '#7b2ff7'],
      titleFill: '#f4feff',
      titleStroke: '#12002e',
      accent: '#00e5ff',
      panelLine: 'rgba(0, 229, 255, 0.55)'
    },
    noir: {
      label: 'Noir',
      photoFilter: 'grayscale(1) contrast(1.28) brightness(1.06)',
      tintTop: 'rgba(255, 255, 255, 0.05)',
      tintBottom: 'rgba(0, 0, 0, 0.16)',
      band: ['#0a0a0a', '#3a3a3a', '#000000'],
      sun: ['#f5f5f5', '#c9c9c9', '#8a8a8a'],
      titleFill: '#ffffff',
      titleStroke: '#000000',
      accent: '#e8e8e8',
      panelLine: 'rgba(255, 255, 255, 0.45)'
    },
    vice: {
      label: 'Vice',
      photoFilter: 'saturate(1.35) contrast(1.1) hue-rotate(10deg)',
      tintTop: 'rgba(123, 47, 247, 0.12)',
      tintBottom: 'rgba(0, 194, 168, 0.10)',
      band: ['#1a0533', '#7b2ff7', '#00c2a8'],
      sun: ['#c9f7c5', '#7be0c3', '#7b2ff7'],
      titleFill: '#f2fffb',
      titleStroke: '#1a0533',
      accent: '#00c2a8',
      panelLine: 'rgba(0, 194, 168, 0.55)'
    }
  };

  var LAYOUTS = ['hero2', 'triptych', 'quad', 'solo'];

  // ------------------------------------------------------------------ state
  function defaultState() {
    return {
      layout: 'hero2',
      grade: 'sunset',
      title: 'NEON VICE',
      subtitle: 'VICE CITY \u2022 LEONIDA',
      credit: 'A NEON VICE ORIGINAL \u2014 MADE OFFLINE',
      autofill: true,
      // photos: key -> HTMLImageElement (or {width,height,draw} for tests)
      photos: {},
      // one entry per panel slot; photo is a key of photos or null
      panels: [
        { photo: null, zoom: 1, panX: 0, panY: 0 },
        { photo: null, zoom: 1, panX: 0, panY: 0 },
        { photo: null, zoom: 1, panX: 0, panY: 0 },
        { photo: null, zoom: 1, panX: 0, panY: 0 }
      ]
    };
  }

  // ------------------------------------------------------------- panel geometry
  // The photo area is the top 78% of the cover; the title band is the rest.
  // Returns rects {x, y, w, h} in cover pixels, one per panel slot.
  function panelRects(layout, w, h) {
    var photoH = h * 0.78;
    var g = Math.max(2, Math.round(w * 0.011));
    var rects = [];
    var i, cw, ch;
    if (layout === 'triptych') {
      cw = (w - 2 * g) / 3;
      for (i = 0; i < 3; i++) {
        rects.push({ x: i * (cw + g), y: 0, w: cw, h: photoH });
      }
    } else if (layout === 'quad') {
      cw = (w - g) / 2;
      ch = (photoH - g) / 2;
      rects.push({ x: 0, y: 0, w: cw, h: ch });
      rects.push({ x: cw + g, y: 0, w: cw, h: ch });
      rects.push({ x: 0, y: ch + g, w: cw, h: ch });
      rects.push({ x: cw + g, y: ch + g, w: cw, h: ch });
    } else if (layout === 'solo') {
      rects.push({ x: 0, y: 0, w: w, h: photoH });
    } else { // hero2
      var heroH = (photoH - g) * 0.58;
      var botH = photoH - heroH - g;
      cw = (w - g) / 2;
      rects.push({ x: 0, y: 0, w: w, h: heroH });
      rects.push({ x: 0, y: heroH + g, w: cw, h: botH });
      rects.push({ x: cw + g, y: heroH + g, w: cw, h: botH });
    }
    return rects;
  }

  function panelCount(layout) {
    return panelRects(layout, 100, 100).length;
  }

  // ------------------------------------------------------------ photo drawing
  // Cover-fit a photo into a panel rect, with zoom and pan.
  // panX/panY are in [-1, 1]; 0 centres the photo.
  function drawPhotoInto(ctx, img, rect, zoom, panX, panY) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    var dx = rect.x + (rect.w - dw) / 2 + panX * (dw - rect.w) / 2;
    var dy = rect.y + (rect.h - dh) / 2 + panY * (dh - rect.h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // A gradient placeholder for a panel with no photo yet.
  function drawPlaceholder(ctx, rect, grade, index) {
    var g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, grade.band[0]);
    g.addColorStop(1, grade.band[1]);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '700 ' + Math.round(rect.h * 0.09) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    void index;
  }

  // Varied crops for the one-photo autofill: each panel gets a different
  // deterministic zoom/pan of the same photo, so the grid never repeats.
  function autofillCrop(index) {
    return {
      zoom: 1.12 + 0.14 * ((index * 37) % 10) / 10,
      panX: 0.55 * Math.sin(index * 2.1 + 0.6),
      panY: 0.45 * Math.cos(index * 1.7 + 0.3)
    };
  }

  // -------------------------------------------------------------- sun + band
  // Original retro sun disc: a circle sliced into horizontal slats whose
  // gaps widen toward the bottom. Drawn from scratch, no image.
  function drawSun(ctx, cx, cy, r, colors) {
    var rows = 26;
    var g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.55, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    for (var i = 0; i < rows; i++) {
      var y0 = cy - r + (2 * r * i) / rows;
      var y1 = cy - r + (2 * r * (i + 1)) / rows;
      var ym = (y0 + y1) / 2;
      var dy = ym - cy;
      var half = Math.sqrt(Math.max(0, r * r - dy * dy));
      if (half <= 0) continue;
      // Gaps grow below the centre: the classic slatted-sun look.
      var gap = ym > cy ? (ym - cy) / r * (y1 - y0) * 0.55 : 0;
      var top = y0 + gap / 2;
      var bottom = y1 - gap / 2;
      if (bottom <= top) continue;
      ctx.fillRect(cx - half, top, half * 2, bottom - top);
    }
  }

  function drawTitleBand(ctx, state, w, h) {
    var grade = GRADES[state.grade] || GRADES.sunset;
    var bandY = h * 0.78;
    var bandH = h - bandY;
    // Band fill: vertical sunset gradient.
    var g = ctx.createLinearGradient(0, bandY, 0, h);
    g.addColorStop(0, grade.band[0]);
    g.addColorStop(0.55, grade.band[1]);
    g.addColorStop(1, grade.band[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY, w, bandH);
    // Thin neon rule above the band.
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, bandY, w, Math.max(2, bandH * 0.02));
    // Sun disc straddling the band's top edge, behind the title.
    drawSun(ctx, w / 2, bandY, bandH * 0.62, grade.sun);
    // Title: bold outlined capitals, slanted, slightly condensed.
    var titleSize = bandH * 0.46;
    var cx = w / 2;
    var titleY = bandY + bandH * 0.44;
    ctx.save();
    ctx.translate(cx, titleY);
    ctx.transform(0.92, 0, -0.14, 1, 0, 0);
    ctx.font = '900 ' + Math.round(titleSize) + 'px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = titleSize * 0.08;
    ctx.shadowOffsetY = titleSize * 0.03;
    ctx.strokeStyle = grade.titleStroke;
    ctx.lineWidth = Math.max(2, titleSize * 0.10);
    ctx.strokeText(state.title, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grade.titleFill;
    ctx.fillText(state.title, 0, 0);
    ctx.restore();
    // Subtitle: letterspaced small caps under the title.
    var subSize = Math.max(10, bandH * 0.13);
    ctx.save();
    ctx.font = '700 ' + Math.round(subSize) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = Math.round(subSize * 0.28) + 'px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(state.subtitle, w / 2, bandY + bandH * 0.78);
    ctx.restore();
    // Credit line at the very bottom.
    var credSize = Math.max(8, bandH * 0.085);
    ctx.save();
    ctx.font = '700 ' + Math.round(credSize) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = Math.round(credSize * 0.22) + 'px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(state.credit, w / 2, h - bandH * 0.075);
    ctx.restore();
  }

  // ------------------------------------------------------------------- render
  // Draw the whole cover onto ctx at w x h. opts.highlight is a panel index
  // to outline (editor selection only; never used for exports).
  function drawCover(ctx, state, w, h, opts) {
    opts = opts || {};
    var grade = GRADES[state.grade] || GRADES.sunset;
    var rects = panelRects(state.layout, w, h);
    var photoH = h * 0.78;
    // Black gutters show through between panels.
    ctx.fillStyle = '#06030a';
    ctx.fillRect(0, 0, w, photoH);
    // First available photo, for the autofill fallback.
    var firstKey = null;
    var keys = Object.keys(state.photos);
    for (var k = 0; k < keys.length; k++) {
      if (state.photos[keys[k]]) { firstKey = keys[k]; break; }
    }
    for (var i = 0; i < rects.length; i++) {
      var panel = state.panels[i] || { photo: null, zoom: 1, panX: 0, panY: 0 };
      var img = panel.photo ? state.photos[panel.photo] : null;
      var zoom = panel.zoom;
      var panX = panel.panX;
      var panY = panel.panY;
      if (!img && state.autofill && firstKey) {
        img = state.photos[firstKey];
        var crop = autofillCrop(i);
        zoom = crop.zoom;
        panX = crop.panX;
        panY = crop.panY;
      }
      if (img) {
        ctx.save();
        ctx.filter = grade.photoFilter;
        drawPhotoInto(ctx, img, rects[i], zoom, panX, panY);
        ctx.restore();
      } else {
        drawPlaceholder(ctx, rects[i], grade, i);
      }
      // Thin neon inner line around each panel.
      ctx.strokeStyle = grade.panelLine;
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.strokeRect(rects[i].x + 1, rects[i].y + 1, rects[i].w - 2, rects[i].h - 2);
    }
    // Grade tint + vignette over the whole photo area.
    var tint = ctx.createLinearGradient(0, 0, 0, photoH);
    tint.addColorStop(0, grade.tintTop);
    tint.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, photoH);
    var vig = ctx.createRadialGradient(w / 2, photoH / 2, Math.min(w, photoH) * 0.42,
      w / 2, photoH / 2, Math.max(w, photoH) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, photoH);
    // Title band on top.
    drawTitleBand(ctx, state, w, h);
    // Editor selection outline (preview only).
    if (typeof opts.highlight === 'number' && rects[opts.highlight]) {
      var r = rects[opts.highlight];
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, w * 0.005);
      ctx.setLineDash([Math.max(8, w * 0.014), Math.max(6, w * 0.01)]);
      ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      ctx.restore();
    }
  }

  // Render the cover onto a fresh canvas of w x h; returns the canvas.
  function renderCanvas(state, w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    drawCover(ctx, state, w, h, {});
    return canvas;
  }

  // Export the cover as a PNG blob at w x h.
  function exportPNG(state, w, h) {
    return new Promise(function (resolve, reject) {
      var canvas = renderCanvas(state, w, h);
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('toBlob produced nothing'));
        }, 'image/png');
      } else {
        reject(new Error('canvas.toBlob is not available'));
      }
    });
  }

  // Load an image from a URL; resolves with the HTMLImageElement.
  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('could not load ' + url)); };
      img.src = url;
    });
  }

  // Public surface.
  window.NeonVice = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    defaultState: defaultState,
    panelRects: panelRects,
    panelCount: panelCount,
    drawCover: drawCover,
    renderCanvas: renderCanvas,
    exportPNG: exportPNG,
    loadImage: loadImage,
    EXPORT_SIZES: [
      { w: 1080, h: 1080, label: '1080 \u00d7 1080' },
      { w: 1080, h: 1350, label: '1080 \u00d7 1350' },
      { w: 1920, h: 1080, label: '1920 \u00d7 1080' },
      { w: 1080, h: 1920, label: '1080 \u00d7 1920' }
    ]
  };
})();
