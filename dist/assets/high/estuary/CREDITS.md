# Photographed forest and sediment collection

High Graphics uses locally served assets adapted from the following CC0 sources. Standard does not load this collection. The scene is authored artwork inspired by Bhitarkanika, not a surveyed digital twin or a botanically verified reconstruction.

## Coastal tree, bark and leaves

- Source: [Island Tree 01, Poly Haven](https://polyhaven.com/a/island_tree_01).
- Authors: Rob Tuytel (scanning, processing), Rico Cilliers (cleanup, processing).
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), as covered by [Poly Haven's asset license](https://polyhaven.com/license).
- Original model: [1k glTF](https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/island_tree_01/island_tree_01_1k.gltf), [geometry buffer](https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/island_tree_01/island_tree_01.bin).
- Maps: original, unmodified 1024 × 1024 photographs/PBR maps. `trunk-color.jpg`, `trunk-normal.jpg`, `trunk-arm.jpg`, `leaf-color.jpg`, `leaf-normal.jpg`, `leaf-arm.jpg`, `leaf-alpha.png` are renamed local copies. Color maps are sRGB. ARM green channels supply roughness; photographed normal maps supply surface detail. Alpha is supplied separately for the photographed leaf silhouette. See the parent `manifest.json` for exact download URLs and checksums.
- Adaptation: the scanned trunk is simplified offline; small disconnected twig geometry is pruned; photographed leaf arrangement and atlas UVs are retained on four-vertex leaf surfaces, with increasingly enlarged leaf footprints in distant detail levels to preserve crown coverage. Six height, spread, bend and twist variants create the local collection. The original asset is a coastal tree, **not a scanned Bhitarkanika tree or an identified native mangrove species**. Authored stilt roots and ecological placement adapt its appearance for this setting.
- `crown-0.bin` through `crown-5.bin` store reusable near/mid/far components. `crowns.json` records buffer layouts, names, sizes and SHA-256 hashes. The development-only baker is `tools/bake-photographic-forest.py`; no Python tooling is shipped or needed by the browser.
- Authored roots, fallen wood, and secondary branch surfaces continue to use the credited bark maps under `../forest/`, rather than reusing the scan's unique trunk UVs incorrectly.

## Sediment

- Source: [Brown Mud 03, Poly Haven](https://polyhaven.com/a/brown_mud_03).
- Author: Rob Tuytel.
- License: CC0 1.0, as above.
- Maps: unmodified 1024 × 1024 `sediment-color.jpg`, `sediment-normal.jpg`, `sediment-roughness.jpg`, `sediment-height.jpg`, `sediment-ao.jpg`. The source has a physical width of 1.3 metres, preserved in the shoreline texture mapping.
- Color, OpenGL normal, roughness and ambient occlusion maps are active on the shoreline material. The original displacement JPEG is retained as source reference and is not requested at runtime; displacement is baked into terrain geometry using the derived `sediment-relief.bin` (128 × 128, unsigned 8-bit, periodic bilinear sampling). The browser does not bind the source JPEG to a shader displacement channel.
- The scanned relief is combined with authored macro contours, tidal shelves, drainage rills and wetness. Two continuous copies of the same scan, one rotated and scaled to 1.46 metres, blend through a broad irregular mask to reduce tile repetition. Color, normal, roughness, AO and sampled geometry relief use matching coordinates; the rotated normal is transformed back before blending. The material is not a scan from Bhitarkanika itself. Sampled displacement remains outside the navigation boundary and is also exposed to wildlife grounding.

## Reference photography

The actual Bhitarkanika creek and crocodile photographs in the separately credited `assets/field-guide/` collection informed the narrow mud ledges, dense low foliage, irregular overlapping crowns and exposed root structures. Their credits remain in that collection. Reference photographs are not silently repurposed as scene textures.
