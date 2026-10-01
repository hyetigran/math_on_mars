# V2 city builder — art style guide

Draft for owner review · October 1, 2026 · Related ticket: [#49](https://github.com/hyetigran/math_on_mars/issues/49).

This document defines the proposed visual target for the city builder. The town layout, two camera modes, building catalog, five building levels, families, livestock, and decorative production follow the [accepted product plan](V2_TOWN_BUILDER_PLAN.md). The art treatment, dimensions, and budgets below are proposals to validate in a representative scene. Writing this guide does not approve production assets or complete #49.

## Direction

**A stylized, inhabited European village inside a Martian habitat.** Warm plaster houses, tiled roofs, leafy pedestrian lanes, active shopfronts, and gardens form the foreground. A light dome structure and a red rocky horizon establish Mars beyond it. Quietly integrated technology makes the settlement believable without overwhelming its architecture.

The recommended treatment is a storybook miniature rendered in 3D: simplified substantial shapes, gently softened edges, restrained painted detail, and warm daylight. Buildings have enough physical detail to reward walking past them, while roof shapes and primary features remain clear from above. Charming does not mean every surface is decorated; each building gets a few memorable features.

Clash of Clans informs interaction clarity, bold HUD controls, and rewarding upgrades. Our environment uses the supplied European-town references and its own architecture, palette, characters, and symbols. The [implemented UI pass](https://github.com/hyetigran/math_on_mars/pull/77) is a starting point for the town's controls, not an approved final art kit.

### Decisions already established

- Predefined streets and player-customizable plots; ordinary buildings remain compatible with ordinary plots. Livestock uses rural plots at the habitat edge.
- One 3D scene supports an elevated management view and a true behind-character walking view.
- A transparent pressurized dome encloses people, vegetation, cafés, and livestock. Red Martian terrain remains visible outside.
- Five increasingly impressive visual levels for each of the 23 building types; a level need not add a storey.
- Varied colonists, actual families, permanent child characters, and visible animals. Appearance does not determine personality or job suitability.
- Food crops come from Greenhouses; decorative plants come from the Plant Nursery. Workshop furnishings and the separate Playground serve different roles.
- Functional, minimal UI copy: names, levels, costs, timers, states, and consequences.

### Proposed for review

The storybook treatment, architectural family, palette, proportions, lighting, progression examples, and production constraints in this guide. The owner may revise these after seeing the same street corner from both cameras.

## Use the supplied references

The [reference register](V2_VISUAL_REFERENCES.md) identifies all seven supplied images. Use their spatial and architectural qualities rather than recreating their exact sites.

| Reference | Apply to our town |
|---|---|
| Village aerial: `GyFk_LzW8AAvtPv` | Compact center, roofs with varied heights, gardens and a gradual rural transition |
| Courtyard blocks: `GzC7IJmW0AE_9-G` | Buildings frame streets and shelter planted courtyards; scale down the metropolitan massing |
| Pedestrian square: `GzlPyTQaAAAnTdp` | Fountain focal point, active shopfronts, small gathering spaces and varied rooflines |
| Gabled houses: `G0AVLQcXsAEIVTn` | Narrow façades, occasional timber framing, colored trim, cobbles and flower pots |
| Leafy café lane: `HP16w3QXQAAMb4S` | Tree canopy, awnings and seating around a clear walking corridor |
| Village plan: `HTPzwQaWkAE24Zs` | Connected small squares, passages and enclosed gardens along authored streets |
| Village/agricultural aerial: `HTQlHbKWUAABqRI` | Dense settlement gives way to orderly growing rows and rural facilities |

Photographs are inspiration, not shipped textures. Churches, river systems, cars, actual business signs, and copied landmarks are not required assets.

## Architecture and town composition

Use a restrained northwestern/central European village vocabulary: cream or pale ochre plaster, terracotta and muted slate roofs, stone bases, narrow windows, painted shutters, and occasional timber framing. Shopfronts, doors, and roof pitches share construction logic across the kit. Avoid applying timber framing, balconies, elaborate gables, and roof gardens to every building at once.

Most street buildings are two to three storeys in visual mass; apartments and selected civic landmarks may reach four. These are art limits to test, not new housing rules. Roofs vary in ridge direction, pitch, dormers, and color within the palette. Growth increases craftsmanship, functional equipment, and planted detail before increasing height.

Buildings meet the street with visible entrances and a coherent façade line. Use narrow front gardens, small courtyards, arcades, and corner treatments to soften transitions. Randomly rotated isolated buildings in the middle of lawns should not be the dominant composition. Freestanding Greenhouses and rural facilities still connect to the same pedestrian network.

A plot's selected type must remain identifiable when surrounded by similar roofs. Give each type one primary silhouette feature and one entrance-level cue. Neighborhood variety comes from compatible façade variants and trim palettes; these never alter a building's function or level.

### Mars in the environment

- Show red sand, layered rocks, and distant ridges beyond the habitat; protect the green interior from appearing to be an uncontained Earth landscape.
- Keep dome ribs slender and glazing visually quiet. The dome should remain legible at the horizon without a dense wire grid over every roof and street.
- Integrate air grilles, sealed service panels, utility conduits, filtration vessels, solar surfaces, and discreet lamps into village architecture.
- Use restrained blue-green glass and equipment accents. Avoid turning every façade into a glowing science-fiction console.
- Construction uses scaffold frames, stacked materials and a small construction drone as visual storytelling. The build timer and saved state remain authoritative.

## Palette, surfaces, and light

These are starting swatches, not requirements to apply one flat color to every mesh. Check their appearance under the actual renderer's lighting.

| Role | Starting color | Use |
|---|---|---|
| Warm plaster | `#F1DFBC` | Main wall family |
| Pale ochre | `#D7B782` | Secondary walls and masonry accents |
| Terracotta | `#BA7053` | Common roof tiles |
| Slate | `#59696A` | Selected roofs and utility finishes |
| Painted teal | `#4D827D` | Shutters, doors and shop trim |
| Glass | `#A9D1CB` | Greenhouses and quiet technology |
| Foliage | `#719657` | Midtone canopy; vary lighter/darker values |
| Paving | `#C8BA98` | Cobble and plaza base |
| Martian soil | `#BA795A` | Exterior ground, separated by habitat edge |
| Structural dark | `#4B5147` | Frames, rails and readable dark accents |
| UI cream | `#FFF2D0` | Labels and light panel highlights |
| UI action green | `#83B54B` | Primary actions with a separate focus treatment |

Use matte plaster, lightly textured stone, simplified tile rhythms, rounded timber edges, and broad painted color variation. Reserve stronger reflectivity for glass and small equipment details. Avoid dense dirt, photographic grain, tiny repeated bricks, and noisy normal maps that shimmer during camera movement.

Use warm daylight with cooler ambient shadows. Keep doorways and characters readable in shadow. Ground contact and soft cast shadows establish scale; baked ambient shading must not look like a second contradictory sun. Glazing should show beds and structural frames with limited transparency layers. Night lighting, weather, and seasonal variants are later additions, not requirements for the first kit.

World meshes rely on silhouette and value separation rather than thick outlines around every object. UI icons can use stronger outlines and simpler highlights for small-size readability.

## Building identity

The full catalog is listed here to keep a consistent art vocabulary. These are proposed cues, not a request to produce all 115 appearances now.

| Building | Overhead identity | Street-level cue |
|---|---|---|
| House | Pitched roof, chimney, compact garden | Welcoming door, shutters, household planting |
| Apartments | Broader roof mass around a small shared court | Multiple doors/landings, balconies and shared seating |
| Greenhouse | Glazed pitched structure and planted rows | Glass framing, crop beds and irrigation equipment |
| Orchard | Grouped fruit-tree canopies | Visible fruit, espalier supports and collection baskets |
| Water Plant | Rounded cisterns and blue-green pipe loops | Filter tanks and water-recovery housing |
| Oxygen Plant | Paired vertical air-processing vessels | Large clean intake grilles and sealed plant equipment |
| Solar Plant | Dark segmented panels and a solar canopy | Electrical cabinet, clean supports and service access |
| Block Factory | Material stacks and an enclosed working yard | Molding/fabrication equipment and stacked blocks |
| Workshop | Sawtooth or skylit workshop roof | Workbench, parts drawers and a crafted furnishing display |
| Warehouse | Broad loading roof and organized crates | Storage doors, racks and a simple delivery trolley |
| Chicken Coop | Small low house within a fenced run | Chickens, nesting access and feed containers |
| Dairy Barn | Broad barn roof with pasture enclosure | Cows, feed troughs and sheltered milking equipment |
| Pig Farm | Low shelters and a partitioned enclosure | Pigs, feeding area and clean fenced pens |
| Mill | Tall roof vent and grain bins | Grain hopper, mill housing and flour sacks |
| Bakery | Oven chimney and striped awning | Bread display, shop window and oven-side door |
| Jam Kitchen | Fruit-colored canopy and glazed work area | Fruit baskets, jars and processing counter |
| Café | Distinct canopy and contained seating terrace | Tables, chairs, service window and menu symbol |
| Market | Covered stalls beneath a larger canopy | Crates and separate goods displays |
| Construction Office | Small civic roof crest and covered materials bay | Plan board, construction tools and drone dock |
| Armory | Reinforced roof and compact equipment crest | Armor/weapon display behind a secure shopfront |
| Research Lab | Glazed roof lantern and instruments | Specimen/work display and integrated lab equipment |
| Playground | Clear play structure and open court | Child-scale equipment with unobstructed access |
| Plant Nursery | Potting pavilion and varied plant groupings | Saplings, pots, flowers, shrubs and propagation tables |

Signs use original pictograms. Building names and interactive status remain live UI text rather than baked lettering on textures. Animals and meat production are presented without graphic processing imagery.

## Five-level upgrade language

Every upgrade must preserve type identity, street entrance, footprint compatibility, and recognizable primary colors. Player-owned decoration must remain distinguishable from detail included with the building mesh.

| Level | Visual change | House example |
|---|---|---|
| 1 | Simple complete building, modest function and detail | Plaster dwelling, plain tiled roof, clear door/windows |
| 2 | Better finish and one obvious new feature | Shutters, stone base, small balcony or dormer |
| 3 | Richer façade and more purposeful outdoor detail | Articulated entry, trim, fitted planters and improved roof |
| 4 | Distinctive craftsmanship and integrated advanced equipment | Refined balcony, solar tiles and a sheltered upper terrace |
| 5 | Mature signature building with the strongest silhouette | Elegant roof composition, coherent planted terrace and refined service details |

These examples illustrate visual investment; they do not grant particular gameplay benefits. Fixed plot limits may require choosing between a roof garden, dormer, or balcony rather than adding every feature. Level 5 remains a village building, not a skyscraper or fortress.

Greenhouses progress through better framing, growing-bed organization, irrigation, roof vents and integrated monitoring. Utility buildings improve equipment quality and enclosure design. Livestock facilities improve shelter and husbandry presentation. Review each building family independently; House approval cannot stand in for all five levels across all types.

Show active construction with clear scaffolding and a restrained dust/work effect. An upgrade keeps the old building recognizable and operating until completion. The completion reveal uses a short highlight and a visible change of silhouette/detail; it must not block interaction or imply progress that the saved state has not completed.

## Colonists, children, and animals

Colonists have soft stylized proportions, readable faces, substantial hands/feet, and everyday clothing suited to a comfortable habitat. Adults should read as adults, with roughly five to six heads of height; children need a separate, shorter four-to-five-head proportion and animation set. Test these proportions beside doorways and furniture before locking them. The town protagonist may share conventions where compatible with the existing marine source; town NPCs do not inherit combat gear requirements.

Build a compatible wardrobe around a small adult body/rig family. Compose skin tones, face shapes, hair, clothing and accessories using stable part IDs in a versioned appearance recipe. Demonstrate at least 12 distinct adults across idle, walk and sit poses. Hair/hats, sleeves/hands, shoes/legs, and body/clothing pairings need explicit compatibility rules. A fallback part must preserve saved identity as far as possible when an asset is unavailable.

Job clothing is a removable layer: apron, work jacket, gloves, utility belt or small tool. Base appearance remains recognizable when a job changes. Clothing, skin tone, body shape and hairstyle never determine happiness, food preference, relationships, or ability. Children remain children, have no worker clothing or production jobs, and appear walking, talking, resting and playing.

Use several canopy/plant shapes and readable chicken, cow and pig silhouettes. Their animation vocabulary is simple: idle, walk, eat, and a small response gesture. Walking, conversation, tending and seated activity provide town life; essential output must not depend on an animation successfully reaching its target.

## Modular kit and camera fit

### Proposed authoring convention

Use metres as the authoring scale, then convert through one documented adapter to the current scene. Do not assume that existing prototype units already equal metres. Use Y up and +Z as the front/entrance direction. Place a building root at ground level at the centre of its plot; use a named entrance socket, separate collision proxy, selection bounds, and optional attachment sockets.

Start with a 0.5 m construction increment, 1 m façade modules, a 1.7 m adult reference, approximately 2.1 m doors, and 2.8–3.2 m storeys. Main lanes target 4–6 m clear width; secondary passages target 2.5–3.5 m. These dimensions are scale tests, not simulation restrictions. Tables, planters, awnings and balcony supports must not consume the promised clear walking corridor.

Derive ordinary and rural plot envelopes from the authored map before production modeling. Record each actual width/depth, buildable inset and height envelope in an asset manifest. All ordinary building types must fit the common ordinary-plot contract; rear volume or court layout can vary within it. Rural livestock envelopes are separate under ADR-0002. Do not freeze new plot dimensions in this document without checking the existing map.

The kit needs façade bays, party walls, visible end walls, corner returns, roof ends/ridges, door/window families, paving boundaries and courtyard entrances. Place neighboring buildings without z-fighting or unintended walkable slivers. Use perimeter/transition pieces inside the plot envelope rather than stretching doorways or distorting an entire model to fit. Invisible neighbors must not leave a finished building with a missing exterior wall.

### Two-camera checks

- **Overview:** use an elevated orthographic or restrained-perspective view with clear roof silhouettes and visible street connections. Confirm the exact projection in-engine; the current prototype camera is not an approved final composition.
- **Walking:** use a perspective camera behind the protagonist. Inspect doors, side/rear faces, ground contact, roofs seen from below, glazing and street furniture. Avoid detail that only looks correct from one fixed angle.
- **Occlusion:** test the protagonist beside a tall building and under a canopy. Camera collision, selective foreground fading, and roof treatment are implementation work to validate; they are not solved by a beautiful overview screenshot.
- **Interaction:** selection highlight follows a building's ground footprint, not its whole roof silhouette. Add a clear contextual action tray; resource counters and edge controls must leave useful town space on portrait and landscape screens.

## UI and feedback art

Use substantial cream/stone frames, dark resource counters, illustrated icons and bright green primary actions. Battle keeps a distinct warm orange action. Buttons need obvious silhouettes and pressed depth; selected, unavailable, focused, offline and paused states must not rely on color alone.

Building cards show a recognizable preview, building name/level, plot label, icon costs and timer. Tapping a building keeps the town visible with contextual actions. Keep numbers and labels live and localizable. Check icons at 24, 32 and 48 px; avoid tiny highlights that disappear at phone size. The art should tolerate longer labels and enlarged text.

Animate construction, completion and resource changes with short, restrained feedback. Honor reduced-motion preferences; avoid persistent bouncing badges, camera shakes and decorative particles over math questions. This guide sets visual rules, not sound-production scope.

## Asset production and initial budgets

Deliver editable sources alongside runtime GLB exports, shared materials/atlases, collision proxies, documented pivots/socket names, and a reproducible export procedure. Keep textures separate when useful for caching. Record provenance and rights for every externally sourced component; original concept images are references, not usable 3D exports. Do not import unverified artwork or photographic crops as textures.

Provisional ceilings for the **first reference block**, to revise from measurements:

| Measure | Initial target |
|---|---|
| Reference composition | House L1/L2, Greenhouse L1, Bakery L1, one street corner, planting, bench/fountain, protagonist and 12 adults |
| Ordinary building mesh | 5–15k visible triangles per building; up to 25k only for a demonstrated landmark need |
| Character mesh | 3–6k visible triangles including clothing/hair; plan a simpler distant representation |
| Rendered reference scene | At most 250k visible triangles and 150 draw calls in standard mode; shadow passes reported separately |
| Reduced-detail reference scene | At most 100k visible triangles and 80 draw calls; reduced vegetation and simpler shadows |
| Texture sets | Shared 1024 px atlases initially; 2048 px only where street-level comparison justifies them; avoid unique large textures for every level |
| First playable town download | Aim for no more than 10 MB compressed town art/animation; measure actual transferred bytes, separate from existing battle assets |
| Frame behavior | Aim for 60 fps on the chosen desktop/tablet and 30 fps in reduced-detail phone mode; report frame-time distribution, not only an average |

These are proposed experiment bounds, not proven engine limits or approved full-town budgets. Choose and record actual desktop/tablet/phone models before claiming coverage. Track texture memory, visible skinned meshes, material count and load/decode time as well as triangles. Reuse materials and batch static repeated scenery; do not require a separate material for every shutter or plant pot.

## Approval scene and production gate

Build one representative corner with a House, Bakery frontage, Greenhouse, narrow planted lane, small fountain/bench area and a view of the dome/Mars edge. Show House L1 and L2 in the same location. Include the protagonist and a small varied adult group; child proportions can be a clearly labeled concept before #55's animation kit exists.

Deliver the following review evidence:

1. Overview and behind-character captures of the same finished corner, including a phone-size view.
2. House L1/L2 comparison with identical camera and lighting; a separate proposed five-level silhouette sheet.
3. Material/palette board, doorway/person scale comparison, and examples of readable building-type cues.
4. A runnable scene with selection, camera switching and walking; record clipping, foreground-fading and collision limitations.
5. Asset manifest and measured load/render cost; list actual devices tested and those still untested.

**Current approval record:** the European-town references and game-style UI direction were accepted in conversation. The storybook environment treatment, palette, character proportions and finished modular kit are proposed here. The current Three.js scene and SVG building cards are placeholders. No finished reference corner, physical-device budget validation, or production art approval is recorded.

After owner review, record the selected direction and date here, revise the guide, and complete the remaining #49 acceptance checks before starting dependent asset production (#50, #51, #54). The complete 23-building/five-level catalog requires further family-by-family reviews. This document does not unblock those tickets by itself.
