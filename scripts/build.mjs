import { rm, mkdir } from "node:fs/promises";
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

await esbuild.build({
  entryPoints: [`${root}src/index.ts`, `${root}src/react.tsx`],
  outdir: `${root}dist`,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: ["es2022"],
  jsx: "automatic",
  // react stays external so consumers dedupe it; the core entry pulls in nothing
  external: ["react", "react/jsx-runtime"],
  sourcemap: true,
  logLevel: "info",
});

await run("npx", ["tsc", "-p", "tsconfig.json"], { cwd: root });
console.log("types written to types/");
