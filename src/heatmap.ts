import { applyGaps, type GapPolicy } from "./gaps.js";
import { escapeXml, svgStyle } from "./sparkline.js";
import type { DownloadPoint } from "./types.js";

/**
 * How a day's downloads become one of the ramp's levels.
 *
 * `"linear"` spans zero to the busiest day, so a cell's darkness is
 * proportional to its downloads and a year that doubled gets visibly darker
 * towards the right. `"quantile"` puts an equal number of days in every level,
 * which fills the ramp evenly but hides exactly that: a package that doubled
 * and a package that never moved produce the same picture. Linear is the
 * default for that reason; reach for quantile only when one spike flattens
 * everything else into the bottom level.
 */
export type HeatmapScale = "linear" | "quantile";

export interface HeatmapOptions {
  /** 0 is Sunday. Unset, it follows the locale, falling back to Monday. */
  weekStart?: number;
  /** Ramp steps. Default 5, as GitHub uses. */
  levels?: number;
  /** Default `"linear"`. */
  scale?: HeatmapScale;
  /** Side of one day's square, in user units. Default 11. */
  cellSize?: number;
  /** Space between squares. Default 3. */
  cellGap?: number;
  /** Corner radius. Default 2. */
  radius?: number;
  /** Default `"fill"`, matching the rest of the package. */
  gaps?: GapPolicy;
  /** Names the months. Default the host's locale. */
  locale?: string;
}

export interface HeatmapCell {
  /** `YYYY-MM-DD`. */
  day: string;
  downloads: number;
  /** 0 to `levels - 1`. */
  level: number;
  /** Column, counting from the first week the range touches. */
  week: number;
  /** Row, already rotated so row 0 is `weekStart`. */
  weekday: number;
  x: number;
  y: number;
  size: number;
  /**
   * The day npm reported nothing for, so `downloads` is interpolated. Worth
   * drawing differently: the alternative is a square that states a number
   * nobody measured.
   */
  filled: boolean;
}

export interface HeatmapMonth {
  /** Localised short name. */
  label: string;
  /** 1-12, for a caller writing its own label. */
  month: number;
  /** Left edge of the first column this month owns. */
  x: number;
}

export interface Heatmap {
  cells: readonly HeatmapCell[];
  months: readonly HeatmapMonth[];
  /** Upper bound of each level except the last, so `thresholds.length` is `levels - 1`. */
  thresholds: readonly number[];
  levels: number;
  weeks: number;
  weekStart: number;
  /** Row order as drawn, each 0-6 with 0 Sunday, so a caller can label rows. */
  weekdays: readonly number[];
  low: number;
  high: number;
  width: number;
  height: number;
  cellSize: number;
  cellGap: number;
  radius: number;
}

const DAY_MS = 86_400_000;

/** UTC throughout: a `YYYY-MM-DD` has no timezone, and local parsing shifts it. */
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);

/**
 * The weekday a locale starts its week on. `Intl.Locale#getWeekInfo` is the
 * only source that knows, and it is recent enough to be missing, so an
 * unanswered locale falls back to Monday — the ISO week and the commoner of
 * the two worldwide.
 */
export function localeWeekStart(locale?: string): number {
  try {
    const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const info = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const week = info.getWeekInfo?.() ?? info.weekInfo;
    // getWeekInfo reports 1-7 with 7 for Sunday; getUTCDay uses 0 for Sunday
    if (week) return week.firstDay % 7;
  } catch {
    // an unknown locale tag, or a runtime without weekInfo
  }
  return 1;
}

/** The level boundaries, as upper bounds of every level but the last. */
function thresholdsFor(values: readonly number[], levels: number, scale: HeatmapScale): number[] {
  if (levels < 2) return [];

  if (scale === "quantile") {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
    return Array.from({ length: levels - 1 }, (_, i) => at((i + 1) / levels));
  }

  // Linear spans zero rather than the quietest day: starting at the minimum
  // would stretch a narrow range across the whole ramp and read as drama.
  const high = Math.max(...values, 0);
  return Array.from({ length: levels - 1 }, (_, i) => (high * (i + 1)) / levels);
}

/**
 * Lays a daily series out as a GitHub-style calendar: one column per week, one
 * row per weekday, each day a square shaded by its downloads.
 *
 * Returns geometry only, so the string and React renderers draw the same
 * picture from one computation and a caller can lay it out differently.
 */
