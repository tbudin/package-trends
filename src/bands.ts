import type { DownloadPoint } from "./types.js";

export interface Band {
  /** The day the bucket ends on. */
  day: string;
  low: number;
  mean: number;
  high: number;
  /** Days that went into the bucket. */
  days: number;
}

/**
 * Buckets a daily series into periods and reports each one's low, mean and
 * high.
 *
 * This is the honest form of what a candlestick would show. Download counts
 * have no open and no close — there is one number a day — so borrowing the
 * price-series idiom would mean inventing two of its four values. A band keeps
 * the part that is real: how wide the period's spread was, and where the
 * middle sat.
 *
 * Buckets are measured back from the most recent day so the latest is always
 * whole; an incomplete oldest bucket is dropped, as it would read as a
 * collapse rather than as a short period.
 */
export function toBands(points: readonly DownloadPoint[], size = 7): Band[] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`toBands size must be a positive integer, got ${size}`);
  }

  const bands: Band[] = [];

  for (let end = points.length; end - size >= 0; end -= size) {
    const bucket = points.slice(end - size, end);
    let low = bucket[0]!.downloads;
    let high = bucket[0]!.downloads;
    let sum = 0;

    for (const point of bucket) {
      if (point.downloads < low) low = point.downloads;
      if (point.downloads > high) high = point.downloads;
      sum += point.downloads;
    }

    bands.push({
      day: bucket[bucket.length - 1]!.day,
      low,
      high,
      mean: sum / bucket.length,
      days: bucket.length,
    });
  }

  return bands.reverse();
}
