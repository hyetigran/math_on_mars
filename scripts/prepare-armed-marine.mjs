import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const root = "src/assets/characters/marine/armed";
await mkdir(`${root}/runtime`, { recursive: true });
const animations = [];
for (const direction of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
  for (const state of ["idle", "run", "attack", "run-attack"]) {
    const key = `${state}-${direction}`;
    const meta = JSON.parse(
      await readFile(`${root}/sprites/${direction}/${key}.json`, "utf8"),
    );
    const size = 192,
      columns = 5,
      rows = Math.ceil(meta.frameCount / columns);
    const frames = [];
    for (let frame = 0; frame < meta.frameCount; frame++) {
      const input = await sharp(`${root}/sprites/${direction}/${key}.png`)
        .extract({
          left: (frame % meta.columns) * meta.frameWidth,
          top: Math.floor(frame / meta.columns) * meta.frameHeight,
          width: meta.frameWidth,
          height: meta.frameHeight,
        })
        .resize(size, size)
        .png()
        .toBuffer();
      frames.push({
        input,
        left: (frame % columns) * size,
        top: Math.floor(frame / columns) * size,
      });
    }
    await sharp({
      create: {
        width: size * columns,
        height: size * rows,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite(frames)
      .webp({ lossless: true })
      .toFile(`${root}/runtime/${key}.webp`);
    // Bake metadata recorded the pivot in the 1024px render, before its 512px export.
    animations.push({
      key,
      direction,
      state,
      frameWidth: size,
      frameHeight: size,
      frameCount: meta.frameCount,
      fps: meta.fps,
      pivot: { x: meta.pivot.x / 1024, y: meta.pivot.y / 1024 },
    });
  }
}
await writeFile(
  `${root}/runtime/manifest.json`,
  JSON.stringify(animations, null, 2) + "\n",
);
console.log(`Prepared ${animations.length} armed marine sheets.`);
