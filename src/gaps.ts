import type { DownloadPoint } from "./types.js";

export type GapPolicy = "fill" | "zero";

export interface GapReport {
  points: DownloadPoint[];
  /** The days that held no data, in order. */
  gapDays: string[];
}

/**
 * Repairs the zeros npm's downloads API reports for days it has no data for.
 *
 * The API does not distinguish "nobody installed this" from "not aggregated
 * yet": both come back as `0`. For a package doing millions a day those zeros
 * are plainly missing data — a real sample of `react` carried seven of them in
 * thirty days — and taken literally they drag the mean down, invert the
 * weekday profile, turn a flat month into a fall, and make the chart dive to
 * the floor.
 *
 * Interior gaps are filled by straight-line interpolation between the nearest
 * days that do have data. The array keeps its length and its day alignment, so
 * weekly buckets and weekday profiles stay correct. Leading and trailing gaps
 * have nothing to interpolate between and are dropped.
 *
 * A series that is zero throughout is left alone: that is a package nobody
 * installs, not a gap.
 */
export function fillGaps(points: readonly DownloadPoint[]): GapReport {
  const real = points.filter((point) => point.downloads > 0);
  if (real.length === 0 || real.length === points.length) {
    return { points: points.slice(), gapDays: [] };
  }

  const firstReal = points.findIndex((point) => point.downloads > 0);
  let lastReal = points.length - 1;
  while (points[lastReal]!.downloads === 0) lastReal -= 1;

  const inner = points.slice(firstReal, lastReal + 1);
  const gapDays: string[] = [];
  const filled = inner.map((point) => ({ ...point }));

  for (let i = 0; i < filled.length; i++) {
    if (filled[i]!.downloads > 0) continue;

    gapDays.push(filled[i]!.day);

    // inner[] starts and ends on a real value, so both neighbours exist
    let before = i - 1;
    while (inner[before]!.downloads === 0) before -= 1;
    let after = i + 1;
    while (inner[after]!.downloads === 0) after += 1;

    const step = (inner[after]!.downloads - inner[before]!.downloads) / (after - before);
    filled[i]!.downloads = Math.round(inner[before]!.downloads + step * (i - before));
  }

  // leading and trailing gaps are dropped, so report them too
  for (let i = 0; i < firstReal; i++) gapDays.unshift(points[i]!.day);
  for (let i = lastReal + 1; i < points.length; i++) gapDays.push(points[i]!.day);

  return { points: filled, gapDays };
}

/** Applies a gap policy, defaulting to `"fill"`. */
export function applyGaps(points: readonly DownloadPoint[], policy: GapPolicy = "fill"): GapReport {
  return policy === "zero" ? { points: points.slice(), gapDays: [] } : fillGaps(points);
}
