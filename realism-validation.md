# High Graphics: creek and boat rebuild

Local review of the changes after published commit `b46b33f`. Nothing in this pass has been pushed or deployed.

## Visual changes

High now composes the route as asymmetric groves, with shaded overhangs near z=−52/−697 m, broader right-bank tidal margins near −196/−1050 m, left-bank sunlit openings near −380/−1246 m, and denser forest near −532/−870 m. Crooked boughs carry layered, drooping crowns; the supporting instances follow the same planting logic. Ground continues inland, with low irregular tidal shelves and canopy contact shading. All 17 sections received the treatment after a representative section was inspected from Follow, Bow and Overhead.

The player boat's old thin hull is replaced in High by twelve continuous joined timber strakes, thick wooden gunwales, a recessed interior and 26 structural ribs/knees. Existing curved cloth, seams, supports and fittings are retained. Timber wear and wetness stay restrained. Clothing has fuller torso/thigh volume on the existing anatomical rig. The boat dimensions, collision envelope, seats, feet and working oars remain consistent; no extra boat draw calls were introduced.

High's default Follow camera is lower and closer, with its existing damping, orbit and zoom preserved. A channel clearance guard keeps low orbit views inside the banks. Water has broader calm/current patches and a browner turbid body. Morning fill/exposure and haze are reduced; moon radiance, bloom and water glint are reduced while nearby indirect light is increased. Standard retains its previous rendering and framing.

## Reference and attribution

The pale shoreline was not missing geometry or a foliage LOD gap. The banks shared an exposed sloping apron outside the nearby shadow map, one bank had reversed winding, and grazing specular plus extra low-level haze exaggerated that continuous edge. High now corrects the winding, reshapes shelves, bakes canopy contact into the land, and uses darker low-specular silt. Mud retains the same ordinary distance fog as water, while its unmatched extra height haze is removed. Final Bow inspection confirms the pale ribbon is gone; naturally lit exposed mud remains. No additional fog was used to conceal it.

The [Stay & Sail Bhitarkanika creek photograph](https://stayandsailbhitarkanika.in/WhatsApp%20Image%202025-09-13%20at%2023.47.29_b35c9502.jpg), viewed at the [operator's site](https://stayandsailbhitarkanika.in/), informed tangled bank-edge growth, low crooked boughs, olive-brown water, thick weathered timber and the recessed boat interior. It was used as visual reference only, not downloaded into the app or redistributed. Existing local MakeHuman character and Poly Haven bark attribution remains in `dist/assets/high/`. This pass introduces no external models, recordings or texture files.

## Verification

The existing controls were exercised in the browser: automatic Row, Pause/coast, Resume, manual Q takeover, Motor parking, all cameras and High → Standard → High during travel. Pause reached rest/active=false while the boat still coasted at 0.180 m/s. Motor parked the same two oars. Quality changes retained Row/cruise/camera and advanced the journey from 49.27 m to 71.82 m rather than resetting it. Live grip error remained at floating-point precision. No physics, speed limits or controls were changed.

Full-route geometry checks covered 3.09 million transformed vertex samples. All 816 prop-root systems reached the low bank, roots remained outside the collision channel, and shoreline vegetation remained on land. The lowest sampled over-water geometry was 4.70 m; the protected camera corridor had 7.86 m minimum clearance, with wind margin included by placement. The suite also verifies rowing transitions, blade clearance, planted feet, collision handling, paired/single strokes, terrain continuity, reflection restoration and exact Standard restoration.

All **91 tests pass**. The final forest/weather shader adjustment passed the ten affected tests, including mud shader chaining, wetness retention and exact restoration. The application syntax and whitespace checks pass. This computer's global npm launcher is broken (missing npm-cli.js), so the package's test and syntax commands were run directly through Node instead. No dependency changes were needed.

## Images and limits

The final moving Golden-hour sample used a **1920 × 1080 viewport and drawing buffer, DPR 1**, on this Windows laptop's integrated AMD graphics through ANGLE/Direct3D 11, Chrome 153. Over **2,280 frames / 54.09 s** it averaged **42.15 FPS**; median frame interval was 17.0 ms, 95th percentile 33.5 ms, maximum 66.3 ms. One interval exceeded 50 ms; none exceeded 100 ms. It travelled from approximately z=−31 m to −160 m using the ordinary new Follow view. Initial loading, resizing and shader warm-up were excluded. No runtime/shader errors were reported in the final browser session. This is a measured route sample, not a promise for every route, weather preset or device.

The final rolling 60-frame sample submitted 264 main draws / 1,087,099 triangles; 243 reflection draws / 590,787 triangles; 76 shadow draws / 418,178 triangles; and four post draws. Total CPU submission was 19.53 ms; these are **CPU submission timings, not GPU timings**. Forest batching retains 114 draws before visibility culling, with roughly 985k main triangles. Camera/frustum culling and simpler reflection instances reduce actual cost. High still uses 1536px reflections and 3072px shadows; Standard remains independently lightweight. Raw samples are in [measurements.json](artifacts/realism-review/measurements.json).

The [comparison gallery](artifacts/realism-review/index.html) contains matched before/after Golden hour, Morning, developed Storm, Night, Bow and Overhead captures at **1280 × 720 drawing-buffer and viewport resolution, DPR 1**. Fixed comparison time is 42 s; weather advances 25 s before capture. Both versions use the same original locked camera and boat pose to isolate the art changes. Ambient traffic can differ. The [new ordinary Follow view](artifacts/realism-review/after-normal.jpg) separately shows the lower framing.

These are real-time authored meshes and procedural placement, not photogrammetry. Foliage and wildlife remain stylized at close range. The cloth improvement uses skinning/shape and subtle existing motion rather than a cloth simulation. Water retains the shared analytic waves, wake and paddle contacts; it is not a fluid solver. Cached skies/environment light and limited local shadows remain performance compromises. This pass was tested on the desktop, not a physical phone.
