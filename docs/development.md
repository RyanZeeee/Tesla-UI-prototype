# Development guide

[Project overview](../README.md) · [中文介绍](../README.zh-CN.md)

## Everyday development

Use Node.js 24 and run all commands from the repository root:

```bash
npm ci
npm run dev
```

Validate changes with `npm run lint` and `npm run build`. `npm run preview` serves an existing `dist/` build. There are no separate component-preview HTML pages or dedicated automated end-to-end test scripts.

The app is a client-side prototype. `src/App.tsx` owns the main panel visibility, canvas sizing, and Dock-level climate state. The displayed canvas is 1920 × 1200 and scales as a whole.

| Area | Entry points |
| --- | --- |
| Dock and main panel coordination | `src/App.tsx`, `src/components/ControlBar.tsx` |
| Compact vehicle area | `src/components/Sidebar.tsx`, `CarCard.tsx`, `VehicleModel.tsx` |
| Vehicle rendering | `src/vehicle/createVehicleScene.ts` |
| Climate | `src/components/ClimatePanel.tsx`, `src/climate/` |
| Seats | `src/components/SeatPanel.tsx`, `src/seats/` |
| Navigation and quick destinations | `src/components/Navigate.tsx`, `NavigateCard.tsx`, `src/navigation/mapData.ts` |
| Shared music state | `src/components/MusicPlayer.tsx` |
| Map-area music window | `src/components/DockMusicPanel.tsx` |
| Volume slider | `src/components/ClimateControls.tsx` |
| Vehicle settings | `src/settings/` |
| Design tokens and common layout | `src/tokens.css`, `src/dashboard.css` |

Music state is shared between the compact player and the Dock window rather than running two playback simulations. Vehicle-settings keys and seat preferences use browser storage; legacy setting labels are migrated when read.

## Optional asset tools

The repository already includes runtime map images and both GLB models. **These tools are not part of installation or the production build.** Use them only when intentionally regenerating assets; they overwrite the corresponding generated outputs.

### Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements.txt
```

On Windows, activate with `.venv\Scripts\Activate.ps1` in PowerShell. The Python requirements are NumPy and OpenCV.

### Maps

- `scripts/vectorize-map.py`: reconstructs the full authoring geometry from `src/assets/map.png`; use only when replacing the original traced map.
- `scripts/refine-map-center.py`: regenerates the central-road geometry while the raster exporter preserves the outer map.
- `scripts/rasterize-map.cjs`: exports `map-base.webp` and `map-base-flat.webp` to `src/assets/navigation/`.
- The source geometry in `src/navigation/mapGeometry.ts` and `mapCenterGeometry.json` is used for authoring, not imported by the runtime map component.

For raster export, install the optional Sharp tool locally without changing the project manifest or lockfile:

```bash
npm install --no-save --package-lock=false sharp
python scripts/refine-map-center.py
node scripts/rasterize-map.cjs
```

This temporary Sharp installation is removed by a later `npm ci`. Inspect both generated maps and verify the route/label alignment before committing them.

### Front-seat extraction

```bash
node scripts/inspect-seats.cjs
python scripts/extract-front-seat.py
```

The Node script reads the bundled vehicle GLB and decodes the relevant surfaces into `.cache/tesla-seat-parts.json`. The Python script extracts the selected connected surfaces, preserves the correct triangle winding, separates the cushion and backrest, and writes `public/models/tesla-front-seat.glb`.

The intermediate cache is ignored by Git. The generated GLB is **not** ignored and should be committed when changed. Extraction uses the source-model layout and is not a generic converter for unrelated GLBs.

## Validation checklist

After interface or scene changes, check the relevant flows in a WebGL-capable browser:

- Compact/expanded vehicle transitions, disabled compact rotation, and five-second camera reset.
- Frunk, trunk, and charge-port opening/closing; inspect close-ups when adjusting geometry.
- Climate airflow, fan/temperature controls, and drawer dismissal.
- Seat fore/aft and backrest adjustment, bounds, and saved positions.
- Quick navigation, search, route selection, and the parked vehicle marker.
- Dock music vs. compact music, shared track/progress state, volume-slider positioning, and outside-click dismissal.
- Vehicle-settings tabs, dialogs, and keyboard focus.

Run the production build after changing asset imports. TypeScript and ESLint do not establish visual correctness.

## Repository contents

Commit source, configuration, lockfile, documentation, images, model files, and decoder license files. Do not commit `node_modules/`, `dist/`, `.cache/`, `.venv/`, local environment files, or editor state.

The package identifier is lowercase `tesla-ui-prototype` to follow npm naming conventions. The project, page title, and repository folder are named `Tesla-UI-prototype`.

## Static hosting

The production build includes `public/` files. Models and Draco are requested using Vite's `BASE_URL`, so the correct base path must be set when deploying under a repository subdirectory. See the deployment examples in the main README.
