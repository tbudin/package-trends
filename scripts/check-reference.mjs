// Fails the build when the reference page stops describing the package.
//
// Generating the page from the types was the other option. It would have
// replaced sentences that say what a function is for with signatures that say
// what it takes, which is the part a reader can already see. So the prose
// stays hand-written and this checks the one thing prose cannot check itself:
// that nothing public is missing, and nothing listed has been removed.
//
// The export lists come from esbuild's metafile, so nothing is evaluated and
// no runtime is needed for the React entries.
import { readFile } from "node:fs/promises";
import * as esbuild from "esbuild";

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(await readFile(`${root}package.json`, "utf8"));

const SOURCE = {
  ".": "index.ts",
  "./react": "react.tsx",
  "./compare": "compare-react.tsx",
  "./heatmap": "heatmap-react.tsx",
};

const real = new Map();
for (const [subpath, file] of Object.entries(SOURCE)) {
  if (!pkg.exports[subpath]) continue;
  const out = await esbuild.build({
    bundle: true, format: "esm", write: false, metafile: true,
    external: Object.keys(pkg.peerDependencies ?? {}),
    entryPoints: [`${root}src/${file}`],
    outfile: "out.js",
  });
  for (const o of Object.values(out.metafile.outputs)) {
    for (const name of o.exports ?? []) real.set(name, subpath);
  }
}

// The built copy, because site/pages.js imports the template's ui.js by the
// path it has once the generator has placed it beside the pages.
const { pages } = await import(`${root}docs/assets/pages.js`);

// An export counts as described if the site names it anywhere a reader would
// take as documentation: a reference row, a code sample, or inline code in the
// prose. Prose alone does not count — "columns" in a sentence is a word, not a
// promise — or this becomes a check that cannot fail.
const described = new Set();
const identifiers = (text) => {
  for (const m of String(text).matchAll(/[A-Za-z_$][\w$]*/g)) described.add(m[0]);
};
const render = (value, page) => {
  if (typeof value !== "function") return String(value ?? "");
  try { return String(value(page.state ?? {}, null, { link: () => "", site: {}, page, asset: () => "" })); }
  catch { return ""; }
};

for (const page of pages) {
  for (const row of page.ref ?? []) identifiers(row[0]);
  identifiers(render(page.code, page));
  for (const key of ["before", "after", "lead"]) {
    const html = render(page[key], page);
    for (const m of html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)) identifiers(m[1]);
  }
  for (const q of page.faq ?? []) {
    for (const m of String(q.a).matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)) identifiers(m[1]);
  }
}

const missing = [...real.keys()].filter((name) => !described.has(name)).sort();

// Exports the site knowingly says nothing about. The list may only shrink: a
// name that is no longer exported has to come off, so it cannot quietly turn
// into cover for something else. Seeded from what was already true the day
// this check was written, rather than pretending the backlog did not exist.
const allowFile = new URL("../site/undocumented.json", import.meta.url);
let allowed = [];
try { allowed = JSON.parse(await readFile(allowFile, "utf8")); } catch { /* none yet */ }

const stale = allowed.filter((name) => !real.has(name));
const undocumented = missing.filter((name) => !allowed.includes(name));

const fail = (title, names, advice) => {
  console.error(`\n  ${title}:`);
  for (const name of names) console.error(`    ${name}${real.get(name) ? `  (${real.get(name)})` : ""}`);
  console.error(`\n  ${advice}\n`);
};

if (undocumented.length) {
  fail(`The site does not describe ${undocumented.length} public export${undocumented.length > 1 ? "s" : ""}`,
    undocumented, "Document them in site/pages.js, stop exporting them, or add them to site/undocumented.json and say why in the commit.");
}
if (stale.length) {
  fail(`site/undocumented.json lists ${stale.length} name${stale.length > 1 ? "s" : ""} that is no longer exported`,
    stale, "Delete them: the list may only shrink.");
}
if (undocumented.length || stale.length) process.exit(1);

const described_count = real.size - allowed.length;
console.log(`  reference: ${described_count} of ${real.size} public exports described` +
  (allowed.length ? `, ${allowed.length} knowingly not (site/undocumented.json)` : ""));
