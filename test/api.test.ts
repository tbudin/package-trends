import { describe, expect, it, vi } from "vitest";
import { fetchDownloads, normaliseRange } from "../src/api.js";
import { PackageTrendsError } from "../src/error.js";

const payload = {
  start: "2026-01-01",
  end: "2026-01-02",
  package: "demo",
  downloads: [
    { day: "2026-01-01", downloads: 10 },
    { day: "2026-01-02", downloads: 20 },
  ],
};

function respond(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: "",
    json: async () => body,
  })) as unknown as typeof globalThis.fetch;
}

describe("fetchDownloads", () => {
  it("asks the range endpoint for the period", async () => {
    const fetchImpl = respond(payload);
    await fetchDownloads("demo", { period: "last-week", fetch: fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.npmjs.org/downloads/range/last-week/demo",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  it("keeps a scoped name's slash as a path separator", async () => {
    const fetchImpl = respond(payload);
    await fetchDownloads("@scope/thing", { fetch: fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.npmjs.org/downloads/range/last-month/%40scope/thing",
      expect.anything(),
    );
  });

  it("explains a 404 as a missing package", async () => {
    const fetchImpl = respond({}, { ok: false, status: 404 });
    await expect(fetchDownloads("nope", { fetch: fetchImpl })).rejects.toThrow(/No such package/);
  });

  it("carries the status on the error", async () => {
    const fetchImpl = respond({}, { ok: false, status: 503 });
    await expect(fetchDownloads("demo", { fetch: fetchImpl })).rejects.toMatchObject({
      name: "PackageTrendsError",
      status: 503,
      package: "demo",
    });
  });

  it("requires a name", async () => {
    await expect(fetchDownloads("")).rejects.toThrow(PackageTrendsError);
  });
});

describe("normaliseRange", () => {
  it("drops entries that are not usable points", () => {
    const out = normaliseRange("demo", {
      ...payload,
      downloads: [
        { day: "2026-01-01", downloads: 10 },
        { day: "2026-01-02", downloads: null },
        { downloads: 5 },
        null,
        { day: "2026-01-03", downloads: 7 },
      ],
    });
    expect(out.points).toEqual([
      { day: "2026-01-01", downloads: 10 },
      { day: "2026-01-03", downloads: 7 },
    ]);
  });

  it("throws when nothing is left", () => {
    expect(() => normaliseRange("demo", { downloads: [] })).toThrow(/No downloads recorded/);
  });

  it("throws when there is no series at all", () => {
    expect(() => normaliseRange("demo", {})).toThrow(/sent no series/);
  });

  it("falls back to the series' own dates", () => {
    const out = normaliseRange("demo", { downloads: payload.downloads });
    expect(out.start).toBe("2026-01-01");
    expect(out.end).toBe("2026-01-02");
    expect(out.package).toBe("demo");
  });
});
