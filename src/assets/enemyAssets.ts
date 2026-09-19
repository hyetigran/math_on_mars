/** Lossless runtime sheets generated from the retained 512px AutoSprite masters. */
export const enemyAnimationAssets = {
  "drifter-run": new URL(
    "./characters/enemies/drifter/runtime/drifter-run.webp",
    import.meta.url,
  ).href,
  "drifter-attack": new URL(
    "./characters/enemies/drifter/runtime/drifter-attack.webp",
    import.meta.url,
  ).href,
  "spitter-run": new URL(
    "./characters/enemies/spitter/runtime/spitter-run.webp",
    import.meta.url,
  ).href,
  "spitter-attack": new URL(
    "./characters/enemies/spitter/runtime/spitter-attack.webp",
    import.meta.url,
  ).href,
  "charger-run": new URL(
    "./characters/enemies/charger/runtime/charger-run.webp",
    import.meta.url,
  ).href,
  "charger-attack": new URL(
    "./characters/enemies/charger/runtime/charger-attack.webp",
    import.meta.url,
  ).href,
  "splitter-run": new URL(
    "./characters/enemies/splitter/runtime/summoner-run.webp",
    import.meta.url,
  ).href,
  "splitter-attack": new URL(
    "./characters/enemies/splitter/runtime/summoner-attack.webp",
    import.meta.url,
  ).href,
  "overmind-run": new URL(
    "./characters/enemies/overmind/runtime/overmind-run.webp",
    import.meta.url,
  ).href,
  "overmind-attack": new URL(
    "./characters/enemies/overmind/runtime/overmind-attack.webp",
    import.meta.url,
  ).href,
} as const;

export type EnemyAnimationKey = keyof typeof enemyAnimationAssets;
