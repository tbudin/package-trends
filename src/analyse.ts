import { applyGaps, type GapPolicy } from "./gaps.js";
import { movingAverage, toWeekly } from "./series.js";
import type { DownloadPoint, DownloadRange } from "./types.js";

export interface AnalyseOptions {
  /**
   * What to do with the zeros npm reports for days it has no data for.
   * `"fill"` (the default) interpolates them; `"zero"` takes them literally,
   * which will understate the mean and scramble the weekday profile.
   */
  gaps?: GapPolicy;
}

export interface Fit {
  /** Downloads gained per day, by least squares. */
  slope: number;
  intercept: number;
  /**
   * How much of the movement a straight line explains, 0–1. This is the field
   * to gate a sentence on: below about 0.3 the series is noise around a level
   * and "downloads are rising" is not a claim the data supports.
   */
  rSquared: number;
}

export interface WeekdayProfile {
  /** 0 is Sunday, 6 is Saturday, in UTC — the days npm reports in. */
  weekday: number;
  mean: number;
  /** This weekday's share of all downloads, 0–1. */
  share: number;
}

export interface Spike {
  day: string;
  downloads: number;
  /** How many standard deviations the day sits from the fitted line. */
  sigma: number;
}

export interface Streak {
  direction: "rising" | "falling";
  /** Whole weeks the direction has held, counting back from the latest. */
  weeks: number;
}

export interface Analysis {
  package: string;
  start: string;
  end: string;
  days: number;

  total: number;
  mean: number;
  median: number;
  latest: number;
  peak: DownloadPoint;
  trough: DownloadPoint;

  /**
   * Compound growth per week, from the first whole week to the last. Growth is
   * measured on weekly buckets rather than the first and last day, because a
   * series that happens to start on a Sunday would otherwise report a wild
   * figure that is only the weekend dip.
   */
  weeklyGrowth: number | null;
  /** `weeklyGrowth` compounded over 52 weeks. An extrapolation, not a forecast. */
  annualisedGrowth: number | null;
  /** Compound growth per day, derived from the weekly rate. */
  dailyGrowth: number | null;

  fit: Fit;
  direction: "rising" | "falling" | "flat";
  /** How far the fit supports the direction: `rSquared` banded for convenience. */
  confidence: "strong" | "moderate" | "weak";

  weekday: { mean: number; share: number };
  weekend: { mean: number; share: number };
  /** Weekend mean over weekday mean. Below ~0.5 reads as weekday-driven use. */
  weekendRatio: number;
  byWeekday: WeekdayProfile[];
  busiestWeekday: WeekdayProfile;
  quietestWeekday: WeekdayProfile;

  /**
   * Spread of the 7-day mean around its trend, as a fraction of the mean. The
   * weekly cycle is removed first, so this measures real unsteadiness rather
   * than the weekend.
   */
  volatility: number;
  /** Days more than two standard deviations off the fitted line, newest first. */
  spikes: Spike[];
  streak: Streak | null;

  weeks: DownloadPoint[];
  /**
   * Days npm reported no data for. Non-empty means the figures above rest on
   * interpolation for those days — worth saying out loud in any sentence
   * written from them.
   */
  gapDays: string[];
}

/**
 * Derives the figures you would need to write about a package's downloads
 * without looking at the chart.
 */
