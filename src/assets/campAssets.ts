/** Vite owns every runtime URL, including sheets named by the animation manifest. */
export const campBackgroundUrl = new URL(
  "./environment/camp/runtime/base-camp-v3.webp",
  import.meta.url,
).href;
export const splashUrl = new URL(
  "./screens/splash/runtime/splash.webp",
  import.meta.url,
).href;
export const marineManifestUrl = new URL(
  "./characters/marine/runtime/marine-v005-r3.json",
  import.meta.url,
).href;
const sheets = import.meta.glob(
  "./characters/marine/runtime/*-v005-r3-*.webp",
  {
    query: "?url",
    import: "default",
    eager: true,
  },
) as Record<string, string>;
export function marineSheetUrl(name: string): string {
  const url = sheets[`./characters/marine/runtime/${name}`];
  if (!url) throw new Error(`Missing marine animation sheet: ${name}`);
  return url;
}
