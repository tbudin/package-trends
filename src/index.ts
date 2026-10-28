export { fetchDownloads, normaliseRange, between, NPM_DOWNLOADS_ENDPOINT } from "./api.js";
export type { FetchDownloadsOptions } from "./api.js";

export { PackageTrendsError } from "./error.js";

export { movingAverage, toWeekly, toMonthly, shapeSeries } from "./series.js";
export type { Aggregate, ShapeOptions } from "./series.js";

export { computeTrend } from "./trend.js";

export { sparkline, sparklineSvg, columns, marksFor, scaleFor } from "./sparkline.js";
export type {
  Column,
  Columns,
  ColumnsOptions,
  Domain,
  Mark,
  MarkKind,
  Scale,
  Sparkline,
  SparklineOptions,
  SparklineSvgOptions,
} from "./sparkline.js";

export { analyse } from "./analyse.js";
export type { Analysis, AnalyseOptions, Fit, Spike, Streak, WeekdayProfile } from "./analyse.js";

export { fillGaps, applyGaps } from "./gaps.js";
export type { GapPolicy, GapReport } from "./gaps.js";

export {
  formatCount,
  formatExact,
  formatChange,
  changeDirection,
  describeTrend,
  formatWeekday,
} from "./format.js";
export type { NumberFormat } from "./format.js";

export type { DownloadPoint, DownloadRange, Period, Trend } from "./types.js";
