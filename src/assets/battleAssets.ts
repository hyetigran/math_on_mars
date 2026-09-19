export const arenaBackgroundUrl = new URL(
  "./environment/arena/mars-arena-4k.png",
  import.meta.url,
).href;

const audio = import.meta.glob(
  ["./audio/runtime/*.mp3", "!./audio/runtime/*_0[2-4].mp3"],
  {
    query: "?url",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

export function battleAudioUrl(name: string): string | undefined {
  return audio[`./audio/runtime/${name}.mp3`];
}

export const gameAudioNames = Object.keys(audio).map((path) =>
  path
    .split("/")
    .at(-1)!
    .replace(/\.mp3$/, ""),
);
