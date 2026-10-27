export interface SparklineOptions {
  width?: number;
  height?: number;
  /** Room left for the stroke so it is not clipped at the edges. Default 2. */
  padding?: number;
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
  width: number;
  height: number;
}

/**
 * Lays a series out as SVG path geometry.
 *
 * The y-scale runs from the series' own low to its own high rather than from
 * zero, which is the convention for sparklines: the shape of the change is the
 * point, not the absolute level. A flat series draws along the middle.
 */
export function sparkline(values: readonly number[], options: SparklineOptions = {}): Sparkline {
  const { width = 120, height = 32, padding = 2 } = options;

  if (values.length === 0) {
    const empty = `M0 ${height / 2}H${width}`;
    return { path: empty, area: "", points: [], last: [0, height / 2], width, height };
  }

  const top = padding;
  const bottom = height - padding;
  const span = bottom - top;

  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = high - low;

  const x = (index: number) =>
    values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
  // A flat series has no range to scale across, so it sits on the mid-line.
  const y = (value: number) =>
    range === 0 ? top + span / 2 : bottom - ((value - low) / range) * span;

  const points = values.map((value, index) => [x(index), y(value)] as [number, number]);

  if (points.length === 1) {
    const [px, py] = points[0]!;
    // A one-point series has no line; a tiny horizontal stub renders as a dot
    // under a round linecap.
    return { path: `M${round(px)} ${round(py)}h0`, area: "", points, last: points[0]!, width, height };
  }

  const path = points
    .map(([px, py], index) => `${index === 0 ? "M" : "L"}${round(px)} ${round(py)}`)
    .join(" ");

  const area = `${path} L${round(points[points.length - 1]![0])} ${height} L${round(points[0]![0])} ${height} Z`;

  return { path, area, points, last: points[points.length - 1]!, width, height };
}

export interface SparklineSvgOptions extends SparklineOptions {
  /** Default `"currentColor"`, so the line inherits the surrounding text colour. */
  stroke?: string;
  strokeWidth?: number;
  /** A fill for the area under the line. Omitted by default. */
  fill?: string;
  /** Draws a dot on the most recent point. Default false. */
  dot?: boolean;
  /** Becomes the `<title>`, which is what a screen reader reads. */
  label?: string;
}

/**
 * Renders a series as a standalone SVG string, for use outside React: a
 * template, an email, a static build step, or another framework.
 */
export function sparklineSvg(values: readonly number[], options: SparklineSvgOptions = {}): string {
  const {
    stroke = "currentColor",
    strokeWidth = 1.5,
    fill,
    dot = false,
    label,
    ...geometry
  } = options;

  const line = sparkline(values, geometry);
  const parts: string[] = [];

  if (label) parts.push(`<title>${escapeXml(label)}</title>`);
  if (fill && line.area) {
    parts.push(`<path d="${line.area}" fill="${escapeXml(fill)}" stroke="none"/>`);
  }
  parts.push(
    `<path d="${line.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  if (dot) {
    parts.push(
      `<circle cx="${round(line.last[0])}" cy="${round(line.last[1])}" r="${strokeWidth * 1.4}" fill="${escapeXml(stroke)}"/>`,
    );
  }

  const accessibility = label
    ? ` role="img" aria-label="${escapeXml(label)}"`
    : ` aria-hidden="true"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${line.width} ${line.height}" width="${line.width}" height="${line.height}"${accessibility}>${parts.join("")}</svg>`;
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
