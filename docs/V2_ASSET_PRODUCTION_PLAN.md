# V2 asset production plan and WizardGenie workflow

Planning baseline · October 2, 2026 · Related tickets: [#49](https://github.com/hyetigran/math_on_mars/issues/49), [#50](https://github.com/hyetigran/math_on_mars/issues/50), [#51](https://github.com/hyetigran/math_on_mars/issues/51), [#52](https://github.com/hyetigran/math_on_mars/issues/52), [#53](https://github.com/hyetigran/math_on_mars/issues/53), [#54](https://github.com/hyetigran/math_on_mars/issues/54), [#55](https://github.com/hyetigran/math_on_mars/issues/55).

Use the [approved town concept](art/v2-approved-style/town-style-approved.png), [art guide](V2_TOWN_ART_STYLE.md), and [accepted product plan](V2_TOWN_BUILDER_PLAN.md). This document proposes production batches and working methods; it does not approve finished assets, introduce new resources, or complete the art tickets. No paid generation was started to prepare it.

The town needs actual 3D assets because one scene supports both an elevated management camera and a behind-character walking camera. Deliver GLBs to the existing Three.js town; use WizardGenie/Sorceress for asset creation and editing. Asset production does not require moving the game into WizardGenie's engine. Phaser remains the separate battle renderer.

## 1. Complete inventory

The accepted catalog contains **23 building types × five levels = 115 building appearances**. This is a count of visible states, not 115 unrelated generation jobs or necessarily 115 independent GLB files. Shared architecture and interchangeable upgrade pieces should cover much of the catalog. Whole-town Level 0–5 concept images are references, not an additional six levels for every building.

### Buildings

Every row needs levels 1–5, a readable overhead silhouette, a street-level entrance cue, finished sides/rear, construction presentation, selection/collision bounds, and compatible plot fit.

| Family | Buildings | Required distinguishing features |
|---|---|---|
| Homes | House; Apartments | Doors, shutters, roof variants; shared entrances/balconies/courtyard for Apartments |
| Growing | Greenhouse; Orchard; Plant Nursery | Glasshouse beds; fruit-tree groupings; decorative saplings, pots and propagation benches |
| Utilities | Water Plant; Oxygen Plant; Solar Plant | Cisterns/filters; intake grilles/air vessels; solar panels/electrical enclosure |
| Manufacturing/storage | Block Factory; Workshop; Warehouse | Block stacks and fabrication yard; workbench/parts/furnishing display; crates/racks/loading frontage |
| Livestock | Chicken Coop; Dairy Barn; Pig Farm | Species-specific shelters, fenced runs, feed/water equipment and collection cues on rural plots |
| Food/services | Mill; Bakery; Jam Kitchen; Café; Market | Grain bins/hopper; oven/bread window; jars/fruit processing; seating/awning; covered stalls/goods |
| Civic/progression | Construction Office; Armory; Research Lab; Playground | Plan board/drone dock; equipment display; instruments/glazed roof lantern; child-scale play equipment |

House L5 remains a recognizable house. Upgrades improve finish, silhouette, equipment and detail within the plot envelope. Do not make an upgraded house become an apartment tower. Ordinary buildings must fit the ordinary-plot contract; only the livestock facilities use the separate rural envelopes.

### Everything around the buildings

Counts below describe an initial proposed kit, not newly accepted gameplay varieties. Expand after the reference scene works.

| Asset group | Full-V2 requirements | Reuse/production method |
|---|---|---|
| Modular architecture | Frontage bays, end/rear/party walls, corner returns, doors, windows, shutters, roof pitches/ends/ridges/dormers, balconies, railings, stairs, awnings, shopfronts, service panels and attachment sockets | One compatible library with material variants; bespoke silhouettes for utility/farm/civic types |
| Streets/courtyards | Straight and corner paving, intersections, plaza paving, curbs/borders, courtyard entrances, ramps/steps where the map requires them, drainage and plot transitions | Author to the actual map; shared meshes/materials, with clear walking corridors |
| Mars/habitat | Interior ground, exterior red terrain/rocks/ridges, transparent dome/ribs, habitat edge, airlock/arrival gate, starter habitat and essential utility cues | Model large structures deliberately; terrain and dome can be generated procedurally in code |
| Construction | Empty-plot treatment, foundation, scalable scaffold pieces, stacked blocks/crates, construction drone, work/completion effects | Shared kit across building types; code handles effects and saved-state timing |
| Decorative plants | Shade trees, flowers, shrubs, hedges; saplings and finished plants for Nursery production/inventory | Start with three canopy silhouettes and a small compatible planting set; use palette/scale variation rather than dozens of unique meshes |
| Furnishings | Benches, fountains, planters, lamps, basketball hoops and small play equipment; café tables/chairs, fences/gates and useful street props | Workshop-produced catalog is distinct from baked building details. Individual decorations do not automatically need five tiers |
| Food plants | Grain, edible vegetables and fruit trees appropriate to the eventual seed catalog; planting, growing and harvest-ready representations; beds/supports/irrigation | Propose three visible crop stages initially. Exact varieties and stage counts must follow the final crop table |
| Goods/production props | Grain/flour/feed sacks, fruit/vegetable crates, bread/pastry display, jam jars, eggs, milk containers, non-graphic packaged meat, blocks, parts and held-harvest containers | Small shared display props plus inventory icons; do not model every unit of simulated inventory |
| Adult colonists | Compatible body/rig family, skin/face options, hair, tops, bottoms, shoes, hats/accessories and removable job overlays; at least 12 distinct assembled adults for #54 | Shared skeleton and attachment rules; stable part IDs and versioned appearance recipes |
| Children | Separate child proportions, compatible child wardrobe/rig and child activities | Children stay children and never receive production jobs; prove scale and seating fit beside adults |
| Protagonist | Current marine mesh, rig and walking animation; town control integration and material/lighting checks | Reuse existing source GLB and clips before generating replacements |
| Animals | Chicken, dairy cow and pig, modest visual variants and idle/walk/eat/response motion | Separate species rigs; humanoid auto-rig does not cover these animals |
| Character activities | Adult idle/walk/turn/sit/stand/greet/conversation/carry/tend/harvest/feed/work; child idle/walk/sit/conversation/play | Start with idle/walk/sit; share/retarget motions where compatible. Tool/prop attachment needs sockets |
| Building activity | Fountain water, useful machinery motion, greenhouse tending cues, drone motion, restrained smoke/steam where appropriate | Simple object transforms and engine effects first; do not pay for animation of every static prop |
| UI art | Resource/goods symbols, building thumbnails, decoration previews, people/housing/workforce/happiness indicators, research/unlock symbols, crafting-material and equipment icons, menu/action/status symbols | Render thumbnails from approved models. Keep text, numbers, timers, progress bars and panel layout in HTML/CSS/SVG |
| Feedback/VFX | Plot selection/placement preview, valid/invalid placement, construction/upgrade reveal, harvest-ready/storage-full/paused cues, construction-credit spending feedback | Lightweight engine effects and live UI, readable without relying only on color; respect reduced motion |
| Music/ambience | One first town instrumental loop, later two or three compatible variations; interior hum, leaves/water, restrained social/farm ambience and exterior wind | Separate music and ambient layers; seamless loops require editing/testing |
| Interaction audio | UI click/back/error; placement/store; build start/complete/upgrade; harvest/production; credit spending; research/crafting completion; unlock/arrival; contextual farm/work sounds | A small shared vocabulary, with variants where repetition becomes distracting; avoid a unique sound for every building level |
| Combat equipment connection | Visible pieces for Helm, Armor/chest, Gloves, Legs and Boots; one-handed pistols/dual wield and two-handed rifles; equipment icons/Armory displays | Audit existing marine gear first. Recipe/tier counts remain open; new silhouettes must fit the existing rig and hand sockets |

UI resource symbols must distinguish food supply, building blocks, parts, trade credits, power, water, oxygen, housing, adult workforce and construction credit. Research is a project/unlock, not a science currency. Food-detail icons cover the actual goods roster: grain, flour, feed, fruit, vegetables, bread, jam, eggs, milk, meat and adopted recipes/varieties. Crafting materials remain separate from town parts and mission salvage. Preferences, family relationships and happiness need simple status symbols rather than new spendable resources.

### Every asset also needs delivery data

Keep editable sources, runtime GLB/textures, reusable materials, low-detail versions where needed, collision proxies, pivots, sockets, selection bounds, preview renders and reproducible export instructions. Record a stable ID, category, building type/level or part family, dependencies, dimensions, triangles, materials, texture sizes, transfer size, clip names, provenance, generator/model/settings, source references, rights/attribution and review status.

Suggested IDs: `house_l01`, `roof_gable_a`, `bench_a`, `adult_hair_03`, `child_top_02`, `cow_a`, `adult_walk`. Suggested future layout: `src/assets/town/{buildings,environment,plants,props,characters,animals,ui,audio}` with sources and generation records kept alongside or in a documented source archive. Do not move existing marine assets just to match this proposal.

## 2. Production order

| Batch | Deliverables | Check before expansion |
|---|---|---|
| A — reference corner (#49) | House L1/L2; Greenhouse L1; Bakery L1; paving/corner/end-wall kit; one tree, planting, bench and fountain; dome/Mars backdrop; existing MC; one adult rig proof and a small varied group | Same corner in both cameras; House upgrade at unchanged footprint; clear paths; scale/material consistency. Complete #49 evidence before dependent production |
| B — first playable kit (#50/#51) | Clean reusable exports/sources for that corner; protagonist walking integration, collisions/selection/camera handling | Runnable selection, camera switch, walking and L1→L2 swap; physical-device performance and load measurements |
| C — people (#54/#55) | Shared adult wardrobe yielding at least 12 distinct people; job overlays; child kit and activities | Saved identities survive reload/job changes; idle/walk/sit compatibility; no clothing gaps; distinct child proportions and no worker jobs |
| D — production families | Utilities/manufacturing/storage, growing/food families, rural facilities/animals, civic/service families; first L1 then five-level progressions per family | Type cues, consistent upgrades, plot fit, material reuse, non-graphic farming and camera readability |
| E — decoration and polish | Nursery/Workshop decorative catalog, icons derived from approved models, restrained VFX, audio (#52/#53), equipment connection when recipes are defined | Free placement preserves walk routes; minimal UI copy; loops/mix/volume settings; load/runtime budget |

The NPC and animal feasibility tests belong early even though full kits come later. Do not produce all 115 appearances before testing the pipeline. Music and SFX can wait until the reference corner has a stable visual and interaction rhythm.

## 3. WizardGenie: step by step

Tool names and capabilities were checked against the connected Sorceress live catalog and 3D guide on October 2, 2026. WizardGenie provides the agent/model editor; Sorceress supplies its image, 3D and sound tools. The official suite describes the [image → 3D → humanoid rig → animation workflow](https://sorceress.games/). Use feature names below rather than assuming a particular button position in the evolving UI.

### Step 1 — prepare the project/reference pack

Open [WizardGenie](https://sorceress.games/wizard-genie/app). Make a dedicated asset-production project/collection, or use an existing project without changing its runtime. Supply the approved town image and art guide. Also supply a front/side render of the existing marine for proportion comparison. The older Level 0–5 town images are layout/progression references; the final approved concept controls surface treatment and people.

In the agent chat, establish this brief:

> We are producing reusable 3D assets for Math on Mars V2, exported to our existing Three.js town. Read the attached approved art guide and selected town image. Match warm cream/ochre plaster, terracotta/slate roofs, teal trim, smooth matte surfaces, softly rounded forms and larger-headed compact people consistent with the marine. Start with one House L1 and a House L2 modification. Inspect existing assets first. List the chosen tools/settings and their current costs before generation. Keep editable sources and generation provenance. Do not generate the full catalog or change gameplay rules.

For agent-driven work, inspect the live tool catalog (`sorceress_list_tools`) and existing model/animation libraries before purchasing a new generation. We already have the marine locally even if it is absent from the connected account's model library. Upload/import local references in the studio; APIs require usable hosted image URLs, not a local `file://` path.

### Step 2 — set dimensions and build a simple blockout

Use the Modeler to make a plain box/roof building and door beside the actual marine. Read ordinary/rural plot envelopes from the authored town map. Agree on metres, Y-up, +Z entrance direction, ground-level root and entrance socket; document the adapter to current scene units. Check head clearance, doors, seats and street width with the walking camera before detailed generation.

The art guide's starting dimensions and polygon limits are provisional. A pleasing isolated model at arbitrary scale is insufficient. Do not stretch a finished building unevenly to make it fit a plot.

### Step 3 — make an isolated House L1 concept

In AI Image Gen, attach the approved town image, specify one object and a plain background, and generate one modest complete house. GPT Image 2 at 1K is a reasonable first trial available in the current catalog; it is a pipeline choice, not a claim that it wins all style comparisons.

Copyable concept prompt:

> One isolated Level 1 house for a softly stylized European village inside a Martian habitat, matching the attached approved town reference. Narrow cream-plaster frontage, simple terracotta pitched roof, teal door, modest windows, rounded readable construction, smooth matte surfaces and restrained texture detail. Door and windows sized for compact large-headed characters. Complete front, visible side and roof; front three-quarter view, entire object visible. Neutral plain light-gray background, even soft lighting, no cast shadow outside the object. No people, neighbors, street, ground slab, dome, scenery, lettering, logo or dramatic cinematic effects. Preserve a simple village-house silhouette suitable for modular construction.

Inspect the image before conversion. Fix fused/missing openings, inconsistent roofs, excessive detail or an overly realistic look. A five-level comparison sheet is useful for design review; crop/export each selected object separately rather than sending a whole grid to image-to-3D.

### Step 4 — convert that house to 3D

Open [3D Studio](https://sorceress.games/3d-studio), use the selected single-house image as input, and generate a static model. Start with Hunyuan 3D 3.1 as a 30-credit comparison baseline; try Tripo or Meshy if its geometry needs excessive repair. Do not auto-rig buildings. Export/save the original GLB and generation record before editing.

Inspect a full turntable: backside, roof underside, door recesses, normals, detached pieces, texture stretching, ground slabs accidentally incorporated into the mesh, glass opacity and material count. Image-to-3D invents hidden surfaces; a good front render does not validate them. If using multiple views, keep them geometrically consistent and provide separate front/side/back images, up to the selected model's supported limit.

### Step 5 — turn the result into a reusable building kit

Use WizardGenie's native 3D Modeler for supported mesh/object edits and simple authored props. Use Blender or another DCC when retopology, UVs, skinning or accurate modular cuts require it. AI output is a starting mesh; neither automatic generation nor the native editor guarantees production-ready modular geometry.

Separate useful roofs, wall bays, doors/windows and upgrade attachments. Share plaster/roof/trim materials; repair end/rear walls; remove hidden geometry; build simple collision/selection proxies and named sockets. Save an editable model and exported runtime GLB. PBR material generation is optional: simple restrained materials suit this direction better than automatically adding strong normals to every surface.

### Step 6 — create L2 from L1, then establish the five-level design

Duplicate the cleaned L1 source. Add an obvious improvement such as shutters, a stone base and one dormer or compact balcony. Keep footprint, entrance, palette and roof identity. A reference-guided image edit can help design the change, but implement it on the same compatible kit; independently generated buildings rarely align exactly.

Review L1/L2 at identical camera/lighting. Plan L3–L5 as attachments and better craftsmanship, then produce them after the reference scene passes. Render building-card thumbnails from approved models rather than paying for separate illustrations that may show a different building.

### Step 7 — build the street corner and test in the game

Add Greenhouse L1 and Bakery L1 using the same process. Author straight/corner paving, façade ends, a bench, planting, one tree and fountain. Build the dome/terrain backdrop with deliberate geometry or code rather than converting the complete concept painting into one village mesh.

Export to the existing town, switch overview/walking cameras, and test selection, door/person scale, ground contact, roof/canopy occlusion, collisions and the House L1→L2 swap. Test actual desktop/tablet/phone devices and report untested devices. Initial reference targets from the art guide: ordinary buildings 5–15k triangles, characters 3–6k, shared 1024 px atlases, ≤250k visible scene triangles/150 draw calls in standard mode, and ≤10 MB compressed first-town art. These are experimental bounds, not measured results; reduced-mode targets and frame-time checks remain in the guide.

Complete #49's in-engine review evidence before scaling dependent kits. Concept approval has already happened; this check concerns the resulting assets and runnable scene.

### Step 8 — prove one civilian's rig and animations

Read `sorceress_3d_guide` before creating a humanoid. Make one civilian reference image, with the approved style and marine as references:

> One full-body civilian colonist matching the approved town and marine proportions: larger rounded head, compact torso, sturdy short limbs, substantial hands and feet, simple fitted everyday shirt, trousers and shoes. Front view at chest-height camera, neutral expression, symmetrical OPEN A-pose. Arms 30–45 degrees below horizontal with clear gaps at armpits; legs hip-width apart with clear inner-thigh separation; feet flat and parallel; hands flat with fingers together and empty. Plain light-gray background, even lighting, entire body and feet visible. No props, pedestal, long coat, skirt covering the legs, text, exterior cast shadow or additional people.

Convert to 3D, inspect limb separation, then use humanoid Auto-Rig. Test idle, walk and sit before making a wardrobe. Start with short simple text-to-animation prompts: “Relaxed standing idle, slight breathing, hands empty”; “Steady relaxed walking, moderate arm swing, no gestures”; “Sit down on a chair, remain seated, hands relaxed.” Validate looping/root motion and seat height; generated motions can require trimming or retargeting.

The current humanoid pipeline uses a 24-bone Mixamo-style skeleton without face/finger bones. Strongly stylized bodies may rig poorly. The rigged output is normalized near 1.7 m, feet Y=0, facing +Z: load using its documented convention rather than guessing a scale factor. Child output needs a deliberate documented scale/rig adaptation, not accidental adult-height normalization. Raw SMPL motion requires correct retargeting; do not directly assign its joints to an unrelated skeleton.

For a finished humanoid use the Animate export's **Three.js Package**, or the agent's `sorceress_character_package` with runtime included. Keep its instructions, rig, clips and drive profile together, then integrate through our existing controls/collisions. A drive-profile JSON alone is not a playable character.

### Step 9 — make colonists composable

One independently generated person per NPC does not provide interchangeable clothing or a consistent skeleton. Establish a small compatible body/rig family, derive fitted wardrobe meshes from it, and skin every compatible garment to the same skeleton/bind pose. Use deliberate Modeler/DCC work for separating, fitting and weighting parts; colors/textures can supply some variation without new geometry.

Start by proving two hairstyles, two tops and two bottoms on one body, including seated poses. Check hats/hair, sleeves/hands, leg/shoe seams and hidden-body geometry. Expand until at least 12 adults are visibly distinct. Store part IDs in appearance recipes and keep apron/work-jacket/tool-belt job layers removable. Repeat with a child-specific kit and child activities. Appearance never assigns personality, relationship, food preferences or work suitability.

### Step 10 — test animals and growing plants

Generate one chicken, cow and pig as isolated models in the same rounded matte style. The humanoid rigger is unsuitable for these. The suite offers [Procedural Walk](https://sorceress.games/) for creature motion; first prove that its export/control behavior fits our Three.js runtime. Idle/eating and species-specific behavior may still require a manually rigged model and authored clips. Chickens also need their own suitable rig rather than a humanoid skeleton.

For plants, begin with reusable canopy/branch/bed modules. Make seedling/growing/ready representations for one grain and one edible vegetable; test one fruit-tree family and a separate decorative shade tree. Adopt exact named crops only from the final gameplay catalog. Show held harvest with a small container/status cue, without claiming that the goods are already in town storage.

### Step 11 — create UI and audio after the first scene works

Build original resource/action SVG icons or generate clean icon concepts, then simplify and inspect at 24/32/48 px. Derive thumbnails from the GLBs. Leave labels, values, buttons, modal layout and progress in the application. Do not generate a flat picture of the entire HUD or bake text into signs.

In [MusicGen](https://sorceress.games/music-gen), begin with one instrumental town theme:

> Warm, gently playful instrumental music for a peaceful European village under a Martian dome. Light acoustic plucks, soft woodwinds and restrained airy synths; unhurried, welcoming, low intensity. No vocals, dramatic battle drums, abrupt changes or recognizable existing game melody. Leave room for UI sounds and concentration during math practice.

A generated music track is not automatically seamless. Trim/fade or crossfade it, then test repeated playback. In [SFXGen](https://sorceress.games/sfx-gen), make short distinct build/complete/harvest/UI sounds; use the loop-capable option for ambience. Example: “Short friendly construction-complete chime with a soft wooden click and two warm bell notes, no speech, no background music.” Check peaks, repetition, music/SFX volume controls and the math-screen mix. Generate animal voices as restrained occasional sounds rather than constant loops.

### Step 12 — export, register, and review each batch

Keep source and runtime exports separate. Add manifest data and provenance, inspect both cameras, check animation/clothing compatibility, and measure transfer/render costs. Verify the applicable service terms and any imported component's rights; an AI job's success is not a rights record. Review a family and its five-level progression before mass production. Continue the repository's per-ticket branches/PRs into `v2`.

## 4. Current credit reference

Exact values below come from the connected **live tool catalog on October 2, 2026**, not older individual wrapper descriptions. Recheck the catalog/settings before each paid batch. Iterations, cleanup labor and extra options are additional; these figures are not a whole-project quote.

| Operation/settings | Credits |
|---|---:|
| GPT Image 2, 1K / 2K / 4K | 5 / 8 / 15 |
| Hunyuan 3D 3.1, image-to-3D | 30 |
| Tripo 3.1, image input, no texture / standard / HD | 30 / 40 / 50 |
| Meshy 6 or 7, default base + texture | 50 |
| Humanoid auto-rig | 20 |
| Text animation, current listed models | 3 |
| Music generation, approximately two variations | 10 |
| Seed Audio SFX | 1 per finished second, minimum 1 |
| Suno Sounds SFX, supports loop option | 2 |

Example: one GPT Image 2 1K concept plus one Hunyuan model is **35 credits before retries and cleanup**. For a character, that same pair plus a rig and three generated motion clips is **64 credits before retries and cleanup**. The editable modular kit and compatible NPC wardrobe require work beyond these generation charges. Meshy remeshing/high-resolution and other optional settings change costs; model availability can differ between the website and an agent wrapper.

## 5. Immediate next action

Make **House L1 → cleaned source → House L2 → both-camera town test**, while separately proving one civilian's idle/walk/sit rig. The output should be a working corner and reusable sources, with a measured art contract we can apply to the full catalog. This is the first production experiment, not authorization in this planning document to launch paid generation for every asset.
