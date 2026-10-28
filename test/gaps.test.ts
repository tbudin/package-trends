import { describe, expect, it } from "vitest";
import { applyGaps, fillGaps } from "../src/gaps.js";
import { analyse } from "../src/analyse.js";
import { computeTrend } from "../src/trend.js";
import { days, range } from "./helpers.js";

describe("fillGaps", () => {
  it("interpolates a single missing day between its neighbours", () => {
    const out = fillGaps(days(3, (i) => (i === 1 ? 0 : i === 0 ? 100 : 300)));
    expect(out.points[1]!.downloads).toBe(200);
    expect(out.gapDays).toEqual(["2026-01-02"]);
  });

  it("interpolates a run of missing days", () => {
    const out = fillGaps(days(5, (i) => (i === 0 ? 0 : i === 4 ? 400 : 0)).map((p, i) =>
      i === 0 ? { ...p, downloads: 0 } : p,
    ));
    // 0,0,0,0,400 has no leading real value, so everything before the 400 goes
    expect(out.points).toHaveLength(1);
    expect(out.points[0]!.downloads).toBe(400);
    expect(out.gapDays).toHaveLength(4);
  });

  it("keeps the day alignment, so weekday maths still works", () => {
    const input = days(10, (i) => (i === 4 ? 0 : 1000));
    const out = fillGaps(input);
    expect(out.points).toHaveLength(10);
    expect(out.points.map((p) => p.day)).toEqual(input.map((p) => p.day));
  });

  it("drops leading and trailing gaps, which have nothing to sit between", () => {
    const out = fillGaps(days(5, (i) => (i === 0 || i === 4 ? 0 : 500)));
    expect(out.points.map((p) => p.day)).toEqual(["2026-01-02", "2026-01-03", "2026-01-04"]);
    expect(out.gapDays).toEqual(["2026-01-01", "2026-01-05"]);
  });

  it("leaves a genuinely empty series alone", () => {
    const out = fillGaps(days(5, () => 0));
    expect(out.points).toHaveLength(5);
    expect(out.points.every((p) => p.downloads === 0)).toBe(true);
    expect(out.gapDays).toEqual([]);
  });

  it("leaves a complete series untouched", () => {
    const input = days(5, (i) => 100 + i);
    expect(fillGaps(input).points).toEqual(input);
    expect(fillGaps(input).gapDays).toEqual([]);
  });

  it("can be told to take the zeros literally", () => {
    const input = days(3, (i) => (i === 1 ? 0 : 100));
    expect(applyGaps(input, "zero").points).toEqual(input);
  });
});

describe("gaps downstream", () => {
  // react really did come back with seven zero days in thirty: the shape below
  const withHoles = range(days(28, (i) => ([6, 13, 20].includes(i) ? 0 : 30_000)));

  it("no longer drags the mean down", () => {
    expect(analyse(withHoles).mean).toBeCloseTo(30_000, 5);
    expect(analyse(withHoles, { gaps: "zero" }).mean).toBeLessThan(27_000);
  });

  it("no longer invents a downward trend", () => {
    expect(analyse(withHoles).direction).toBe("flat");
  });

  it("reports which days were missing", () => {
    expect(analyse(withHoles).gapDays).toEqual(["2026-01-07", "2026-01-14", "2026-01-21"]);
    expect(computeTrend(withHoles).gapDays).toHaveLength(3);
  });

  it("keeps the weekday profile honest", () => {
    const profile = analyse(withHoles).byWeekday;
    const means = profile.filter((d) => d.mean > 0).map((d) => Math.round(d.mean));
    expect(new Set(means)).toEqual(new Set([30_000]));
  });

  it("stops the chart diving to the floor", () => {
    const raw = computeTrend(withHoles, { smooth: 1, gaps: "zero" });
    const fixed = computeTrend(withHoles, { smooth: 1 });
    expect(Math.min(...raw.values)).toBe(0);
    expect(Math.min(...fixed.values)).toBe(30_000);
  });
});
