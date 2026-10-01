// Original UI illustrations. All markup is static; server data never enters SVG.
const icons: Record<string, string> = {
  blocks:
    '<path fill="#e6ab76" d="M5 18 24 8l19 10-19 11Z"/><path fill="#ae694d" d="m5 18 19 11v15L5 33Z"/><path fill="#cf8d60" d="m24 29 19-11v15L24 44Z"/><path d="m14 14 19 11M14 23v15m19-14v15"/>',
  parts:
    '<path fill="#9ecad3" d="m19 5 10 0 2 7 7-1 5 9-5 5 3 7-8 6-6-4-6 5-8-5 2-7-6-4 3-10 8 1Z"/><circle cx="25" cy="23" r="7" fill="#496d7a"/>',
  credits:
    '<ellipse cx="24" cy="28" rx="17" ry="14" fill="#bd8034"/><circle cx="24" cy="22" r="17" fill="#ffd561"/><path fill="#fff1a2" d="m24 11 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/>',
  food: '<path fill="#77b95b" d="M23 20Q4 17 10 5q17-1 15 16Q26 4 41 9q0 15-17 15"/><path fill="#e6a152" d="M9 24q15-8 29 0L26 44q-4 3-7-1Z"/><path d="m13 30 9 2m-5 5 7 1"/>',
  build:
    '<path fill="#bc8152" d="m10 39 20-28 7 5-19 29Z"/><path fill="#c6e2df" d="m19 9 9-7 18 14-8 9Z"/>',
  practice:
    '<path fill="#efe1ae" d="M4 10q12-5 20 2 8-7 20-2v28q-12-4-20 2-8-6-20-2Z"/><path d="M24 12v28M10 18h8m-8 7h8m12-7h8m-8 7h8"/>',
  battle:
    '<path fill="#c6e2df" d="m8 4 9 3 24 30-5 5L10 14Z"/><path fill="#c6e2df" d="m40 4-9 3L7 37l5 5 26-28Z"/><path stroke="#edb850" stroke-width="5" d="m5 31 13 11m12 0 13-11"/>',
};
export function townIcon(name: string) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="#4e4638" stroke-width="2" stroke-linejoin="round">${icons[name] ?? icons.build}</svg>`;
}
export function buildingArt(
  house: boolean,
  level: number,
  constructing: boolean,
) {
  const building = house
    ? `<path fill="#e5c58e" d="m48 72 55 15v66l-55-20Z"/><path fill="#f8e3b9" d="m103 87 65-27v67l-65 26Z"/><path fill="#995c4c" d="m37 73 37-44 43 11-14 47Z"/><path fill="#c77857" d="m74 29 67-10 39 43-77 25Z"/><path fill="#486f73" d="m118 106 18-7v38l-18 7Z"/><path fill="#7bafb1" d="m57 89 17 5v20l-17-5Zm91-6 12-5v19l-12 5Z"/>${level > 1 ? '<path fill="#e6c58c" d="m77 35 0-28 19 5v30Z"/><path fill="#557b77" d="m73 9 15-9 15 15-10 4Z"/><path stroke="#527750" stroke-width="6" d="m53 125 32 10m62-20 17-6"/>' : ""}`
    : '<path fill="#77b5af" d="m40 91 63 23v40l-63-24Z"/><path fill="#a6d3c0" d="m103 114 78-33v43l-78 30Z"/><path fill="#c7e7df" d="m40 91 25-40 63-20 53 50-78 33Z"/><path fill="none" stroke="#eee3bc" stroke-width="5" d="m65 51 38 63v40m25-123 0 112m-50-90 0 92m-38-44 63 23 78-33m-14-13-75 32m-3-66 51 57"/><path fill="#6da35a" d="m48 123 46 17v9l-46-17Z"/>';
  return `<svg viewBox="0 0 220 180" aria-hidden="true" focusable="false" stroke="#695548" stroke-width="2" stroke-linejoin="round"><ellipse cx="111" cy="147" rx="85" ry="21" fill="#526646" opacity=".16" stroke="none"/><path fill="#9daa71" d="m18 129 94-39 94 37-96 44Z"/>${building}${constructing ? '<path stroke="#e6b260" stroke-width="5" fill="none" d="M32 142V61m151 66V49M32 77l151-23M32 105l151-25M32 132l151-25m-122 37V74m95 63V59"/>' : ""}</svg>`;
}
