import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
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
import {
  changeDirection,
  describeTrend,
  formatChange,
  formatCount,
  formatExact,
  type NumberFormat,
} from "./format.js";
import type { ShapeOptions } from "./series.js";
import type { DownloadPoint, DownloadRange, Period, Trend } from "./types.js";

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
  /**
   * Follow the pointer, and take keyboard focus with arrow keys. The chart
   * draws a guide at the nearest point and reports it through `onActive`.
   */
  interactive?: boolean;
  /** Called with the index under the pointer, or `null` on the way out. */
  onActive?: (index: number | null) => void;
  /** Merged over the chart's own inline style. */
  style?: CSSProperties;
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
  interactive = false,
  onActive,
  style,
  className,
  ...geometry
}: SparklineProps) {
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const announce = useCallback(
    (index: number | null) => {
      setActive(index);
      onActive?.(index);
    },
    [onActive],
  );

  const kinds: MarkKind[] = mark ? [...mark] : dot ? ["last"] : [];
  const body =
    chart === "column"
      ? renderColumns(values, geometry, kinds, { stroke, fill, markColor, axis, axisColor })
      : renderLine(values, geometry, kinds, { stroke, strokeWidth, fill, markColor });

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0 || values.length === 0) return;
    const ratio = (event.clientX - box.left) / box.width;
    announce(clamp(Math.round(ratio * (values.length - 1)), 0, values.length - 1));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (values.length === 0) return;
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) {
      if (event.key === "Escape") announce(null);
      return;
    }
    event.preventDefault();
    announce(clamp((active ?? values.length - 1) + step, 0, values.length - 1));
  };

  const guide =
    interactive && active !== null ? renderGuide(active, values, chart, geometry, body, stroke) : null;

  const base: CSSProperties = fluid
    ? { display: "block", width: "100%", height: "auto" }
    : { display: "block", maxWidth: "100%", height: "auto" };

  return (
    <svg
      ref={svg}
      className={className}
      viewBox={`0 0 ${body.width} ${body.height}`}
      width={body.width}
      height={body.height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      tabIndex={interactive ? 0 : undefined}
      style={{ ...base, ...(interactive ? { touchAction: "none", cursor: "crosshair" } : null), ...style }}
      {...(interactive
        ? {
            onPointerMove,
            onPointerLeave: () => announce(null),
            // a touch that is interrupted sends cancel and no leave, which
            // would otherwise strand the guide where the finger lifted
            onPointerCancel: () => announce(null),
            onKeyDown,
            onBlur: () => announce(null),
          }
        : null)}
    >
      {label ? <title>{label}</title> : null}
      {body.nodes}
      {guide}
    </svg>
  );
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function renderGuide(
  index: number,
  values: readonly number[],
  chart: "line" | "column",
  geometry: SparklineOptions,
  body: { width: number; height: number },
  stroke: string,
) {
  const x =
    chart === "column"
      ? (index + 0.5) * (body.width / values.length)
      : values.length === 1
        ? body.width / 2
        : (index / (values.length - 1)) * body.width;

  const laid = chart === "column" ? null : sparkline(values, geometry);
  const y = laid?.points[index]?.[1];

  return (
    <g pointerEvents="none">
      <path d={`M${round(x)} 0V${body.height}`} stroke={stroke} strokeWidth={1} opacity={0.3} />
      {y === undefined ? null : <circle cx={round(x)} cy={round(y)} r={2.6} fill={stroke} />}
    </g>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
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

/**
 * Inline styles merged over each part's own. This is where font weight,
 * `display` and anything else typographic belongs — there is no separate prop
 * for each.
 */
export interface TrendStyles {
  root?: CSSProperties;
  count?: CSSProperties;
  change?: CSSProperties;
  label?: CSSProperties;
  chart?: CSSProperties;
}

export interface PackageTrendProps extends UsePackageTrendOptions, Omit<ChartProps, "label" | "style"> {
  /** The package name, scoped names included. */
  package: string;
  /** Default `"sparkline"`. */
  variant?: PackageTrendVariant;
  locale?: string;
  /** `Intl.NumberFormat` options merged over the defaults for the count. */
  numberFormat?: NumberFormat;
  /** `Intl.NumberFormat` options merged over the defaults for the change. */
  percentFormat?: NumberFormat;
  /**
   * Colours for the rise and fall figures. Unset, they inherit the surrounding
   * text colour, which is what keeps the component out of a host's palette.
   * The `data-direction` attribute is there either way, so CSS can do it
   * instead.
   */
  colors?: TrendColors;
  /** Inline styles per part: weight, display, spacing, anything. */
  styles?: TrendStyles;
  /**
   * The accessible name for the chart, replacing the sentence built from the
   * trend. A function receives the trend, so the name can still carry the
   * numbers.
   */
  label?: string | ((trend: Trend) => string);
  /** Called with the day under the pointer while `interactive`. */
  onActivePoint?: (point: DownloadPoint | null) => void;
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
  numberFormat,
  percentFormat,
  colors,
  styles,
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
  interactive,
  onActive,
  onActivePoint,
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleActive = useCallback(
    (index: number | null) => {
      setActiveIndex(index);
      onActive?.(index);
    },
    [onActive],
  );

  const trend = state.trend;
  // the drawn series is shaped, so the day under the pointer is read off it
  const activePoint =
    trend && activeIndex !== null ? (trend.shapedPoints[activeIndex] ?? null) : null;

  useEffect(() => {
    onActivePoint?.(activePoint);
  }, [activePoint, onActivePoint]);

  if (children) return <>{children(state)}</>;
  if (state.error) return <>{renderError ? renderError(state.error) : null}</>;

  if (!trend) {
    // A block at the chart's size, so nothing moves when the data lands.
    return (
      <span
        className={join("pt-loading", className)}
        style={{ display: "inline-block", opacity: 0.5, ...styles?.root }}
      >
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

  const label =
    typeof labelProp === "function" ? labelProp(trend) : (labelProp ?? describeTrend(trend, locale));
  const direction = changeDirection(trend);
  const change = formatChange(trend.changeRatio, locale, percentFormat);

  // while the pointer is on a day, the headline shows that day
  const headline = activePoint
    ? formatCount(activePoint.downloads, locale, numberFormat)
    : formatCount(trend.total, locale, numberFormat);
  const headlineTitle = activePoint
    ? `${activePoint.day}: ${formatExact(activePoint.downloads, locale)}`
    : `${formatExact(trend.total, locale)} downloads`;

  const changeStyle: CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    color: colors?.[direction],
    ...styles?.change,
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
      interactive={interactive}
      onActive={handleActive}
      style={styles?.chart}
      {...geometry}
    />
  );

  if (variant === "sparkline") {
    return (
      <span
        className={join("pt-sparkline", className)}
        style={{ display: "inline-block", maxWidth: "100%", ...styles?.root }}
      >
        {chartNode}
        {interactive ? <LiveRegion point={activePoint} locale={locale} /> : null}
      </span>
    );
  }

  if (variant === "text") {
    return (
      <span
        className={join("pt-text", className)}
        style={{ fontVariantNumeric: "tabular-nums", ...styles?.root }}
      >
        <span className="pt-count" style={styles?.count}>
          {headline}
        </span>{" "}
        downloads
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
    <div
      className={join("pt-kpi", className)}
      style={{ display: "flex", flexDirection: "column", gap: "0.25rem", ...styles?.root }}
    >
      <div
        className="pt-kpi-head"
        style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <span
          className="pt-count"
          style={{
            fontSize: "1.5em",
            fontWeight: 600,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            ...styles?.count,
          }}
          title={headlineTitle}
        >
          {headline}
        </span>
        {change ? (
          <span className="pt-change" data-direction={direction} style={changeStyle}>
            {change}
          </span>
        ) : null}
      </div>
      <div
        className="pt-kpi-label"
        style={{ opacity: 0.7, fontSize: "0.875em", ...styles?.label }}
      >
        {activePoint ? activePoint.day : trend.package}
      </div>
      {chartNode}
      <span style={VISUALLY_HIDDEN}>{label}</span>
      {interactive ? <LiveRegion point={activePoint} locale={locale} /> : null}
    </div>
  );
}

/** Announces the day under the pointer, which the chart itself cannot. */
function LiveRegion({ point, locale }: { point: DownloadPoint | null; locale?: string }) {
  return (
    <span aria-live="polite" style={VISUALLY_HIDDEN}>
      {point ? `${point.day}: ${formatExact(point.downloads, locale)} downloads` : ""}
    </span>
  );
}

const VISUALLY_HIDDEN: CSSProperties = {
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
};

function join(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export type { Domain, MarkKind, NumberFormat };
