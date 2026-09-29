# V2 visual prototype — first street

Branch: `codex/v2-opening-session`. Experimental scene, not the town simulation.

Run `pnpm dev:town` with Node 20.19+ or 22.12+; visit `/town-prototype.html`. `pnpm build:town` writes an isolated static build to `dist-town/`. The normal game entry and build are unchanged. Three.js is reused from the existing asset-tool dependencies as a prototype choice, not a final engine decision.

The scene uses a shared geometric 3D kit for overview and behind-character walking, with a House, Greenhouse, Bakery, plaza, dome framework, vegetation, and Martian horizon. The user reference pass adds attached houses, a leafy lane, planted courtyard, café seating, fountain and growing rows around those three selectable buildings. These extra frontages are scenery only. See `docs/V2_VISUAL_REFERENCES.md`. Toggle the House between two sample appearances. This is placeholder art and a simple proxy character, not final assets or all five building levels.

Overview: drag to orbit, scroll/pinch to zoom, select buildings by clicking or with named buttons. Walking: WASD/arrows or on-screen direction buttons; drag to look. Reset view restores the starting position. Buildings block character motion; the following camera shortens its distance at building surfaces. Reduced detail removes paving detail and shadows and limits pixel density; it defaults on for narrow screens.

State lives only in memory and resets on reload. No cadet data, resources, learning rewards, building queues, families, or economy are modified. Existing combat is separate.

Validation: TypeScript and isolated production build; browser smoke checks for camera switching, movement, house upgrade, selection, reduced-detail mode, and narrow layout. Desktop and phone screenshots inspected, including the denser reference-inspired layout. The revised scene passed touch movement, collision, selection, camera and upgrade checks with no browser exceptions. Static neighborhood geometry is merged by material to keep the additional houses and planting from creating a draw call for every piece. Actual tablet/phone GPU performance, final asset readability, accessible nonvisual play, and full-town scale remain unvalidated.

Review questions: Does the same street feel inviting from above and behind the character? Is street width comfortable? Is the upgraded house recognizably more developed? Treat user feedback as evidence before committing to final art or renderer architecture.
