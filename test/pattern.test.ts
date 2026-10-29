import { describe, expect, it } from "vitest";
import { patternId, patternMarkup, patternTile } from "../src/pattern.js";
import type { FillPattern } from "../src/pattern.js";

const PATTERNED: FillPattern[] = ["hatch", "cross", "dots"];

describe("patternTile", () => {
  it("gives every pattern but solid a tile", () => {
    for (const kind of PATTERNED) expect(patternTile(kind, "#000")).not.toBeNull();
    expect(patternTile("solid", "#000")).toBeNull();
  });

  it("carries the colour into the shape, whichever shape it is", () => {
    for (const kind of PATTERNED) {
      const tile = patternTile(kind, "tomato")!;
      const painted = tile.shape.kind === "line" ? tile.shape.stroke : tile.shape.fill;
      expect(painted).toBe("tomato");
    }
  });

  it("keeps the dot inside its own tile", () => {
    const tile = patternTile("dots", "#000")!;
    expect(tile.shape.kind).toBe("dot");
    if (tile.shape.kind !== "dot") return;
    expect(tile.shape.cx + tile.shape.r).toBeLessThanOrEqual(tile.size);
    expect(tile.shape.cy + tile.shape.r).toBeLessThanOrEqual(tile.size);
  });

  it("is the one source both renderers draw from", () => {
    // patternMarkup must not invent geometry of its own, or a server render
    // and the React tree would disagree about the same pattern
    for (const kind of PATTERNED) {
      const tile = patternTile(kind, "#123456")!;
      const markup = patternMarkup({ kind, color: "#123456", id: patternId(kind, "#123456") });
      expect(markup).toContain(`width="${tile.size}"`);
      expect(markup).toContain("#123456");
      if (tile.transform) expect(markup).toContain(`patternTransform="${tile.transform}"`);
    }
  });

  it("writes no markup for solid", () => {
    expect(patternMarkup({ kind: "solid", color: "#000", id: "x" })).toBe("");
  });
});

describe("patternId", () => {
  it("is stable for the same pattern and different across patterns", () => {
    expect(patternId("hatch", "#000")).toBe(patternId("hatch", "#000"));
    expect(patternId("hatch", "#000")).not.toBe(patternId("cross", "#000"));
    expect(patternId("hatch", "#000")).not.toBe(patternId("hatch", "#fff"));
  });

  it("is usable as an SVG id", () => {
    expect(patternId("dots", "rgb(1, 2, 3)")).toMatch(/^pt-[a-z0-9]+$/);
  });
});
