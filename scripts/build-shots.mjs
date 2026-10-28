// Builds the README images. Every figure is the real component's own output,
// server-rendered from live npm data, then photographed in headless Chrome —
// so a picture cannot drift from what the package actually draws.
//
//   node scripts/build-shots.mjs            live data
//   node scripts/build-shots.mjs --offline  examples/sample.json
//
// Needs Google Chrome; set CHROME to point at another binary.

import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { fetchDownloads, computeTrend, analyse, formatCount, formatWeekday } from "../dist/index.js";
import { PackageTrend } from "../dist/react.js";
import { PackageComparison } from "../dist/compare-react.js";
import { compare as compareRanges } from "../dist/compare.js";

const run = promisify(execFile);
const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const out = path.join(root, "docs", "img");
const work = path.join(root, "node_modules", ".cache", "shots");

const CHROME =
  process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SUBJECT = "react";
const RIVALS = ["react", "vue", "svelte", "preact"];

const THEMES = {
  light: { paper: "#fbfaf7", ink: "#1a1a17", muted: "#6a6a62", rule: "#e2e0d8", accent: "#9a4a1e", up: "#15803d" },
  dark: { paper: "#16161a", ink: "#eceae4", muted: "#9b9b93", rule: "#2e2e34", accent: "#e09b6a", up: "#4ac98a" },
};

const el = React.createElement;

/* ── data ─────────────────────────────────────────────────────────────── */

async function load() {
  if (process.argv.includes("--offline")) {
    const sample = JSON.parse(await readFile(path.join(root, "examples", "sample.json"), "utf8"));
    return { month: sample.month, year: sample.year, rivals: sample.compare };
  }
  const [month, year, ...rivals] = await Promise.all([
    fetchDownloads(SUBJECT, { period: "last-month" }),
    fetchDownloads(SUBJECT, { period: "last-year" }),
    ...RIVALS.map((name) => fetchDownloads(name, { period: "last-month" })),
  ]);
  return { month, year, rivals };
}

/* ── page chrome ──────────────────────────────────────────────────────── */

