import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackageTrend } from "../src/react.js";
import { between } from "../src/api.js";
import { toMonthly, shapeSeries } from "../src/series.js";
import { formatChange, formatCount, formatExact } from "../src/format.js";
import { days, range } from "./helpers.js";

const data = range(days(30, (i) => (i % 7 < 5 ? 30_000 : 10_000) * (1 + i * 0.05)), "demo");
const noNetwork = () =>
  vi.fn(() => {
    throw new Error("fetched during a server render");
  }) as unknown as typeof globalThis.fetch;

describe("number formatting", () => {
  it("takes Intl options over the compact default", () => {
    expect(formatCount(1_234_567, "en-US")).toBe("1.2M");
    expect(formatCount(1_234_567, "en-US", { notation: "standard" })).toBe("1,234,567");
    expect(formatCount(1_234_567, "en-US", { maximumFractionDigits: 3 })).toBe("1.235M");
  });

  it("takes them for the change too", () => {
    expect(formatChange(0.1234, "en-US")).toBe("+12%");
    expect(formatChange(0.1234, "en-US", { maximumFractionDigits: 2 })).toBe("+12.34%");
    expect(formatChange(0.1234, "en-US", { signDisplay: "never" })).toBe("12%");
  });

  it("reaches currency and other styles through the same door", () => {
    expect(formatExact(42, "en-US", { style: "currency", currency: "USD" })).toBe("$42.00");
  });

  it("flows through the component", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo" data={data} fetch={noNetwork()} variant="text" locale="en-US"
        numberFormat={{ notation: "standard" }} percentFormat={{ maximumFractionDigits: 2 }}
      />,
    );
    expect(html).toMatch(/\d{3},\d{3}/);
    expect(html).toMatch(/\+\d+\.\d{2}%/);
  });
});

describe("styles", () => {
  it("sets the weight of each part", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo" data={data} fetch={noNetwork()} variant="kpi" locale="en-US"
        styles={{ count: { fontWeight: 400 }, change: { fontWeight: 700 } }}
      />,
    );
    expect(html).toContain("font-weight:400");
    expect(html).toContain("font-weight:700");
  });

  it("is 600 on the count by default", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} variant="kpi" locale="en-US" />,
    );
    expect(html).toContain("font-weight:600");
  });

  it("changes the display of the root", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo" data={data} fetch={noNetwork()}
        styles={{ root: { display: "inline" } }}
      />,
    );
    expect(html).toContain("display:inline;");
  });

  it("reaches the chart element", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo" data={data} fetch={noNetwork()}
        styles={{ chart: { opacity: 0.5 } }}
      />,
    );
    expect(html).toContain("opacity:0.5");
  });
});

describe("interactive", () => {
  it("is not focusable unless asked", () => {
    const off = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} />,
    );
    expect(off).not.toContain("tabindex");
  });

  it("takes focus and announces politely when on", () => {
    const on = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} interactive />,
    );
    expect(on).toContain('tabindex="0"');
    expect(on).toContain('aria-live="polite"');
  });
});

describe("aggregate month", () => {
  it("sums calendar months and drops the partial ones", () => {
    // 1 Jan to 20 Mar: January and February are whole, March is not
    const points = days(79, () => 100);
    const months = toMonthly(points);
    expect(months).toHaveLength(2);
    expect(months.map((m) => m.day.slice(0, 7))).toEqual(["2026-01", "2026-02"]);
    expect(months[0]!.downloads).toBe(3100);
    expect(months[1]!.downloads).toBe(2800);
  });

  it("keeps a short range rather than drawing nothing", () => {
    expect(toMonthly(days(10, () => 100))).toHaveLength(1);
  });

  it("is reachable through shapeSeries", () => {
    expect(shapeSeries(range(days(79, () => 100)), { aggregate: "month" })).toHaveLength(2);
  });
});

describe("between", () => {
  it("builds the range npm takes", () => {
    expect(between("2026-01-01", "2026-03-31")).toBe("2026-01-01:2026-03-31");
  });

  it("accepts dates", () => {
    expect(between(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 0, 8)))).toBe(
      "2026-01-01:2026-01-08",
    );
  });

  it("refuses a range that runs backwards", () => {
    expect(() => between("2026-03-31", "2026-01-01")).toThrow(RangeError);
  });

  it("refuses something that is not a date", () => {
    expect(() => between("last-month", "2026-01-01")).toThrow(/YYYY-MM-DD/);
  });
});
