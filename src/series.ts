import { applyGaps, type GapPolicy } from "./gaps.js";
import type { DownloadPoint, DownloadRange } from "./types.js";

/**
 * Trailing mean over `window` points.
 *
 * npm's daily counts swing hard across the week — a weekday can be three times
 * its neighbouring Sunday — so a raw daily series draws as a comb rather than a
 * trend. A 7-point mean is what makes a daily sparkline readable.
 *
 * The leading points that have no full window are dropped, so the series gets
 * shorter by `window - 1`. Pass `partial: true` to keep them, averaged over
 * however many points exist, which keeps the length but leaves the left edge
 * noisy.
 */
export function movingAverage(
  points: readonly DownloadPoint[],
  window: number,
  options: { partial?: boolean } = {},
): DownloadPoint[] {
  if (!Number.isInteger(window) || window < 1) {
    throw new RangeError(`movingAverage window must be a positive integer, got ${window}`);
  }
  if (window === 1) return points.slice();

  const out: DownloadPoint[] = [];
  let sum = 0;

  for (let i = 0; i < points.length; i++) {
    sum += points[i]!.downloads;
    if (i >= window) sum -= points[i - window]!.downloads;

    const span = Math.min(i + 1, window);
    if (span < window && !options.partial) continue;

    out.push({ day: points[i]!.day, downloads: sum / span });
  }

  return out;
}

/**
 * Sums the series into 7-day buckets, each labelled with the day it ends on.
 *
 * Buckets are measured back from the most recent day so the latest one is
 * always whole; an incomplete oldest bucket is dropped rather than shown as a
 * short week, which would read as a collapse in downloads.
 */
export function toWeekly(points: readonly DownloadPoint[]): DownloadPoint[] {
  const weeks: DownloadPoint[] = [];

  for (let end = points.length; end - 7 >= 0; end -= 7) {
    const bucket = points.slice(end - 7, end);
    weeks.push({
      day: bucket[bucket.length - 1]!.day,
      downloads: bucket.reduce((total, point) => total + point.downloads, 0),
    });
  }

  return weeks.reverse();
}

/**
 * Sums the series into calendar months.
 *
 * A month that the series only partly covers is dropped at either end: a
 * three-day stub shown beside whole months reads as a collapse in downloads
 * rather than as a short period.
 */
export function toMonthly(points: readonly DownloadPoint[]): DownloadPoint[] {
  if (points.length === 0) return [];

  const buckets = new Map<string, { sum: number; last: string; days: number }>();
  for (const point of points) {
    const key = point.day.slice(0, 7);
    const bucket = buckets.get(key) ?? { sum: 0, last: point.day, days: 0 };
    bucket.sum += point.downloads;
    bucket.last = point.day;
    bucket.days += 1;
    buckets.set(key, bucket);
  }

  const keys = [...buckets.keys()].sort();
  const whole = keys.filter((key) => buckets.get(key)!.days === daysInMonth(key));

  // Nothing whole (a short range inside one month): keep what there is rather
  // than returning an empty chart.
  const chosen = whole.length > 0 ? whole : keys;
  return chosen.map((key) => ({ day: buckets.get(key)!.last, downloads: buckets.get(key)!.sum }));
}

function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}

export type Aggregate = "day" | "week" | "month";

export interface ShapeOptions {
  /**
   * What to do with the zeros npm reports for days it has no data for.
   * `"fill"` (the default) interpolates them; `"zero"` takes them literally.
   */
  gaps?: GapPolicy;
  /**
   * `"week"` sums into 7-day buckets measured back from the latest day;
   * `"month"` sums into calendar months, dropping partial ones at either end.
   * Default `"day"`.
   */
  aggregate?: Aggregate;
  /**
   * Trailing-mean window applied to daily points. Default 7 for `"day"`, and
   * ignored for `"week"`, which has already absorbed the weekly cycle. Set 1
   * to leave the daily series raw.
   */
  smooth?: number;
}

/** Applies `aggregate` and `smooth` to a range's points. */
export function shapeSeries(range: DownloadRange, options: ShapeOptions = {}): DownloadPoint[] {
  const { aggregate = "day", smooth, gaps } = options;
  const points = applyGaps(range.points, gaps).points;

  if (aggregate === "month") {
    const monthly = toMonthly(points);
    return monthly.length > 0 ? monthly : points.slice();
  }

  if (aggregate === "week") {
    const weekly = toWeekly(points);
    // Too short to make even one whole week: fall back to the daily series
    // rather than rendering nothing.
    return weekly.length > 0 ? weekly : points.slice();
  }

  const window = smooth ?? 7;
  const smoothed = movingAverage(points, Math.max(1, window));
  // A window wider than the series leaves nothing; the raw points beat an empty chart.
  return smoothed.length > 0 ? smoothed : points.slice();
}
