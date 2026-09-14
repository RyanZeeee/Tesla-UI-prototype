# Tesla-UI-prototype

**English** · [简体中文](README.zh-CN.md)

A Tesla-inspired in-car touchscreen prototype for exploring vehicle interfaces, interaction motion, and 3D presentation in the browser.

The project includes a real-time Model 3 viewer, a 3D climate interface, front-seat adjustment, a simulated navigation map, vehicle settings, and a music player. The interface uses a **1920 × 1200** design canvas that scales proportionally with the browser window.

This is an independent design prototype, not an official Tesla product. Vehicle controls, routes, tire readings, and playback are demonstrations: it does not connect to a real car, a live mapping service, or a music-streaming service.

## Features and interactions

### 3D vehicle

- Compact overhead view and an expanded, low-angle front three-quarter view.
- Drag or use arrow keys to rotate **only while expanded**. After five seconds without rotation input, the camera smoothly returns to its default view.
- Double-click, or press Home / Escape with the viewer focused, to reset the camera. Mouse-wheel zoom is intentionally disabled.
- Animated frunk, trunk, and charge-port opening and closing, with leader lines and Open / Close controls pointing at the matching part.
- While compact, the frunk and trunk controls appear on the right of the model and the charge-port control on the left.
- Custom paint, glass, rubber, lighting, ground illumination, and reflections. Headlights and taillights remain on.

### Climate and front seats

- A bottom drawer with a 3D cabin, animated airflow, draggable air direction, fan levels, temperature controls, and climate power.
- Driver and passenger seat views with interactive handles for fore/aft movement and backrest recline. Seat-height adjustment is intentionally excluded.
- Seat positions are saved locally. Switching between seats and changing the backrest retain a consistent model scale.

### Navigation

- A lightweight raster map base with separate live layers for text, places, the vehicle marker, and route overlays.
- Pan, zoom, recenter, destination search, charging locations, route comparison, and starting or ending a navigation demonstration.
- Navigate, Home, and Work below the expanded vehicle card return to the map: collapsing the model opens search or the matching route preview.
- The vehicle stays parked, including after navigation starts. There is no simulated driving and no live traffic.

### Music and Dock

- Five tracks with artwork, shared track selection, playback state, progress, previous/next controls, favorites, and queue selection.
- The compact music card has its own details and search interactions. The Dock music icon opens a **separate player window above the map**, synchronized with the card.
- Clicking the speaker opens a volume slider with a percentage readout and mute control. The Dock also retains volume step buttons.
- Front/rear defrost switches, active states, press feedback, and shortcuts to vehicle settings, climate, seats, and the app launcher.
- The app launcher displays the author's avatar, name, and contact information.

Music playback is a UI simulation; no audio files or streaming credentials are included.

### Vehicle settings

Eight sections: **Controls, Autopilot, Lights, Locks, Display, Dynamics, Safety, and Service**.

Explore switches, segmented selectors, sliders, adjustment dialogs, demo key management, tire-pressure display, wheel/tire configuration, and service-related flows. Vehicle preferences, demo keys, and seat positions are saved through browser `localStorage`; other interface state is generally kept only for the current session.

## Technology

| Layer | Implementation |
| --- | --- |
| UI | React 19, TypeScript 6 |
| Development and build | Vite 8, npm lockfile |
| Styling | CSS, CSS variables/design tokens, Tailwind CSS 4 |
| 3D | Three.js 0.186, glTF/GLB, Draco compression, WebGL |
| Motion | CSS transitions and requestAnimationFrame-based scene/camera animations |
| Navigation | Pre-rendered WebP maps with SVG/DOM interaction layers |
| Local persistence | Browser localStorage |
| Code checks | TypeScript project build and ESLint |

No backend, API key, or account is required to run the prototype. The model files and Draco decoder are included in the repository. The main page requests Inter from Google Fonts; system-font fallbacks are available if that request is unavailable.

## Installation

Use **Node.js 24** (the version selected by `.nvmrc`) and npm. Vite requires Node.js `^20.19.0 || >=22.12.0`. A browser with hardware acceleration and WebGL 2 support is needed for the 3D views.

