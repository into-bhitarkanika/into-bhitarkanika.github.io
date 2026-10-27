# Into Bhitarkanika

A self-contained Three.js riverboat experience, set in an artistic interpretation of the mangrove creeks of Bhitarkanika, Odisha.

**Live site:** [into-bhitarkanika.github.io](https://into-bhitarkanika.github.io/)

## Run

Requires Node.js 20 or newer. No dependency installation or build is required.

```sh
npm start
```

Open http://127.0.0.1:4173/. The server binds only to your computer. The complete static application is in `dist/`; it can also be served by any static host. Three.js r183.2 and its water normal map are included locally.

For the latest photographic asset comparison, run `npm run review` and open http://127.0.0.1:4176/review/. **Explore this build** opens `/live/?graphics=high` on the same server, serving the working `dist/` application with its normal controls. Matched captures compare the frozen previous High with the new assets under identical neutral lighting, plus Golden hour, Morning, developed Storm and Night. The optional interactive `/before/` route requires the local frozen baseline in `.sites-runtime/photographic-baseline-20260927/dist`; captured comparisons remain available without that ignored directory. Review controls, neutral test lighting and baseline files are never included in the published application. `npm run review:reconstruction` retains the earlier comparison on port 4175.

## GitHub Pages

The canonical repository is [into-bhitarkanika/into-bhitarkanika.github.io](https://github.com/into-bhitarkanika/into-bhitarkanika.github.io), and its independent organization site is [https://into-bhitarkanika.github.io/](https://into-bhitarkanika.github.io/).

The [Pages workflow](.github/workflows/pages.yml) publishes `dist/` when `main` is updated in that canonical repository. It can also be run from **Actions → Deploy GitHub Pages → Run workflow** on its `main` branch. The deployment job is restricted to that exact repository and branch, so copies and forks cannot deploy through this workflow. In the canonical repository's **Settings → Pages**, **GitHub Actions** is the publishing source. The deployment's `github-pages` environment shows the live URL.

[Kenshi0905/into-bhitarkanika](https://github.com/Kenshi0905/into-bhitarkanika) is a source mirror with GitHub Pages disabled.

There is no build or dependency installation step. Application modules, textures, and recordings use relative paths. Only `dist/` is uploaded; development scripts and research notes remain in the repository. GitHub Pages serves the site publicly.

## Controls

- **W / S** or **up / down**: accelerate / reverse.
- **A / D** or **left / right**: steer.
- **R**: switch between motor and rowing.
- Hold **Q / E** for the left / right oar. Hold **Space** or **W** to row both oars, or tap for one complete stroke. **Space** brakes in motor mode.
- **C**: trailing, bow, and overhead cameras.
- **H**: hide or restore the interface.
- Drag the scene to look around; scroll or pinch to zoom.
- Selecting **Row** starts gentle repeating strokes. **Play / Pause** pauses or resumes the selected mode without switching it. Steering remains available during automatic rowing; manual oar or braking input takes over until Play is selected again. In Motor, Play starts the gentle creek cruise and manual navigation cancels it.
- **More** contains graphics, camera, lighting, hide interface, reset and help. Lighting cycles Golden hour, Morning mist and Blue hour; High adds Storm and Moonlit Night to the same manual control. Weather never forces an automatic time cycle.
- The sound button enables two real, licensed kingfisher recordings with spatial positioning, plus synthesized wind and water. High's storms add rain and delayed thunder through the same mute control. Daytime kingfisher calls are quiet during heavy rain and Moonlit Night. Calls are intermittent; audio starts only after a click.
- Touch devices get on-screen steering, throttle and rowing controls, with a compact retained minimap.
- **Field guide** opens facts about the wetland, crocodiles and five bird species, with research links, audio previews and recording attribution. The journey pauses while the guide is open.

## Water and motion

The water renders an actual mirrored view of the scene into a 1024px reflection target (512px on phones). It combines four scales of scrolling surface detail with three travelling waves, analytic wave derivatives, Fresnel reflection, and sunlight. The player and passing boats create wakes; oar strokes and swimming crocodiles emit expanding, decaying ripples.

Boat handling uses fixed-step integration, forward and lateral drag, speed-dependent rudder authority, smooth catch/power/recovery rowing cycles, and damped buoyancy. Paired strokes synchronize, while individual oars apply gradual opposing turns. Rendered position is interpolated between simulation steps. Collision samples protect the bow, centre, and stern against both banks. This is a real-time visual and handling approximation, not a computational fluid dynamics model. Bulk fluid flow, refraction and coupled turbulence are not simulated.

Selecting **Row** prepares the boatman at the stern and starts a repeating rhythm through the existing rowing simulation. Automatic and manual input share the same stroke scheduler, so they cannot overlap. Pause lets the active stroke finish and clears queued strokes; Resume retains Row. Both graphics presets share one pair of working oars and the simulation's catch, power, release and recovery clock. Articulated arms follow the handles, feet stay planted, and ripples originate at each blade's actual water contact. High connects the shoulders, elbows, wrists, spine and hips, with leg posing that keeps each sole's position and orientation planted while weight shifts. Small pooled droplets appear only at actual blade contact. Switching to Motor smoothly lifts the blades, releases the handles and parks the same oars lengthwise alongside the gunwales. Coasting does not keep the character rowing. Graphics changes preserve the current stroke, boat position and journey.

The environment includes mangroves with individual folded leaves, irregular branches, tapered prop roots, breathing roots, moving foliage, textured wet banks, a wooden landing, five basking crocodiles, and three swimming crocodiles with articulated tails. Crocodiles are ambient wildlife; there is no combat or animal interaction.

Twenty-two modelled birds represent white-throated, common and black-capped kingfishers, little egrets and Brahminy kites. All five species are documented in Bhitarkanika. Calls are assigned only to the two species with licensed recordings. The recordings were not made in the park; provenance is disclosed in the field guide and [research notes](birds-research.md).

Three passenger boats and an occasional police patrol travel the creek, slow down and steer around nearby vessels. The patrol and routes are fictional ambient traffic. Water shows each vessel's wake, and the minimap marks them. In High, their height and damped tilt follow the same water surface as the player while their routes and passenger positions remain unchanged.

Standard's dense forest uses six overlapping depth bands of opaque, leaf-textured canopy volumes and dark undergrowth behind the detailed shoreline trees. These inexpensive shapes remain three-dimensional from overhead and in reflections. Distant individual-leaf crowns switch to simpler volumes with hysteresis to prevent repeated switching; distant roots and forest sections are culled. Instancing batches repeated geometry. Standard uses reduced foliage, 512px reflections and 1024px shadows on phones, including landscape phones; only Standard adapts scene resolution on slower devices.

The route is approximately 1.2 km and is designed for exploration; it is not a reconstruction of surveyed geography. Desktop graphics hardware is recommended. A WebGL 2 browser and hardware acceleration are required.

## Graphics modes

Every visit starts in **Standard**, keeping the lightweight forest and wildlife. **More → Graphics → High** loads an independent estuary and working launch, along with additional character, sky, weather and post-processing assets. Loading shows progress and allows a return to Standard. High targets computers and capable phones; its scene pixel ratio follows the display up to a cap of 2 and is not automatically lowered when frame rate drops. The HTML interface stays at the browser's native display resolution. The landscape, models and animation are authored real-time artwork inspired by Bhitarkanika, not surveyed geography or a claim of completed photorealism.

Before loading High on a detected phone, the graphics panel explains the additional graphics load and possible device warmth. Choose **Continue with High** or **Keep Standard**. Either choice acknowledges the advice once for the current tab session, and switching back remains available. Phone detection uses device and input signals rather than window width alone. It is advisory: actual eligibility checks HDR rendering, texture/renderbuffer limits and simultaneous texture support, so a capable phone is not rejected merely for being a phone. The graphics choice itself resets to Standard on reload.

High uses two active photographic HDR skies from Poly Haven: Qwantani Sunset for Golden hour and Kloofendal Partly Cloudy for the other lighting treatments. Their visible radiance and environmental lighting are coordinated with the key light, weather and exposure. Five manual presets provide Golden hour, Morning mist, Blue hour, Storm and Moonlit Night, with an aligned moon and restrained stars at night. Cached environment maps are prepared during loading; moving weather does not regenerate them each frame. Water reflections use a 1536px target, and shadows use up to 3072px within hardware limits.

Storm drives local rain streaks, bounded instanced water-contact rings and occasional lightning that illuminates both the sky and the scene. One shared wind state moves foliage, cloud layers, low haze, rain, canvas slack and the water surface. Surface waves and boat buoyancy use the same water-height function. Materials wet gradually during rain and dry gradually after it, with different responses for wood, cloth, rope, rubber, paint, leaves, skin and wildlife. Rain stays outside the player's covered canopy, surface rings avoid the boat footprint, and rain geometry is omitted from the reflection pass. Synthesized rain and delayed thunder follow the existing sound toggle and browser audio restrictions.

- People use an anatomical MakeHuman rig with separate, authored collared shirts and trousers, modeled folds and cuffs, matched CC0 skin color/normal/specular maps, hair, and sandals. The skin's specular map controls bounded roughness; it is not incorrectly treated as a roughness image. Fuller torso and thigh fabric gives clothing volume without changing skin weights or sole contacts. The boatman's coordinated hip, torso and shoulder motion follows the working oars, with fingers curled around the handles and fixed sole contacts maintained through the weight shift. Seated traffic passengers face inward with their feet and seat fitted to the benches. This remains a generic anatomical character, not a scanned local operator.
- The independent working launch has a 14.6 m curved hull with a continuous cubic section profile and tapered stern, 14 joined carvel strakes, timber thickness, a recessed interior, structural frames and fitted deck boards. Photographed wood maps follow the construction with matte roughness and restrained wear. The tensioned canopy uses scanned linen at a 0.4 m repeat, modeled seams, support attachments and slight sag between ribs. It responds subtly to wind. A modest lamp illuminates the interior at night. The boat and waterline share the same hull profile; the assembly retains its working oars, rowing station and character contacts. Quality switching restores the Standard craft without resetting navigation.
- High water combines six irregular travelling components with coherent directional, scale and amplitude variation. A denser local mesh visibly displaces at the bow, hull shoulders and spreading stern wake, becoming coarse offshore. Analytical gradients, buoyancy and actual blade contacts use the same base and vessel displacement fields, including reverse travel and traffic. Real paddle contacts seed directional, decaying ripple packets; actual falling drops seed transient rain rings. The reflection target remains 1536px, with filtered distant detail and nearby shoreline reflections.
- The independent estuary uses six optimized coastal-tree assets adapted offline from Poly Haven's scanned Island Tree 01 trunk and authored foliage. Photographic leaf atlases, bark color/normal/packed material maps and multiple detail levels are stored locally; the browser places these assets instead of generating every crown from primitives. Added tapering prop roots adapt the coastal silhouettes to the mangrove setting. They are artistic adaptations, not scans of Bhitarkanika mangrove species. Asymmetric planting gives the creek, overhung bend, tidal shelf and clearing different profiles. Scanned Brown Mud 03 maps add sediment color, roughness, normal detail, ambient occlusion and real height variation to continuous banks, alongside erosion rills, damp gradients and buried debris. Ground sampling agrees with the terrain for wildlife placement. The navigation envelope stays intact. Bank batches, distance detail levels and pooled per-instance culling limit main-view and reflected work while retaining full shadow sources. Invisible shadow proxies skip color rendering.

The active High assembly is coordinated by `high-graphics.js`, using `high-estuary.js`, `estuary-assets.js`, `high-launch.js`, `high-fauna.js`, `high-sky.js`, `high-atmosphere.js`, `high-weather.js`, and `high-post.js`. Earlier `high-forest.js` and `high-boat.js` implementations remain for regression history. Assets are cached for repeat switching; Standard restores its original materials, models, shader hooks and environment. Quality changes retain the journey, propulsion and selected camera. High's Follow camera is lower and closer; orbit and zoom remain available. The [latest comparison gallery](artifacts/photographic-review/index.html) includes fixed matched views and separate ordinary gameplay framing. The shared neutral review bypasses atmospheric effects and all post-processing in both versions to expose material and silhouette differences.

High's small, dependency-free post-processing pipeline retains the full scene resolution and adds four passes: selective bright-highlight extraction, two quarter-resolution highlight blurs, and one full-resolution composite. The composite applies restrained depth-contact shading, light shafts sampled against actual scene depth, and a gentle filmic grade with tone mapping applied once. The main image is never blurred; there is no depth-of-field or motion blur. The interface does not pass through these effects.

Required graphics capabilities are checked before High assets load, leaving Standard available when support is missing. Failed High asset loading restores Standard and allows retry. Unsupported render-target sizes, framebuffer failures or a failed post-processing shader fall back to direct rendering at the current scene resolution. A lost graphics context pauses the journey; when the browser restores it, the application releases the old High resources and returns to Standard while retaining journey state. The recovery message provides a reload option if the browser cannot reconnect.

Shadows use a tighter, texel-stabilized light volume, soft filtering, restrained surface bump maps, and updates synchronized to moving geometry.

## References and assets

- [Bhitarkanika boat service on Google Maps](https://www.google.com/maps/search/Bhitarkanika+National+Park+boating/): visual reference for muddy tidal water, banks, mangrove foliage and roots. Google Maps images are not redistributed or used as textures.
- [Odisha Tourism — Bhitarkanika Nature Camps](https://odishatourism.gov.in/content/tourism/en/experience/activities/boat-riding/bhitarkanika-nature-camps.html): setting, boating, mangroves, and saltwater crocodiles.
- [Meng To — Sakura River Valley](https://valley.mengto.here.now/): inspiration for the trailing camera, contemplative atmosphere, and reflective water. No source or assets copied.
- [Stay & Sail Bhitarkanika](https://stayandsailbhitarkanika.in/): boat photographs informed the thick timber gunwales, recessed interior and visible structural framing. Reference photographs are not redistributed or used as textures.
- [Three.js](https://threejs.org/): r183.2, MIT licence in `dist/vendor/LICENSE-three.txt`. Water normal map from [the official Three.js examples](https://threejs.org/examples/textures/waternormals.jpg).
- Standard models and canvas material textures are generated in code. High adds a CC0 MakeHuman rig, matched skin maps, authored clothing and wildlife, adapted scanned coastal trees, scanned sediment/linen/timber materials, and two photographic HDR skies. The [asset manifest](dist/assets/high/manifest.json) records source authors, URLs, licenses, adaptations, dimensions, sizes and hashes for active assets; individual `CREDITS.md` files provide readable attribution. The [reference study](photographic-reference-study.md) records photographs and the concrete changes they informed. Assets are stored locally and do not request source sites at runtime. Typefaces: DM Sans and Libre Caslon Display, loaded through Google Fonts with local system-font fallbacks.
- Bird recordings: Shajiarikkad's white-throated kingfisher (CC BY-SA 3.0) and Marie-Lan Taÿ Pamart's common kingfisher (CC BY-SA 4.0). Full links, locations, playback adjustments and licenses are in `dist/assets/audio-credits.json` and the field guide. Audio files retain their individual Creative Commons licenses.
- Field-note photographs: seven local Wikimedia Commons images with individual attribution and license links beneath each image; full source metadata and adaptations are in `dist/assets/field-guide/CREDITS.md`. The mangrove and crocodile photos document Bhitarkanika; the bird photographs are labeled species references with their actual locations. Photos load only after opening the guide and expanding a species.

## Verification

`npm test` verifies physics, traffic, rowing, water, launch construction, the human rig, both forest implementations, weather/audio, propulsion controls, device detection, graphics capabilities, CPU/GPU profiling and post-processing. Tests cover automatic/manual arbitration, pause/resume, blade clearance, palm contact, planted feet, exact Standard restoration, hull collisions, frame-rate independence, CPU/shader wave and wake agreement, launch geometry and canopy attachment, terrain seams and navigation clearance, reflection restoration, wetting/drying, spatial rain, audio restrictions, capability checks and rendering fallbacks. `npm run check` checks application module syntax. Current matched captures, measurements and remaining limitations are documented in [photographic validation](artifacts/photographic-review/validation.md).

The scene canvas exposes `data-render-passes` with a rolling 60-frame average of main-view, reflection, shadow and post-processing draws, triangles and CPU submission time. Counts include nested renders and shadows exactly once. `data-gpu-profile` separately reports whole-frame GPU execution when `EXT_disjoint_timer_query_webgl2` is supported. Queries are sampled asynchronously, invalid/disjoint results are discarded, and unsupported devices report the reason rather than an invented GPU time. CPU submission time, GPU time and displayed frame rate are distinct measurements.

Performance depends on device, camera, drawing-buffer resolution and nearby traffic. Browser validation uses ordinary camera framing and existing controls; a phone-sized browser viewport is not a physical-phone performance test. Measurements and screenshot findings belong in the validation report rather than serving as a universal performance promise.
