// Bundles the core entry into site/, where pages.js imports it. The generator
// then copies that bundle into docs/assets/ and imports it from there, so the
// module the browser loads and the module the prerender uses are one file.
import { mkdir } from "node:fs/promises";
import * as esbuild from "esbuild";

const root = new URL("..", import.meta.url).pathname;

await mkdir(`${root}site`, { recursive: true });

await esbuild.build({
  bundle: true,
  format: "esm",
  target: ["es2022"],
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
  entryPoints: [`${root}src/index.ts`],
  outfile: `${root}site/package-trends.js`,
});
