import type { DownloadPoint, DownloadRange } from "../src/types.js";

/** `n` consecutive days from 2026-01-01, with `value(index)` downloads each. */
export function days(n: number, value: (index: number) => number): DownloadPoint[] {
  return Array.from({ length: n }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index));
    return { day: date.toISOString().slice(0, 10), downloads: value(index) };
  });
}

export function range(points: DownloadPoint[], name = "demo"): DownloadRange {
  return {
    package: name,
    start: points[0]!.day,
    end: points[points.length - 1]!.day,
    points,
  };
}
