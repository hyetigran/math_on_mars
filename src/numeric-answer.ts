export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function fraction(n: number, d = 1): [number, number] {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return [(n / g) * sign, Math.abs(d) / g];
}

export function parseNumericAnswer(value: string): [number, number] | null {
  const clean = value.trim();
  if (!clean || clean.length > 18) return null;
  if (/^-?\d+\/\d+$/.test(clean)) {
    const [n, d] = clean.split("/").map(Number);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
      return null;
    return fraction(n, d);
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(clean)) {
    const negative = clean.startsWith("-");
    const unsigned = negative ? clean.slice(1) : clean;
    const [whole, decimals = ""] = unsigned.split(".");
    const d = 10 ** decimals.length;
    const n = Number(whole || 0) * d + Number(decimals || 0);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) return null;
    return fraction(negative ? -n : n, d);
  }
  return null;
}

export function isCorrect(value: string, expected: [number, number]): boolean {
  const parsed = parseNumericAnswer(value);
  return !!parsed && parsed[0] * expected[1] === expected[0] * parsed[1];
}
