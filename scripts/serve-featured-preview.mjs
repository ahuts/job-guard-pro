// Static build preview with the same /featured rewrite as Vercel.
// Vite preview serves the SPA shell at /featured instead of its prerendered head.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".xml": "application/xml",
};
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const destination =
    path === "/featured" || path === "/featured/"
      ? "/featured/index.html"
      : path === "/"
        ? "/index.html"
        : path;
  const file = resolve(root, `.${destination}`);
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(await readFile(resolve(root, "index.html")));
  }
}).listen(4174, "127.0.0.1", () =>
  console.log("Static preview: http://127.0.0.1:4174"),
);
