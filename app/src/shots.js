// Neon Vice — screenshot scenes.
// ?shot=cover shows one finished cover full-bleed, ?shot=cover-neon the same
// in the Neon grade, ?shot=editor the editor with a photo loaded, and
// ?shot=export the PNG the app itself exported, shown as it was written.
// Every scene sets window.__shotReady once its cover is drawn, so a
// headless browser can screenshot exactly when the art is ready.
(function () {
  'use strict';

  var NV = window.NeonVice;

  function params() {
    var out = {};
    var q = window.location.search.replace(/^\?/, '');
    q.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return out;
  }

  function showOnlyCover() {
    document.body.classList.add('shot-cover');
    var canvas = document.getElementById('cover-canvas');
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    }
  }

  function drawCoverScene(state, w, h) {
    var canvas = document.getElementById('cover-canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;
    NV.drawCover(ctx, state, w, h, {});
  }

  function finish() {
    window.__shotReady = true;
  }

  function sceneCover(state, grade, layout, title, subtitle) {
    state.grade = grade;
    state.layout = layout;
    state.title = title;
    state.subtitle = subtitle;
    state.autofill = true;
    showOnlyCover();
    drawCoverScene(state, 1920, 1080);
    finish();
  }

  function sceneExport(state) {
    // Render the cover at 1080 x 1350, export it as a PNG, and display the
    // very bytes the app wrote — this is the exported-cover screenshot.
    state.grade = 'vice';
    state.layout = 'quad';
    state.title = 'NEON VICE';
    state.subtitle = 'VICE CITY \u2022 LEONIDA';
    state.autofill = true;
    NV.exportPNG(state, 1080, 1350).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var view = document.getElementById('export-view');
      var img = document.getElementById('export-img');
      var meta = document.getElementById('export-meta');
      if (!view || !img) { finish(); return; }
      document.body.classList.add('shot-export');
      img.onload = function () {
        if (meta) {
          meta.textContent = 'Exported PNG \u2014 1080 \u00d7 1350 \u00b7 ' +
            Math.round(blob.size / 1024) + ' KiB \u00b7 written by Neon Vice';
        }
        finish();
      };
      img.onerror = function () { finish(); };
      img.src = url;
      view.hidden = false;
    }).catch(function () { finish(); });
  }

  function init() {
    var shot = params().shot || '';
    if (!shot) return;
    var app = window.NeonViceApp;
    if (!app) { finish(); return; }
    app.ready.then(function () {
      var state = app.state;
      if (shot === 'cover') {
        sceneCover(state, 'sunset', 'hero2', 'NEON VICE', 'VICE CITY \u2022 LEONIDA');
      } else if (shot === 'cover-neon') {
        sceneCover(state, 'neon', 'triptych', 'NEON VICE', 'MIDNIGHT BOULEVARD');
      } else if (shot === 'editor') {
        // The editor as the maker sees it, with a sample photo loaded.
        document.body.classList.add('shot-editor');
        state.grade = 'sunset';
        state.layout = 'hero2';
        state.autofill = true;
        app.renderPreview();
        finish();
      } else if (shot === 'export') {
        sceneExport(state);
      } else {
        finish();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