export function heatmapGeometry(
  points: readonly DownloadPoint[],
  options: HeatmapOptions = {},
): Heatmap {
  const {
    levels = 5,
    scale = "linear",
    cellSize = 11,
    cellGap = 3,
    radius = 2,
    gaps = "fill",
    locale,
  } = options;

  const weekStart = options.weekStart ?? localeWeekStart(locale);
  const step = cellSize + cellGap;

  const repaired = applyGaps(points, gaps);
  const missing = new Set(repaired.gapDays);
  const days = repaired.points;

  if (days.length === 0) {
    return {
      cells: [], months: [], thresholds: [], levels, weeks: 0, weekStart,
      weekdays: [], low: 0, high: 0, width: 0, height: 0, cellSize, cellGap, radius,
    };
  }

  const values = days.map((point) => point.downloads);
  const thresholds = thresholdsFor(values, levels, scale);
  const levelOf = (value: number) => {
    let level = 0;
    while (level < thresholds.length && value > thresholds[level]!) level += 1;
    return level;
  };

  const row = (day: string) => (new Date(utc(day)).getUTCDay() - weekStart + 7) % 7;
  const firstOffset = row(days[0]!.day);
  const origin = utc(days[0]!.day);

  const cells: HeatmapCell[] = days.map((point) => {
    // Index by real date, not array position: a dropped leading or trailing
    // gap would otherwise slide every later day into the wrong column.
    const index = Math.round((utc(point.day) - origin) / DAY_MS);
    const week = Math.floor((index + firstOffset) / 7);
    const weekday = row(point.day);
    return {
      day: point.day,
      downloads: point.downloads,
      level: levelOf(point.downloads),
      week,
      weekday,
      x: week * step,
      y: weekday * step,
      size: cellSize,
      filled: missing.has(point.day),
    };
  });

  const weeks = cells[cells.length - 1]!.week + 1;

  // One label per month, over the column its first day falls in. A month whose
  // first day lands late in a column would sit over mostly the month before,
  // so it moves on to the next column.
  //
  // A range rarely starts on the 1st, so the first month owns a sliver — a
  // couple of columns that cannot hold a name without running into the next
  // month's. Where two labels land closer than three columns the later one
  // wins, since it owns the ground they are arguing over.
  const minGap = 3 * step;
  const months: HeatmapMonth[] = [];
  for (const cell of cells) {
    const month = Number(cell.day.slice(5, 7));
    if (months.length && months[months.length - 1]!.month === month) continue;
    const column = cell.weekday > 3 ? cell.week + 1 : cell.week;
    if (column >= weeks) continue;
    const label = {
      label: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(utc(cell.day)),
      month,
      x: column * step,
    };
    if (months.length && label.x - months[months.length - 1]!.x < minGap) months.pop();
    months.push(label);
  }

  return {
    cells,
    months,
    thresholds,
    levels,
    weeks,
    weekStart,
    weekdays: Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7),
    low: Math.min(...values),
    high: Math.max(...values),
    width: weeks * step - cellGap,
    height: 7 * step - cellGap,
    cellSize,
    cellGap,
    radius,
  };
}

/**
 * The opacity a level is drawn at, against `currentColor`.
 *
 * The ramp is one hue stepped in opacity rather than a sequence of colours, so
 * it inherits the host's text colour like every other part of this package,
 * survives a dark ground without a second palette, and stays ordered in
 * monochrome and for a reader who cannot separate hues. Lightness is the only
 * channel carrying the value, which is the one channel everybody shares.
 */
export function levelOpacity(level: number, levels: number): number {
  if (levels < 2) return 1;
  const floor = 0.12;
  return floor + (1 - floor) * (level / (levels - 1));
}

/**
 * The fill and opacity one level draws with.
 *
 * Left alone, the ramp is one colour at rising opacity: lightness alone
 * carries the value, so it inherits the host's text colour and inverts on a
 * dark ground for free. `emptyColor` gives the quietest level a colour of its
 * own — GitHub's look, where an empty day is grey and the ramp is green — at
 * the cost of a palette that no longer follows the surrounding text.
 *
 * The opacity is rounded here rather than at each renderer, so the string and
 * the React output agree by construction: `levelOpacity` is exact maths, and
 * 1/4 of the way up a 5-step ramp is 0.33999999999999997 in binary floating
 * point. Three places keep every level distinct well past any sane `levels`.
 */
export function levelFill(
  level: number,
  levels: number,
  color: string,
  emptyColor?: string,
): { fill: string; opacity: number } {
  if (emptyColor !== undefined && level === 0) return { fill: emptyColor, opacity: 1 };
  return { fill: color, opacity: Math.round(levelOpacity(level, levels) * 1000) / 1000 };
}

/* ── string renderer ──────────────────────────────────────────────────── */

export interface HeatmapSvgOptions extends HeatmapOptions {
  /** Default `"currentColor"`, so the ramp inherits the surrounding text colour. */
  color?: string;
  /** A colour of its own for the quietest level. Default `color` at low opacity. */
  emptyColor?: string;
  /** Month names across the top. Default `true`: a year of squares is unreadable without them. */
  months?: boolean;
  /** Weekday initials down the left. Default `false`; the row order is usually obvious. */
  weekdays?: boolean;
  /** A Less-to-More ramp key underneath. Default `false`. */
  legend?: boolean;
  /** Label text, for a non-English legend. */
  legendLabels?: { less: string; more: string };
  /** Type size for labels and legend. Default 9. */
  fontSize?: number;
  /** Hatches the days npm reported nothing for. Default `true`. */
  markGaps?: boolean;
  /** Extra attributes set on the `<svg>`. */
  attrs?: Record<string, string | number>;
  /** Fills the container's width rather than sitting at its natural size. */
  fluid?: boolean;
  /** Becomes the `<title>`, which is what a screen reader reads. */
  label?: string;
}

