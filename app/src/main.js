// Neon Vice — editor wiring.
// Connects the controls to the cover renderer: photo uploads and samples,
// layout and grade picks, per-panel crop (drag to pan, scroll to zoom) and
// the four PNG export sizes. Everything runs offline; photos never leave
// the machine.
(function () {
  'use strict';

  var NV = window.NeonVice;
  var PREVIEW_W = 1080;
  var PREVIEW_H = 1350;

  var state = NV.defaultState();
  var selectedPanel = 0;
  var canvas = null;
  var ctx = null;
  var statusEl = null;

  // Sample photos shipped with the app (flat illustrations drawn for it).
  var SAMPLES = [
    { key: 'pier', label: 'Pier Sunset', url: 'samples/pier.jpg' },
    { key: 'boulevard', label: 'Boulevard Night', url: 'samples/boulevard.jpg' }
  ];

  // Uploaded photos land here, in slot order.
  var UPLOADS = [
    { key: 'up1', label: 'Upload 1' },
    { key: 'up2', label: 'Upload 2' },
    { key: 'up3', label: 'Upload 3' }
  ];

  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderPreview() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    NV.drawCover(ctx, state, canvas.width, canvas.height, { highlight: selectedPanel });
  }

  function refreshPanelControls() {
    var rects = NV.panelRects(state.layout, PREVIEW_W, PREVIEW_H);
    var panel = state.panels[selectedPanel] || { photo: null, zoom: 1, panX: 0, panY: 0 };
    var label = $('panel-label');
    if (label) label.textContent = 'Panel ' + (selectedPanel + 1) + ' of ' + rects.length;
    var picker = $('panel-photo');
    if (picker) picker.value = panel.photo || '';
    var zoom = $('panel-zoom');
    if (zoom) zoom.value = String(panel.zoom);
    var zoomVal = $('zoom-value');
    if (zoomVal) zoomVal.textContent = panel.zoom.toFixed(2) + '\u00d7';
  }

  function allPhotoOptions() {
    var opts = [];
    SAMPLES.forEach(function (s) {
      if (state.photos[s.key]) opts.push({ key: s.key, label: s.label + ' (sample)' });
    });
    UPLOADS.forEach(function (u) {
      if (state.photos[u.key]) opts.push({ key: u.key, label: u.label });
    });
    return opts;
  }

  function rebuildPhotoPicker() {
    var picker = $('panel-photo');
    if (!picker) return;
    var current = picker.value;
    picker.innerHTML = '';
    var none = document.createElement('option');
    none.value = '';
    none.textContent = '\u2014 autofill \u2014';
    picker.appendChild(none);
    allPhotoOptions().forEach(function (o) {
      var el = document.createElement('option');
      el.value = o.key;
      el.textContent = o.label;
      picker.appendChild(el);
    });
    picker.value = current;
  }

  function rebuildThumbs() {
    var wrap = $('thumbs');
    if (!wrap) return;
    wrap.innerHTML = '';
    SAMPLES.concat(UPLOADS).forEach(function (entry) {
      var img = state.photos[entry.key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb' + (img ? '' : ' thumb-empty');
      btn.title = entry.label + (img ? ' \u2014 click to put in the selected panel' : ' \u2014 empty');
      if (img) {
        var t = document.createElement('img');
        t.src = img.src;
        t.alt = entry.label;
        btn.appendChild(t);
      } else {
        btn.textContent = entry.label;
      }
      btn.addEventListener('click', function () {
        if (!state.photos[entry.key]) return;
        state.panels[selectedPanel].photo = entry.key;
        rebuildPhotoPicker();
        refreshPanelControls();
        renderPreview();
      });
      wrap.appendChild(btn);
    });
  }

  function selectPanel(index) {
    var count = NV.panelCount(state.layout);
    selectedPanel = Math.max(0, Math.min(count - 1, index));
    refreshPanelControls();
    renderPreview();
  }

  function pickPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) / rect.width * canvas.width;
    var y = (ev.clientY - rect.top) / rect.height * canvas.height;
    return { x: x, y: y };
  }

  function hitPanel(x, y) {
    var rects = NV.panelRects(state.layout, canvas.width, canvas.height);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  function wireCanvas() {
    var dragging = false;
    var last = null;
    canvas.addEventListener('pointerdown', function (ev) {
      var p = pickPoint(ev);
      var hit = hitPanel(p.x, p.y);
      if (hit < 0) return;
      selectPanel(hit);
      dragging = true;
      last = p;
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!dragging || !last) return;
      var p = pickPoint(ev);
      var panel = state.panels[selectedPanel];
      if (!panel) return;
      var rects = NV.panelRects(state.layout, canvas.width, canvas.height);
      var r = rects[selectedPanel];
      if (!r) return;
      // Drag moves the photo inside its panel; scale by zoom so it feels 1:1.
      panel.panX = clamp(panel.panX + (p.x - last.x) / r.w * 2 / Math.max(1, panel.zoom), -1, 1);
      panel.panY = clamp(panel.panY + (p.y - last.y) / r.h * 2 / Math.max(1, panel.zoom), -1, 1);
      last = p;
      renderPreview();
    });
    function endDrag() { dragging = false; last = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var panel = state.panels[selectedPanel];
      if (!panel) return;
      var next = panel.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12);
      panel.zoom = clamp(next, 1, 3);
      refreshPanelControls();
      renderPreview();
    }, { passive: false });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function wireControls() {
    // Layout buttons.
    document.querySelectorAll('[data-layout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.layout = btn.getAttribute('data-layout');
        document.querySelectorAll('[data-layout]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        selectedPanel = 0;
        refreshPanelControls();
        renderPreview();
      });
    });
    // Grade buttons.
    document.querySelectorAll('[data-grade]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.grade = btn.getAttribute('data-grade');
        document.querySelectorAll('[data-grade]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderPreview();
      });
    });
    // Words.
    var title = $('title-input');
    if (title) title.addEventListener('input', function () {
      state.title = (title.value || 'NEON VICE').toUpperCase();
      renderPreview();
    });
    var subtitle = $('subtitle-input');
    if (subtitle) subtitle.addEventListener('input', function () {
      state.subtitle = (subtitle.value || '').toUpperCase();
      renderPreview();
    });
    var credit = $('credit-input');
    if (credit) credit.addEventListener('input', function () {
      state.credit = (credit.value || '').toUpperCase();
      renderPreview();
    });
    // Panel photo picker + zoom + reset.
    var picker = $('panel-photo');
    if (picker) picker.addEventListener('change', function () {
      state.panels[selectedPanel].photo = picker.value || null;
      renderPreview();
    });
    var zoom = $('panel-zoom');
    if (zoom) zoom.addEventListener('input', function () {
      state.panels[selectedPanel].zoom = parseFloat(zoom.value) || 1;
      refreshPanelControls();
      renderPreview();
    });
    var reset = $('panel-reset');
    if (reset) reset.addEventListener('click', function () {
      var panel = state.panels[selectedPanel];
      panel.zoom = 1; panel.panX = 0; panel.panY = 0;
      refreshPanelControls();
      renderPreview();
    });
    // Autofill toggle.
    var auto = $('autofill');
    if (auto) auto.addEventListener('change', function () {
      state.autofill = auto.checked;
      renderPreview();
    });
    // Uploads.
    UPLOADS.forEach(function (u, i) {
      var input = $('upload-' + (i + 1));
      if (!input) return;
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            state.photos[u.key] = img;
            state.panels[selectedPanel].photo = u.key;
            rebuildThumbs();
            rebuildPhotoPicker();
            refreshPanelControls();
            renderPreview();
            setStatus(u.label + ' loaded \u2014 ' + file.name);
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    });
    // Export buttons.
    document.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var size = btn.getAttribute('data-export').split('x');
        var w = parseInt(size[0], 10);
        var h = parseInt(size[1], 10);
        setStatus('Exporting ' + w + ' \u00d7 ' + h + ' PNG\u2026');
        NV.exportPNG(state, w, h).then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'neon-vice-' + w + 'x' + h + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
          setStatus('Exported ' + w + ' \u00d7 ' + h + ' PNG (' +
            Math.round(blob.size / 1024) + ' KiB)');
        }).catch(function (err) {
          setStatus('Export failed: ' + err.message);
        });
      });
    });
  }

  function loadSamples() {
    var jobs = SAMPLES.map(function (s) {
      return NV.loadImage(s.url).then(function (img) {
        state.photos[s.key] = img;
      }).catch(function () {
        // A missing sample just leaves its slot empty; the app still works.
      });
    });
    return Promise.all(jobs);
  }

  function init() {
    canvas = $('cover-canvas');
    statusEl = $('status');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    wireCanvas();
    wireControls();
    loadSamples().then(function () {
      rebuildThumbs();
      rebuildPhotoPicker();
      refreshPanelControls();
      renderPreview();
      setStatus('Ready \u2014 pick a layout, drag a photo to pan, scroll to zoom.');
      readyResolve();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.NeonViceApp = {
    state: state,
    ready: ready,
    renderPreview: renderPreview,
    selectPanel: selectPanel,
    SAMPLES: SAMPLES,
    UPLOADS: UPLOADS
  };
})();
