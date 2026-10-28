import { describe, expect, it } from "vitest";
import { pathFrom, type Curve } from "../src/curve.js";
import { patternId, patternMarkup } from "../src/pattern.js";
import { sparkline, sparklineSvg } from "../src/sparkline.js";

type Point = [number, number];

/** Samples every cubic segment of a path so the drawn curve can be checked. */
function sampleCurve(path: string, steps = 24): number[] {
  const ys: number[] = [];
  const start = path.match(/^M([\d.-]+) ([\d.-]+)/);
  if (!start) return ys;

  let from: Point = [Number(start[1]), Number(start[2])];
  const segments = path.matchAll(/C([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)/g);

  for (const segment of segments) {
    const [c1x, c1y, c2x, c2y, x, y] = segment.slice(1).map(Number) as [
      number, number, number, number, number, number,
    ];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      ys.push(u ** 3 * from[1] + 3 * u ** 2 * t * c1y + 3 * u * t ** 2 * c2y + t ** 3 * y);
    }
    void c1x;
    void c2x;
    from = [x, y];
  }
  return ys;
}

const points: Point[] = [
  [0, 30],
  [20, 28],
  [40, 4],
  [60, 26],
  [80, 29],
  [100, 10],
];

describe("pathFrom", () => {
  it("joins points with straight segments by default", () => {
    expect(pathFrom(points)).toBe("M0 30 L20 28 L40 4 L60 26 L80 29 L100 10");
  });

  it("emits cubics when smooth", () => {
    const path = pathFrom(points, "smooth");
    expect(path.startsWith("M0 30")).toBe(true);
    expect(path).toContain("C");
    expect(path).not.toContain("L");
  });

  it("never overshoots the data, which is the reason it is monotone cubic", () => {
    // a cardinal spline through these points dips below 4 and above 30,
    // drawing download counts that never happened
    const low = Math.min(...points.map((p) => p[1]));
    const high = Math.max(...points.map((p) => p[1]));
    const drawn = sampleCurve(pathFrom(points, "smooth"));

    expect(drawn.length).toBeGreaterThan(50);
    expect(Math.min(...drawn)).toBeGreaterThanOrEqual(low - 0.001);
    expect(Math.max(...drawn)).toBeLessThanOrEqual(high + 0.001);
  });

  it("flattens at a turning point rather than curving through it", () => {
    // a peak must not be rounded into a higher peak
    const peak: Point[] = [[0, 10], [10, 0], [20, 10]];
    const drawn = sampleCurve(pathFrom(peak, "smooth"));
    expect(Math.min(...drawn)).toBeGreaterThanOrEqual(-0.001);
  });

  it("holds each value until the next when stepped", () => {
    expect(pathFrom([[0, 10], [10, 20]], "step")).toBe("M0 10 H10V20");
    expect(pathFrom([[0, 10], [10, 20]], "step-before")).toBe("M0 10 V20H10");
  });

  it("handles one point and none", () => {
    expect(pathFrom([[5, 5]], "smooth")).toBe("M5 5h0");
    expect(pathFrom([])).toBe("");
  });

  it("is reachable through sparkline()", () => {
    for (const curve of ["linear", "smooth", "step", "step-before"] as Curve[]) {
      expect(sparkline([1, 5, 2, 8], { curve }).path).toContain("M");
    }
    expect(sparkline([1, 5, 2, 8], { curve: "smooth" }).path).toContain("C");
  });

  it("closes the area under a curved line too", () => {
    const line = sparkline([1, 5, 2, 8], { curve: "smooth" });
    expect(line.area).toContain("C");
    expect(line.area.endsWith("Z")).toBe(true);
  });
});

describe("patterns", () => {
  it("gives identical patterns the same id, so one defs entry serves both", () => {
    expect(patternId("hatch", "#eee")).toBe(patternId("hatch", "#eee"));
    expect(patternId("hatch", "#eee")).not.toBe(patternId("dots", "#eee"));
    expect(patternId("hatch", "#eee")).not.toBe(patternId("hatch", "#ddd"));
  });

  it("builds each kind", () => {
    for (const kind of ["hatch", "cross", "dots"] as const) {
      const markup = patternMarkup({ kind, color: "#999", id: "x" });
      expect(markup).toContain("<pattern id=\"x\"");
      expect(markup).toContain("#999");
    }
    expect(patternMarkup({ kind: "solid", color: "#999", id: "x" })).toBe("");
  });

  it("paints the area through the pattern", () => {
    const svg = sparklineSvg([1, 5, 2, 8], { fill: "#999", fillPattern: "hatch" });
    expect(svg).toContain("<defs>");
    expect(svg).toContain("url(#pt-");
  });

  it("needs a fill to pattern", () => {
    expect(sparklineSvg([1, 5, 2, 8], { fillPattern: "hatch" })).not.toContain("<defs>");
  });

  it("stays flat colour when solid", () => {
    const svg = sparklineSvg([1, 5, 2, 8], { fill: "#999" });
    expect(svg).not.toContain("<defs>");
    expect(svg).toContain('fill="#999"');
  });
});

describe("dashes", () => {
  it("sets stroke-dasharray on the line", () => {
    expect(sparklineSvg([1, 2, 3], { strokeDasharray: "3 2" })).toContain('stroke-dasharray="3 2"');
  });

  it("leaves it off by default", () => {
    expect(sparklineSvg([1, 2, 3])).not.toContain("stroke-dasharray");
  });
});
