import { describe, expect, it } from "vitest";
import {
  heatmapGeometry,
  heatmapSvg,
  levelFill,
  levelOpacity,
  localeWeekStart,
} from "../src/heatmap.js";
import { days } from "./helpers.js";

/** The weekday a `YYYY-MM-DD` really falls on, read straight from the date. */
const realWeekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();

describe("localeWeekStart", () => {
  it("reads the week start out of the locale", () => {
    expect(localeWeekStart("en-GB")).toBe(1);
    expect(localeWeekStart("en-US")).toBe(0);
    expect(localeWeekStart("ar-EG")).toBe(6);
  });

  it("falls back to Monday for a locale it cannot read", () => {
    expect(localeWeekStart("zz-ZZ-nonsense")).toBe(1);
  });
});

describe("heatmapGeometry", () => {
  it("puts every day in the row its real date falls on", () => {
    const map = heatmapGeometry(days(365, () => 1000), { weekStart: 1 });
    for (const cell of map.cells) {
      expect(cell.weekday).toBe((realWeekday(cell.day) - 1 + 7) % 7);
    }
  });

  it("gives every day its own column-and-row slot", () => {
    const map = heatmapGeometry(days(365, (i) => 1000 + i), { weekStart: 0 });
    const slots = new Set(map.cells.map((cell) => `${cell.week}:${cell.weekday}`));
    expect(slots.size).toBe(map.cells.length);
  });

  it("starts the first column at the first day's weekday, not at row 0", () => {
    // 2026-01-01 was a Thursday, so with a Monday week start it sits on row 3
    const map = heatmapGeometry(days(7, () => 1000), { weekStart: 1 });
    expect(map.cells[0]!.weekday).toBe(3);
    expect(map.cells[0]!.week).toBe(0);
    expect(map.cells[0]!.y).toBe(3 * (map.cellSize + map.cellGap));
  });

  it("keeps the calendar aligned when a day is absent from the series", () => {
    // not a zero: the entry itself is gone, so array position no longer tracks
    // the date and anything indexing by position slides a week sideways
    const full = days(28, () => 1000);
    const holed = [...full.slice(0, 10), ...full.slice(11)];
    const map = heatmapGeometry(holed, { weekStart: 1, gaps: "zero" });

    expect(map.cells).toHaveLength(27);
    for (const cell of map.cells) {
      expect(cell.weekday).toBe((realWeekday(cell.day) - 1 + 7) % 7);
    }
    const after = map.cells.find((cell) => cell.day === full[11]!.day)!;
    expect(after.weekday).toBe((realWeekday(full[11]!.day) - 1 + 7) % 7);
  });

  it("marks the days the gap repair interpolated", () => {
    const points = days(21, (i) => (i === 9 || i === 10 ? 0 : 50_000));
    const map = heatmapGeometry(points, { weekStart: 1 });
    const filled = map.cells.filter((cell) => cell.filled).map((cell) => cell.day);
    expect(filled).toEqual([points[9]!.day, points[10]!.day]);
    // and the value is the interpolation, not the zero npm reported
    expect(map.cells.find((cell) => cell.day === points[9]!.day)!.downloads).toBe(50_000);
  });

  it("leaves the zeros alone under gaps: zero", () => {
    const points = days(21, (i) => (i === 9 ? 0 : 50_000));
    const map = heatmapGeometry(points, { weekStart: 1, gaps: "zero" });
    expect(map.cells.some((cell) => cell.filled)).toBe(false);
    expect(map.cells.find((cell) => cell.day === points[9]!.day)!.downloads).toBe(0);
  });

  it("labels each month once, in order", () => {
    const map = heatmapGeometry(days(120, () => 1000), { weekStart: 1, locale: "en-GB" });
    expect(map.months.map((month) => month.month)).toEqual([1, 2, 3, 4]);
    const xs = map.months.map((month) => month.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("drops a leading sliver month that has no room for its name", () => {
    // 2026-01-29 to 2026-03-31: January owns one column, so its label would
    // land on top of February's and loses to it
    const points = days(90, () => 1000).slice(28);
    const map = heatmapGeometry(points, { weekStart: 1, locale: "en-GB" });
    expect(map.months.map((month) => month.month)).toEqual([2, 3]);
  });

  it("keeps every month when they all have room", () => {
    const map = heatmapGeometry(days(365, () => 1000), { weekStart: 1, locale: "en-GB" });
    const gaps = map.months.slice(1).map((month, i) => month.x - map.months[i]!.x);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(3 * (map.cellSize + map.cellGap));
    expect(map.months.length).toBeGreaterThanOrEqual(12);
  });

  it("measures the box from the weeks it actually spans", () => {
    const map = heatmapGeometry(days(14, () => 1000), { weekStart: 1, cellSize: 10, cellGap: 2 });
    expect(map.height).toBe(7 * 12 - 2);
    expect(map.width).toBe(map.weeks * 12 - 2);
  });

  it("returns an empty map rather than throwing on no data", () => {
    const map = heatmapGeometry([]);
    expect(map.cells).toEqual([]);
    expect(map.width).toBe(0);
    expect(map.months).toEqual([]);
  });
});

describe("the colour scale", () => {
  it("spans zero to the busiest day, so darkness is proportional", () => {
    const map = heatmapGeometry(days(28, () => 100), { levels: 5, weekStart: 1 });
    expect(map.thresholds).toEqual([20, 40, 60, 80]);
    // every day is the maximum, so every day is the top level
    expect(new Set(map.cells.map((cell) => cell.level))).toEqual(new Set([4]));
  });

  it("keeps growth visible: a year that doubles gets darker", () => {
    const growing = days(364, (i) => 1000 + i * 10);
    const map = heatmapGeometry(growing, { levels: 5, weekStart: 1 });
    const first = map.cells.slice(0, 30).reduce((sum, c) => sum + c.level, 0) / 30;
    const last = map.cells.slice(-30).reduce((sum, c) => sum + c.level, 0) / 30;
    expect(last).toBeGreaterThan(first + 1);
  });

  it("quantile hides that growth, which is why it is not the default", () => {
    const growing = days(364, (i) => 1000 + i * 10);
    // stationary, but with the same variety of values, so the comparison is
    // about trend rather than about how many distinct numbers there are
    const flat = days(364, (i) => 1000 + ((i * 37) % 364) * 10);
    const spread = (points: typeof growing) => {
      const map = heatmapGeometry(points, { levels: 5, scale: "quantile", weekStart: 1 });
      const occupancy = Array.from({ length: 5 }, (_, level) =>
        map.cells.filter((cell) => cell.level === level).length,
      );
      return Math.max(...occupancy) - Math.min(...occupancy);
    };
    // both come out evenly spread, so the two series look alike
    expect(spread(growing)).toBeLessThan(10);
    expect(spread(flat)).toBeLessThan(10);
  });

  it("puts a roughly equal number of days in each quantile level", () => {
    const map = heatmapGeometry(days(100, (i) => i * i), { levels: 4, scale: "quantile", weekStart: 1 });
    const occupancy = Array.from({ length: 4 }, (_, level) =>
      map.cells.filter((cell) => cell.level === level).length,
    );
    for (const count of occupancy) expect(count).toBeGreaterThanOrEqual(20);
  });
});

describe("levelOpacity", () => {
  it("rises with the level and tops out at full", () => {
    const steps = Array.from({ length: 5 }, (_, level) => levelOpacity(level, 5));
    expect(steps[4]).toBe(1);
    expect(steps[0]).toBeGreaterThan(0);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
  });

  it("keeps the quietest day visible rather than invisible", () => {
    expect(levelOpacity(0, 5)).toBeGreaterThanOrEqual(0.1);
  });
});

describe("heatmapSvg", () => {
  const year = days(365, (i) => 10_000 + (i % 7 < 5 ? 20_000 : 0));

  it("draws one square per day", () => {
    const svg = heatmapSvg(year, { weekStart: 1, months: false });
    expect(svg.match(/<rect/g)).toHaveLength(365);
  });

  it("adds the month labels by default and drops them on request", () => {
    expect(heatmapSvg(year, { weekStart: 1, locale: "en-GB" })).toContain("<text");
    expect(heatmapSvg(year, { weekStart: 1, months: false })).not.toContain("<text");
  });

  it("hatches an interpolated day over its square", () => {
    const holed = days(21, (i) => (i === 9 ? 0 : 50_000));
    const svg = heatmapSvg(holed, { weekStart: 1, months: false });
    expect(svg).toContain("<pattern");
    expect(svg.match(/<rect/g)).toHaveLength(22); // 21 days plus the one hatch
  });

  it("leaves out the pattern when nothing was interpolated", () => {
    expect(heatmapSvg(year, { weekStart: 1, months: false })).not.toContain("<pattern");
  });

  it("adds the ramp key with the legend", () => {
    const svg = heatmapSvg(year, { weekStart: 1, months: false, legend: true, levels: 5 });
    expect(svg).toContain("Less");
    expect(svg).toContain("More");
    expect(svg.match(/<rect/g)).toHaveLength(365 + 5);
  });

  it("is hidden from a screen reader until it is given a label", () => {
    expect(heatmapSvg(year, { weekStart: 1 })).toContain('aria-hidden="true"');
    const labelled = heatmapSvg(year, { weekStart: 1, label: "react downloads" });
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain("<title>react downloads</title>");
  });

  it("escapes a label rather than letting it close the tag", () => {
    const svg = heatmapSvg(year, { weekStart: 1, label: 'a "b" & <c>' });
    expect(svg).toContain("a &quot;b&quot; &amp; &lt;c&gt;");
    expect(svg).not.toContain("<c>");
  });

  it("renders nothing for an empty series", () => {
    expect(heatmapSvg([])).toBe("");
  });
});

describe("emptyColor", () => {
  const ramp = days(28, (i) => i * 1000);
  const quietCount = () =>
    heatmapGeometry(ramp, { levels: 5, weekStart: 1 }).cells.filter((cell) => cell.level === 0)
      .length;

  it("keeps the ramp one colour until it is set", () => {
    expect(levelFill(0, 5, "#000")).toEqual({ fill: "#000", opacity: 0.12 });
    expect(levelFill(4, 5, "#000")).toEqual({ fill: "#000", opacity: 1 });
  });

  it("rounds the ramp, so both renderers emit the same number", () => {
    // levelOpacity is exact: a quarter of the way up a 5-step ramp is
    // 0.33999999999999997, which React would print in full
    expect(levelOpacity(1, 5)).not.toBe(0.34);
    expect(levelFill(1, 5, "#000").opacity).toBe(0.34);
  });

  it("gives a colour of its own to the quietest level and to no other", () => {
    expect(levelFill(0, 5, "#216e39", "#ebedf0")).toEqual({ fill: "#ebedf0", opacity: 1 });
    expect(levelFill(1, 5, "#216e39", "#ebedf0")).toEqual({ fill: "#216e39", opacity: 0.34 });
  });

  it("paints it on exactly the quietest squares", () => {
    const svg = heatmapSvg(ramp, { levels: 5, weekStart: 1, months: false, emptyColor: "#ebedf0" });
    expect(svg.match(/fill="#ebedf0"/g)).toHaveLength(quietCount());
  });

  it("changes nothing when it is left alone", () => {
    expect(heatmapSvg(ramp, { levels: 5, weekStart: 1, months: false })).not.toContain("#ebedf0");
  });

  it("shows in the legend key, in the first swatch only", () => {
    const svg = heatmapSvg(ramp, {
      levels: 5,
      weekStart: 1,
      months: false,
      legend: true,
      color: "#216e39",
      emptyColor: "#ebedf0",
    });
    // the quiet squares, plus the one legend swatch that stands for them
    expect(svg.match(/fill="#ebedf0"/g)).toHaveLength(quietCount() + 1);
  });
});
