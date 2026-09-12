import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (
        !file.startsWith(root + path.sep) ||
        pathname.split("/").some((p) => p.startsWith("."))
      ) {
        res.writeHead(403).end();
        return;
      }
      const content = await readFile(file);
      res
        .writeHead(200, {
          "Content-Type":
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".json": "application/json",
              ".svg": "image/svg+xml",
            }[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(content);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("Wordbook: http://127.0.0.1:4173"),
  );
