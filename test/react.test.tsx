import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackageTrend, Sparkline } from "../src/react.js";
import { days, range } from "./helpers.js";

const data = range(days(30, (i) => (i % 7 < 5 ? 30_000 : 10_000)), "demo");

/** Fails the test if anything reaches the network during a render. */
function noNetwork() {
  const fetchImpl = vi.fn(() => {
    throw new Error("fetched during a server render");
  });
  return fetchImpl as unknown as typeof globalThis.fetch;
}

describe("PackageTrend on the server", () => {
  it("renders a sparkline from data without fetching", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} locale="en-US" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).not.toContain("—");
  });

  it("renders the text variant with the real total", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" variant="text" data={data} fetch={noNetwork()} locale="en-US" />,
    );
    // 22 weekdays at 30k plus 8 weekend days at 10k = 740,000
    expect(html).toContain("downloads");
    expect(html).toContain("740K");
  });

  it("renders the kpi variant with a chart and a package name", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" variant="kpi" data={data} fetch={noNetwork()} locale="en-US" />,
    );
    expect(html).toContain("pt-kpi");
    expect(html).toContain("demo");
    expect(html).toContain("<svg");
  });

  it("hands the trend to a render prop instead of its own markup", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()}>
        {({ trend }) => <b>{trend ? trend.points.length : 0}</b>}
      </PackageTrend>,
    );
    expect(html).toBe("<b>30</b>");
  });

  it("shows the fallback when there is no data yet", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" fetch={noNetwork()} fallback="loading" />,
    );
    expect(html).toContain("loading");
  });
});

describe("Sparkline", () => {
  it("hides itself from a screen reader without a label", () => {
    const html = renderToStaticMarkup(<Sparkline values={[1, 2, 3]} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title>");
  });

  it("draws the area only when filled", () => {
    expect(renderToStaticMarkup(<Sparkline values={[1, 2, 3]} />).match(/<path/g)).toHaveLength(1);
    expect(
      renderToStaticMarkup(<Sparkline values={[1, 2, 3]} fill="#eee" />).match(/<path/g),
    ).toHaveLength(2);
  });
});
