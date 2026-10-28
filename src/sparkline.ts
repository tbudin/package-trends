export type Domain = readonly [number, number] | "auto" | "zero";

export interface SparklineOptions {
  /**
   * A number is the chart's width in px and sets the `viewBox` with it.
   *
   * A CSS length — `"10em"`, `"100%"`, `"4rem"` — leaves the `viewBox` at the
   * default and renders at that size instead, so the chart scales with the
   * surrounding text rather than sitting at a fixed pixel size.
   */
  width?: number | string;
  height?: number | string;
  /** Room left for the stroke so it is not clipped at the edges. Default 2. */
  padding?: number;
  /**
   * The y-range the values are laid out across.
   *
   * `"auto"` (the line default) runs from the series' own low to its own high:
   * the convention for a sparkline, where the shape of the change is the point.
   * `"zero"` (the column default) runs from 0, which is the honest baseline for
   * a count. An explicit pair fixes the range, which is the only way two charts
   * side by side can be compared — otherwise each scales to itself and a
   * package with a thousand downloads looks identical to one with a million.
   */
  domain?: Domain;
}

export interface Scale {
  low: number;
  high: number;
  /** Maps a value to a y coordinate. */
  y: (value: number) => number;
  top: number;
  bottom: number;
}

/** Resolves a domain against the data and the box. */
export function scaleFor(
  values: readonly number[],
  domain: Domain,
  top: number,
  bottom: number,
): Scale {
  let low: number;
  let high: number;

  if (domain === "auto") {
    low = Math.min(...values);
    high = Math.max(...values);
  } else if (domain === "zero") {
    low = Math.min(0, ...values);
    high = Math.max(...values);
  } else {
    low = domain[0];
    high = domain[1];
  }

  const span = bottom - top;
  const range = high - low;
  // A flat series, or a domain of zero width, has nothing to scale across;
  // putting it on the mid-line beats dividing by zero.
  const y = (value: number) =>
    range === 0 ? top + span / 2 : bottom - ((value - low) / range) * span;

  return { low, high, y, top, bottom };
}

export interface Sparkline {
  /** An SVG path `d` for the line. */
  path: string;
  /** An SVG path `d` for the filled area under the line. */
  area: string;
  /** The plotted coordinates, in order. */
  points: readonly [number, number][];
  /** The most recent coordinate, for a dot at the end of the line. */
  last: readonly [number, number];
  scale: Scale;
  width: number;
  height: number;
}

/** Lays a series out as SVG path geometry. */
/** The px box the geometry is laid out in, ignoring any CSS length. */
export function boxOf(options: SparklineOptions, fallback = { width: 120, height: 32 }) {
  return {
    width: typeof options.width === "number" ? options.width : fallback.width,
    height: typeof options.height === "number" ? options.height : fallback.height,
  };
}

export function sparkline(values: readonly number[], options: SparklineOptions = {}): Sparkline {
  const { width, height } = boxOf(options);
  const { padding = 2, domain = "auto" } = options;
  const top = padding;
  const bottom = height - padding;

  if (values.length === 0) {
    const scale = scaleFor([0], "auto", top, bottom);
    return {
      path: `M0 ${height / 2}H${width}`,
      area: "",
      points: [],
      last: [0, height / 2],
      scale,
      width,
      height,
    };
  }

  const scale = scaleFor(values, domain, top, bottom);
  const x = (index: number) =>
    values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
  const points = values.map((value, index) => [x(index), scale.y(value)] as [number, number]);

  if (points.length === 1) {
    const [px, py] = points[0]!;
    // A one-point series has no line; a tiny horizontal stub renders as a dot
    // under a round linecap.
    return {
      path: `M${round(px)} ${round(py)}h0`,
      area: "",
      points,
      last: points[0]!,
      scale,
      width,
      height,
    };
  }

  const path = points
    .map(([px, py], index) => `${index === 0 ? "M" : "L"}${round(px)} ${round(py)}`)
    .join(" ");
  const area = `${path} L${round(points[points.length - 1]![0])} ${height} L${round(points[0]![0])} ${height} Z`;

  return { path, area, points, last: points[points.length - 1]!, scale, width, height };
}

export interface ColumnsOptions extends SparklineOptions {
  /** Share of each slot taken by the bar, 0–1. Default 0.7. */
  barRatio?: number;
}

export interface Column {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  index: number;
}

export interface Columns {
  columns: readonly Column[];
  /** Where zero sits, for a baseline rule. `null` when zero is off the chart. */
  zeroY: number | null;
  scale: Scale;
  width: number;
  height: number;
}

