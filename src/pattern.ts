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

/** The `<pattern>` body, as SVG markup. */
export function patternMarkup(spec: PatternSpec): string {
  const { id, color } = spec;
  const stroke = `stroke="${color}" stroke-width="1"`;

  switch (spec.kind) {
    case "hatch":
      return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" ${stroke}/></pattern>`;
    case "cross":
      return `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0H5M0 0V5" ${stroke}/></pattern>`;
    case "dots":
      return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="${color}"/></pattern>`;
    default:
      return "";
  }
}
