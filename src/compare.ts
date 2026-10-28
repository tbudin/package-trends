import { applyGaps } from "./gaps.js";
import { shapeSeries, type ShapeOptions } from "./series.js";
import { computeTrend } from "./trend.js";
import type { DownloadPoint, DownloadRange, Trend } from "./types.js";

/**
 * How several packages are laid against each other.
 *
 * `"absolute"` puts every series on one shared scale, which is the literal
 * truth and the right choice when the packages are of a like size. When they
 * are not, it is close to useless: react at 24 million downloads a day and a
 * new package at ten thousand share a chart on which the smaller one is a flat
 * line along the floor, and nothing about its own growth is visible.
 *
 * `"indexed"` restates each series as a percentage of its own first value, so
 * the chart compares growth instead of size. Every line starts at 100 and what
 * you read is which package is pulling away.
 */
export type CompareScale = "absolute" | "indexed";

export interface Series {
  package: string;
  /** The values drawn, after shaping and any indexing. */
  values: number[];
  /** The shaped points, so a chart index names a day. */
  points: DownloadPoint[];
  /** Every figure for this package, always on the real numbers. */
  trend: Trend;
}

export interface Comparison {
  series: Series[];
  /** The shared y-range every series is drawn against. */
  domain: [number, number];
  scale: CompareScale;
  /**
   * Largest total over smallest. Above about 10 an absolute chart will flatten
   * the smaller packages, and `"indexed"` is the honest choice.
   */
  spread: number;
  /** The package with the most downloads over the period. */
  leader: string;
  /** Days any package was missing data for. */
  gapDays: string[];
}

export interface CompareOptions extends ShapeOptions {
  /** Default `"absolute"`. */
  scale?: CompareScale;
}

/**
 * Puts several packages on one scale.
 *
 * Ranges need not cover the same days; each is shaped on its own and the
 * domain spans them all. Series are returned in the order given.
 */
export function compare(ranges: readonly DownloadRange[], options: CompareOptions = {}): Comparison {
  if (ranges.length === 0) {
    throw new RangeError("compare() needs at least one range");
  }

  const { scale = "absolute", ...shape } = options;

  const series: Series[] = ranges.map((range) => {
    const shaped = shapeSeries(range, shape);
    const raw = shaped.map((point) => point.downloads);
    return {
      package: range.package,
      values: scale === "indexed" ? indexSeries(raw) : raw,
      points: shaped,
      trend: computeTrend(range, shape),
    };
  });

  let low = Infinity;
  let high = -Infinity;
  for (const one of series) {
    for (const value of one.values) {
      if (value < low) low = value;
      if (value > high) high = value;
    }
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    low = 0;
    high = 1;
  }

  const totals = series.map((one) => one.trend.total);
  const smallest = Math.min(...totals);
  const largest = Math.max(...totals);

  const gapDays = [...new Set(series.flatMap((one) => one.trend.gapDays))].sort();

  return {
    series,
    domain: [low, high],
    scale,
    spread: smallest === 0 ? Infinity : largest / smallest,
    leader: series[totals.indexOf(largest)]!.package,
    gapDays,
  };
}

/**
 * Restates a series as a percentage of its own first value, so series of very
 * different sizes can be compared on growth.
 *
 * The base is the first value above zero; a series that is zero throughout has
 * no base and is returned unchanged.
 */
export function indexSeries(values: readonly number[]): number[] {
  const base = values.find((value) => value > 0);
  if (base === undefined) return [...values];
  return values.map((value) => (value / base) * 100);
}

/**
 * Fetches several packages at once, asking for each distinct name only once.
 *
 * Every chart on a page costs a request, so a page comparing five packages in
 * three places would otherwise make fifteen.
 */
export async function fetchMany(
  names: readonly string[],
  fetchOne: (name: string) => Promise<DownloadRange>,
): Promise<DownloadRange[]> {
  const started = new Map<string, Promise<DownloadRange>>();
  for (const name of names) {
    if (!started.has(name)) started.set(name, fetchOne(name));
  }
  return Promise.all(names.map((name) => started.get(name)!));
}

/** Days every listed package has in common, for an exactly aligned chart. */
export function commonDays(ranges: readonly DownloadRange[]): string[] {
  if (ranges.length === 0) return [];
  const sets = ranges.map((range) => new Set(applyGaps(range.points).points.map((p) => p.day)));
  return [...sets[0]!].filter((day) => sets.every((set) => set.has(day))).sort();
}
