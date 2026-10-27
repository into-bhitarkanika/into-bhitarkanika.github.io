# Photographic asset rebuild — 28 September 2026

Local review of `high-photographic-2026-09-28`. Nothing was published during this iteration.

## Scope and evidence

High now loads six optimized coastal-tree models adapted from a scanned trunk and authored photographic foliage. It uses scanned sediment with geometric relief, linen canopy maps, a smoother planked hull with a tapered stern, matched skin maps, and quieter water reflections. Standard retains its original scene and lightweight rendering path.

The reference study is [photographic-reference-study.md](../../photographic-reference-study.md). It connects actual photographs to decisions about crown coverage, low foliage, damp banks, hull construction and the operator's stance. Imported assets are credited in the [machine-readable manifest](../../dist/assets/high/manifest.json) and individual credits files. These are coastal assets adapted to a Bhitarkanika setting, not local photogrammetry.

The first playable stretch covered approximately z=113 to −223 m. Inspection under neutral daylight exposed porous crowns and excessive empty forest floor. The second pass increased leaf coverage, moved rear groves closer, varied their heights, and added a lower fringe. Only after that review was the treatment extended through all 17 sections. Overhead inspection then exposed regular sediment tiling; rotated, continuously blended samples now use matching coordinates for color, roughness, AO, normals and geometric relief. Intermediate evidence is retained as `representative-neutral.jpg` and `representative-neutral-revised.jpg`.

## Matched comparisons

[Open the gallery](index.html), or run `npm run review` and visit http://127.0.0.1:4176/review/. Its preview link opens the current application at `/live/?graphics=high`, with normal controls. The interactive baseline is frozen in `.sites-runtime/photographic-baseline-20260927/dist`; it includes the exact previous uncommitted High build rather than an older Git commit.

Both versions use 1280 × 720 CSS and drawing-buffer pixels, a 48° field of view, the same camera, boat position `(0, 0)`, heading `0.13`, and simulation time `42`. The three comparison cameras are Follow, Bow and Overhead. Weather is advanced 25 seconds before capture. Traffic may differ. The neutral view uses one shared neutral sky/environment, white key light and cooler fill; fog, atmospheric additions, bloom and grading are disabled in both versions. Neutral is a development control, not a sixth public preset.

Golden hour, Morning, developed Storm and Night are captured separately with the same conditions. `after-default.jpg` and the journey images show normal gameplay framing rather than the matched historical camera.

## Verification

The current complete automated suite passes 120 checks. Coverage includes continuous hull tangents shared with water contact, scanned model buffer integrity and detail reductions, navigation clearance, terrain seams and wildlife grounding, exact Standard restoration, actual hand-to-handle contact, planted feet, paired and single rowing, coasting, Motor stowing, weather, water/CPU agreement and rendering fallbacks. All production modules and the local review tools pass syntax checks.

Browser interaction evidence is stored in `interaction-checks.json`. The checks exercise Row, manual takeover, pause/resume, Motor, all camera modes, Standard ↔ High during a live stroke, the field guide, weather changes and a continuous Motor journey past 600 metres. Actual console errors are checked separately from automated tests. A 390 × 844 browser check confirms the Standard controls, minimap and field guide fit without horizontal overflow; it is a layout check, not a physical-phone performance test. Unopened field-guide species keep their images deferred until expanded.

## Performance

Final measurements are recorded in `measurements.json`. The browser reports an AMD Radeon integrated graphics adapter through ANGLE/Direct3D11, running Chromium 154 on Windows. This is one desktop, not a high-end phone or a universal performance guarantee.

| Warm 1280 × 720 run | Duration | Displayed fps | Frame p95 | GPU average / p95 | Sampled JS heap |
|---|---:|---:|---:|---:|---:|
| Frozen previous High, matched Golden view | 57.9 s | 45.6 | 33.5 ms | 17.8 / 20.3 ms | Not exposed by baseline |
| Final High, matched Golden view | 64.2 s | 26.2 | 50.1 ms | 33.2 / 35.0 ms | 175.0 MiB |
| Final High, normal Follow journey | 78.6 s | 27.5 | 50.1 ms | 31.6 / 34.2 ms | 172.8 MiB |

The richer forest and materials are measurably heavier than the previous build. High does **not** sustain 60 fps on this tested integrated GPU. The final main-view visibility pass reduced submitted geometry and CPU submission cost, but the complete scene remains GPU-bound here; the measurements do not claim a frame-rate improvement from that pass. No frame longer than 100 ms occurred within these warmed timing windows. Loading and first-use compilation are separate costs.

At the final static sample, all passes submitted about 11.58 million triangles: 5.75 million main, 3.71 million reflection, and 2.11 million shadow. CPU submission averaged 22.24 ms, which is not GPU execution time. The moving sample retained 421 geometry resources and 61 textures; these are counts, not byte allocations. The scene uses native pixel ratio up to 2 in ordinary play; higher drawing-buffer resolutions cost more than this controlled 720p comparison.

The delivered ordinary preview uses a 1920 × 1080 drawing buffer on this display and reported approximately 22 fps in its rolling indicator after loading. That is a spot reading, not another fixed-duration benchmark. Its build identifier and error-free console are saved in `interaction-checks.json`. Every gallery comparison button and all image loads were verified in `gallery-checks.json`; the actual preview link was followed and confirmed to serve this build.

Displayed frame intervals, CPU submission time and asynchronous GPU time are reported separately. Warm static comparisons use the same fixed 1280 × 720 camera and Golden preset. Travel uses normal gameplay and includes changing detail levels. Initial loading and shader compilation are excluded from warmed frame timing. Rendering work elsewhere on the machine can affect results.

`performance.memory` reports approximate JavaScript heap only; renderer counters report resource counts. WebGL does not expose allocated GPU bytes, so the report does not invent them. Textures and model data also consume memory outside the JavaScript heap. Cached High resources are retained on switching to Standard for faster return; they are released on disposal/context recovery.

The first full-route measurement exposed unnecessary main-view geometry. The final pass compacts visible forest instances into reusable batches for both the main and reflected views while keeping full source meshes for shadow rendering. Invisible canopy shadow proxies no longer submit triangles in the color pass. Source transforms and instance colors remain unchanged, and nested reflection state is restored. Distant canopy coverage is retained to 565 m; performance is not improved by exposing a visibly shortened treeline.

The active High asset collection is 55,145,156 bytes (52.59 MiB), excluding JavaScript and shared Standard assets. Thirty-seven runtime files are catalogued. Unused source/reference maps are identified separately rather than fetched. Texture decoding, mipmaps, render targets and generated geometry add memory beyond download size.

## Remaining visual limitations

- The forest is an adaptation of one scanned coastal tree into six silhouettes, with authored mangrove roots. It still repeats at longer distances and is not botanically verified Bhitarkanika vegetation. Distant enlarged foliage surfaces can remain visible at some angles.
- The crew has a functional anatomical rig and matched skin maps, but clothing, hair and facial detail remain authored real-time artwork. This is not a scanned local boat operator. Birds and crocodiles still use the existing authored models.
- Sediment combines a repeating 1.3 m scan with larger modeled rills and height changes. Very close inspection can reveal the repeated source material.
- Water uses a shared analytic displacement/contact field and planar reflections, not volumetric fluid simulation. Reflections and shadow maps retain finite resolution. Leaf edges can still shimmer during movement without temporal antialiasing.
- Clouds and weather combine HDR photography with procedural layers. Post-processing is restrained; the scene is still recognizably a real-time rendering. Photorealism remains a target rather than a completed claim.

High retains its device warning and Standard fallback. No physical-phone performance claim is made.
