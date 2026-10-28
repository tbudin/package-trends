import { describe, expect, it } from "vitest";
import { computeTrend } from "../src/trend.js";
import { days, range } from "./helpers.js";

describe("computeTrend", () => {
  it("totals the raw series, not the smoothed one", () => {
    const trend = computeTrend(range(days(30, () => 100)));
    expect(trend.total).toBe(3_000);
    // the drawn series is shorter, and summing it would have given 2,400
    expect(trend.values).toHaveLength(24);
  });

  it("reports the extremes from the raw days", () => {
    const trend = computeTrend(range(days(10, (i) => (i === 3 ? 900 : i === 7 ? 1 : 100))));
    expect(trend.peak.downloads).toBe(900);
    expect(trend.peak.day).toBe("2026-01-04");
    expect(trend.trough.downloads).toBe(1);
    expect(trend.latest).toBe(100);
  });

  it("compares equal halves", () => {
    // 10 days: 100 each for the first five, 200 each for the last five.
    const trend = computeTrend(range(days(10, (i) => (i < 5 ? 100 : 200))));
    expect(trend.change).toBe(500);
    expect(trend.changeRatio).toBe(1);
  });

  it("leaves the oldest point out on an odd-length series", () => {
    // 11 days: a flat 100 would read as flat only if the halves match in size.
    const trend = computeTrend(range(days(11, () => 100)));
    expect(trend.change).toBe(0);
    expect(trend.changeRatio).toBe(0);
  });

  it("gives no ratio when the earlier half had no downloads", () => {
    // gaps: "zero" so the leading zeros stay, rather than reading as missing days
    const trend = computeTrend(range(days(10, (i) => (i < 5 ? 0 : 50))), { gaps: "zero" });
    expect(trend.change).toBe(250);
    expect(trend.changeRatio).toBeNull();
  });

  it("gives no change for a single point", () => {
    const trend = computeTrend(range(days(1, () => 42)));
    expect(trend.change).toBeNull();
    expect(trend.changeRatio).toBeNull();
    expect(trend.total).toBe(42);
  });

  it("carries the package name and dates through", () => {
    const trend = computeTrend(range(days(8, () => 1), "@scope/thing"));
    expect(trend.package).toBe("@scope/thing");
    expect(trend.start).toBe("2026-01-01");
    expect(trend.end).toBe("2026-01-08");
  });
});
