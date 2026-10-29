/** Thrown when the downloads API cannot be reached or answers with something unusable. */
export class PackageTrendsError extends Error {
  readonly package: string;
  readonly status?: number;

  constructor(message: string, options: { package: string; status?: number; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "PackageTrendsError";
    this.package = options.package;
    this.status = options.status;
  }
}

/** Narrows an unknown throw to an `Error`, which is what the hooks report. */
export function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * Runs a derivation that may throw and hands back the failure as a value.
 *
 * `computeTrend` and `compare` refuse a range with no points. A throw raised
 * while rendering takes the whole React tree with it — on a server that is the
 * page, not the chart — so the hooks route it into their ordinary error state
 * instead and let the caller's `renderError` decide what to show.
 */
export function derive<T>(run: () => T): { value: T | null; error: Error | null } {
  try {
    return { value: run(), error: null };
  } catch (cause) {
    return { value: null, error: asError(cause) };
  }
}
