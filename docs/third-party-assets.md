# Third-party assets and attribution

[Project overview](../README.md)

The vehicle and seat models are intentionally included in this repository, together with the local Draco decoder. Retain these credits when sharing the project or a build.

## Vehicle model

- Local file: [`public/models/tesla-model-3.glb`](../public/models/tesla-model-3.glb)
- Distribution: [TeslaHub community-model credits](https://github.com/Olrik-WP/TeslaHub/blob/3832ede986aa8ae99e2013af28afc2f3dc6bb341/src/TeslaHub.Web/public/community-models/CREDITS.md)
- Distribution filename: `community-m3-rigged.glb`
- Recorded revision: `3832ede986aa8ae99e2013af28afc2f3dc6bb341`
- Recorded license in both distribution and embedded metadata: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)

The embedded metadata credits **aarajesh**, *Tesla White car.*, with [this Sketchfab source](https://sketchfab.com/3d-models/tesla-white-car-2a4ee44439dc4b1b98f452a9ff427116).

The distribution credits instead name **ChoochooLi**, *Tesla Model 3 (Realistic Graphics)*, and list [this Sketchfab link](https://sketchfab.com/3d-models/tesla-model-3-realistic-graphics). The original records differ; this project preserves both and does not assert that they identify the same author.

The downloaded vehicle GLB remains the source asset. The prototype changes display scale, paint/glass/lighting, camera framing, cargo motion, and scene composition at runtime. It adds trunk lining and detaches the original charge-port lens/trim surfaces into an animated cover, disabling the misaligned extra cover. The climate scene selects cabin components from the same source and adds procedural airflow and a center-display treatment.

## Derived seat model

[`public/models/tesla-front-seat.glb`](../public/models/tesla-front-seat.glb) is extracted from the vehicle model's front-seat surfaces, with separate cushion/backrest structure. Runtime materials and lighting add the graphite-leather presentation. Source attribution and CC BY 4.0 apply to this derivative as well.

## Decoder and rendering dependencies

- [`public/draco/README.md`](../public/draco/README.md) records the bundled decoder origin.
- [`public/draco/LICENSE.txt`](../public/draco/LICENSE.txt): Draco, Apache License 2.0.
- [`public/draco/THREE-LICENSE.txt`](../public/draco/THREE-LICENSE.txt): Three.js, MIT.
- npm dependencies retain their respective licenses and are installed from `package-lock.json`.

## Other artwork

Music covers in `src/assets/artwork/`, the source map image, and reference/interface artwork are prototype resources. Separate redistribution licenses for those assets are not recorded in this project; the vehicle model's CC BY 4.0 license does not cover them. Tesla names and branding remain associated with their respective owners.

`src/assets/icons/chijiao.jpeg` is the author-supplied profile image. The project author is **赤角大王 / RyanZeeee**; model authorship is credited separately above.

## Project license status

No repository-wide open-source license has been selected for the original application code. Publishing the repository does not replace the separate license terms of third-party assets.

## Bundled model integrity

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `tesla-model-3.glb` | 3,230,592 | `a8c079bf8b2143389dcd8c1618ac39b121414c9f5dc9c3cd1f7003f722f39225` |
| `tesla-front-seat.glb` | 397,632 | `f6fb711923e9bb91816ec3c894d65706052d63f9c7d84d39f7331720dbd07548` |