/**
 * Lays a series out as bars.
 *
 * Columns default to a `"zero"` domain: a bar's height reads as its magnitude,
 * so starting the axis part-way up would overstate small differences. Lines
 * default the other way, because a line's shape is read, not its area.
 */
export function columns(values: readonly number[], options: ColumnsOptions = {}): Columns {
  const { width, height } = boxOf(options);
  const { padding = 1, domain = "zero", barRatio = 0.7 } = options;
  const top = padding;
  const bottom = height - padding;

  if (values.length === 0) {
    return { columns: [], zeroY: null, scale: scaleFor([0], "auto", top, bottom), width, height };
  }

  const scale = scaleFor(values, domain, top, bottom);
  const slot = width / values.length;
  const barWidth = Math.max(1, slot * barRatio);
  const baseline = scale.low <= 0 && scale.high >= 0 ? scale.y(0) : bottom;

  const out = values.map((value, index) => {
    const y = scale.y(value);
    const topY = Math.min(y, baseline);
    const barHeight = Math.max(1, Math.abs(baseline - y));
    return {
      x: round(index * slot + (slot - barWidth) / 2),
      y: round(topY),
      width: round(barWidth),
      height: round(barHeight),
      value,
      index,
    };
  });

  return {
    columns: out,
    zeroY: scale.low <= 0 && scale.high >= 0 ? round(scale.y(0)) : null,
    scale,
    width,
    height,
  };
}

export interface BandMark {
  x: number;
  /** y of the period's mean. */
  y: number;
  /** y of the period's low, which is the LOWER value and so the HIGHER y. */
  lowY: number;
  highY: number;
  index: number;
}

export interface BandGeometry {
  marks: readonly BandMark[];
  scale: Scale;
  width: number;
  height: number;
}

/** Lays low/mean/high buckets out as a point with a whisker through it. */
export function bandGeometry(
  bands: readonly { low: number; mean: number; high: number }[],
  options: SparklineOptions = {},
): BandGeometry {
  const { width, height } = boxOf(options);
  const { padding = 3, domain = "auto" } = options;
  const top = padding;
  const bottom = height - padding;

  if (bands.length === 0) {
    return { marks: [], scale: scaleFor([0], "auto", top, bottom), width, height };
  }

  const spread = bands.flatMap((band) => [band.low, band.high]);
  const scale = scaleFor(spread, domain, top, bottom);
  const slot = width / bands.length;

  return {
    marks: bands.map((band, index) => ({
      x: roundTo(index * slot + slot / 2),
      y: roundTo(scale.y(band.mean)),
      lowY: roundTo(scale.y(band.low)),
      highY: roundTo(scale.y(band.high)),
      index,
    })),
    scale,
    width,
    height,
  };
}

function roundTo(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The points a chart can call out. */
export type MarkKind = "first" | "last" | "high" | "low";

export interface Mark {
  kind: MarkKind;
  index: number;
  value: number;
}

/** Resolves which indices the requested marks fall on, in series order. */
export function marksFor(values: readonly number[], kinds: readonly MarkKind[]): Mark[] {
  if (values.length === 0 || kinds.length === 0) return [];

  const at: Partial<Record<MarkKind, number>> = {};
  if (kinds.includes("first")) at.first = 0;
  if (kinds.includes("last")) at.last = values.length - 1;
  if (kinds.includes("high")) at.high = extremeIndex(values, (a, b) => a > b);
  if (kinds.includes("low")) at.low = extremeIndex(values, (a, b) => a < b);

  // "last" wins over "high"/"low" on the same point: the end of the series is
  // the thing a reader looks for first.
  const order: MarkKind[] = ["last", "first", "high", "low"];
  const taken = new Set<number>();
  const out: Mark[] = [];
  for (const kind of order) {
    const index = at[kind];
    if (index === undefined || taken.has(index)) continue;
    taken.add(index);
    out.push({ kind, index, value: values[index]! });
  }
  return out.sort((a, b) => a.index - b.index);
}

function extremeIndex(values: readonly number[], better: (a: number, b: number) => boolean): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (better(values[i]!, values[best]!)) best = i;
  return best;
}

