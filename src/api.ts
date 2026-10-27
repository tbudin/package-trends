import { PackageTrendsError } from "./error.js";
import type { DownloadRange, Period } from "./types.js";

export const NPM_DOWNLOADS_ENDPOINT = "https://api.npmjs.org/downloads";

export interface FetchDownloadsOptions {
  /** Default `"last-month"`. */
  period?: Period;
  signal?: AbortSignal;
  /** Override for a mirror or a caching proxy of your own. */
  endpoint?: string;
  /** Override for tests, or for a fetch that adds caching. */
  fetch?: typeof globalThis.fetch;
}

interface NpmRangeResponse {
  start?: unknown;
  end?: unknown;
  package?: unknown;
  downloads?: unknown;
}

/**
 * Reads a package's daily download counts from the public npm downloads API.
 *
 * The endpoint needs no key and sends `access-control-allow-origin: *`, so this
 * works from a browser with no proxy. Responses carry `cache-control: max-age=300`.
 *
 * Call it on a server and hand the result to the `data` prop to avoid a request
 * per visitor.
 */
export async function fetchDownloads(
  name: string,
  options: FetchDownloadsOptions = {},
): Promise<DownloadRange> {
  const {
    period = "last-month",
    signal,
    endpoint = NPM_DOWNLOADS_ENDPOINT,
    fetch: fetchImpl = globalThis.fetch,
  } = options;

  if (!name) throw new PackageTrendsError("A package name is required.", { package: name });
  if (typeof fetchImpl !== "function") {
    throw new PackageTrendsError("No fetch available; pass one in options.fetch.", { package: name });
  }

  // A scoped name's slash is a path separator the API expects, so each segment
  // is encoded on its own rather than the whole name at once.
  const path = name.split("/").map(encodeURIComponent).join("/");
  const url = `${endpoint}/range/${encodeURIComponent(period)}/${path}`;

  let response: Response;
  try {
    response = await fetchImpl(url, { signal, headers: { accept: "application/json" } });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new PackageTrendsError(`Could not reach the downloads API for "${name}".`, {
      package: name,
      cause,
    });
  }

  if (!response.ok) {
    const detail = response.status === 404 ? "No such package, or no downloads recorded." : response.statusText;
    throw new PackageTrendsError(`Downloads API answered ${response.status} for "${name}". ${detail}`, {
      package: name,
      status: response.status,
    });
  }

  let body: NpmRangeResponse;
  try {
    body = (await response.json()) as NpmRangeResponse;
  } catch (cause) {
    throw new PackageTrendsError(`Downloads API sent unreadable JSON for "${name}".`, {
      package: name,
      cause,
    });
  }

  return normaliseRange(name, body);
}

/** Turns the API's payload into a `DownloadRange`, or throws if it is unusable. */
export function normaliseRange(name: string, body: NpmRangeResponse): DownloadRange {
  if (!Array.isArray(body.downloads)) {
    throw new PackageTrendsError(`Downloads API sent no series for "${name}".`, { package: name });
  }

  const points = body.downloads
    .filter((entry): entry is { day: string; downloads: number } =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as { day?: unknown }).day === "string" &&
      Number.isFinite((entry as { downloads?: unknown }).downloads))
    .map((entry) => ({ day: entry.day, downloads: entry.downloads }));

  if (points.length === 0) {
    throw new PackageTrendsError(`No downloads recorded for "${name}" in that period.`, { package: name });
  }

  return {
    package: typeof body.package === "string" ? body.package : name,
    start: typeof body.start === "string" ? body.start : points[0]!.day,
    end: typeof body.end === "string" ? body.end : points[points.length - 1]!.day,
    points,
  };
}
