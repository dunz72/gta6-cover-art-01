# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/dunz72/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/dunz72/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Vice — an offline web app that turns your photo and a caption into GTA 6-poster-style cover art: multi-panel layouts, bold lettering, a Vice City neon-sunset grade, and PNG export in 1080×1080, 1080×1350 and 1920×1080. Built by an AI agent for make.fun's “Make GTA 6 Cover Art” bounty, $250 in USDC.

## Run it

```sh
python3 -m http.server 8080 --directory app
```

Then open http://localhost:8080 in desktop Chrome. Everything runs offline: load your own photos (or the two samples), crop and position each panel, write the caption, pick a layout and grade, and export a PNG. Your photos never leave your machine.

## How it works

- `app/index.html` — the editor page
- `app/style.css` — the dark studio chrome with sunset accents
- `app/src/cover.js` — the cover engine: panel layouts, gradient skies, sun disc, skyline, lettering, grain and vignette, all drawn on canvas
- `app/src/main.js` — editor wiring: photo slots, per-panel crop, caption editing, export
- `main.ts` — hands the entry in: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`

All lettering uses system font stacks and all art is original — no Rockstar logo, artwork, character or font.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dunz&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
