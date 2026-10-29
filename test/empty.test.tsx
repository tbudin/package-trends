import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analyse } from "../src/analyse.js";
import { compare } from "../src/compare.js";
import { PackageComparison } from "../src/compare-react.js";
import { PackageTrendsError } from "../src/error.js";
import { heatmapGeometry, heatmapSvg } from "../src/heatmap.js";
import { PackageHeatmap } from "../src/heatmap-react.js";
import { PackageTrend } from "../src/react.js";
import { sparkline } from "../src/sparkline.js";
import { computeTrend } from "../src/trend.js";
import type { DownloadRange } from "../src/types.js";

/** A range with no points. `fetchDownloads` never returns one — it throws — but
 *  anything that caches, serialises or hand-builds a range can produce one. */
const empty: DownloadRange = { package: "ghost", start: "2026-01-01", end: "2026-01-31", points: [] };

const noNetwork = () =>
  vi.fn(() => {
    throw new Error("fetched during a server render");
  }) as unknown as typeof globalThis.fetch;

describe("a summary of nothing", () => {
  it("is refused, with the package named", () => {
    expect(() => computeTrend(empty)).toThrow(PackageTrendsError);
    try {
      computeTrend(empty);
    } catch (cause) {
      expect((cause as PackageTrendsError).package).toBe("ghost");
    }
  });

  it("is refused through compare too, rather than crashing inside it", () => {
    expect(() => compare([empty])).toThrow(PackageTrendsError);
  });

  it("is refused by analyse on the same grounds", () => {
    // it used to answer: mean and median NaN, peak and trough undefined behind
    // a type promising a DownloadPoint, and JSON.stringify turns NaN into null
    expect(() => analyse(empty)).toThrow(PackageTrendsError);
  });
});

describe("a drawing of nothing", () => {
  // the deliberate asymmetry: a renderer can honestly draw nothing, a summary
  // would have to report zeros that read as real measurements
  it("is allowed, and draws nothing", () => {
    expect(sparkline([]).points).toEqual([]);
    expect(heatmapGeometry([]).cells).toEqual([]);
    expect(heatmapSvg([])).toBe("");
  });
});

describe("empty data through React", () => {
  it("does not take the render down with it", () => {
    expect(() =>
      renderToStaticMarkup(<PackageTrend package="ghost" data={empty} fetch={noNetwork()} />),
    ).not.toThrow();
    expect(() =>
      renderToStaticMarkup(
        <PackageComparison packages={["ghost"]} data={[empty]} fetch={noNetwork()} />,
      ),
    ).not.toThrow();
    expect(() =>
      renderToStaticMarkup(<PackageHeatmap package="ghost" data={empty} fetch={noNetwork()} />),
    ).not.toThrow();
  });

  it("offers the failure to renderError instead", () => {
    const html = renderToStaticMarkup(
      <PackageTrend
        package="ghost"
        data={empty}
        fetch={noNetwork()}
        renderError={(error) => <p>{error.message}</p>}
      />,
    );
    expect(html).toBe("<p>No downloads to summarise for &quot;ghost&quot;.</p>");
  });

  it("hands the comparison's failure over the same way", () => {
    const html = renderToStaticMarkup(
      <PackageComparison
        packages={["ghost"]}
        data={[empty]}
        fetch={noNetwork()}
        renderError={(error) => <p>{error.name}</p>}
      />,
    );
    expect(html).toBe("<p>PackageTrendsError</p>");
  });

  it("shows the heatmap's fallback rather than a zero-sized svg", () => {
    const html = renderToStaticMarkup(
      <PackageHeatmap
        package="ghost"
        data={empty}
        fetch={noNetwork()}
        fallback={<span>no data</span>}
      />,
    );
    expect(html).toBe("<span>no data</span>");
  });
});
