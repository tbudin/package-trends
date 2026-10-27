/** A period the npm downloads API accepts, or an explicit `YYYY-MM-DD:YYYY-MM-DD` range. */
export type Period =
  | "last-day"
  | "last-week"
  | "last-month"
  | "last-year"
  | (string & {});

export interface DownloadPoint {
  /** `YYYY-MM-DD`. */
  day: string;
  downloads: number;
}

/** A normalised download series, as returned by `fetchDownloads`. JSON-serialisable. */
export interface DownloadRange {
  package: string;
  start: string;
  end: string;
  points: DownloadPoint[];
}

export interface Trend {
  package: string;
  start: string;
  end: string;
  /** Downloads across the whole series. */
  total: number;
  /** Mean downloads per point. */
  average: number;
  /** The most recent point's downloads. */
  latest: number;
  peak: DownloadPoint;
  trough: DownloadPoint;
  /**
   * Recent half minus earlier half. `null` when the series is too short to
   * split (fewer than two points).
   */
  change: number | null;
  /**
   * `change` as a ratio of the earlier half: 0.25 is a 25% rise. `null` when
   * the series is too short to split, or the earlier half had no downloads at
   * all, in which case a ratio would be meaningless rather than infinite.
   */
  changeRatio: number | null;
  /**
   * The shaped series a sparkline draws: aggregated and smoothed per
   * `ShapeOptions`, so it is shorter than `points` and its numbers are means
   * rather than counts. Never sum it; the figures above are the real ones.
   */
  values: number[];
  /** The raw daily series every figure above is computed from. */
  points: DownloadPoint[];
}
