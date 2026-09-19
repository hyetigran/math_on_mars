import { loadCampAssets } from "./base-camp";
import { preloadGameAudio } from "./battle-audio";
import { loadImage } from "./image-cache";
import { arenaBackgroundUrl } from "./assets/battleAssets";
import {
  armedMarineAnimations,
  armedMarineUrl,
} from "./assets/armedMarineAssets";
import { itemAssets, uiAssets, enemyAnimationAssets } from "./assets";

const extraImages = import.meta.glob(
  ["./assets/ui/power/*.svg", "./assets/ui/cursors/*.png"],
  { query: "?url", import: "default", eager: true },
) as Record<string, string>;
const imageUrls = [
  ...new Set([
    arenaBackgroundUrl,
    ...armedMarineAnimations.map((animation) => armedMarineUrl(animation.key)),
    ...Object.values(enemyAnimationAssets),
    ...Object.values(itemAssets),
    ...Object.values(uiAssets),
    ...Object.values(extraImages),
  ]),
];

/** The splash owns loading; entering combat only attaches already-decoded textures. */
export async function loadGameAssets(
  progress: (fraction: number) => void,
): Promise<void> {
  const fractions = [0, 0, 0, 0];
  const update = (group: number, fraction: number) => {
    fractions[group] = fraction;
    progress(
      fractions.reduce((sum, value) => sum + value, 0) / fractions.length,
    );
  };
  let index = 0,
    complete = 0;
  await Promise.all([
    loadCampAssets((value) => update(0, value)),
    Promise.all(
      Array.from({ length: 6 }, async () => {
        while (index < imageUrls.length) {
          await loadImage(imageUrls[index++]);
          update(1, ++complete / imageUrls.length);
        }
      }),
    ),
    preloadGameAudio((value) => update(2, value)),
    Promise.all([
      document.fonts.load('16px "Oxanium"'),
      document.fonts.load('16px "Atkinson Hyperlegible Next"'),
    ]).then(() => update(3, 1)),
  ]);
  progress(1);
}