const page = (theme, width, body) => {
  const t = THEMES[theme];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;650&display=swap">
<style>
  :root {
    --paper: ${t.paper}; --ink: ${t.ink}; --muted: ${t.muted};
    --rule: ${t.rule}; --accent: ${t.accent}; --up: ${t.up};
    --body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
    color-scheme: ${theme};
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    width: ${width}px; background: var(--paper); color: var(--ink);
    font: 400 15px/1.55 var(--body); -webkit-font-smoothing: antialiased;
    padding: 30px 34px;
  }
  .k { font: 500 10.5px/1 var(--mono); text-transform: uppercase;
       letter-spacing: .1em; color: var(--accent); margin-bottom: 11px; }
  .why { font-size: 12.5px; color: var(--muted); margin: 11px 0 0; line-height: 1.5; }
  .pt-count { font-variant-numeric: tabular-nums; }
  .pt-change { font-weight: 500; }
  figcaption { font: 400 12.5px/1.5 var(--mono); color: var(--muted); margin-top: 10px; }
</style></head><body>${body}</body></html>`;
};

const cols = (n, gap = 30) =>
  `display:grid;grid-template-columns:repeat(${n},minmax(0,1fr));gap:${gap}px`;

const cell = (label, markup, why, figureHeight) =>
  `<div style="display:flex;flex-direction:column;height:100%">
     <div class="k">${label}</div>
     <div style="${figureHeight ? `min-height:${figureHeight}px;` : ""}display:flex;flex-direction:column;justify-content:center">${markup}</div>
     ${why ? `<p class="why" style="margin-top:auto">${why}</p>` : ""}
   </div>`;

/* ── the shots ────────────────────────────────────────────────────────── */

function variants({ month }) {
  const common = { package: SUBJECT, data: month, locale: "en-US" };
  return [
    `<div style="${cols(3, 34)}">`,
    cell(
      "sparkline",
      renderToStaticMarkup(el(PackageTrend, { ...common, width: 210, height: 44, dot: true })),
      "Shape only. For a nav, a list row, a table cell.",
      104,
    ),
    cell(
      "text",
      `<div style="font-size:17px">${renderToStaticMarkup(
        el(PackageTrend, { ...common, variant: "text", colors: { up: "var(--up)" } }),
      )}</div>`,
      "One line, to sit inside a sentence or a footer.",
      104,
    ),
    cell(
      "kpi",
      renderToStaticMarkup(
        el(PackageTrend, {
          ...common,
          variant: "kpi",
          width: 210,
          height: 40,
          colors: { up: "var(--up)" },
          fill: "color-mix(in oklab, currentColor 10%, transparent)",
        }),
      ),
      "A tile. The number leads, the chart confirms.",
      104,
    ),
    `</div>`,
  ].join("");
}

function charts({ month, year }) {
  const base = { package: SUBJECT, data: month, width: 148, height: 52, locale: "en-US" };
  const shots = [
    ["line", { ...base, dot: true }, "the default"],
    ["column", { ...base, chart: "column" }, "discrete days"],
    ["band", { ...base, chart: "band", data: year, bandSize: 7 }, "high to low"],
    ["step", { ...base, curve: "step" }, "no between-days"],
    ["smooth", { ...base, curve: "smooth", fill: "color-mix(in oklab, currentColor 12%, transparent)" }, "monotone cubic"],
  ];
  return `<div style="${cols(5, 26)}">${shots
    .map(([k, props, why]) => cell(k, renderToStaticMarkup(el(PackageTrend, props)), why, 62))
    .join("")}</div>`;
}

function gaps({ month }) {
  const chart = (policy) =>
    renderToStaticMarkup(
      el(PackageTrend, {
        package: SUBJECT,
        data: month,
        gaps: policy,
        width: 380,
        height: 104,
        dot: true,
        fill: "color-mix(in oklab, currentColor 10%, transparent)",
      }),
    );
  const figure = (policy, title, note) => {
    const a = analyse(month, { gaps: policy });
    return `<figure style="margin:0">
      <div class="k">gaps="${policy}" — ${title}</div>
      ${chart(policy)}
      <figcaption>mean ${formatCount(Math.round(a.mean), "en-US")} · ${a.direction} · quietest ${formatWeekday(a.quietestWeekday.weekday, "en-US")}</figcaption>
      <p class="why">${note}</p>
    </figure>`;
  };
  const missing = computeTrend(month).gapDays.length;
  return `<div style="${cols(2, 34)}">
    ${figure("zero", "taken literally", `npm answered 0 for ${missing} of these 30 days. It cannot tell you whether that is a quiet day or a day it never aggregated.`)}
    ${figure("fill", "the default", "Interior zeros are interpolated from their neighbours and listed in <code>gapDays</code>, so the figures describe the month rather than the API.")}
  </div>`;
}

function compare({ rivals }) {
  const { spread } = compareRanges(rivals);
  const chart = (scale, note) => `<figure style="margin:0">
    <div class="k">scale="${scale}"</div>
    ${renderToStaticMarkup(
      el(PackageComparison, {
        packages: RIVALS,
        data: rivals,
        scale,
        width: 380,
        height: 108,
        locale: "en-US",
      }),
    )}
    <p class="why">${note}</p>
  </figure>`;
  return `<div style="${cols(2, 34)}">
    ${chart("absolute", `One shared y-range. Literally true, and useless once the largest is ${spread.toFixed(0)}× the smallest.`)}
    ${chart("indexed", "Every series starts at 100, so the chart compares growth instead of size.")}
  </div>`;
}

const SHOTS = [
  { id: "variants", width: 940, build: variants },
  { id: "charts", width: 940, build: charts },
  { id: "gaps", width: 940, build: gaps },
  { id: "compare", width: 940, build: compare },
];

/* ── capture ──────────────────────────────────────────────────────────── */

async function main() {
  await mkdir(out, { recursive: true });
  await mkdir(work, { recursive: true });
  const data = await load();

  for (const shot of SHOTS) {
    for (const theme of Object.keys(THEMES)) {
      const file = path.join(work, `${shot.id}-${theme}.html`);
      await writeFile(file, page(theme, shot.width, shot.build(data)));

      // Chrome pads a screenshot out to the window height, so measure the
      // page first and open the window at exactly that size.
      const height = await measure(file, shot.width);
      const png = path.join(out, `${shot.id}-${theme}.png`);
      await run(CHROME, [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--virtual-time-budget=8000",
        `--window-size=${shot.width},${height}`,
        `--screenshot=${png}`,
        `file://${file}`,
      ]);
      console.log(`${shot.id}-${theme}.png  ${shot.width}×${height} @2x`);
    }
  }
}

/** The page's own scrollHeight, read back through a title round-trip. */
async function measure(file, width) {
  const probe = path.join(work, "measure.html");
  await writeFile(
    probe,
    `<!doctype html><iframe id="f" src="file://${file}" style="width:${width}px;border:0"></iframe>
<script>
  const f = document.getElementById("f");
  f.onload = () => {
    const h = f.contentDocument.documentElement.scrollHeight;
    document.title = "H" + h;
    document.body.textContent = "H" + h;
  };
</script>`,
  );
  const { stdout } = await run(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=8000",
    "--dump-dom",
    `file://${probe}`,
  ]);
  const found = /H(\d+)/.exec(stdout);
  return found ? Number(found[1]) : 400;
}

await main();
