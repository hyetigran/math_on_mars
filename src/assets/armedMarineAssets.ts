import manifest from "./characters/marine/armed/runtime/manifest.json";
export const armedMarineAnimations = manifest;
const sheets = import.meta.glob("./characters/marine/armed/runtime/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
export function armedMarineUrl(key: string): string {
  const url = sheets[`./characters/marine/armed/runtime/${key}.webp`];
  if (!url) throw new Error(`Missing armed marine sheet: ${key}`);
  return url;
}
