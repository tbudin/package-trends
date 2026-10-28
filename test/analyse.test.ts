import { describe, expect, it } from "vitest";
import { analyse } from "../src/analyse.js";
import { formatWeekday } from "../src/format.js";
import { days, range } from "./helpers.js";

const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
const isWeekend = (day: string) => weekdayOf(day) === 0 || weekdayOf(day) === 6;

describe("analyse", () => {
  it("reads a straight line as a confident rise", () => {
    const a = analyse(range(days(28, (i) => 1000 + i * 100)));
    expect(a.direction).toBe("rising");
    expect(a.fit.rSquared).toBeCloseTo(1, 5);
    expect(a.fit.slope).toBeCloseTo(100, 5);
    expect(a.confidence).toBe("strong");
  });

  it("reads a level series as flat, with no confidence in a trend", () => {
    const a = analyse(range(days(28, () => 1000)));
    expect(a.direction).toBe("flat");
    expect(a.fit.rSquared).toBe(0);
    expect(a.confidence).toBe("weak");
  });

  it("will not call noise a trend", () => {
    // alternating either side of a level: a line explains almost none of it
    const a = analyse(range(days(28, (i) => (i % 2 ? 1200 : 800))));
    expect(a.confidence).toBe("weak");
    expect(a.fit.rSquared).toBeLessThan(0.1);
  });

  it("compounds growth on whole weeks, not on the first and last day", () => {
    // each week exactly double the one before
    const a = analyse(range(days(28, (i) => 100 * 2 ** Math.floor(i / 7))));
    expect(a.weeklyGrowth).toBeCloseTo(1, 5);
    expect(a.dailyGrowth).toBeCloseTo(2 ** (1 / 7) - 1, 5);
    expect(a.annualisedGrowth).toBeGreaterThan(1e15);
  });

  it("gives no growth rate when the first week had nothing", () => {
    // gaps: "zero" so the empty first week stays, rather than reading as missing
    const a = analyse(range(days(28, (i) => (i < 7 ? 0 : 500))), { gaps: "zero" });
    expect(a.weeklyGrowth).toBeNull();
    expect(a.annualisedGrowth).toBeNull();
  });

  it("splits weekdays from weekends", () => {
    const a = analyse(range(days(28, (_, ) => 0).map((p) => ({
      ...p,
      downloads: isWeekend(p.day) ? 10_000 : 30_000,
    }))));
    expect(a.weekday.mean).toBeCloseTo(30_000, 5);
    expect(a.weekend.mean).toBeCloseTo(10_000, 5);
    expect(a.weekendRatio).toBeCloseTo(1 / 3, 5);
    expect(a.weekday.share + a.weekend.share).toBeCloseTo(1, 5);
  });

  it("names the busiest and quietest day", () => {
    const a = analyse(range(days(28, (_, ) => 0).map((p) => ({
      ...p,
      downloads: weekdayOf(p.day) === 2 ? 99_000 : 10_000,
    }))));
    expect(a.busiestWeekday.weekday).toBe(2);
    expect(formatWeekday(a.busiestWeekday.weekday, "en-US")).toBe("Tuesday");
    expect(a.quietestWeekday.mean).toBe(10_000);
  });

  it("finds a spike off the trend line", () => {
    const a = analyse(range(days(28, (i) => (i === 20 ? 90_000 : 1_000))));
    expect(a.spikes).toHaveLength(1);
    expect(a.spikes[0]!.day).toBe("2026-01-21");
    expect(a.spikes[0]!.sigma).toBeGreaterThan(2);
  });

  it("finds no spikes in a steady series", () => {
    expect(analyse(range(days(28, () => 1_000))).spikes).toEqual([]);
  });

  it("counts a run of rising weeks", () => {
    const a = analyse(range(days(28, (i) => 100 + Math.floor(i / 7) * 50)));
    expect(a.streak).toEqual({ direction: "rising", weeks: 3 });
  });

  it("counts a run of falling weeks", () => {
    const a = analyse(range(days(28, (i) => 1000 - Math.floor(i / 7) * 50)));
    expect(a.streak?.direction).toBe("falling");
  });

  it("measures volatility on the smoothed series, so the weekend is not counted", () => {
    const cyclical = range(days(28, (_, ) => 0).map((p) => ({
      ...p,
      downloads: isWeekend(p.day) ? 10_000 : 30_000,
    })));
    expect(analyse(cyclical).volatility).toBeLessThan(0.02);
  });

  it("carries the plain figures through", () => {
    const a = analyse(range(days(10, (i) => (i + 1) * 100), "@scope/thing"));
    expect(a.package).toBe("@scope/thing");
    expect(a.total).toBe(5500);
    expect(a.median).toBe(550);
    expect(a.latest).toBe(1000);
    expect(a.peak.downloads).toBe(1000);
    expect(a.trough.downloads).toBe(100);
    expect(a.days).toBe(10);
  });
});
