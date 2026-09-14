# 3D vehicle implementation

[Project overview](../README.md) · [Asset credits](third-party-assets.md)

## View and input

`src/vehicle/createVehicleScene.ts` renders a normalized Model 3 in one WebGL canvas. The scene fills the vehicle region while camera framing keeps the model aligned with the dashboard.

- Compact view: fixed overhead framing, no rotation input.
- Expanded default: yaw −48° and elevation 3°, with a closer camera for a larger vehicle presentation.
- Expanded interaction: pointer dragging or five-degree arrow-key rotation, with elevation limited to 2°–65°. High elevations increase camera distance to keep the vehicle in frame.
- After five seconds without rotation input, return smoothly to the default over 700 ms. Holding/continuing a drag cancels the pending reset.
- Double-click or press Home / Escape while the viewer is focused to reset. Wheel zoom is disabled.
- Starting a collapse disables rotation immediately. Reopening restores the default camera without discarding cargo state.

## Lighting and materials

The project applies pearl-white paint, smoked glass, graphite wheels, rubber detail, procedural studio reflections, and ground lighting at runtime. Original headlights and taillights remain illuminated. Lamp emission follows the existing lamp geometry/UVs; vehicle paint and ground surfaces are excluded from the lamp bloom pass.

`createVehicleStudio.ts` manages the studio environment, ground reflections and light patches. `createVehicleBloom.ts` handles selective lamp glow. Canvas coverage extends across the vehicle area so the scene does not end at the model's bounding box.

## Frunk, trunk and charge port

`vehicleCargo.ts` animates the original frunk/trunk hinge nodes over approximately 1.05 seconds and permits smooth reversal during motion. Trunk lining remains stationary inside the body, while the lid uses the original exterior geometry.

`createChargePort.ts` disables the source distribution's misaligned extra `charge_dummy` cover. Instead, it partitions the original left outer lens/trim surfaces at the charge-port seam and attaches those surfaces to an upper hinge measured in the source chassis coordinates. At the closed pose, the extracted surfaces retain their original position. A recessed dark surface remains behind the open cover. The source GLB itself is not rewritten by this operation.

The charge-port extraction intentionally targets this specific model's nodes (`Object_441`, `Object_57`, and `Object_69`) and chassis coordinates. Replacing the GLB requires recalibrating that code rather than reusing its constants blindly.

Buttons display Open / Close, with descriptive accessible names:

- Compact: frunk/trunk on the right, charge port on the left, connected by horizontal leader lines.
- Expanded: projected controls above the relevant parts, with vertical leader lines. The charge-port anchor remains at the hinge while the cover moves.

## Files

| File | Purpose |
| --- | --- |
| `src/components/VehicleModel.tsx` | Canvas host, loading state, retry and cargo controls |
| `src/vehicle/createVehicleScene.ts` | Renderer, camera, input, loading and frame requests |
| `src/vehicle/createVehicleStudio.ts` | Lighting environment, reflections and ground illumination |
| `src/vehicle/createVehicleBloom.ts` | Selective light emission bloom |
| `src/vehicle/vehicleMaterials.ts` | Runtime material adjustments |
| `src/vehicle/vehicleCargo.ts` | Cargo motion and projected button positioning |
| `src/vehicle/createChargePort.ts` | Flush charge-port surface extraction and hinge |
| `public/models/tesla-model-3.glb` | Bundled vehicle source model |
| `public/models/tesla-front-seat.glb` | Derived front-seat model |
| `public/models/credits.html` | Authors, source, licenses and modifications |
| `public/draco/` | Bundled decoder and licenses |

Rendering is requested for loading, resizing, view changes, dragging, reset and cargo motion. The vehicle does not use an idle continuous render loop. Pixel ratio is capped at 1.5, and cleanup disposes scene resources, timers, workers and event handlers. Cabin airflow has its own animation lifecycle and should not be confused with the vehicle's idle rendering behavior.

The old vehicle SVG is a loading/error placeholder. Successful loading displays the GLB meshes.
