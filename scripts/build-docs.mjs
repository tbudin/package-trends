// Builds the GitHub Pages site into docs/. The site is one hash-routed page
// over the core entry — no framework, which is both the fast choice and a
// demonstration of that path — and it fetches live from npm as you use it.
import { rm, mkdir } from "node:fs/promises";
import * as esbuild from "esbuild";

const root = new URL("..", import.meta.url).pathname;

await rm(`${root}docs/assets`, { recursive: true, force: true });
await mkdir(`${root}docs/assets`, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  jsx: "automatic",
  target: ["es2022"],
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
};

await esbuild.build({
  ...common,
  entryPoints: [`${root}src/index.ts`],
  outfile: `${root}docs/assets/package-trends.js`,
});
