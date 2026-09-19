# Final game assets

All finalized artwork and its reproducible source files live here. Runtime files are grouped with their source family:

- `brand/`: approved title artwork and provenance.
- `screens/splash/`: splash master and runtime WebP.
- `environment/camp/`: current v3 camp master and runtime WebP.
- `environment/arena/`: rectangular chain-link-fence arena master and integrated 3840px runtime WebP; historical crater master retained.
- `characters/marine/`: current v005 rig/walk sources, unarmed camp sprites, and `armed/` dual-pistol battle sprites.
- `characters/enemies/`: approved enemy masters plus lossless run/attack runtime sheets.
- `weapons/pulse_blaster/`: approved Twin Rail master and provenance.
- `items/{ammo,trinkets,healing_loot}/`: approved PNG masters and optimized `runtime/` WebPs.
- `ui/`: approved `masters/`, `icons/`, `runtime/` images and control state CSS.
- `music/`: original 48 kHz/24-bit stereo camp, battle and boss loops.
- `sfx/`: original 48 kHz/24-bit game effects. Cartoon enemy effects are
  grouped under `sfx/enemies/`; quiz, interface and mission cues are under
  `sfx/interface/`; reward, equipment and environmental cues are under
  `sfx/rewards-equipment-environment/`. Files use mono or stereo according to
  their role.

Run `node scripts/prepare-game-assets.mjs` to regenerate item/UI exports and `runtime-manifest.json`. Run `node scripts/prepare-camp-assets.mjs` to regenerate camp, splash and marine runtime assets. Both use only files inside this repository. `pnpm sprites:bake:marine` rebakes the current marine idle/walk sprites from the retained GLBs; it requires local Chrome. Historical bake/preview commands explicitly use the sibling archive.

Run `node scripts/prepare-enemy-sprites.mjs` to rebuild the 256px lossless enemy runtime sheets from the retained Corridor Key masters. Full-frame repair sources under `assets/sorceress/enemies/sprites/repairs/` replace generated frames whose silhouettes originally left the camera. The preparation pass gives every frame a fixed scale, stable ground line, transparent-background cleanup, and an 18px safety inset so motion cannot bleed or clip across sprite cells.

Run `python3 scripts/generate-music-assets.py` to regenerate the three music loops. The composer is deterministic and requires only Python 3 plus ffmpeg.

Run `node scripts/prepare-sfx-assets.mjs` to trim, level-match and export the
Sorceress source effects as runtime WAV files. This requires ffmpeg and ffprobe.
Run `node scripts/prepare-enemy-sfx-assets.mjs` to reproduce the separately
named enemy movement, impact, attack-warning and Overmind WAV masters.
Run `node scripts/prepare-quiz-ui-sfx-assets.mjs` to reproduce the quiz,
interface, wave and mission-ending WAV masters.
Run `node scripts/prepare-rewards-equipment-env-sfx-assets.mjs` to reproduce
the reward, pickup, equipment and shop effects plus the circularly crossfaded
Mars wind, camp machinery and portal ambience loops.

Audio naming uses stable snake-case runtime filenames requested by the game
(for example `quiz_correct.wav`) and readable embedded titles (for example
`Quiz Correct`). Retained Sorceress inputs use the matching descriptive name
with a `_source.mp3` suffix; opaque service timestamps are not used.

`itemAssets.ts`, `uiAssets.ts` and `campAssets.ts` expose Vite-managed URLs. Camp animation filenames resolve through an explicit Vite asset map so production hashes and offline caching include every sprite. Masters and GLB sources are not imported into the game bundle.

Unused assets, prior models, experiments, reference screenshots and historical galleries live outside the repository at `../tmp_assets` relative to the repository root (`/Users/tig/Desktop/tigran/tmp_assets`). No runtime or normal asset preparation depends on that archive. The archive has not been deleted. [Relocation manifest](../../docs/ASSET_RELOCATION.json) records old/new locations and checksums, including metadata updated to match the move.

## Battle Zone

`battleAssets.ts` and `armedMarineAssets.ts` expose the arena, battle audio, and all 32 armed marine runtime sheets. The armed source sheets were recovered from the sibling archive’s `unused/assets/sorceress/3d/marine-dual-pistols-v001/sprites/`; their original metadata is retained for provenance. Historical `sourceModel` paths in that metadata are not runtime or regeneration dependencies. The source manifest omitted idle, so preparation explicitly covers all four states and eight directions.

Run `node scripts/prepare-armed-marine.mjs` to regenerate the armed sheets from their in-repository PNGs. It independently resizes each frame and normalizes the original 1024px bake pivot for the 512px source exports. Run `node scripts/prepare-battle-assets.mjs` to regenerate the arena WebP and compressed audio in `audio/runtime/` (requires ffmpeg). WAV masters remain unchanged. Vite includes the runtime assets in the production build and offline pack.
