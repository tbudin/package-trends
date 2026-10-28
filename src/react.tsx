import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { fetchDownloads, type FetchDownloadsOptions } from "./api.js";
import { computeTrend } from "./trend.js";
import {
  columns as layOutColumns,
  marksFor,
  sparkline,
  type Domain,
  type MarkKind,
  type SparklineOptions,
} from "./sparkline.js";
import { changeDirection, describeTrend, formatChange, formatCount, formatExact } from "./format.js";
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
  const { data, period = "last-month", aggregate, smooth, gaps, endpoint, fetch: fetchImpl } = options;
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
    () => (range ? computeTrend(range, { aggregate, smooth, gaps }) : null),
    [range, aggregate, smooth, gaps],
  );

  return { trend, loading: range === null && error === null, error };
}

export interface ChartProps extends SparklineOptions {
  /** `"line"` (default) or `"column"`. */
  chart?: "line" | "column";
  /** Read by a screen reader. Without one the chart is hidden from them. */
  label?: string;
  stroke?: string;
  strokeWidth?: number;
  /** A fill for the area under the line, or for the bars. */
  fill?: string;
  /** Draws a dot on the most recent point. Shorthand for `mark={["last"]}`. */
  dot?: boolean;
  /** Points to call out. */
  mark?: readonly MarkKind[];
  /** A colour per mark kind. Anything unset uses `stroke`. */
  markColor?: Partial<Record<MarkKind, string>>;
  /** Draws a rule at zero when zero is inside the domain. */
  axis?: boolean;
  axisColor?: string;
  /** Fill the container's width instead of sitting at the natural size. */
  fluid?: boolean;
  className?: string;
}

export interface SparklineProps extends ChartProps {
  values: readonly number[];
}

