# High reconstruction · 27 September 2026

This is a local, unpublished reconstruction. Run `node server.mjs` for the application on port 4173, or `node review-server.mjs` for the [comparison gallery](http://127.0.0.1:4175/review/). The gallery's **Explore this build** link serves the current `dist/` on `/live/?graphics=high` and visibly prepares High. It does not point at the published site. Standard remains the default on the normal application URL.

## Builds and comparison method

The frozen baseline is the actual local implementation at the start of this reconstruction, including the preceding 25 September realism pass. It is not simply Git commit `b46b33f`. Its files are retained locally in `.sites-runtime/reconstruction-baseline-20260927/dist/`. The current application reports `data-build="high-reconstruction-2026-09-27"`.

The gallery contains both previous High → rebuilt High and Standard → rebuilt High comparisons. Follow, Bow and Overhead cameras use identical positions and a 48° field of view; the boat is at `(0,0)` with heading `0.13`, simulation time is 42 seconds, and each preset has 25 seconds of weather settling. All matched images are 1280 × 720 CSS pixels with a **1280 × 720 rendering buffer**, explicitly fixed by the local review fixture. Native screen density is not silently substituted for rendering resolution. Traffic locations can differ. Standard does not implement Storm or Night; those two comparisons are explicitly unavailable for Standard.

The extra default, rowing, tidal shelf and clearing views are identified separately. High's normal Follow view has a lower, closer composition and a smoothly blended 54° field of view. Its Bow and Overhead options remain available. Review fixtures and timing controls are confined to the development server, outside `dist/`.

## Reconstruction

- **Independent landscape:** `high-estuary.js` replaces the Standard vegetation and banks, with exact restoration on return. Four tree architectures cover leaning veterans, buttressed trees, young forked growth and recruiting thickets. Connected folded leaves, tapering wood and roots, young understory, relief, shallow erosion channels and debris replace canopy cores and the continuous dark bank treatment. A complete entrance section was inspected from Follow, Bow and Overhead before extending the treatment across 17 sections. The overhung bend, exposed shelf and clearing have distinct planting and bank profiles. The shared navigable channel stays clear.
- **Independent launch:** `high-launch.js` builds a 14.6 m working boat: 14 curved hull strakes, a real transom, 19 structural frames, 71 fitted deck boards, thin fittings, slatted seats and a shorter supported fabric canopy. The recessed inner sole closes the plank seams against water visible underneath. Three local CC0 photographic timber maps supply grain, normals and roughness; the original polished-table roughness is remapped to matte working timber. Rain exclusion uses this canopy's actual profile.
- **Character:** the existing credible anatomical rig is retained, with fuller clothing and a fitted headcloth. It shares the gameplay oars, stroke clock and contact targets. Hands, shoulders, torso and fixed feet remain coordinated through rowing, take-up and stowing. This is a rigged authored character, not a new scanned human.
- **Water:** varied advected surface detail, derivative-filtered fine normals, rough angle-dependent reflection and turbid body color; a bounded pool of 18 world-space wake packets spreads and decays behind turns and stopping boats. The meniscus follows the new launch's asymmetric waterline and transom. Wave/contact calculations remain shared with buoyancy and blade effects. This is an analytic visual model, not a fluid solver.
- **Light:** active CC0 photographic HDR skies supply Golden hour and the other presets, combined with moving cloud/weather layers and cached lighting. Near forms retain readable shadows; wet materials, wind, rain and surface movement share weather state. Night uses moonlight and a modest warm cabin lamp. Exposure is restrained rather than relying on strong bloom or a yellow screen filter.
- **Wildlife:** basking crocodiles use their lower mesh envelope and bank slope; standing egrets use actual toe contacts on the new terrain. Swimming, flight and perched source routes remain intact. Small distant fauna and traffic still use lighter assets.

## Browser checks

Inspected Golden hour, Morning, developed Storm and Night; the launch/forest assembly from the three ordinary cameras; automatic rowing, pause to coast, resume, manual Q takeover, Motor stowing, steering input and camera cycling. Standard → High → Standard during rowing retained mode, stroke, camera and journey distance with two working paddles. Recorded hand-target errors were near floating-point precision. No new page errors appeared after the integrated reload.

The field guide opens and pauses the journey; mangrove, crocodile and expanded kingfisher photographs loaded. Nature audio loaded its two recordings after the sound gesture and could be muted. A 390 × 844 viewport exposes the compact controls and minimap. This checks responsive layout, **not physical-phone performance**. Capability checks test required HDR, texture/framebuffer size and available fragment samplers; phone advice and the user's choice remain available.

The browser pass found and fixed a water-shader syntax error, overly glossy timber, open deck seams showing bright water, rain exclusion based on the previous canopy, detached old-hull contact shading and wildlife height mismatches on the reconstructed banks.

## Automated checks

**114 tests pass**, including fixed-step movement and collision, row/manual arbitration, hand contact and planted feet, recovery water clearance, new hull/water intersection (under 1.8 cm approximation), closed deck seams, terrain seams and navigation clearance, Standard restoration, reflection state, bounded wake history, weather/audio, device capabilities and asynchronous GPU-query lifecycle. All 28 application syntax checks and `git diff --check` pass. The installed npm launcher is broken on this host; the exact package test/check commands were executed with Node directly.

## Performance

Raw runs and exposed rendering counters are saved in `artifacts/reconstruction-review/measurements.json`. The machine reports AMD Radeon integrated graphics through ANGLE/D3D11. CPU figures measure rendering submission, not GPU execution; GPU timings use non-blocking WebGL timer queries where supported. One frame in 30 is sampled with at most four pending queries, never a synchronous readback.

Instanced leaves/wood, three foliage detail levels, section culling, low-detail shadow proxies and compacted reflection instances bound the rendering work. The representative view dropped from about 10.5 million submitted triangles before optimization to about 6.2 million across the main, reflected and shadow views.

Matched stationary Golden-hour runs at a fixed 1280 × 720 rendering buffer, with warmed assets and no test process running:

| Build | Observed window | Mean FPS | Frame p95 / max | CPU submission | GPU execution |
|---|---:|---:|---:|---:|---:|
| Standard | 66.1 s / 3,960 frames | 60.0 | 16.8 / 18.0 ms | 8.06 ms | Baseline has no GPU profiler |
| Previous High | 32.8 s / 1,440 frames | 44.0 | 33.4 / 49.8 ms | 21.56 ms | Baseline has no GPU profiler |
| Rebuilt High | 68.5 s / 2,760 frames | 40.3 | 33.5 / 49.8 ms | 22.55 ms | 19.53 ms mean, 22.4 ms p95 / 60 samples |

No frames exceeded 50 ms in these warmed stationary runs. The rebuilt view submitted 908 draws and 6.15 million triangles across all passes: main 4.24 M / 10.49 ms CPU, reflection 1.20 M / 10.48 ms, shadows 0.71 M / 1.45 ms, post 4 draws / 0.13 ms. CPU submission and GPU execution overlap and must not be added together. These are measurements from one integrated GPU, not promised performance on other hardware. The rebuild costs more than previous High, and shader/asset preparation is excluded from the warmed figures.

A separate **normal Motor cruise** with the redesigned Follow camera covered the entrance and first bend: 57.6 seconds / 2,280 frames, **39.6 FPS**, frame p95 33.6 ms, maximum 66.2 ms. Six frames exceeded 50 ms and none exceeded 100 ms. This includes movement, traffic and a screenshot during the run; it is not presented as stall-free. See the `rebuiltTravel` record for GPU and per-pass counters.

## Remaining limits

The independent assembly is a substantial visual change, but vegetation and people still read as authored real-time artwork in places. Some tree growth patterns remain recognizable; terrain detail is synthesized, not scanned. There is no surveyed geography, full fluid simulation, volumetric cloud transport or animated foliage in cached environment lighting. Physical phone thermals, low-memory devices and a broad GPU/browser matrix were not tested. High is expensive on integrated graphics; Standard remains the lightweight fallback. Neither 60 FPS nor near-photorealism is claimed.

Asset licenses and adaptations are in `dist/assets/high/{launch,forest,fauna,sky}/CREDITS.md`. The local sky photographs are sky-only sources, not photographs of Bhitarkanika.
