// Serves the package directory so examples/index.html can import ./dist.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.env.PORT ?? 4178);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const relative = normalize(path === "/" ? "/examples/index.html" : path).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, relative);

  if (!file.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end(`Not found: ${relative}`);
  }
}).listen(port, () => console.log(`package-trends examples on http://localhost:${port}`));
