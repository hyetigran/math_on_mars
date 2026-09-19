# V2 town builder: cameras, assets, and engine choice

Research date: September 17, 2026. Planning advice, not an accepted architecture decision. Current presentation terminology follows `CONTEXT.md`; older architecture documents describe an earlier proposed implementation. The user has confirmed genuine behind-character street-level exploration. The alternatives below explain the scope boundary; the recommended direction is a shared 3D town with two camera arrangements.

## The decision that changes the scope

“Street level” can mean two substantially different experiences:

| Experience | Practical rendering approach | Asset consequence |
|---|---|---|
| Zoom closer and walk the marine through town while retaining the same elevated angle | Phaser, with isometric ground and depth-sorted sprites | Modular building sprites, directional character animation, construction stages, crop stages |
| Lower the camera behind the marine, look down an alley, and see buildings from different directions | A real 3D town renderer | Building geometry with visible sides, ground geometry, a rigged character, materials and animation |

The first does not require 3D assets. The second strongly favors them. A sprite cannot reveal a building's unseen side when the camera moves; this is a geometry problem, not a higher-resolution-image problem.

## Phaser remains useful

Phaser supports isometric tilemaps and its normal scene camera can pan, zoom and follow a character. Its camera rotation turns the rendered plane; it does not lower a viewpoint into a 3D street. Therefore, an elevated town builder with closer walking mode is a reasonable Phaser direction, while a freely changing street-level perspective should use a 3D renderer. Custom integrations are possible, but would introduce another rendering system rather than turn ordinary Phaser sprites into 3D buildings. [Phaser tilemap API](https://docs.phaser.io/api-documentation/namespace/tilemaps), [Phaser cameras](https://docs.phaser.io/phaser/concepts/cameras).

Planning implications: placement, walkability, construction timers, crops and learning rewards should be independent of the renderer. An isometric town still needs authored ground footprints and drawing order for buildings that overlap the marine. Narrow streets make roof fading or foreground hiding worth testing early.

## If true street-level exploration is essential

Build one 3D town and show it through two camera arrangements: an elevated orthographic camera for planning and a perspective camera for walking. The town data and assets remain the same. A camera switch or short fade is enough initially; a seamless cinematic transition is optional.

| Candidate | Why investigate it | Main project tradeoff |
|---|---|---|
| Three.js | Supports orthographic and perspective cameras; a flexible option for a custom browser renderer | The project must supply the game-specific movement, collision, interaction and authoring workflow |
| Babylon.js | Built-in orbit, first-person and following camera types provide relevant starting points | Still requires town rules, character movement tuning, placement and content tools |
| Godot | Camera3D supports both projections within a full game-editor workflow | Introduces a different application/runtime workflow; browser export needs early device validation |

Camera capability references: [Three.js orthographic source](https://github.com/mrdoob/three.js/blob/dev/src/cameras/OrthographicCamera.js), [Three.js perspective source](https://github.com/mrdoob/three.js/blob/dev/src/cameras/PerspectiveCamera.js), [Babylon.js camera documentation](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction/), [Godot Camera3D](https://docs.godotengine.org/en/stable/classes/class_camera3d.html).

Godot's current stable web documentation requires WebAssembly and WebGL 2.0, limits web rendering to Compatibility, and describes mobile-browser caveats. Those are reasons to validate the actual target phones/tablets before choosing it, not evidence that this town cannot work in Godot. [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

Recommendation for the confirmed behind-character view: prototype a small Babylon.js or Three.js town inside the existing browser application and retain Phaser combat. Only one game view needs to be active at a time. Shared profile, learning and town state should live outside both renderers. This is an incremental integration recommendation, not a claim that mixing renderers is free: loading, input ownership, audio and renderer teardown need explicit handling.

## Asset pipeline

Two viable pipelines:

1. **2D runtime:** draw sprites directly, or model in Blender and render fixed-angle images. The latter gives consistent building proportions and lighting across construction stages and rotations, but the runtime is still 2D.
2. **3D runtime:** create modular meshes and export glTF/GLB. Blender's exporter supports mesh/material data and several animation types; GLB can package model data and image textures together. Material compatibility must be checked in the target renderer. [Blender glTF documentation](https://docs.blender.org/manual/en/4.0/addons/import_export/scene_gltf2.html), [GLB and animation details](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html).

For a walkable European-inspired Martian town, start with a coherent kit: attached narrow houses, corner pieces, ground-floor shops, an archway, street paving, plaza edges, greenhouse modules, planters, lamps and crop stages. Street-level views require believable doors, ground contact and facades, while the overhead view requires readable silhouettes and roofs. A full interior for every building is a separate feature, not a prerequisite.

Existing illustrated backgrounds can remain references or distant scenery. They do not provide editable building geometry. Existing marine source models may help a prototype, but a retained model is not automatically an approved replacement for the current illustrated marine.

## The smallest useful test

Use a plaza, one narrow lane, three building types, a greenhouse, a walking marine and one construction site. Test both intended camera modes, selecting a building, avoiding walls, seeing the marine behind buildings, and restoring a changed town after reload. Start with simple shapes; finish one house to test the real art pipeline. Measure loading, frame pacing and interaction on the actual target devices before increasing scene size. No engine performance ranking or reliable town-size limit follows from documentation alone.
