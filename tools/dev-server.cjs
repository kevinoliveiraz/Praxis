/* Preview local sem dependências. Execute npm run dev e abra http://127.0.0.1:5502. */
const http = require("node:http"); // Define http como o módulo o texto “node:http”.
const fs = require("node:fs"); // Define fs como o módulo o texto “node:fs”.
const path = require("node:path"); // Define path como o módulo o texto “node:path”.
const root = path.resolve(__dirname, ".."); // Define root como o resultado de path.resolve com __dirname e o texto “..”.
const port = Number(process.env.PRAXIS_PORT || 5502); // Define port como a conversão de process.env.PRAXIS_PORT ou, se indisponível, 5502 em número.
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", // Define types como um objeto com .html, .css, .js, .png, .ico e outras propriedades.
  ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon", // Define a propriedade .js como o texto “text/javascript; charset=utf-8”.
  ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8" }; // Define a propriedade .svg como o texto “image/svg+xml”.
function createPraxisServer() { // Declara a função createPraxisServer com nenhum parâmetro.
  return http.createServer((req, res) => { // Retorna o resultado de http.createServer com uma função que recebe req, res.
    if (!["GET", "HEAD"].includes(req.method)) { // Verifica a negação de a verificação da presença de req.method em expressão para decidir se executa este bloco.
      res.writeHead(405, { Allow: "GET, HEAD" }); return res.end("Método não permitido"); // Executa a chamada que produz o envio do status HTTP 405 e dos cabeçalhos.
    } // Encerra o bloco da condição.
    let pathname; // Define pathname como sem valor inicial.
    try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); } // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    catch { res.writeHead(400); return res.end("Endereço inválido"); } // Captura a falha em para executar o tratamento.
    if (pathname === "/") pathname = "/index.html"; // Verifica pathname igual, inclusive no tipo, a o texto “/”; se verdadeiro, executa a atribuição de o texto “/index.html” a pathname.
    const file = path.resolve(root, "." + pathname); // Define file como o resultado de path.resolve com root e o texto “.” mais pathname.
    const relative = path.relative(root, file); // Define relative como o resultado de path.relative com root e file.
    if (relative.startsWith("..") || path.isAbsolute(relative) || // Verifica a verificação do início de relative com .. ou, se indisponível, o resultado de path.isAbsolute com relative ou, se indisponível, a verificação de pelo menos um item de relative.split(…) que atende à condição para decidir se executa este bloco.
        relative.split(path.sep).some((segment) => segment.startsWith("."))) { // Executa a chamada que produz a verificação de pelo menos um item de relative.split(…) que atende à condição.
      res.writeHead(403); return res.end("Acesso negado"); // Executa a chamada que produz o envio do status HTTP 403 e dos cabeçalhos.
    } // Encerra o bloco da condição.
    fs.stat(file, (err, stat) => { // Executa a chamada que produz o resultado de fs.stat com file e uma função que recebe err, stat.
      if (err || !stat.isFile()) { // Verifica err ou, se indisponível, a negação de o resultado de stat.isFile para decidir se executa este bloco.
        fs.readFile(path.join(root, "404.html"), (error, page) => { // Executa a chamada que produz a leitura assíncrona do arquivo os itens de path unidos por root.
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", // Executa a chamada que produz o envio do status HTTP 404 e dos cabeçalhos.
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); // Define a propriedade Cache-Control como o texto “no-store”.
          if (req.method === "HEAD") return res.end(); // Verifica req.method igual, inclusive no tipo, a o texto “HEAD”; se verdadeiro, retorna o encerramento da resposta com o valor informado.
          res.end(error ? "Página não encontrada" : page); // Executa a chamada que produz o encerramento da resposta com o texto “Página não encontrada” se error; caso contrário, page.
        }); // Encerra o bloco atual.
        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", // Executa a chamada que produz o envio do status HTTP 200 e dos cabeçalhos.
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); // Define a propriedade Cache-Control como o texto “no-store”.
      if (req.method === "HEAD") return res.end(); // Verifica req.method igual, inclusive no tipo, a o texto “HEAD”; se verdadeiro, retorna o encerramento da resposta com o valor informado.
      const stream = fs.createReadStream(file); // Define stream como um fluxo de leitura do arquivo file.
      stream.on("error", () => res.destroy()); // Executa a chamada que produz o resultado de stream.on com o texto “error” e uma função que recebe nenhum argumento.
      stream.pipe(res); // Executa a chamada que produz o envio do fluxo de dados para res.
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.
} // Encerra o bloco da função createPraxisServer.
module.exports = { createPraxisServer }; // Atualiza module.exports com um objeto com createPraxisServer.
if (require.main === module) { // Verifica require.main igual, inclusive no tipo, a module para decidir se executa este bloco.
  const server = createPraxisServer(); // Define server como o resultado de createPraxisServer.
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; }); // Executa a chamada que produz o resultado de server.on com o texto “error” e uma função que recebe error.
  server.listen(port, "127.0.0.1", () => console.log("Praxis: http://127.0.0.1:" + port)); // Executa a chamada que produz o resultado de server.listen com port e o texto “127.0.0.1”.
} // Encerra o bloco da condição.
