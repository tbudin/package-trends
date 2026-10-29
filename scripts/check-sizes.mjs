// Checks the sizes the README promises against what the package actually costs.
//
// The README opens by stating the gzipped weight of each entry combination, and
// nothing checked it: all three figures had drifted, one of them by 2 kB in the
// flattering direction. This is the README's counterpart to build-sizes.mjs,
// which keeps the site honest the same way.
//
// Measured as a consumer's bundler would: bundled, minified, ESM, peers
// external, gzipped. The entries are built together with code splitting on, so
// a module shared between them is counted once — which is what the README's
// "nothing is counted twice" claims.
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import * as esbuild from "esbuild";

// Wide enough that an ordinary edit does not fail the build, narrow enough that
// a new entry point or a stray dependency does.
const TOLERANCE_KB = 0.5;

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(await readFile(`${root}package.json`, "utf8"));
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
];

const COMBOS = [
  { claim: 8.3, entries: ["index.ts"] },
  { claim: 12.5, entries: ["index.ts", "react.tsx"] },
  { claim: 14.8, entries: ["index.ts", "react.tsx", "compare-react.tsx"] },
  { claim: 17.1, entries: ["index.ts", "react.tsx", "compare-react.tsx", "heatmap-react.tsx"] },
];

const readme = await readFile(`${root}README.md`, "utf8");
const failures = [];

// The last combination must cover every public entry point, or a new subpath
// could ship with the README silently describing the package without it.
const code = Object.keys(pkg.exports).filter((subpath) => subpath !== "./package.json");
if (COMBOS[COMBOS.length - 1].entries.length !== code.length) {
  failures.push(
    `package.json exports ${code.length} entry points but scripts/check-sizes.mjs measures ${COMBOS[COMBOS.length - 1].entries.length}`,
  );
}

for (const { claim, entries } of COMBOS) {
  const built = await esbuild.build({
    bundle: true,
    format: "esm",
    target: ["es2022"],
    minify: true,
    write: false,
    splitting: true,
    outdir: "out",
    external,
    define: { "process.env.NODE_ENV": '"production"' },
    entryPoints: entries.map((file) => `${root}src/${file}`),
  });

  const measured = built.outputFiles.reduce((n, file) => n + gzipSync(file.contents).length, 0) / 1000;
  const label = `${claim.toFixed(1)} kB`;
  const what = entries.join(" + ");

  if (!readme.includes(`**${label}**`)) {
    failures.push(`README does not state **${label}** for ${what}`);
  }
  if (Math.abs(measured - claim) > TOLERANCE_KB) {
    failures.push(`README claims ${label} for ${what}, measured ${measured.toFixed(1)} kB`);
  }
}

if (failures.length) {
  console.error("README sizes are out of date:");
  for (const failure of failures) console.error(`  ${failure}`);
  console.error("\nUpdate the figures in README.md and the claims in scripts/check-sizes.mjs.");
  process.exit(1);
}

console.log(`  README sizes — ${COMBOS.map((c) => c.claim.toFixed(1) + " kB").join(", ")}`);