export interface SparklineSvgOptions extends SparklineOptions {
  /** `"line"` (default), `"column"` or `"band"`. */
  chart?: "line" | "column" | "band";
  /** Low/mean/high buckets, required when `chart` is `"band"`. */
  bands?: readonly { low: number; mean: number; high: number }[];
  /** Extra attributes set on the `<svg>`: `id`, `data-*`, anything. */
  attrs?: Record<string, string | number>;
  /** Default `"currentColor"`, so the chart inherits the surrounding text colour. */
  stroke?: string;
  strokeWidth?: number;
  /** A fill for the area under the line, or for the bars. */
  fill?: string;
  /** Draws a dot on the most recent point. Shorthand for `mark: ["last"]`. */
  dot?: boolean;
  /** Points to call out. */
  mark?: readonly MarkKind[];
  /** A colour per mark kind. Anything unset uses `stroke`. */
  markColor?: Partial<Record<MarkKind, string>>;
  /** Draws a rule at zero when zero is inside the domain. */
  axis?: boolean;
  axisColor?: string;
  /**
   * `true` makes the chart fill its container's width instead of sitting at
   * its natural size. It never grows past the container either way: a chart
   * wider than the box scales down with its aspect ratio kept.
   */
  fluid?: boolean;
  /** Becomes the `<title>`, which is what a screen reader reads. */
  label?: string;
}

/**
 * Renders a series as a standalone SVG string, for use outside React: a
 * template, an email, a static build step, or another framework.
 */
export function sparklineSvg(values: readonly number[], options: SparklineSvgOptions = {}): string {
  const {
    chart = "line",
    bands,
    attrs,
    stroke = "currentColor",
    strokeWidth = 1.5,
    fill,
    dot = false,
    mark,
    markColor = {},
    axis = false,
    axisColor,
    label,
    fluid = false,
    ...geometry
  } = options;

  const kinds: MarkKind[] = mark ? [...mark] : dot ? ["last"] : [];
  const parts: string[] = [];
  let box: { width: number; height: number };

  if (chart === "band") {
    const laid = bandGeometry(bands ?? [], geometry);
    box = { width: laid.width, height: laid.height };
    for (const band of laid.marks) {
      parts.push(
        `<path d="M${band.x} ${band.highY}V${band.lowY}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.4"/>`,
      );
      parts.push(
        `<circle cx="${band.x}" cy="${band.y}" r="${strokeWidth * 1.5}" fill="${escapeXml(fill ?? stroke)}"/>`,
      );
    }
  } else if (chart === "column") {
    const laid = columns(values, geometry);
    box = { width: laid.width, height: laid.height };
    const marks = new Map(marksFor(values, kinds).map((m) => [m.index, m.kind]));

    if (axis && laid.zeroY !== null) {
      parts.push(
        `<path d="M0 ${laid.zeroY}H${laid.width}" stroke="${escapeXml(axisColor ?? stroke)}" stroke-width="1" opacity="0.35"/>`,
      );
    }
    for (const column of laid.columns) {
      const kind = marks.get(column.index);
      const colour = (kind && markColor[kind]) ?? fill ?? stroke;
      parts.push(
        `<rect x="${column.x}" y="${column.y}" width="${column.width}" height="${column.height}" fill="${escapeXml(colour)}"${kind ? "" : ' opacity="0.85"'}/>`,
      );
    }
  } else {
    const line = sparkline(values, geometry);
    box = { width: line.width, height: line.height };

    if (fill && line.area) {
      parts.push(`<path d="${line.area}" fill="${escapeXml(fill)}" stroke="none"/>`);
    }
    parts.push(
      `<path d="${line.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    for (const m of marksFor(values, kinds)) {
      const [cx, cy] = line.points[m.index] ?? line.last;
      parts.push(
        `<circle cx="${round(cx)}" cy="${round(cy)}" r="${strokeWidth * 1.4}" fill="${escapeXml(markColor[m.kind] ?? stroke)}"/>`,
      );
    }
  }

  if (label) parts.unshift(`<title>${escapeXml(label)}</title>`);
  const accessibility = label ? ` role="img" aria-label="${escapeXml(label)}"` : ` aria-hidden="true"`;

  const extra = Object.entries(attrs ?? {})
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join("");
  const w = geometry.width ?? box.width;
  const h = geometry.height ?? box.height;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" width="${escapeXml(String(w))}" height="${escapeXml(String(h))}" style="${svgStyle(fluid)}"${accessibility}${extra}>${parts.join("")}</svg>`;
}

/**
 * `max-width` keeps the chart inside a container narrower than its natural
 * width, and `height: auto` makes it scale down with its aspect ratio rather
 * than being squashed. Without this a 120px chart overflows an 80px column.
 */
export function svgStyle(fluid: boolean): string {
  return fluid ? "display:block;width:100%;height:auto" : "display:block;max-width:100%;height:auto";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
