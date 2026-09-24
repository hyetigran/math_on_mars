import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

for (const motion of ["run", "attack"]) {
  test(`Overmind ${motion} frames retain flat colors, transparency, and safe cell margins`, async () => {
    const { data, info } = await sharp(
      `src/assets/characters/enemies/overmind/runtime/overmind-${motion}.webp`,
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 2048);
    assert.equal(info.height, 1024);
    for (let frame = 0; frame < 32; frame++) {
      let opaque = 0;
      let dark = 0;
      let visible = 0;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const offset =
            ((Math.floor(frame / 8) * 256 + y) * info.width +
              (frame % 8) * 256 +
              x) *
            4;
          if (data[offset + 3] >= 16) {
            visible++;
            assert.ok(
              x >= 18 && x < 238 && y >= 18 && y < 238,
              `frame ${frame} clips its safety margin`,
            );
          }
          if (data[offset + 3] <= 200) continue;
          opaque++;
          if (Math.max(data[offset], data[offset + 1], data[offset + 2]) < 65)
            dark++;
        }
      }
      if (frame === 31) {
        assert.equal(visible, 0, "unused final cell must stay transparent");
      } else {
        assert.ok(opaque > 5000, `frame ${frame} is missing its body`);
        // Corrected outlines/eyes occupy 10–14%; damaged poses were 35–53% black.
        assert.ok(
          dark / opaque < 0.2,
          `frame ${frame} has excessive black shading (${Math.round((100 * dark) / opaque)}%)`,
        );
      }
    }
  });
}
