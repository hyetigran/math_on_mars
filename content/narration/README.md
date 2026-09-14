# Installed K–1 narration

`k1-en.json` contains authored English task fragments, numbers and guidance. The checked-in MP3 files under `public/audio/k1` were generated locally with macOS Samantha at 155 words per minute and encoded by FFmpeg at 64 kbps. Runtime playback uses those files, with no live speech generation or runtime API key.

On a Mac with Samantha and FFmpeg installed, run `node scripts/build-narration.mjs` to regenerate the audio and `src/narration-manifest.ts`, then run `pnpm format`. These authoring tools are not game runtime dependencies.

The player decodes installed audio while the task remains hidden. Browser permission is requested through Enable speech before timed exposure. Initial speech and Replay use the shared countdown and never lock answer entry. Pause stops queued speech; Resume checks playable readiness again. Browser/device playback still needs hands-on verification. Offline application and content-pack installation belong to the offline ticket.
