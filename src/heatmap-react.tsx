import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import { fetchDownloads, type FetchDownloadsOptions } from "./api.js";
import { asError } from "./error.js";
import { formatCount, formatExact } from "./format.js";
import {
  heatmapGeometry,
  levelFill,
  type Heatmap,
  type HeatmapCell,
  type HeatmapOptions,
} from "./heatmap.js";
import type { DownloadRange, Period } from "./types.js";

export interface UsePackageHeatmapOptions {
  /**
   * A range already fetched with `fetchDownloads`, typically on the server.
   * When it is set no request is made.
   */
  data?: DownloadRange;
  /** Default `"last-year"`: a calendar is the point, so it wants a year. */
  period?: Period;
  endpoint?: string;
  fetch?: FetchDownloadsOptions["fetch"];
}

export interface PackageHeatmapState {
  range: DownloadRange | null;
  map: Heatmap | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Resolves a package's daily downloads and lays them out as a calendar.
 *
 * Unlike `usePackageTrend` this keeps the raw daily series: a heatmap draws one
 * square per day, so aggregating or smoothing it first would be drawing
 * something else.
 *
 * `data` is deliberately left out of the effect's dependencies, so passing a
 * fresh object literal on every render cannot loop.
 */
export function usePackageHeatmap(
  name: string,
  options: UsePackageHeatmapOptions & HeatmapOptions = {},
): PackageHeatmapState {
  const {
    data,
    period = "last-year",
    endpoint,
    fetch: fetchImpl,
    weekStart,
    levels,
    scale,
    cellSize,
    cellGap,
    radius,
    gaps,
    locale,
  } = options;

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
        setError(asError(cause));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [name, period, endpoint, fetchImpl, provided]);

  const range = data ?? fetched;
  const map = useMemo(
    () =>
      range
        ? heatmapGeometry(range.points, {
            weekStart, levels, scale, cellSize, cellGap, radius, gaps, locale,
          })
        : null,
    [range, weekStart, levels, scale, cellSize, cellGap, radius, gaps, locale],
  );

  return { range, map, loading: range === null && error === null, error };
}

export interface PackageHeatmapProps extends UsePackageHeatmapOptions, HeatmapOptions {
  /** The package name, scoped names included. */
  package: string;
  /** Default `"currentColor"`, so the ramp inherits the surrounding text colour. */
  color?: string;
  /** A colour of its own for the quietest level. Default `color` at low opacity. */
  emptyColor?: string;
  /** Month names across the top. Default `true`: a year of squares is unreadable without them. */
  months?: boolean;
  /** Weekday initials down the left. Default `false`. */
  weekdays?: boolean;
  /** A Less-to-More ramp key underneath. Default `false`. */
  legend?: boolean;
  legendLabels?: { less: string; more: string };
  /** Type size for labels and legend. Default 9. */
  fontSize?: number;
  /** Hatches the days npm reported nothing for. Default `true`. */
  markGaps?: boolean;
  /**
   * A `<title>` per square, which is the browser's own tooltip and costs no
   * script. Default `true` here, and `false` in `heatmapSvg`: on a live page a
   * heatmap nobody can read a value off is decorative, while the string
   * renderer's output is usually rasterised into a README or pasted into an
   * email, where 365 unreachable titles are only weight.
   */
  cellTitles?: boolean;
  /** Fills the container's width rather than sitting at its natural size. */
  fluid?: boolean;
  /** The accessible name for the chart, replacing the sentence built from the range. */
  label?: string | ((map: Heatmap) => string);
  /** Called with the day under the pointer. */
  onActiveDay?: (cell: HeatmapCell | null) => void;
  style?: CSSProperties;
  className?: string;
  /** Shown while fetching. Default a block at the chart's size. */
  fallback?: ReactNode;
  /** Shown when the fetch fails. Default nothing, so a failure stays quiet. */
  renderError?: (error: Error) => ReactNode;
  /**
   * Anything else to put on the `<svg>`: `id`, `data-*`, `onClick`,
   * `preserveAspectRatio`, a `ref`. Applied last, so it can override what the
   * component sets.
   */
  svgProps?: SVGProps<SVGSVGElement> &
    Partial<Record<`data-${string}`, string | number | boolean>>;
  /** Replaces the built-in markup entirely. */
  children?: (state: PackageHeatmapState) => ReactNode;
}

const GAP_HATCH = "pt-heat-gap-r";

/** 1970-01-04 was a Sunday, so adding the weekday number lands on that day. */
const weekdayName = (weekday: number, locale?: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
    Date.UTC(1970, 0, 4 + weekday),
  );

function defaultLabel(map: Heatmap, name: string, locale?: string): string {
  const total = map.cells.reduce((sum, cell) => sum + cell.downloads, 0);
  const repaired = map.cells.filter((cell) => cell.filled).length;
  const note = repaired ? `, ${repaired} interpolated` : "";
  return `${name}: ${formatCount(total, locale)} downloads across ${map.cells.length} days${note}. Busiest day ${formatCount(map.high, locale)}.`;
}

