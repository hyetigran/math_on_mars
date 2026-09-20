/** Bound drawing cost on high-density screens while preserving the viewport ratio. */
export function canvasRenderSize(
  width: number,
  height: number,
  pixelRatio: number,
) {
  const density = Math.min(
    Math.max(1, pixelRatio),
    2,
    Math.sqrt((1280 * 720 * 4) / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * density)),
    height: Math.max(1, Math.floor(height * density)),
  };
}
