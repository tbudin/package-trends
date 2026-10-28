import { describe, expect, it } from "vitest";
import { toBands } from "../src/bands.js";
import { bandGeometry, boxOf, sparklineSvg } from "../src/sparkline.js";
import { days } from "./helpers.js";

describe("toBands", () => {
  it("reports each week's low, mean and high", () => {
    const bands = toBands(days(14, (i) => (i % 7 < 5 ? 30_000 : 10_000)));
    expect(bands).toHaveLength(2);
    expect(bands[0]).toMatchObject({ low: 10_000, high: 30_000, days: 7 });
    expect(bands[0]!.mean).toBeCloseTo((5 * 30_000 + 2 * 10_000) / 7, 5);
  });

  it("labels a bucket with the day it ends on, chronologically", () => {
    expect(toBands(days(14, () => 1)).map((b) => b.day)).toEqual(["2026-01-07", "2026-01-14"]);
  });

  it("measures back from the latest day and drops a part bucket", () => {
    const bands = toBands(days(9, (i) => (i < 2 ? 999_999 : 1)));
    expect(bands).toHaveLength(1);
    expect(bands[0]!.high).toBe(1);
  });

  it("takes a bucket size", () => {
    expect(toBands(days(30, () => 1), 10)).toHaveLength(3);
  });

  it("refuses a size that is not a positive integer", () => {
    expect(() => toBands(days(7, () => 1), 0)).toThrow(RangeError);
  });

  it("returns nothing when there is not one whole bucket", () => {
    expect(toBands(days(6, () => 1))).toEqual([]);
  });
});

describe("bandGeometry", () => {
  it("puts the mean between the low and the high", () => {
    const laid = bandGeometry([{ low: 0, mean: 50, high: 100 }], { height: 100, padding: 0 });
    const mark = laid.marks[0]!;
    expect(mark.highY).toBeLessThan(mark.y);
    expect(mark.y).toBeLessThan(mark.lowY);
    expect(mark.y).toBeCloseTo(50, 0);
  });

  it("scales across every low and high, not just the means", () => {
    const laid = bandGeometry(
      [
        { low: 10, mean: 15, high: 20 },
        { low: 80, mean: 85, high: 90 },
      ],
      { height: 100, padding: 0 },
    );
    expect(laid.scale.low).toBe(10);
    expect(laid.scale.high).toBe(90);
  });

  it("centres each bucket in its slot", () => {
    const laid = bandGeometry(
      [{ low: 1, mean: 2, high: 3 }, { low: 1, mean: 2, high: 3 }],
      { width: 100 },
    );
    expect(laid.marks.map((m) => m.x)).toEqual([25, 75]);
  });

  it("survives an empty set", () => {
    expect(bandGeometry([]).marks).toEqual([]);
  });
});

describe("css lengths and attributes", () => {
  it("keeps the viewBox in px while rendering at a CSS length", () => {
    const svg = sparklineSvg([1, 2, 3], { width: "10em", height: "2em" });
    expect(svg).toContain('viewBox="0 0 120 32"');
    expect(svg).toContain('width="10em"');
    expect(svg).toContain('height="2em"');
  });

  it("falls back to the default box for geometry", () => {
    expect(boxOf({ width: "10em" })).toEqual({ width: 120, height: 32 });
    expect(boxOf({ width: 300, height: 50 })).toEqual({ width: 300, height: 50 });
  });

  it("puts extra attributes on the svg", () => {
    const svg = sparklineSvg([1, 2, 3], { attrs: { id: "chart", "data-pkg": "react" } });
    expect(svg).toContain('id="chart"');
    expect(svg).toContain('data-pkg="react"');
  });

  it("escapes them", () => {
    expect(sparklineSvg([1, 2], { attrs: { "data-x": '"><script>' } })).not.toContain("<script>");
  });

  it("draws a band chart from buckets", () => {
    const svg = sparklineSvg([], { chart: "band", bands: [{ low: 1, mean: 2, high: 3 }] });
    expect(svg).toContain("<path");
    expect(svg).toContain("<circle");
  });
});
