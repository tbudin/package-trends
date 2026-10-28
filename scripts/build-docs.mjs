// Builds the GitHub Pages site into docs/. The landing page uses the core
// entry only — no framework — so it loads fast and demonstrates that path;
// the reference page mounts the React gallery. Both fetch live from npm.
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

await esbuild.build({
  ...common,
  entryPoints: [`${root}examples/live.tsx`],
  outfile: `${root}docs/assets/reference.js`,
});
