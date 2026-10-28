import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { commonDays, compare, fetchMany, indexSeries } from "../src/compare.js";
import { PackageComparison } from "../src/compare-react.js";
import { days, range } from "./helpers.js";

const big = range(days(28, (i) => 1_000_000 + i * 20_000), "react");
const small = range(days(28, (i) => 1_000 + i * 60), "tiny");
const noNetwork = () =>
  vi.fn(() => {
    throw new Error("fetched during a server render");
  }) as unknown as typeof globalThis.fetch;

describe("compare", () => {
  it("puts every series on one domain", () => {
    const c = compare([big, small]);
    const all = c.series.flatMap((s) => s.values);
    expect(c.domain[0]).toBe(Math.min(...all));
    expect(c.domain[1]).toBe(Math.max(...all));
  });

  it("reports the spread, which says whether an absolute chart will read", () => {
    const c = compare([big, small]);
    expect(c.spread).toBeGreaterThan(100);
    expect(compare([big, big]).spread).toBe(1);
  });

  it("names the leader", () => {
    expect(compare([small, big]).leader).toBe("react");
  });

  it("keeps the order it was given", () => {
    expect(compare([small, big]).series.map((s) => s.package)).toEqual(["tiny", "react"]);
  });

  it("computes each package's figures on its real numbers, not the indexed ones", () => {
    const c = compare([big, small], { scale: "indexed" });
    expect(c.series[1]!.trend.total).toBe(small.points.reduce((t, p) => t + p.downloads, 0));
    expect(c.series[1]!.values[0]).toBe(100);
  });

  it("gathers the gap days of every package", () => {
    const holey = range(days(28, (i) => (i === 10 ? 0 : 500)), "holey");
    expect(compare([big, holey]).gapDays).toEqual(["2026-01-11"]);
  });

  it("refuses an empty set", () => {
    expect(() => compare([])).toThrow(RangeError);
  });
});

describe("indexSeries", () => {
  it("restates a series against its own start", () => {
    expect(indexSeries([50, 100, 25])).toEqual([100, 200, 50]);
  });

  it("makes two series of very different size comparable", () => {
    const a = indexSeries([1_000_000, 1_100_000]);
    const b = indexSeries([1_000, 1_100]);
    expect(a).toEqual(b);
  });

  it("bases on the first value above zero", () => {
    expect(indexSeries([0, 0, 40, 80])).toEqual([0, 0, 100, 200]);
  });

  it("leaves an all-zero series alone", () => {
    expect(indexSeries([0, 0])).toEqual([0, 0]);
  });
});

describe("fetchMany", () => {
  it("asks for each distinct name once", async () => {
    const seen: string[] = [];
    const one = async (name: string) => {
      seen.push(name);
      return range(days(7, () => 1), name);
    };
    const out = await fetchMany(["react", "vue", "react"], one);
    expect(seen).toEqual(["react", "vue"]);
    expect(out.map((r) => r.package)).toEqual(["react", "vue", "react"]);
  });
});

describe("commonDays", () => {
  it("returns the days every package has", () => {
    const a = range(days(5, () => 1));
    const b = range(days(3, () => 1));
    expect(commonDays([a, b])).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("PackageComparison", () => {
  it("draws one line per package with a legend", () => {
    const html = renderToStaticMarkup(
      <PackageComparison packages={["react", "tiny"]} data={[big, small]} fetch={noNetwork()} />,
    );
    expect(html.match(/<path/g)).toHaveLength(4); // two lines, two legend strokes
    expect(html).toContain("pt-legend");
    expect(html).toContain("react");
    expect(html).toContain("tiny");
  });

  it("tells the series apart by dash as well as colour", () => {
    const html = renderToStaticMarkup(
      <PackageComparison packages={["a", "b"]} data={[big, small]} fetch={noNetwork()} />,
    );
    expect(html).toContain("stroke-dasharray");
  });

  it("draws them all solid when asked", () => {
    const html = renderToStaticMarkup(
      <PackageComparison packages={["a", "b"]} data={[big, small]} fetch={noNetwork()} dashes={[]} />,
    );
    expect(html).not.toContain("stroke-dasharray");
  });

  it("gives each package a row in the table variant", () => {
    const html = renderToStaticMarkup(
      <PackageComparison
        packages={["react", "tiny"]} data={[big, small]} fetch={noNetwork()}
        variant="table" locale="en-US"
      />,
    );
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain('scope="row"');
    expect(html).toContain("data-direction");
  });

  it("scales each table row to itself, so no row is a flat line", () => {
    const html = renderToStaticMarkup(
      <PackageComparison
        packages={["react", "tiny"]} data={[big, small]} fetch={noNetwork()}
        variant="table" width={100} height={20}
      />,
    );
    // both rows draw the same shape, because both rise by the same proportion
    const paths = [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe(paths[1]);
  });

  it("shares the scale across rows when asked", () => {
    const html = renderToStaticMarkup(
      <PackageComparison
        packages={["react", "tiny"]} data={[big, small]} fetch={noNetwork()}
        variant="table" sharedDomain width={100} height={20}
      />,
    );
    const paths = [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths[0]).not.toBe(paths[1]);
  });

  it("hands the comparison to a render prop", () => {
    const html = renderToStaticMarkup(
      <PackageComparison packages={["a", "b"]} data={[big, small]} fetch={noNetwork()}>
        {({ comparison }) => <b>{comparison ? comparison.leader : "…"}</b>}
      </PackageComparison>,
    );
    expect(html).toBe("<b>react</b>");
  });

  it("shows a placeholder before the data lands", () => {
    const html = renderToStaticMarkup(
      <PackageComparison packages={["a"]} fetch={noNetwork()} fallback="comparing…" />,
    );
    expect(html).toContain("comparing…");
  });
});