/** A chart on its own, for your own markup around it. */
export function Sparkline({
  values,
  chart = "line",
  label,
  stroke = "currentColor",
  strokeWidth = 1.5,
  fill,
  dot = false,
  mark,
  markColor = {},
  axis = false,
  axisColor,
  fluid = false,
  className,
  ...geometry
}: SparklineProps) {
  const kinds: MarkKind[] = mark ? [...mark] : dot ? ["last"] : [];
  const body =
    chart === "column"
      ? renderColumns(values, geometry, kinds, { stroke, fill, markColor, axis, axisColor })
      : renderLine(values, geometry, kinds, { stroke, strokeWidth, fill, markColor });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${body.width} ${body.height}`}
      width={body.width}
      height={body.height}
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
      {body.nodes}
    </svg>
  );
}

function renderLine(
  values: readonly number[],
  geometry: SparklineOptions,
  kinds: readonly MarkKind[],
  paint: { stroke: string; strokeWidth: number; fill?: string; markColor: Partial<Record<MarkKind, string>> },
) {
  const line = sparkline(values, geometry);
  const nodes: ReactNode[] = [];

  if (paint.fill && line.area) {
    nodes.push(<path key="area" d={line.area} fill={paint.fill} stroke="none" />);
  }
  nodes.push(
    <path
      key="line"
      d={line.path}
      fill="none"
      stroke={paint.stroke}
      strokeWidth={paint.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
  );
  for (const m of marksFor(values, kinds)) {
    const [cx, cy] = line.points[m.index] ?? line.last;
    nodes.push(
      <circle
        key={`mark-${m.kind}`}
        cx={cx}
        cy={cy}
        r={paint.strokeWidth * 1.4}
        fill={paint.markColor[m.kind] ?? paint.stroke}
      />,
    );
  }

  return { nodes, width: line.width, height: line.height };
}

function renderColumns(
  values: readonly number[],
  geometry: SparklineOptions,
  kinds: readonly MarkKind[],
  paint: {
    stroke: string;
    fill?: string;
    markColor: Partial<Record<MarkKind, string>>;
    axis: boolean;
    axisColor?: string;
  },
) {
  const laid = layOutColumns(values, geometry);
  const marks = new Map(marksFor(values, kinds).map((m) => [m.index, m.kind]));
  const nodes: ReactNode[] = [];

  if (paint.axis && laid.zeroY !== null) {
    nodes.push(
      <path
        key="axis"
        d={`M0 ${laid.zeroY}H${laid.width}`}
        stroke={paint.axisColor ?? paint.stroke}
        strokeWidth={1}
        opacity={0.35}
      />,
    );
  }
  for (const column of laid.columns) {
    const kind = marks.get(column.index);
    nodes.push(
      <rect
        key={column.index}
        x={column.x}
        y={column.y}
        width={column.width}
        height={column.height}
        fill={(kind && paint.markColor[kind]) ?? paint.fill ?? paint.stroke}
        opacity={kind ? undefined : 0.85}
      />,
    );
  }

  return { nodes, width: laid.width, height: laid.height };
}

export type PackageTrendVariant = "sparkline" | "text" | "kpi";

/** Colours for the change figure. Anything unset inherits the surrounding text. */
export interface TrendColors {
  up?: string;
  down?: string;
  flat?: string;
}

export interface PackageTrendProps extends UsePackageTrendOptions, Omit<ChartProps, "label"> {
  /** The package name, scoped names included. */
  package: string;
  /** Default `"sparkline"`. */
  variant?: PackageTrendVariant;
  locale?: string;
  /**
   * Colours for the rise and fall figures. Unset, they inherit the surrounding
   * text colour, which is what keeps the component out of a host's palette.
   * The `data-direction` attribute is there either way, so CSS can do it
   * instead.
   */
  colors?: TrendColors;
  /**
   * The accessible name for the chart, replacing the sentence built from the
   * trend. A function receives the trend, so the name can still carry the
   * numbers.
   */
  label?: string | ((trend: Trend) => string);
  /** Shown while fetching. Default a block at the chart's size. */
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
  colors,
  chart,
  stroke,
  strokeWidth,
  fill,
  dot,
  mark,
  markColor,
  axis,
  axisColor,
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
  gaps,
  endpoint,
  fetch: fetchImpl,
  ...geometry
}: PackageTrendProps) {
  const state = usePackageTrend(name, {
    data,
    period,
    aggregate,
    smooth,
    gaps,
    endpoint,
    fetch: fetchImpl,
  });

  if (children) return <>{children(state)}</>;
  if (state.error) return <>{renderError ? renderError(state.error) : null}</>;

  if (!state.trend) {
    // A block at the chart's size, so nothing moves when the data lands.
    return (
      <span className={join("pt-loading", className)} style={{ display: "inline-block", opacity: 0.5 }}>
        {fallback ?? (
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: geometry.width ?? 120,
              height: geometry.height ?? 32,
              maxWidth: "100%",
              borderRadius: 4,
              background: "currentColor",
              opacity: 0.12,
            }}
          />
        )}
      </span>
    );
  }

  const trend = state.trend;
  const label =
    typeof labelProp === "function" ? labelProp(trend) : (labelProp ?? describeTrend(trend, locale));
  const direction = changeDirection(trend);
  const change = formatChange(trend.changeRatio, locale);
  const changeStyle: CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    color: colors?.[direction],
  };

  const chartNode = (
    <Sparkline
      values={trend.values}
      chart={chart}
      label={variant === "sparkline" ? label : undefined}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      dot={dot}
      mark={mark}
      markColor={markColor}
      axis={axis}
      axisColor={axisColor}
      fluid={fluid}
      {...geometry}
    />
  );

  if (variant === "sparkline") {
    return (
      <span className={join("pt-sparkline", className)} style={{ display: "inline-block", maxWidth: "100%" }}>
        {chartNode}
      </span>
    );
  }

  if (variant === "text") {
    return (
      <span className={join("pt-text", className)} style={{ fontVariantNumeric: "tabular-nums" }}>
        <span className="pt-count">{formatCount(trend.total, locale)}</span> downloads
        {change ? (
          <>
            {" "}
            <span className="pt-change" data-direction={direction} style={changeStyle}>
              {change}
            </span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <div className={join("pt-kpi", className)} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
          <span className="pt-change" data-direction={direction} style={changeStyle}>
            {change}
          </span>
        ) : null}
      </div>
      <div className="pt-kpi-label" style={{ opacity: 0.7, fontSize: "0.875em" }}>
        {trend.package}
      </div>
      {chartNode}
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

export type { Domain, MarkKind };