export function analyse(range: DownloadRange, options: AnalyseOptions = {}): Analysis {
  const repaired = applyGaps(range.points, options.gaps);
  const points = repaired.points;
  const values = points.map((p) => p.downloads);
  const total = values.reduce((sum, v) => sum + v, 0);
  const mean = total / points.length;

  let peak = points[0]!;
  let trough = points[0]!;
  for (const point of points) {
    if (point.downloads > peak.downloads) peak = point;
    if (point.downloads < trough.downloads) trough = point;
  }

  const weeks = toWeekly(points);
  const growth = compoundGrowth(weeks.map((w) => w.downloads));
  const fit = leastSquares(values);
  const direction = directionOf(fit, mean);

  const byWeekday = weekdayProfile(points, total);
  const weekdayDays = byWeekday.filter((d) => d.weekday >= 1 && d.weekday <= 5);
  const weekendDays = byWeekday.filter((d) => d.weekday === 0 || d.weekday === 6);

  const smoothed = movingAverage(points, 7).map((p) => p.downloads);

  return {
    package: range.package,
    start: range.start,
    end: range.end,
    days: points.length,

    total,
    mean,
    median: median(values),
    latest: values[values.length - 1]!,
    peak,
    trough,

    weeklyGrowth: growth,
    annualisedGrowth: growth === null ? null : Math.pow(1 + growth, 52) - 1,
    dailyGrowth: growth === null ? null : Math.pow(1 + growth, 1 / 7) - 1,

    fit,
    direction,
    confidence: fit.rSquared >= 0.6 ? "strong" : fit.rSquared >= 0.3 ? "moderate" : "weak",

    weekday: summariseDays(weekdayDays),
    weekend: summariseDays(weekendDays),
    weekendRatio: ratio(summariseDays(weekendDays).mean, summariseDays(weekdayDays).mean),
    byWeekday,
    busiestWeekday: extreme(byWeekday, (a, b) => a.mean > b.mean),
    quietestWeekday: extreme(byWeekday, (a, b) => a.mean < b.mean),

    volatility: smoothed.length > 1 ? spread(smoothed) : 0,
    spikes: findSpikes(points, fit),
    streak: streakOf(weeks),

    weeks,
    gapDays: repaired.gapDays,
  };
}

/** Compound growth per step across a series. `null` when it cannot be defined. */
function compoundGrowth(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0]!;
  const last = values[values.length - 1]!;
  // Growth from nothing is not a rate, and a negative base has no real root.
  if (first <= 0 || last < 0) return null;
  return Math.pow(last / first, 1 / (values.length - 1)) - 1;
}

function leastSquares(values: readonly number[]): Fit {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - meanX) * (values[i]! - meanY);
    sxx += (i - meanX) ** 2;
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (values[i]! - (intercept + slope * i)) ** 2;
    ssTot += (values[i]! - meanY) ** 2;
  }

  return { slope, intercept, rSquared: ssTot === 0 ? 0 : 1 - ssRes / ssTot };
}

function directionOf(fit: Fit, mean: number): "rising" | "falling" | "flat" {
  // A slope under a thousandth of the mean per day is a level series with noise.
  if (mean === 0 || Math.abs(fit.slope) / mean < 0.001) return "flat";
  return fit.slope > 0 ? "rising" : "falling";
}

function weekdayProfile(points: readonly DownloadPoint[], total: number): WeekdayProfile[] {
  const sums = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  for (const point of points) {
    const weekday = new Date(`${point.day}T00:00:00Z`).getUTCDay();
    const bucket = sums[weekday]!;
    bucket.sum += point.downloads;
    bucket.count += 1;
  }
  return sums.map((bucket, weekday) => ({
    weekday,
    mean: bucket.count === 0 ? 0 : bucket.sum / bucket.count,
    share: total === 0 ? 0 : bucket.sum / total,
  }));
}

function summariseDays(days: readonly WeekdayProfile[]): { mean: number; share: number } {
  const present = days.filter((d) => d.mean > 0 || d.share > 0);
  const source = present.length > 0 ? present : days;
  return {
    mean: source.reduce((sum, d) => sum + d.mean, 0) / (source.length || 1),
    share: days.reduce((sum, d) => sum + d.share, 0),
  };
}

function findSpikes(points: readonly DownloadPoint[], fit: Fit): Spike[] {
  if (points.length < 4) return [];

  const residuals = points.map((point, i) => point.downloads - (fit.intercept + fit.slope * i));
  const sd = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
  if (sd === 0) return [];

  return points
    .map((point, i) => ({ day: point.day, downloads: point.downloads, sigma: residuals[i]! / sd }))
    .filter((spike) => Math.abs(spike.sigma) > 2)
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

function streakOf(weeks: readonly DownloadPoint[]): Streak | null {
  if (weeks.length < 2) return null;

  const rising = weeks[weeks.length - 1]!.downloads > weeks[weeks.length - 2]!.downloads;
  let count = 0;
  for (let i = weeks.length - 1; i > 0; i--) {
    const up = weeks[i]!.downloads > weeks[i - 1]!.downloads;
    if (up !== rising) break;
    count += 1;
  }

  return { direction: rising ? "rising" : "falling", weeks: count };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function spread(values: readonly number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function ratio(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

function extreme(
  items: readonly WeekdayProfile[],
  better: (a: WeekdayProfile, b: WeekdayProfile) => boolean,
): WeekdayProfile {
  let best = items[0]!;
  for (const item of items) if (better(item, best)) best = item;
  return best;
}
