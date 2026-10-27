import { describe, expect, it } from "vitest";
import { sparkline, sparklineSvg } from "../src/sparkline.js";

describe("sparkline", () => {
  it("spans the full width and respects the padding", () => {
    const line = sparkline([0, 1], { width: 100, height: 20, padding: 2 });
    expect(line.points[0]).toEqual([0, 18]);
    expect(line.points[1]).toEqual([100, 2]);
  });

  it("scales to the series' own low and high, not to zero", () => {
    // 10 and 20 should use the whole height, exactly as 0 and 10 would.
    const low = sparkline([10, 15, 20], { height: 20, padding: 0 });
    const zeroed = sparkline([0, 5, 10], { height: 20, padding: 0 });
    expect(low.points).toEqual(zeroed.points);
  });

  it("draws a flat series along the middle", () => {
    const line = sparkline([7, 7, 7], { height: 20, padding: 2 });
    expect(line.points.map(([, y]) => y)).toEqual([10, 10, 10]);
    expect(line.path).not.toContain("NaN");
  });

  it("renders a single point as a dot stub at the centre", () => {
    const line = sparkline([5], { width: 100, height: 20 });
    expect(line.points).toEqual([[50, 10]]);
    expect(line.path).toBe("M50 10h0");
    expect(line.area).toBe("");
  });

  it("survives an empty series", () => {
    const line = sparkline([], { width: 100, height: 20 });
    expect(line.points).toEqual([]);
    expect(line.path).toBe("M0 10H100");
  });

  it("closes the area down to the baseline", () => {
    const line = sparkline([1, 2], { width: 10, height: 20, padding: 0 });
    expect(line.area.endsWith("Z")).toBe(true);
    expect(line.area).toContain("L10 20");
  });

  it("reports the last point for a dot", () => {
    const line = sparkline([1, 2, 3], { width: 60, height: 20, padding: 0 });
    expect(line.last).toEqual([60, 0]);
  });
});

describe("sparklineSvg", () => {
  it("inherits the text colour and hides itself without a label", () => {
    const svg = sparklineSvg([1, 2, 3]);
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain("<title>");
  });

  it("exposes a label to a screen reader", () => {
    const svg = sparklineSvg([1, 2, 3], { label: "12 downloads" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>12 downloads</title>");
  });

  it("escapes a label so it cannot break out of the markup", () => {
    const svg = sparklineSvg([1, 2], { label: '<script>&"' });
    expect(svg).toContain("&lt;script&gt;&amp;&quot;");
    expect(svg).not.toContain("<script>");
  });

  it("omits the area unless a fill is given", () => {
    expect(sparklineSvg([1, 2])).not.toContain('fill="none" stroke="none"');
    expect(sparklineSvg([1, 2], { fill: "#eee" })).toContain('fill="#eee"');
  });
});
