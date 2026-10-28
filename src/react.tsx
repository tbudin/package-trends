import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchDownloads, type FetchDownloadsOptions } from "./api.js";
import { computeTrend } from "./trend.js";
import { sparkline, type SparklineOptions } from "./sparkline.js";
import {
  changeDirection,
  describeTrend,
  formatChange,
  formatCount,
  formatExact,
} from "./format.js";
import type { ShapeOptions } from "./series.js";
import type { DownloadRange, Period, Trend } from "./types.js";

export interface UsePackageTrendOptions extends ShapeOptions {
  /**
   * A range already fetched with `fetchDownloads`, typically on the server.
   * When it is set no request is made, so the component renders on the first
   * pass and every visitor costs nothing.
   */
  data?: DownloadRange;
  period?: Period;
  endpoint?: string;
  fetch?: FetchDownloadsOptions["fetch"];
}

export interface PackageTrendState {
  trend: Trend | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Resolves a package's download trend, fetching only when no `data` is given.
 *
 * `data` is deliberately left out of the effect's dependencies, so passing a
 * fresh object literal on every render cannot loop.
 */
export function usePackageTrend(name: string, options: UsePackageTrendOptions = {}): PackageTrendState {
  const { data, period = "last-month", aggregate, smooth, endpoint, fetch: fetchImpl } = options;
  const [fetched, setFetched] = useState<DownloadRange | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const provided = data !== undefined;

  useEffect(() => {
    if (provided) return;

    const controller = new AbortController();
    let active = true;

    fetchDownloads(name, { period, endpoint, fetch: fetchImpl, signal: controller.signal })
      .then((range) => {
        if (active) {
          setFetched(range);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active || (cause as { name?: string })?.name === "AbortError") return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [name, period, endpoint, fetchImpl, provided]);

  const range = data ?? fetched;
  const trend = useMemo(
    () => (range ? computeTrend(range, { aggregate, smooth }) : null),
    [range, aggregate, smooth],
  );

  return { trend, loading: range === null && error === null, error };
}

export interface SparklineProps extends SparklineOptions {
  values: readonly number[];
  /** Fill the container's width instead of sitting at the natural size. */
  fluid?: boolean;
  /** Read by a screen reader. Without one the chart is hidden from them. */
  label?: string;
  stroke?: string;
  strokeWidth?: number;
  /** A fill for the area under the line. Omitted by default. */
  fill?: string;
  /** Draws a dot on the most recent point. */
  dot?: boolean;
  className?: string;
}

/** A sparkline on its own, for your own markup around it. */
export function Sparkline({
  values,
  label,
  stroke = "currentColor",
  strokeWidth = 1.5,
  fill,
  dot = false,
  fluid = false,
  className,
  ...geometry
}: SparklineProps) {
  const line = sparkline(values, geometry);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${line.width} ${line.height}`}
      width={line.width}
      height={line.height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={
        fluid
          ? { display: "block", width: "100%", height: "auto" }
          : { display: "block", maxWidth: "100%", height: "auto" }
      }
    >
      {label ? <title>{label}</title> : null}
      {fill && line.area ? <path d={line.area} fill={fill} stroke="none" /> : null}
      <path
        d={line.path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot ? (
        <circle cx={line.last[0]} cy={line.last[1]} r={strokeWidth * 1.4} fill={stroke} />
      ) : null}
    </svg>
  );
}

export type PackageTrendVariant = "sparkline" | "text" | "kpi";

export interface PackageTrendProps extends UsePackageTrendOptions, SparklineOptions {
  /** The package name, scoped names included. */
  package: string;
  /** Default `"sparkline"`. */
  variant?: PackageTrendVariant;
  locale?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  dot?: boolean;
  /** Fill the container's width instead of sitting at the natural size. */
  fluid?: boolean;
  /**
   * The accessible name for the chart, replacing the sentence built from the
   * trend. A function receives the trend, so the name can still carry the
   * numbers.
   */
  label?: string | ((trend: Trend) => string);
  className?: string;
  /** Shown while fetching. Default a muted dash. */
  fallback?: ReactNode;
  /** Shown when the fetch fails. Default nothing, so a failure stays quiet. */
  renderError?: (error: Error) => ReactNode;
  /** Replaces the built-in markup entirely. */
  children?: (state: PackageTrendState) => ReactNode;
}

/**
 * A package's download trend, as a sparkline, a line of text, or a KPI block.
 *
 * Pass `data` from a server-side `fetchDownloads` to render without a request.
 */
export function PackageTrend({
  package: name,
  variant = "sparkline",
  locale,
  stroke,
  strokeWidth,
  fill,
  dot,
  fluid,
  label: labelProp,
  className,
  fallback,
  renderError,
  children,
  data,
  period,
  aggregate,
  smooth,
  endpoint,
  fetch: fetchImpl,
  ...geometry
}: PackageTrendProps) {
  const state = usePackageTrend(name, {
    data,
    period,
    aggregate,
    smooth,
    endpoint,
    fetch: fetchImpl,
  });

  if (children) return <>{children(state)}</>;

  if (state.error) return <>{renderError ? renderError(state.error) : null}</>;

  if (!state.trend) {
    return (
      <span className={join("pt-loading", className)} style={{ opacity: 0.5 }}>
        {fallback ?? "—"}
      </span>
    );
  }

  const trend = state.trend;
  const label =
    typeof labelProp === "function"
      ? labelProp(trend)
      : (labelProp ?? describeTrend(trend, locale));
  const chart = (
    <Sparkline
      values={trend.values}
      label={variant === "sparkline" ? label : undefined}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      dot={dot}
      fluid={fluid}
      {...geometry}
    />
  );

  if (variant === "sparkline") {
    return <span className={join("pt-sparkline", className)} style={{ display: "inline-block" }}>{chart}</span>;
  }

  const change = formatChange(trend.changeRatio, locale);
  const direction = changeDirection(trend);

  if (variant === "text") {
    return (
      <span className={join("pt-text", className)} style={{ fontVariantNumeric: "tabular-nums" }}>
        <span className="pt-count">{formatCount(trend.total, locale)}</span> downloads
        {change ? (
          <>
            {" "}
            <span className="pt-change" data-direction={direction}>
              {change}
            </span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <div
      className={join("pt-kpi", className)}
      style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
    >
      <div
        className="pt-kpi-head"
        style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <strong
          className="pt-count"
          style={{ fontSize: "1.5em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          title={`${formatExact(trend.total, locale)} downloads`}
        >
          {formatCount(trend.total, locale)}
        </strong>
        {change ? (
          <span
            className="pt-change"
            data-direction={direction}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {change}
          </span>
        ) : null}
      </div>
      <div className="pt-kpi-label" style={{ opacity: 0.7, fontSize: "0.875em" }}>
        {trend.package}
      </div>
      {chart}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          border: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function join(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
