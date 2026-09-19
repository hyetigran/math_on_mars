/** Goblin Gutter's arena and viewport proportions, in logical world pixels. */
export const BATTLE_VIEW = { width: 1280, height: 720 } as const;
export const BATTLE_WORLD = { width: 2560, height: 1440 } as const;
export const BATTLE_PLAY_BOUNDS = {
  left: 91,
  top: 115,
  right: 2462,
  bottom: 1300,
} as const;
export const BATTLE_CENTER = {
  x: (BATTLE_PLAY_BOUNDS.left + BATTLE_PLAY_BOUNDS.right) / 2,
  y: (BATTLE_PLAY_BOUNDS.top + BATTLE_PLAY_BOUNDS.bottom) / 2,
};
export function clampBattleX(x: number, padding = 0): number {
  return Math.max(
    BATTLE_PLAY_BOUNDS.left + padding,
    Math.min(BATTLE_PLAY_BOUNDS.right - padding, x),
  );
}
export function clampBattleY(y: number, padding = 0): number {
  return Math.max(
    BATTLE_PLAY_BOUNDS.top + padding,
    Math.min(BATTLE_PLAY_BOUNDS.bottom - padding, y),
  );
}

/** Spend a bounded pixel budget, independent of CSS viewport size. */
export function battleRenderSize(
  width: number,
  height: number,
  pixelRatio: number,
) {
  const density = Math.min(
    Math.max(1, pixelRatio),
    2,
    Math.sqrt((BATTLE_VIEW.width * BATTLE_VIEW.height * 4) / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * density)),
    height: Math.max(1, Math.floor(height * density)),
  };
}
