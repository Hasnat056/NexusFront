// Okabe-Ito palette — colorblind-safe categorical colors, assigned by index. Used wherever a
// chart needs to color by a real backend ID set (departments, etc.) that isn't a small fixed
// list known ahead of time.
const CATEGORY_PALETTE = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#56B4E9", "#CC79A7", "#F0E442", "#999999"];

export function colorForIndex(i: number): string {
  return CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
}

export function buildColorMap(ids: string[]): Map<string, string> {
  return new Map(ids.map((id, i) => [id, colorForIndex(i)]));
}
