# Cargo Load Simulator (3D)

Interactive Boeing 777F cargo hold — drag ULD packages and watch CG, zone loads, and compliance update in real time.

## Run locally

```bash
cd cargo-loader
python3 -m http.server 8080
```

Open **http://localhost:8080** in your browser.

> Requires a local server (ES modules + Three.js import map won't work from `file://`).

## Controls

| Action | Input |
|---|---|
| **Move ULD** | Left-click + drag |
| Orbit camera | Right-click + drag |
| Zoom | Scroll |
| Auto-balance | Sidebar button |
| Reset load | Sidebar button |

Packages snap to grid on release. Invalid placements revert automatically.

## Architecture

- `js/physics.js` — CG, zones, collision (ported from the Jupyter notebook)
- `js/main.js` — Three.js scene, drag interaction, dashboard UI
- `index.html` + `css/styles.css` — layout and dashboard widgets
