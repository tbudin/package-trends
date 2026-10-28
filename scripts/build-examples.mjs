// Bundles the React harness with React included, so the examples run from a plain file server.
import * as esbuild from "esbuild";
const root = new URL("..", import.meta.url).pathname;

await esbuild.build({
  entryPoints: [`${root}examples/react.tsx`, `${root}examples/live.tsx`],
  outdir: `${root}examples`,
  bundle: true,
  format: "esm",
  jsx: "automatic",
  target: ["es2022"],
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "info",
});
