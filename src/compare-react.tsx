import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { fetchDownloads, type FetchDownloadsOptions } from "./api.js";
import { asError, derive } from "./error.js";
import { compare, fetchMany, type CompareScale, type Comparison } from "./compare.js";
import { changeDirection, formatChange, formatCount, type NumberFormat } from "./format.js";
import type { ShapeOptions } from "./series.js";
import { sparkline } from "./sparkline.js";
import { Sparkline, type ChartProps } from "./react.js";
import type { DownloadRange, Period } from "./types.js";

/**
 * Six hues of near-equal lightness, so they hold up on a light or a dark
 * ground and none of them disappears first.
 */
export const SERIES_COLORS = ["#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#eab308", "#ec4899"];

/**
 * A dash per series, so the lines stay apart in print, in monochrome, and for
 * a reader who cannot rely on hue. Colour alone is never the only difference.
 */
export const SERIES_DASHES = ["", "5 3", "2 2", "7 2 2 2", "1 3", "6 2 1 2"];

export interface UseComparisonOptions extends ShapeOptions {
  /** Ranges already fetched. When set, nothing is requested. */
  data?: readonly DownloadRange[];
  period?: Period;
  scale?: CompareScale;
  endpoint?: string;
  fetch?: FetchDownloadsOptions["fetch"];
}

export interface ComparisonState {
  comparison: Comparison | null;
  loading: boolean;
  error: Error | null;
}

