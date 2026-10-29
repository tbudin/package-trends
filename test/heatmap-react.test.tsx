import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackageHeatmap } from "../src/heatmap-react.js";
import { heatmapSvg } from "../src/heatmap.js";
import { days, range } from "./helpers.js";

const year = days(365, (i) => (i % 7 < 5 ? 30_000 : 10_000));
const data = range(year, "demo");

/** Fails the test if anything reaches the network during a render. */
function noNetwork() {
  const fetchImpl = vi.fn(() => {
    throw new Error("fetched during a server render");
  });
  return fetchImpl as unknown as typeof globalThis.fetch;
}

describe("PackageHeatmap on the server", () => {
  it("renders the calendar from data without fetching", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} weekStart={1} locale="en-GB" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html.match(/<rect/g)).toHaveLength(365);
  });

  it("names itself with the real total for a screen reader", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} weekStart={1} locale="en-US" />,
    );
    // 261 weekdays at 30k plus 104 weekend days at 10k = 8,870,000
    expect(html).toContain("8.9M downloads across 365 days");
  });

  it("takes a label of its own", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} label="a year of demo" />,
    );
    expect(html).toContain('aria-label="a year of demo"');
  });

  it("gives every square its own tooltip by default", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} weekStart={1} locale="en-US" />,
    );
    // one per day, plus the chart's own
    expect(html.match(/<title>/g)).toHaveLength(366);
    expect(html).toContain("2026-01-01");
  });

  it("drops the tooltips on request", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} cellTitles={false} />,
    );
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it("says which days were interpolated", () => {
    const holed = range(days(21, (i) => (i === 9 ? 0 : 50_000)), "demo");
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={holed} fetch={noNetwork()} weekStart={1} locale="en-US" />,
    );
    expect(html).toContain("interpolated");
    expect(html).toContain('data-filled=""');
  });

  it("renders the fallback while there is nothing to draw", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" fetch={noNetwork()} fallback={<span>loading</span>} />,
    );
    expect(html).toBe("<span>loading</span>");
  });

  it("hands the state to a render prop instead of drawing", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap package="demo" data={data} fetch={noNetwork()} weekStart={1}>
        {({ map }) => <b>{map?.weeks} weeks</b>}
      </PackageHeatmap>,
    );
    expect(html).toBe("<b>53 weeks</b>");
  });

  it("shades an emptyColor ramp exactly as the string renderer does", () => {
    const options = { weekStart: 1, color: "#216e39", emptyColor: "#ebedf0", levels: 5 } as const;
    // a rising ramp, so some days really do land on the quietest level
    const ramp = days(28, (i) => i * 1000);
    const html = renderToStaticMarkup(
      <PackageHeatmap
        package="demo"
        data={range(ramp, "demo")}
        fetch={noNetwork()}
        cellTitles={false}
        months={false}
        {...options}
      />,
    );
    const svg = heatmapSvg(ramp, { ...options, months: false });

    const shades = (markup: string) =>
      (markup.match(/<rect[^>]*>/g) ?? []).map((rect) =>
        [/fill="([^"]+)"/, /opacity="([\d.]+)"/].map((pattern) => pattern.exec(rect)?.[1]).join(","),
      );
    expect(shades(html)).toEqual(shades(svg));
    expect(html).toContain('fill="#ebedf0"');
  });

  it("puts svgProps on the svg, last, so they win", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap
        package="demo"
        data={data}
        fetch={noNetwork()}
        cellTitles={false}
        svgProps={{ id: "downloads", "data-kind": "heatmap", role: "presentation" }}
      />,
    );
    expect(html).toContain('id="downloads"');
    expect(html).toContain('data-kind="heatmap"');
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain('role="img"');
  });

  it("draws the same squares as the string renderer", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap
        package="demo"
        data={data}
        fetch={noNetwork()}
        weekStart={1}
        locale="en-GB"
        cellTitles={false}
      />,
    );
    const svg = heatmapSvg(year, { weekStart: 1, locale: "en-GB" });

    const squares = (markup: string) =>
      (markup.match(/<rect[^>]*>/g) ?? []).map((rect) =>
        [/x="([\d.]+)"/, /y="([\d.]+)"/].map((pattern) => pattern.exec(rect)?.[1]).join(","),
      );
    expect(squares(html)).toEqual(squares(svg));
  });
});
