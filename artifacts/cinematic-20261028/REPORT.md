# Into Bhitarkanika — local review, 28 October 2026

Local preview: http://127.0.0.1:4178/live/

Comparisons: http://127.0.0.1:4178/review/

Nothing was pushed or deployed. Changes are committed locally by area. Pseudotheist was not accessed or modified.

## Delivered

- First-visit controls sheet with persistent dismissal and a persistent help button. Keyboard and touch instructions are separated. Touch controls and all visible HUD buttons meet the 44 px minimum at the five requested sizes. Safe-area spacing and landscape placement keep them clear of the minimap.
- A single translucent navigation cluster combines distance, speed, propulsion, heading and map. The HUD dims after 4.5 seconds without input; dialogs, open menus, focused controls and automatic cruising keep it available. Pointer, touch and keyboard activity restore it.
- Explicit Motor/Row selection, pressed Play/Pause and sound states, current camera/lighting/graphics labels, lighting symbols and short change notifications. High has the desktop/GPU recommendation, existing phone warning and return to Standard.
- Desktop guide drawer and phone bottom sheet. Five bird cards show existing credited photographs and concise facts. The two licensed recordings have explicit play/pause buttons; unrecorded species say so. Photo/audio attribution is collapsed but retained. Guide closure stops previews. Opening the guide freezes scene rendering and simulation.
- High Auto / Quality / Performance. Idle code prefetch is deferred and reports its state; phones and data-saving connections skip it. Heavy scenery is still loaded only on selection and retained for subsequent switches.
- Reflection caching with camera-motion invalidation, less frequent High shadow refresh, and an optional single-pass composite in Performance. Original reflection culling/forest LOD remain. High birds beyond 320 m are culled before their animation work. Rain particles are capped (840 or 420); rain geometry updates stop outside Storm. Shared wind and wet-surface drying remain active because other effects depend on them.
- Five restrained High palettes, one filmic tone map, subtle static grain/vignette, stronger existing depth-occluded light shafts, darker green-blue water with silt near banks, and slightly sharper/longer oar and residual wake ripples.
- Coordinated bounded gusts, stronger branch movement, pooled pollen, floating leaves, reeds, sparse shells and six small procedural shore crabs. High fishing kingfishers dive; nearby flying egrets gain altitude. Existing kite thermals and perched-egret behavior remain. Crocodiles gain restrained breathing and wetter skin response; existing surface ripples remain.
- Optional interruptible Cinematic camera, gentle High sway/speed FOV response and subtle focus blur exclusively in Cinematic. Normal gameplay views stay sharp. Reduced-motion preference disables cinematic drift/focus, freezes decorative particle drift and slows visual animation by holding its clock.
- A quiet synthesized insect bed at dusk/night and more frequent existing bird recordings at dawn. All ambient layers remain behind the existing user-gesture sound switch. No invented species recording was added.

## Measurements

Computer: integrated AMD Radeon Graphics, ANGLE/D3D11, Chrome 156. The comparison uses a **1366 × 768 drawing buffer at pixel ratio 1**, fixed Follow camera, boat at the landing, simulation time 42 and Golden hour. Neither resolution nor the original boat handling was reduced to obtain these results.

| Metric | Before, repeated warm run | After, Auto settled on Quality | After, Performance |
|---|---:|---:|---:|
| Sampling duration | 29.0 s | 48.4 s | 37.1 s |
| Mean displayed frame time | 40.2 ms | 33.6 ms | 30.9 ms |
| Average frame rate | 24.9 fps | 29.7 fps | 32.4 fps |
| 95th-percentile frame time | 50.1 ms | 50.0 ms | 50.1 ms |
| Mean draw calls/frame | 1,660 | 1,099 | 944 |
| Mean triangles/frame | 11.93 M | 8.71 M | 7.68 M |
| Instrumented CPU submission | 21.1 ms | 22.5 ms | 23.6 ms |
| First High preparation | 29.9 s | 30.6 s | Same retained scene |

Quality reduces average frame time by **16%**, calls by **34%**, and submitted triangles by **27%**. Performance reduces average frame time by **23%**. The 95th percentile did not improve materially. **No CPU-submission or first-load speedup is claimed.** Geometry construction and texture preparation still dominate the first High load. Code prefetch is retained as a visible, bounded preparation step, not credited with an unmeasured loading gain.

The initial 13.4 fps baseline was an outlier and is retained in `baseline-metrics.json`, not used as the headline. A rendering-only optimization candidate reached 33.2 fps before the artistic additions; this is in `optimized-before-art.json`. Run-to-run CPU timing and live preparation vary substantially on this integrated GPU, so these are local observations, not hardware-independent guarantees. A separate live transition while another review scene existed took 51.5 seconds; it is not a matched single-scene loading comparison.

GPU timer samples are preserved in the JSON records. The old 30-frame sampling interval aligns with the new 2/3-frame schedules and can over-sample expensive frames; those GPU averages are not used to claim a gain. The final build uses an interval of **31** to avoid that aliasing in future measurements.