const GAP_HATCH = "pt-heat-gap";

/**
 * Renders a daily series as a calendar heatmap, as a standalone SVG string.
 *
 * The same geometry the React component uses, for a template, an email, a
 * README build step, or another framework.
 */
export function heatmapSvg(
  points: readonly DownloadPoint[],
  options: HeatmapSvgOptions = {},
): string {
  const {
    color = "currentColor",
    emptyColor,
    months: showMonths = true,
    weekdays: showWeekdays = false,
    legend = false,
    legendLabels = { less: "Less", more: "More" },
    fontSize = 9,
    markGaps = true,
    attrs,
    fluid = false,
    label,
    ...geometry
  } = options;

  const map = heatmapGeometry(points, geometry);
  if (map.cells.length === 0) return "";

  const step = map.cellSize + map.cellGap;
  const padTop = showMonths ? fontSize + 5 : 0;
  const padLeft = showWeekdays ? fontSize * 2.4 : 0;
  const padBottom = legend ? fontSize + 9 : 0;
  const width = padLeft + map.width;
  const height = padTop + map.height + padBottom;

  const parts: string[] = [];

  if (markGaps && map.cells.some((cell) => cell.filled)) {
    parts.push(
      `<defs><pattern id="${GAP_HATCH}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
        `<path d="M0 0V3" stroke="${escapeXml(color)}" stroke-width="1" opacity="0.55"/></pattern></defs>`,
    );
  }

  if (showMonths) {
    for (const month of map.months) {
      parts.push(
        `<text x="${round(padLeft + month.x)}" y="${fontSize}" font-size="${fontSize}" fill="${escapeXml(color)}" opacity="0.65">${escapeXml(month.label)}</text>`,
      );
    }
  }

  if (showWeekdays) {
    // every other row, as GitHub does: seven initials at this size collide
    map.weekdays.forEach((weekday, index) => {
      if (index % 2 === 0) return;
      const name = new Intl.DateTimeFormat(geometry.locale, { weekday: "short", timeZone: "UTC" })
        // 1970-01-04 was a Sunday, so adding the weekday lands on that day
        .format(Date.UTC(1970, 0, 4 + weekday));
      parts.push(
        `<text x="0" y="${round(padTop + index * step + map.cellSize - 1)}" font-size="${fontSize}" fill="${escapeXml(color)}" opacity="0.65">${escapeXml(name)}</text>`,
      );
    });
  }

  for (const cell of map.cells) {
    const x = round(padLeft + cell.x);
    const y = round(padTop + cell.y);
    const shade = levelFill(cell.level, map.levels, color, emptyColor);
    parts.push(
      `<rect x="${x}" y="${y}" width="${cell.size}" height="${cell.size}" rx="${map.radius}"` +
        ` fill="${escapeXml(shade.fill)}" opacity="${shade.opacity}"/>`,
    );
    if (markGaps && cell.filled) {
      parts.push(
        `<rect x="${x}" y="${y}" width="${cell.size}" height="${cell.size}" rx="${map.radius}" fill="url(#${GAP_HATCH})"/>`,
      );
    }
  }

  if (legend) {
    const size = Math.max(7, map.cellSize - 2);
    const y = padTop + map.height + 7;
    const lessWidth = legendLabels.less.length * fontSize * 0.58;
    let x = padLeft + lessWidth + 5;
    parts.push(
      `<text x="${round(padLeft)}" y="${round(y + size - 1)}" font-size="${fontSize}" fill="${escapeXml(color)}" opacity="0.65">${escapeXml(legendLabels.less)}</text>`,
    );
    for (let level = 0; level < map.levels; level++) {
      const shade = levelFill(level, map.levels, color, emptyColor);
      parts.push(
        `<rect x="${round(x)}" y="${round(y)}" width="${size}" height="${size}" rx="${map.radius}" fill="${escapeXml(shade.fill)}" opacity="${shade.opacity}"/>`,
      );
      x += size + 3;
    }
    parts.push(
      `<text x="${round(x + 2)}" y="${round(y + size - 1)}" font-size="${fontSize}" fill="${escapeXml(color)}" opacity="0.65">${escapeXml(legendLabels.more)}</text>`,
    );
  }

  if (label) parts.unshift(`<title>${escapeXml(label)}</title>`);
  const accessibility = label
    ? ` role="img" aria-label="${escapeXml(label)}"`
    : ` aria-hidden="true"`;
  const extra = Object.entries(attrs ?? {})
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}"` +
    ` width="${round(width)}" height="${round(height)}" style="${svgStyle(fluid)}"${accessibility}${extra}>` +
    `${parts.join("")}</svg>`
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
