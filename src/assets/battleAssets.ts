export const arenaBackgroundUrl = new URL(
  "./environment/arena/mars-arena-4k.png",
  import.meta.url,
).href;

const audio = import.meta.glob("./audio/runtime/*.mp3", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function battleAudioUrl(name: string): string | undefined {
  return audio[`./audio/runtime/${name}.mp3`];
}