### Effect costs and retained choices

- New pooled pollen, floating leaves, reeds, shells and crabs: **0.08 ms average CPU update** in the matched Quality sample, at most **5 draws**, about **1.8k triangles** plus 72 points. Performance uses 36 points and 9 floating leaves. Pools are allocated once. Internal particle/leaf/bank flags support disabling each group.
- Grade, vignette, static grain and existing depth shafts: integrated into the existing composite. Total post submission measured **0.15 ms**, versus **0.08 ms** before. This is CPU submission for the complete post stage, not a separate GPU measurement of each shader expression. Performance measured **0.09 ms** with one fullscreen pass instead of four. Grade and Cinematic focus have internal switches.
- Gusts and foliage changes reuse existing uniforms/draws; new bird behavior reuses existing geometry. No separate per-effect GPU cost was isolated. The full scene was measured instead. These effects should not be described as individually benchmarked GPU improvements.
- Reflection submission fell from **660 to 331** average draws in Quality and **214** in Performance. Shadow submission fell from **260 to 106 / 71** average draws. Fast camera motion invalidates the reflection cache; ordinary Standard reflections refresh as before.
- Guide open: scene render statistics remained unchanged during image/audio interaction, confirming that scene work stopped. Hidden tabs already skip scene work; that behavior is retained.
- Main input and rowing-update scratch objects are reused. Existing profiler and forest compaction allocations remain; this is not a claim of a fully allocation-free frame.

## Verification

- **129 tests passed** (120 existing plus 9 additions). New checks cover HUD idle policy, first-visit persistence, grade selection, gust timing, particle caps, bounded cinematic pools, reflection-cache invalidation, optional bloom passes and cinematic post-state restoration. Existing water, forest, sky, boat, rowing, context/fallback and physics checks pass.
- Standard retains its original geometry, material restoration, physics, speed limits and three lighting presets. No Standard color grade or added scene geometry was introduced. The optional cheap Standard grading/aerial-perspective changes were deliberately omitted to preserve its current look and cost.
- Both Standard UI screenshots and High screenshots were captured at **360×640, 844×390, 768×1024, 1366×768 and 1920×1080**. Final DOM bounds checks found no visible button under 44×44, outside the viewport, or overlapping the minimap. These are browser viewport checks, not physical-device thermal/performance tests.
- The phone help shows touch instructions; desktop help shows keyboard instructions. Dismissal persists across reloads. The portrait guide close target was verified inside the sheet at 44×44.
- Bird preview playback was verified by actual media state; closing the guide paused every preview. Photo cards loaded and attribution remained collapsed by default.
- Rowing was active in Standard, continued through loading High with the same mode/camera/journey, and stopped when paused while the boat still coasted. High hand-placement diagnostic error was approximately `7e-15` in the sampled stroke. Returning to Standard while rowing retained Row, cruise state and journey distance. Cinematic selected correctly and pointer input returned to Follow.
- No browser rendering errors were reported during the viewport checks. Every source module passed syntax checking.
- Five High before/after image pairs and one Standard pair are in the gallery. Camera, time, resolution and boat position are matched. Background traffic/wildlife can differ because those simulations retain state; comparisons are not claimed to be pixel-identical replay captures.

## Skipped or constrained

- No separate static-shadow atlas, tighter shadow frustum, additional reflection hierarchy, traffic throttling or texture-resolution reduction was added. The existing near-boat frustum and forest culling are already substantial; a larger rewrite without isolated gains would risk shadow/contact regressions. The implemented schedules have measured draw/frame-time gains.
- Full scene/asset construction is not preloaded during Standard play. It would spend substantial memory and CPU before the user chooses High. First-load improvement remains unresolved.
- No true volumetric ray marcher, extra mist transparency layers, new vines/moss meshes, mudskipper model, crocodile drip particles or full perched-bird takeoff rig. Existing haze and native bird rigs were extended conservatively. The egret reaction applies to flying birds; it is not a new ground-to-flight animation.
- No frog recording was added because there is no verified, credited native-frog recording in the existing collection. Insects are synthesized ambience, not represented as an identified species call.
- No per-effect GPU timings or physical mid-range-desktop/phone benchmarks were fabricated. The whole-scene measurements and isolated pool/post CPU costs above are the evidence available on this host.

## Next ideas, ranked by visual impact per cost

1. **Near-bank art placement and warm/cool lighting balance** — high visual impact, low runtime cost; refine existing roots, dead limbs and vegetation groupings from a few repeatable camera stops.
2. **Distance-tiered reflection and static-shadow caches** — potentially high performance benefit, medium/high engineering cost; benchmark with the new coprime GPU sampling before changing the current cache.
3. **Verified native dusk/night recordings** — medium immersion benefit, low rendering cost; source credited local amphibian/insect recordings and keep the current explicit mute/autoplay behavior.