```bash
git clone https://github.com/RyanZeeee/Tesla-UI-prototype.git
cd Tesla-UI-prototype
npm ci
npm run dev
```

Alternatively, download the repository as a ZIP, extract it, and run the last two commands from its root directory.

The development server normally opens [localhost:5173](http://localhost:5173/). If that port is occupied, use the address printed in the terminal. If you use nvm, run `nvm use` before installing dependencies.

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact dependencies recorded in the lockfile |
| `npm run dev` | Start the development server and open the browser |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and create the production build in `dist/` |
| `npm run preview` | Serve the existing production build locally |

```bash
npm run lint
npm run build
npm run preview
```

The production preview normally uses port 4173. Serve the generated files through HTTP; opening `index.html` directly with `file://` is not supported.

## Project structure

```text
Tesla-UI-prototype/
├── README.md                    # English documentation
├── README.zh-CN.md              # Chinese documentation
├── docs/                       # Architecture, development and asset credits
├── public/
│   ├── models/                 # Included vehicle/seat GLBs and credit page
│   └── draco/                  # Local decoder and upstream license files
├── scripts/                    # Optional offline map/seat authoring tools
├── src/
│   ├── components/             # UI panels, Dock, cards and dialogs
│   ├── vehicle/                # Vehicle scene, materials, cargo and charge port
│   ├── climate/                # Cabin scene, airflow and display
│   ├── seats/                  # Seat scene and persistent adjustment state
│   ├── navigation/             # Map layers, route data and icons
│   ├── settings/               # Vehicle settings and dialogs
│   ├── assets/                 # Artwork, icons and map images
│   ├── App.tsx                 # Dashboard composition and panel coordination
│   └── main.tsx                # App entry
├── index.html
├── package.json
├── package-lock.json
└── vite.config.ts
```

## Development notes

- Most of the visual layout is in `src/dashboard.css`, feature CSS files, and `src/tokens.css`.
- The vehicle, cabin, and seat rendering modules are loaded on demand. Vehicle rendering requests frames for loading, motion, interaction, or resize rather than running continuously while idle.
- Map geometry is processed offline into WebP images to reduce runtime SVG complexity.
- The design scales as a vehicle display, rather than reflowing as a conventional mobile website. A larger landscape window is recommended for interaction testing.
- Python and image-authoring dependencies are **optional**. The generated maps and seat model are already included; normal installation does not require regeneration.

See [development and asset tooling](docs/development.md), [3D implementation notes](docs/vehicle-3d.md), and [settings references](docs/vehicle-settings-reference.md).

## Deployment

`npm run build` generates a static site in `dist/`, including the local models and decoder. Publish the **contents of `dist/`** using a static host.

For GitHub Pages under `/Tesla-UI-prototype/`, build with the repository base path:

```bash
npm run build -- --base=/Tesla-UI-prototype/
```

Use the normal build for a domain-root deployment. Hosting and a GitHub Pages deployment workflow are not configured automatically in this repository.

## Troubleshooting

- **Models do not load:** enable browser hardware acceleration, check WebGL support, and ensure `public/models/` and `public/draco/` were included. Use the model's reload control after resolving the cause.
- **Blank page or missing assets after deployment:** check the Vite base path and that all generated assets, GLB files, and decoder files were deployed together.
- **Small interface:** enlarge the browser window; the entire design canvas scales to fit.
- **Preferences persist after refresh:** this is intentional for vehicle settings and seats. To start over completely, clear the site's local storage in browser developer tools.
- **Large-chunk build warning:** the 3D dependencies create sizeable chunks; a warning alone does not mean the build failed.

## Credits

The bundled vehicle model comes from a TeslaHub community distribution. The model metadata and distribution list CC BY 4.0 but name different authors; both attributions are retained. The seat model is derived from the same source. See [third-party asset notes](docs/third-party-assets.md) and [the bundled model credit page](public/models/credits.html).

No repository-wide open-source license has been selected for the original project code. Bundled dependencies and third-party assets retain their own licenses; model licensing does not extend to album covers, reference artwork, or Tesla branding. This project is not affiliated with or endorsed by Tesla.
