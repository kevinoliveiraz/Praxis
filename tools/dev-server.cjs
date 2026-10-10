/* Preview local sem dependências. Execute npm run dev e abra http://127.0.0.1:5502. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PRAXIS_PORT || 5502);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon",
  ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8" };
function createPraxisServer() {
  return http.createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }); return res.end("Método não permitido");
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
    catch { res.writeHead(400); return res.end("Endereço inválido"); }
    if (pathname === "/") pathname = "/index.html";
    const file = path.resolve(root, "." + pathname);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) ||
        relative.split(path.sep).some((segment) => segment.startsWith("."))) {
      res.writeHead(403); return res.end("Acesso negado");
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        fs.readFile(path.join(root, "404.html"), (error, page) => {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
          if (req.method === "HEAD") return res.end();
          res.end(error ? "Página não encontrada" : page);
        });
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      if (req.method === "HEAD") return res.end();
      const stream = fs.createReadStream(file);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    });
  });
}
module.exports = { createPraxisServer };
if (require.main === module) {
  const server = createPraxisServer();
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log("Praxis: http://127.0.0.1:" + port));
}
