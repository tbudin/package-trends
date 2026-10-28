import type { Trend } from "./types.js";

/**
 * Overrides merged over the defaults. Anything `Intl.NumberFormat` accepts
 * works, so a different notation, more decimal places, or a currency are all
 * reachable without this package inventing its own vocabulary.
 */
export type NumberFormat = Intl.NumberFormatOptions;

const COUNT_DEFAULTS: Intl.NumberFormatOptions = {
  notation: "compact",
  maximumFractionDigits: 1,
};

/** `1234567` becomes `1.2M`. Rounded counts, for a KPI block or a label. */
export function formatCount(value: number, locale?: string, format?: NumberFormat): string {
  return new Intl.NumberFormat(locale, { ...COUNT_DEFAULTS, ...format }).format(Math.round(value));
}

/** `1234567` becomes `1,234,567`. */
export function formatExact(value: number, locale?: string, format?: NumberFormat): string {
  return new Intl.NumberFormat(locale, format).format(Math.round(value));
}

/**
 * `0.124` becomes `+12%`, and a null ratio becomes an empty string. The sign is
 * always shown, because the direction is the whole point of the number.
 */
export function formatChange(ratio: number | null, locale?: string, format?: NumberFormat): string {
  if (ratio === null || !Number.isFinite(ratio)) return "";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    signDisplay: "exceptZero",
    // a big move needs no decimal; a small one is nothing without it
    maximumFractionDigits: ratio >= 0.1 || ratio <= -0.1 ? 0 : 1,
    ...format,
  }).format(ratio);
}

/** `"up"`, `"down"` or `"flat"`, for colouring or an arrow. */
export function changeDirection(trend: Pick<Trend, "change">): "up" | "down" | "flat" {
  if (trend.change === null || trend.change === 0) return "flat";
  return trend.change > 0 ? "up" : "down";
}

/** `0` becomes `Sunday`, in whatever locale you pass. */
export function formatWeekday(weekday: number, locale?: string, style: "long" | "short" = "long"): string {
  // 2026-11-01 was a Sunday, so adding the index lands on the right day.
  const date = new Date(Date.UTC(2026, 10, 1 + weekday));
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(date);
}

/**
 * A sentence a screen reader can read in place of the chart, since a sparkline
 * carries nothing a non-sighted reader can use.
 */
export function describeTrend(trend: Trend, locale?: string): string {
  const total = `${formatExact(trend.total, locale)} downloads for ${trend.package} between ${trend.start} and ${trend.end}`;
  const change = formatChange(trend.changeRatio, locale);
  if (!change) return `${total}.`;
  const direction = changeDirection(trend) === "down" ? "down" : "up";
  return `${total}, ${direction} ${change.replace(/^[+−-]/, "")} against the half before.`;
}
