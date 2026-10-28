import { describe, expect, it } from "vitest";
import { columns, marksFor, scaleFor, sparkline, sparklineSvg } from "../src/sparkline.js";

describe("scaleFor", () => {
  it("auto runs between the series' own extremes", () => {
    const s = scaleFor([10, 20], "auto", 0, 100);
    expect(s.low).toBe(10);
    expect(s.high).toBe(20);
    expect(s.y(10)).toBe(100);
    expect(s.y(20)).toBe(0);
  });

  it("zero anchors the foot of the range", () => {
    const s = scaleFor([10, 20], "zero", 0, 100);
    expect(s.low).toBe(0);
    expect(s.y(10)).toBe(50);
  });

  it("an explicit pair overrides the data", () => {
    const s = scaleFor([10, 20], [0, 40], 0, 100);
    expect(s.y(20)).toBe(50);
  });
});

describe("domain makes two charts comparable", () => {
  const small = [1, 5, 10];
  const large = [100, 500, 1000];

  it("scales each to itself by default, which hides the difference", () => {
    expect(sparkline(small).path).toBe(sparkline(large).path);
  });

  it("keeps them apart on a shared domain", () => {
    const a = sparkline(small, { domain: [0, 1000] });
    const b = sparkline(large, { domain: [0, 1000] });
    expect(a.path).not.toBe(b.path);
    // the small series sits near the floor of the shared range
    expect(a.points.every(([, y]) => y > 28)).toBe(true);
  });
});

describe("columns", () => {
  it("lays one bar per value inside the width", () => {
    const laid = columns([1, 2, 3, 4], { width: 120, height: 32 });
    expect(laid.columns).toHaveLength(4);
    expect(laid.columns[0]!.x).toBeGreaterThanOrEqual(0);
    const lastColumn = laid.columns[3]!;
    expect(lastColumn.x + lastColumn.width).toBeLessThanOrEqual(120);
  });

  it("measures height from zero, so a bar reads as its magnitude", () => {
    const laid = columns([0, 50, 100], { width: 60, height: 100, padding: 0 });
    expect(laid.columns[0]!.height).toBe(1); // a floor, so an empty day is still visible
    expect(laid.columns[1]!.height).toBeCloseTo(50, 0);
    expect(laid.columns[2]!.height).toBeCloseTo(100, 0);
  });

  it("reports where zero sits only when zero is in range", () => {
    expect(columns([-5, 5], { height: 100, padding: 0 }).zeroY).toBeCloseTo(50, 0);
    expect(columns([10, 20], { domain: "auto" }).zeroY).toBeNull();
  });

  it("leaves a gap between bars", () => {
    const laid = columns([1, 1], { width: 100, barRatio: 0.7 });
    expect(laid.columns[0]!.width).toBeCloseTo(35, 0);
  });
});

describe("marksFor", () => {
  it("finds the points asked for, in series order", () => {
    const marks = marksFor([5, 1, 9, 3], ["high", "low", "last"]);
    expect(marks.map((m) => [m.kind, m.index])).toEqual([
      ["low", 1],
      ["high", 2],
      ["last", 3],
    ]);
  });

  it("gives a shared point to last rather than high", () => {
    const marks = marksFor([1, 2, 9], ["high", "last"]);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.kind).toBe("last");
  });

  it("returns nothing when nothing is asked for", () => {
    expect(marksFor([1, 2, 3], [])).toEqual([]);
  });
});

describe("sparklineSvg column mode", () => {
  it("draws rects, not a path", () => {
    const svg = sparklineSvg([1, 2, 3], { chart: "column" });
    expect(svg).toContain("<rect");
    expect(svg).not.toContain("<path d=\"M");
  });

  it("colours a marked bar differently", () => {
    const svg = sparklineSvg([1, 2, 9], { chart: "column", mark: ["high"], markColor: { high: "#f00" } });
    expect(svg).toContain('fill="#f00"');
  });

  it("draws the zero rule only when asked and in range", () => {
    expect(sparklineSvg([-1, 1], { chart: "column", axis: true })).toContain("M0 ");
    expect(sparklineSvg([5, 9], { chart: "column", axis: true, domain: "auto" })).not.toContain("M0 ");
  });
});
