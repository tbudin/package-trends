import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackageTrend, Sparkline } from "../src/react.js";
import { days, range } from "./helpers.js";

const data = range(days(30, (i) => (i % 7 < 5 ? 30_000 : 10_000)), "demo");
const rising = range(days(30, (i) => (i % 7 < 5 ? 30_000 : 10_000) * (1 + i * 0.05)), "demo");

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

describe("PackageTrend colours", () => {
  it("inherits the surrounding text when no colours are given", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" variant="text" data={rising} fetch={noNetwork()} locale="en-US" />,
    );
    expect(html).toContain('data-direction="up"');
    // no colour is written, so the change takes the host's text colour
    expect(html).not.toMatch(/class="pt-change"[^>]*style="[^"]*color:/);
  });

  it("takes the colours it is given", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo"
        variant="text"
        data={rising}
        fetch={noNetwork()}
        colors={{ up: "#0a7", down: "#c33" }}
        locale="en-US"
      />,
    );
    expect(html).toContain("color:#0a7");
  });

  it("keeps data-direction either way, so CSS can style it instead", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" variant="kpi" data={rising} fetch={noNetwork()} locale="en-US" />,
    );
    expect(html).toContain('data-direction="up"');
  });
});

describe("PackageTrend chart types", () => {
  it("draws a line by default", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} />,
    );
    expect(html).toContain("<path");
    expect(html).not.toContain("<rect");
  });

  it("draws columns when asked", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} chart="column" />,
    );
    expect(html).toContain("<rect");
  });

  it("marks the points it is told to", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo"
        data={data}
        fetch={noNetwork()}
        mark={["high", "last"]}
        markColor={{ high: "#f0f" }}
      />,
    );
    expect(html).toContain("#f0f");
    expect(html.match(/<circle/g)).toHaveLength(2);
  });
});

describe("PackageTrend passes shaping options through", () => {
  // `gaps` once fell into the geometry rest-prop and was silently dropped,
  // so the option appeared to do nothing
  const holey = range(
    days(28, (i) => ([6, 13, 20].includes(i) ? 0 : 30_000)),
    "demo",
  );

  it("repairs gaps by default", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={holey} fetch={noNetwork()} variant="text" locale="en-US" smooth={1} />,
    );
    expect(html).toContain("840K");
  });

  it("takes the zeros literally when told to", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo" data={holey} fetch={noNetwork()} variant="text"
        locale="en-US" smooth={1} gaps="zero"
      />,
    );
    expect(html).toContain("750K");
  });

  it("honours aggregate and smooth", () => {
    const weekly = renderToStaticMarkup(
      <PackageTrend package="demo" data={holey} fetch={noNetwork()} aggregate="week" />,
    );
    const daily = renderToStaticMarkup(
      <PackageTrend package="demo" data={holey} fetch={noNetwork()} smooth={1} />,
    );
    expect(weekly).not.toBe(daily);
  });
});

describe("PackageTrend labelling", () => {
  it("builds an accessible name from the trend by default", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} locale="en-US" />,
    );
    expect(html).toContain("740,000 downloads for demo");
  });

  it("takes a label of its own", () => {
    const html = renderToStaticMarkup(
      <PackageTrend package="demo" data={data} fetch={noNetwork()} label="Weekly pulls" />,
    );
    expect(html).toContain('aria-label="Weekly pulls"');
    expect(html).not.toContain("740,000 downloads for demo");
  });

  it("takes a label built from the trend", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="demo"
        data={data}
        fetch={noNetwork()}
        label={(trend) => `${trend.points.length} days`}
      />,
    );
    expect(html).toContain('aria-label="30 days"');
  });
});

describe("Sparkline", () => {
  it("hides itself from a screen reader without a label", () => {
    const html = renderToStaticMarkup(<Sparkline values={[1, 2, 3]} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title>");
  });

  it("stays inside a narrow container by default", () => {
    const html = renderToStaticMarkup(<Sparkline values={[1, 2, 3]} width={120} />);
    expect(html).toContain("max-width:100%");
  });

  it("fills the container when fluid", () => {
    const html = renderToStaticMarkup(<Sparkline values={[1, 2, 3]} width={120} fluid />);
    expect(html).toContain("width:100%");
  });

  it("draws the area only when filled", () => {
    expect(renderToStaticMarkup(<Sparkline values={[1, 2, 3]} />).match(/<path/g)).toHaveLength(1);
    expect(
      renderToStaticMarkup(<Sparkline values={[1, 2, 3]} fill="#eee" />).match(/<path/g),
    ).toHaveLength(2);
  });
});
