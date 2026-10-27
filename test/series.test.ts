import { describe, expect, it } from "vitest";
import { movingAverage, shapeSeries, toWeekly } from "../src/series.js";
import { days, range } from "./helpers.js";

describe("movingAverage", () => {
  it("drops the leading points that have no full window", () => {
    const out = movingAverage(days(10, () => 100), 7);
    expect(out).toHaveLength(4);
    expect(out[0]!.day).toBe("2026-01-07");
  });

  it("averages across the window", () => {
    // 0,1,2,3,4 with window 3 -> means of (0,1,2), (1,2,3), (2,3,4)
    const out = movingAverage(days(5, (i) => i), 3);
    expect(out.map((p) => p.downloads)).toEqual([1, 2, 3]);
  });

  it("flattens the weekday/weekend cycle", () => {
    // Weekends at a third of a weekday, which is roughly what npm really shows.
    const weekly = movingAverage(days(21, (i) => (i % 7 < 5 ? 30_000 : 10_000)), 7);
    const values = weekly.map((p) => p.downloads);
    expect(new Set(values).size).toBe(1);
    expect(values[0]).toBeCloseTo((5 * 30_000 + 2 * 10_000) / 7);
  });

  it("keeps every point when partial is set", () => {
    const out = movingAverage(days(5, () => 10), 3, { partial: true });
    expect(out).toHaveLength(5);
    expect(out[0]!.downloads).toBe(10);
  });

  it("passes the series through at window 1", () => {
    const input = days(3, (i) => i);
    expect(movingAverage(input, 1)).toEqual(input);
  });

  it("rejects a window that is not a positive integer", () => {
    expect(() => movingAverage(days(3, () => 1), 0)).toThrow(RangeError);
    expect(() => movingAverage(days(3, () => 1), 1.5)).toThrow(RangeError);
  });
});

describe("toWeekly", () => {
  it("sums whole weeks and drops an incomplete oldest one", () => {
    const weeks = toWeekly(days(30, () => 100));
    expect(weeks).toHaveLength(4);
    expect(weeks.every((week) => week.downloads === 700)).toBe(true);
  });

  it("labels each bucket with the day it ends on and runs chronologically", () => {
    const weeks = toWeekly(days(14, () => 1));
    expect(weeks.map((w) => w.day)).toEqual(["2026-01-07", "2026-01-14"]);
  });

  it("measures back from the most recent day, so the latest week is whole", () => {
    // 9 points: the last 7 make a week, the first 2 are dropped.
    const weeks = toWeekly(days(9, (i) => (i < 2 ? 999 : 1)));
    expect(weeks).toHaveLength(1);
    expect(weeks[0]!.downloads).toBe(7);
  });

  it("returns nothing when there is not a full week", () => {
    expect(toWeekly(days(6, () => 1))).toEqual([]);
  });
});

describe("shapeSeries", () => {
  it("smooths daily series over 7 points by default", () => {
    expect(shapeSeries(range(days(30, () => 10)))).toHaveLength(24);
  });

  it("aggregates to weeks when asked", () => {
    expect(shapeSeries(range(days(28, () => 10)), { aggregate: "week" })).toHaveLength(4);
  });

  it("falls back to the raw series rather than drawing nothing", () => {
    expect(shapeSeries(range(days(3, () => 10)), { aggregate: "week" })).toHaveLength(3);
    expect(shapeSeries(range(days(3, () => 10)), { smooth: 7 })).toHaveLength(3);
  });
});
