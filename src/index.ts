export { fetchDownloads, normaliseRange, NPM_DOWNLOADS_ENDPOINT } from "./api.js";
export type { FetchDownloadsOptions } from "./api.js";

export { PackageTrendsError } from "./error.js";

export { movingAverage, toWeekly, shapeSeries } from "./series.js";
export type { Aggregate, ShapeOptions } from "./series.js";

export { computeTrend } from "./trend.js";

export { sparkline, sparklineSvg } from "./sparkline.js";
export type { Sparkline, SparklineOptions, SparklineSvgOptions } from "./sparkline.js";

export {
  formatCount,
  formatExact,
  formatChange,
  changeDirection,
  describeTrend,
} from "./format.js";

export type { DownloadPoint, DownloadRange, Period, Trend } from "./types.js";
