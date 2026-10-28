import { rm, mkdir, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as esbuild from "esbuild";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;

await Promise.all([
  rm(`${root}dist`, { recursive: true, force: true }),
  rm(`${root}types`, { recursive: true, force: true }),
]);
await mkdir(`${root}dist`, { recursive: true });

// bundle: false only emits what it is given, so every module is an entry
const sources = (await readdir(`${root}src`))
  .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
  .map((name) => `${root}src/${name}`);

await esbuild.build({
  // Every module is emitted as it stands, imports intact. A library that
  // bundles each entry makes the consumer ship the shared code once per entry;
  // emitted modules let their bundler dedupe and tree-shake across all three.
  entryPoints: sources,
  outdir: `${root}dist`,
  bundle: false,
  format: "esm",
  platform: "neutral",
  target: ["es2022"],
  jsx: "automatic",
  sourcemap: true,
  logLevel: "info",
});

await run("npx", ["tsc", "-p", "tsconfig.json"], { cwd: root });
console.log("types written to types/");