/**
 * A package's daily downloads as a calendar heatmap: one column per week, one
 * row per weekday, each square shaded by that day's downloads.
 *
 * Shows what a sparkline cannot — the weekday rhythm, and where a quiet
 * stretch actually fell in the year.
 */
export function PackageHeatmap({
  package: name,
  color = "currentColor",
  emptyColor,
  months: showMonths = true,
  weekdays: showWeekdays = false,
  legend = false,
  legendLabels = { less: "Less", more: "More" },
  fontSize = 9,
  markGaps = true,
  cellTitles = true,
  fluid = false,
  label: labelProp,
  onActiveDay,
  style,
  className,
  fallback,
  renderError,
  svgProps,
  children,
  ...rest
}: PackageHeatmapProps) {
  const state = usePackageHeatmap(name, rest);
  const { map, loading, error } = state;
  const locale = rest.locale;

  if (children) return <>{children(state)}</>;
  if (error) return <>{renderError?.(error) ?? null}</>;
  if (loading || !map || map.cells.length === 0) {
    return <>{fallback ?? <span aria-hidden="true" style={{ display: "block", height: 0 }} />}</>;
  }

  const step = map.cellSize + map.cellGap;
  const padTop = showMonths ? fontSize + 5 : 0;
  const padLeft = showWeekdays ? fontSize * 2.4 : 0;
  const padBottom = legend ? fontSize + 9 : 0;
  const width = padLeft + map.width;
  const height = padTop + map.height + padBottom;

  const label = typeof labelProp === "function" ? labelProp(map) : (labelProp ?? defaultLabel(map, name, locale));
  const hasGaps = markGaps && map.cells.some((cell) => cell.filled);
  const legendSize = Math.max(7, map.cellSize - 2);
  const legendY = padTop + map.height + 7;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={className}
      style={{
        display: "block",
        ...(fluid ? { width: "100%", height: "auto" } : { maxWidth: "100%", height: "auto" }),
        ...style,
      }}
      onMouseLeave={onActiveDay ? () => onActiveDay(null) : undefined}
      {...svgProps}
    >
      <title>{label}</title>

      {hasGaps ? (
        <defs>
          <pattern
            id={GAP_HATCH}
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path d="M0 0V3" stroke={color} strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
      ) : null}

      {showMonths
        ? map.months.map((month) => (
            <text
              key={`${month.month}-${month.x}`}
              x={padLeft + month.x}
              y={fontSize}
              fontSize={fontSize}
              fill={color}
              opacity={0.65}
            >
              {month.label}
            </text>
          ))
        : null}

      {showWeekdays
        ? map.weekdays.map((weekday, index) =>
            // every other row, as GitHub does: seven initials at this size collide
            index % 2 === 0 ? null : (
              <text
                key={weekday}
                x={0}
                y={padTop + index * step + map.cellSize - 1}
                fontSize={fontSize}
                fill={color}
                opacity={0.65}
              >
                {weekdayName(weekday, locale)}
              </text>
            ),
          )
        : null}

      {map.cells.map((cell) => {
        const x = padLeft + cell.x;
        const y = padTop + cell.y;
        const shade = levelFill(cell.level, map.levels, color, emptyColor);
        return (
          <g
            key={cell.day}
            onMouseEnter={onActiveDay ? () => onActiveDay(cell) : undefined}
            data-day={cell.day}
            data-level={cell.level}
            data-filled={cell.filled ? "" : undefined}
          >
            <rect
              x={x}
              y={y}
              width={cell.size}
              height={cell.size}
              rx={map.radius}
              fill={shade.fill}
              opacity={shade.opacity}
            />
            {markGaps && cell.filled ? (
              <rect
                x={x}
                y={y}
                width={cell.size}
                height={cell.size}
                rx={map.radius}
                fill={`url(#${GAP_HATCH})`}
              />
            ) : null}
            {cellTitles ? (
              <title>
                {`${cell.day}: ${formatExact(cell.downloads, locale)}${cell.filled ? " (interpolated)" : ""}`}
              </title>
            ) : null}
          </g>
        );
      })}

      {legend ? (
        <>
          <text x={padLeft} y={legendY + legendSize - 1} fontSize={fontSize} fill={color} opacity={0.65}>
            {legendLabels.less}
          </text>
          {Array.from({ length: map.levels }, (_, level) => {
            const shade = levelFill(level, map.levels, color, emptyColor);
            return (
              <rect
                key={level}
                x={
                  padLeft + legendLabels.less.length * fontSize * 0.58 + 5 + level * (legendSize + 3)
                }
                y={legendY}
                width={legendSize}
                height={legendSize}
                rx={map.radius}
                fill={shade.fill}
                opacity={shade.opacity}
              />
            );
          })}
          <text
            x={
              padLeft +
              legendLabels.less.length * fontSize * 0.58 +
              7 +
              map.levels * (legendSize + 3)
            }
            y={legendY + legendSize - 1}
            fontSize={fontSize}
            fill={color}
            opacity={0.65}
          >
            {legendLabels.more}
          </text>
        </>
      ) : null}
    </svg>
  );
}
