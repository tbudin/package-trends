export type Curve = "linear" | "smooth" | "step" | "step-before";

type Point = readonly [number, number];

/**
 * Builds the `d` of a path through the points.
 *
 * `"smooth"` is monotone cubic (Fritsch–Carlson), not a cardinal spline. The
 * difference matters for counts: a cardinal spline overshoots a local
 * extreme, so a sparkline of downloads would draw a dip below the real low —
 * and below zero where the low is near it — inventing a number that never
 * happened. Monotone cubic cannot overshoot: between two points the curve
 * stays within their values.
 */
export function pathFrom(points: readonly Point[], curve: Curve = "linear"): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0]!;
    return `M${r(x)} ${r(y)}h0`;
  }

  switch (curve) {
    case "smooth":
      return monotone(points);
    case "step":
      return steps(points, "after");
    case "step-before":
      return steps(points, "before");
    default:
      return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`).join(" ");
  }
}

function steps(points: readonly Point[], side: "after" | "before"): string {
  const out = [`M${r(points[0]![0])} ${r(points[0]![1])}`];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    const [, prevY] = points[i - 1]!;
    out.push(side === "after" ? `H${r(x)}V${r(y)}` : `V${r(y)}H${r(x)}`);
    void prevY;
  }
  return out.join(" ");
}

function monotone(points: readonly Point[]): string {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);

  // secant slopes between neighbours
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1]! - xs[i]!;
    slopes.push(dx === 0 ? 0 : (ys[i + 1]! - ys[i]!) / dx);
  }

  // tangents, then the Fritsch–Carlson correction that forbids overshoot
  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0]!;
  tangents[n - 1] = slopes[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]!;
    const b = slopes[i]!;
    tangents[i] = a * b <= 0 ? 0 : (a + b) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const slope = slopes[i]!;
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const alpha = tangents[i]! / slope;
    const beta = tangents[i + 1]! / slope;
    const sum = alpha * alpha + beta * beta;
    if (sum > 9) {
      const tau = 3 / Math.sqrt(sum);
      tangents[i] = tau * alpha * slope;
      tangents[i + 1] = tau * beta * slope;
    }
  }

  const out = [`M${r(xs[0]!)} ${r(ys[0]!)}`];
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1]! - xs[i]!) / 3;
    out.push(
      `C${r(xs[i]! + dx)} ${r(ys[i]! + tangents[i]! * dx)}` +
        ` ${r(xs[i + 1]! - dx)} ${r(ys[i + 1]! - tangents[i + 1]! * dx)}` +
        ` ${r(xs[i + 1]!)} ${r(ys[i + 1]!)}`,
    );
  }
  return out.join(" ");
}

function r(value: number): number {
  return Math.round(value * 100) / 100;
}
