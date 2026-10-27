# Independent estuary asset collection

`high-estuary.js` owns the High landscape independently of Standard. It now uses
the baked photographic coastal-tree collection and scanned sediment described
in [the estuary asset credits](../estuary/CREDITS.md), across the whole route.
The older entirely authored branch-and-leaf architectures remain in source as
a development comparison option. Their curved branching roots still join the
new tree assets. They are not Standard's trees.

The existing bark photograph maps remain active on roots, secondary boughs and
fallen wood under CC0. See [CREDITS.md](CREDITS.md) for the author, source and
license. Photographed trunks and leaves use their own UVs and maps in `../estuary/`.

Visual research: the Bhitarkanika forest photograph by O'Hans, 26 October 2015,
listed at https://commons.wikimedia.org/wiki/File:Mangrove_at_Bhitarkanika_national_Park.jpg
(CC BY-SA 4.0), and Odisha/BSI mangrove habitat photographs. Reference photographs
are not copied into textures or redistributed with this scene. The forest is an
authored interpretation; the source coastal scan is not a Bhitarkanika specimen
or a verified mangrove species, and this is not an exact botanical inventory.

Veterans carry long stilt roots; older upright trees have shorter, broad
buttresses. Recruits occupy irregular shaded hummocks with leafy growth between
1 and 5 m, interrupting exposed mud without covering the tidal shelf. Each bank
and shoreline/interior group culls independently, reflections compact individual
instances, and coarse shadow meshes avoid redrawing every tiny shoot.

The four asymmetric place compositions share the original navigable river:
intimate creek near z=0, leaning overhang near z=-110, right-hand tidal shelf near
z=-234, and wider left-hand clearing near z=-417. Related compositions recur
farther along the journey without duplicating tree transforms. Tree roots remain
outside the collision channel; branches over water clear 5 m and the camera
corridor clears 8 m. Scanned terrain relief has shared boundary normals and the
same ground-height query for wildlife. Two continuous rotated texture samples
break the scan's tile repetition while preserving the physical sediment scale.
