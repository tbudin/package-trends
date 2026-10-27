import { describe, expect, it } from "vitest";
import { changeDirection, describeTrend, formatChange, formatCount, formatExact } from "../src/format.js";
import { computeTrend } from "../src/trend.js";
import { days, range } from "./helpers.js";

describe("formatCount", () => {
  it("shortens large numbers", () => {
    expect(formatCount(1_234_567, "en-US")).toBe("1.2M");
    expect(formatCount(950, "en-US")).toBe("950");
  });
});

describe("formatExact", () => {
  it("groups the digits", () => {
    expect(formatExact(1_234_567, "en-US")).toBe("1,234,567");
  });
});

describe("formatChange", () => {
  it("always shows the sign", () => {
    expect(formatChange(0.124, "en-US")).toBe("+12%");
    expect(formatChange(-0.33, "en-US")).toBe("-33%");
  });

  it("keeps a decimal for small moves", () => {
    expect(formatChange(0.024, "en-US")).toBe("+2.4%");
  });

  it("gives an empty string for no ratio", () => {
    expect(formatChange(null)).toBe("");
    expect(formatChange(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("changeDirection", () => {
  it("reads the sign of the change", () => {
    expect(changeDirection({ change: 5 })).toBe("up");
    expect(changeDirection({ change: -5 })).toBe("down");
    expect(changeDirection({ change: 0 })).toBe("flat");
    expect(changeDirection({ change: null })).toBe("flat");
  });
});

describe("describeTrend", () => {
  it("states the total and the direction", () => {
    const trend = computeTrend(range(days(10, (i) => (i < 5 ? 100 : 200))), { smooth: 1 });
    const text = describeTrend(trend, "en-US");
    expect(text).toContain("1,500 downloads for demo");
    expect(text).toContain("up 100%");
  });

  it("stops at the total when there is no ratio", () => {
    const trend = computeTrend(range(days(1, () => 42)));
    expect(describeTrend(trend, "en-US")).toBe(
      "42 downloads for demo between 2026-01-01 and 2026-01-01.",
    );
  });
});
