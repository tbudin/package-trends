import { applyGaps } from "./gaps.js";
import { shapeSeries, type ShapeOptions } from "./series.js";
import type { DownloadPoint, DownloadRange, Trend } from "./types.js";

/**
 * Derives totals, extremes and the period-over-period change from a range.
 *
 * Every figure is computed from the raw daily series, never from the shaped
 * one: smoothing drops the leading points and averages the rest, so a total
 * summed from smoothed values would understate the real download count. The
 * shaped series is used for `values` alone, which is what gets drawn.
 *
 * The change compares the recent half of the raw series against the half
 * before it. The two halves are always the same length, so on an odd number of
 * points the oldest one is left out rather than giving the recent half an extra
 * point and a bias to match.
 */
export function computeTrend(range: DownloadRange, options: ShapeOptions = {}): Trend {
  const repaired = applyGaps(range.points, options.gaps);
  const points = repaired.points;

  let total = 0;
  let peak = points[0]!;
  let trough = points[0]!;
  for (const point of points) {
    total += point.downloads;
    if (point.downloads > peak.downloads) peak = point;
    if (point.downloads < trough.downloads) trough = point;
  }

  const { change, changeRatio } = splitChange(points);

  return {
    package: range.package,
    start: range.start,
    end: range.end,
    total,
    average: total / points.length,
    latest: points[points.length - 1]!.downloads,
    peak,
    trough,
    change,
    changeRatio,
    values: shapeSeries(range, options).map((point) => point.downloads),
    points,
    gapDays: repaired.gapDays,
  };
}

function splitChange(points: readonly DownloadPoint[]): {
  change: number | null;
  changeRatio: number | null;
} {
  if (points.length < 2) return { change: null, changeRatio: null };

  const half = Math.floor(points.length / 2);
  const recentFrom = points.length - half;
  const earlierFrom = recentFrom - half;

  let earlier = 0;
  for (let i = earlierFrom; i < recentFrom; i++) earlier += points[i]!.downloads;
  let recent = 0;
  for (let i = recentFrom; i < points.length; i++) recent += points[i]!.downloads;

  const change = recent - earlier;

  // A rise from nothing has no meaningful ratio, so the absolute change stands alone.
  return { change, changeRatio: earlier === 0 ? null : change / earlier };
}
