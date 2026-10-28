export type FillPattern = "solid" | "hatch" | "cross" | "dots";

export interface PatternSpec {
  kind: FillPattern;
  color: string;
  /** Stable across renders and identical for identical patterns, so SSR matches. */
  id: string;
}

/**
 * A short stable id for a pattern, so the same fill reuses one `<defs>` entry
 * and a server render matches the client's.
 */
export function patternId(kind: FillPattern, color: string): string {
  let hash = 2166136261;
  for (const char of `${kind}:${color}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `pt-${(hash >>> 0).toString(36)}`;
}

export interface PatternTile {
  size: number;
  transform?: string;
  /** The one shape the tile repeats. */
  shape:
    | { kind: "line"; d: string; stroke: string }
    | { kind: "dot"; cx: number; cy: number; r: number; fill: string };
}

/** The tile a pattern repeats, as data both renderers draw from. */
export function patternTile(kind: FillPattern, color: string): PatternTile | null {
  switch (kind) {
    case "hatch":
      return { size: 4, transform: "rotate(45)", shape: { kind: "line", d: "M0 0V4", stroke: color } };
    case "cross":
      return { size: 5, shape: { kind: "line", d: "M0 0H5M0 0V5", stroke: color } };
    case "dots":
      return { size: 4, shape: { kind: "dot", cx: 1.5, cy: 1.5, r: 1, fill: color } };
    default:
      return null;
  }
}

/** The `<pattern>` body, as SVG markup, for the string API. */
export function patternMarkup(spec: PatternSpec): string {
  const tile = patternTile(spec.kind, spec.color);
  if (!tile) return "";

  const transform = tile.transform ? ` patternTransform="${tile.transform}"` : "";
  const shape =
    tile.shape.kind === "line"
      ? `<path d="${tile.shape.d}" stroke="${tile.shape.stroke}" stroke-width="1" fill="none"/>`
      : `<circle cx="${tile.shape.cx}" cy="${tile.shape.cy}" r="${tile.shape.r}" fill="${tile.shape.fill}"/>`;

  return `<pattern id="${spec.id}" width="${tile.size}" height="${tile.size}" patternUnits="userSpaceOnUse"${transform}>${shape}</pattern>`;
}