/** Fetches several packages at once and puts them on one scale. */
export function usePackageComparison(
  names: readonly string[],
  options: UseComparisonOptions = {},
): ComparisonState {
  const {
    data,
    period = "last-month",
    scale = "absolute",
    aggregate,
    smooth,
    gaps,
    endpoint,
    fetch: fetchImpl,
  } = options;

  const [fetched, setFetched] = useState<DownloadRange[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const provided = data !== undefined;
  const key = names.join("\u0000");

  useEffect(() => {
    if (provided) return;

    const controller = new AbortController();
    let active = true;

    fetchMany(key.split("\u0000"), (name) =>
      fetchDownloads(name, { period, endpoint, fetch: fetchImpl, signal: controller.signal }),
    )
      .then((ranges) => {
        if (active) {
          setFetched(ranges);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active || (cause as { name?: string })?.name === "AbortError") return;
        setError(asError(cause));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, period, endpoint, fetchImpl, provided]);

  const ranges = data ?? fetched;
  const derived = useMemo(
    () =>
      ranges && ranges.length > 0
        ? derive(() => compare(ranges, { scale, aggregate, smooth, gaps }))
        : null,
    [ranges, scale, aggregate, smooth, gaps],
  );

  return {
    comparison: derived?.value ?? null,
    loading: ranges === null && error === null,
    error: error ?? derived?.error ?? null,
  };
}

export interface PackageComparisonProps
  extends UseComparisonOptions,
    Omit<ChartProps, "label" | "style" | "values"> {
  /** The packages to compare, in the order they should be listed. */
  packages: readonly string[];
  /** `"chart"` overlays the series; `"table"` gives each its own row. */
  variant?: "chart" | "table";
  locale?: string;
  numberFormat?: NumberFormat;
  percentFormat?: NumberFormat;
  /** One colour per series, cycled. */
  colors?: readonly string[];
  /** One dash per series, cycled. Pass `[]` to draw them all solid. */
  dashes?: readonly string[];
  /** Default true for the chart variant. */
  legend?: boolean;
  /**
   * Put the table's rows on one shared scale. Off by default: in a table the
   * totals column already carries the magnitude, so a shared scale only
   * flattens every row but the largest into a straight line, and the shape —
   * which is the one thing the sparkline is there for — is lost. The chart
   * variant always shares a scale, because overlaying is the point.
   */
  sharedDomain?: boolean;
  styles?: { root?: CSSProperties; legend?: CSSProperties; table?: CSSProperties };
  fallback?: ReactNode;
  renderError?: (error: Error) => ReactNode;
  children?: (state: ComparisonState) => ReactNode;
}

/**
 * Several packages against each other, as one overlaid chart or as a row each.
 *
 * On `scale="absolute"` the series share a y-range, which only reads when the
 * packages are of a like size; `spread` on the comparison says when they are
 * not, and `"indexed"` then compares growth instead.
 */
export function PackageComparison({
  packages,
  variant = "chart",
  locale,
  numberFormat,
  percentFormat,
  colors = SERIES_COLORS,
  dashes = SERIES_DASHES,
  legend,
  sharedDomain = false,
  styles,
  fallback,
  renderError,
  children,
  data,
  period,
  scale,
  aggregate,
  smooth,
  gaps,
  endpoint,
  fetch: fetchImpl,
  className,
  ...chart
}: PackageComparisonProps) {
  const state = usePackageComparison(packages, {
    data,
    period,
    scale,
    aggregate,
    smooth,
    gaps,
    endpoint,
    fetch: fetchImpl,
  });

  if (children) return <>{children(state)}</>;
  if (state.error) return <>{renderError ? renderError(state.error) : null}</>;

  if (!state.comparison) {
    return (
      <div className={join("pt-compare", "pt-loading", className)} style={{ opacity: 0.5, ...styles?.root }}>
        {fallback ?? (
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: chart.width ?? 260,
              height: chart.height ?? 48,
              maxWidth: "100%",
              borderRadius: 4,
              background: "currentColor",
              opacity: 0.12,
            }}
          />
        )}
      </div>
    );
  }

  const { comparison } = state;
  const paint = (index: number) => ({
    color: colors[index % colors.length] ?? "currentColor",
    dash: dashes.length === 0 ? undefined : dashes[index % dashes.length] || undefined,
  });

  if (variant === "table") {
    return (
      <table
        className={join("pt-compare", "pt-compare-table", className)}
        style={{ borderCollapse: "collapse", width: "100%", ...styles?.root, ...styles?.table }}
      >
        <tbody>
          {comparison.series.map((series, index) => {
            const { color, dash } = paint(index);
            const direction = changeDirection(series.trend);
            return (
              <tr key={series.package}>
                <th scope="row" style={{ textAlign: "left", fontWeight: 500, paddingRight: "0.75em" }}>
                  {series.package}
                </th>
                <td style={{ width: "40%" }}>
                  <Sparkline
                    values={series.values}
                    domain={sharedDomain ? comparison.domain : (chart.domain ?? "auto")}
                    stroke={color}
                    strokeDasharray={dash}
                    label={`${series.package}, ${formatCount(series.trend.total, locale, numberFormat)} downloads`}
                    {...chart}
                  />
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCount(series.trend.total, locale, numberFormat)}
                </td>
                <td
                  className="pt-change"
                  data-direction={direction}
                  style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", paddingLeft: "0.75em" }}
                >
                  {formatChange(series.trend.changeRatio, locale, percentFormat)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  const width = typeof chart.width === "number" ? chart.width : 260;
  const height = typeof chart.height === "number" ? chart.height : 60;
  const label = comparison.series
    .map((s) => `${s.package} ${formatCount(s.trend.total, locale, numberFormat)}`)
    .join("; ");

  return (
    <div className={join("pt-compare", className)} style={styles?.root}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={chart.width ?? width}
        height={chart.height ?? height}
        role="img"
        aria-label={`Downloads compared: ${label}`}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      >
        <title>{`Downloads compared: ${label}`}</title>
        {comparison.series.map((series, index) => {
          const { color, dash } = paint(index);
          const line = sparkline(series.values, {
            width,
            height,
            domain: comparison.domain,
            curve: chart.curve,
          });
          return (
            <path
              key={series.package}
              d={line.path}
              fill="none"
              stroke={color}
              strokeWidth={chart.strokeWidth ?? 1.5}
              strokeDasharray={dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      {legend === false ? null : (
        <ul
          className="pt-legend"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35em 1em",
            listStyle: "none",
            margin: "0.5em 0 0",
            padding: 0,
            fontSize: "0.875em",
            ...styles?.legend,
          }}
        >
          {comparison.series.map((series, index) => {
            const { color, dash } = paint(index);
            return (
              <li key={series.package} style={{ display: "flex", alignItems: "center", gap: "0.4em" }}>
                <svg width="18" height="8" aria-hidden="true" style={{ flex: "none" }}>
                  <path
                    d="M0 4H18"
                    stroke={color}
                    strokeWidth={1.75}
                    strokeDasharray={dash}
                    strokeLinecap="round"
                  />
                </svg>
                {series.package}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function join(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
