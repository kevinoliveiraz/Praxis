const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const { Writable } = require('node:stream'); // Define Writable como o módulo o texto “node:stream”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { createPraxisServer } = require('../tools/dev-server.cjs'); // Define createPraxisServer como o módulo o texto “../tools/dev-server.cjs”.
const server = createPraxisServer(); // Define server como o resultado de createPraxisServer.
const errorPage = fs.readFileSync(path.join(__dirname, '../404.html'), 'utf8'); // Define errorPage como o conteúdo do arquivo os itens de path unidos por __dirname.

// Exercita o handler HTTP e os arquivos reais, sem abrir uma porta ou um navegador.
function request(url, method = 'GET') { // Declara a função request com url, method.
  return new Promise((resolve, reject) => { // Retorna uma instância de Promise com uma função que recebe resolve, reject.
    const chunks = []; // Define chunks como uma lista vazia.
    const response = new Writable({ write(chunk, encoding, done) { chunks.push(chunk); done(); } }); // Define response como uma instância de Writable com um objeto com write.
    response.writeHead = (status, headers = {}) => { response.status = status; response.headers = headers; }; // Atualiza response.writeHead com uma função que recebe status, headers.
    response.on('error', reject); // Executa a chamada que produz o resultado de response.on com o texto “error” e reject.
    response.on('finish', () => resolve({ status: response.status, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') })); // Executa a chamada que produz o resultado de response.on com o texto “finish” e uma função que recebe nenhum argumento.
    server.emit('request', { url, method }, response); // Executa a chamada que produz o resultado de server.emit com o texto “request” e um objeto com url, method.
  }); // Encerra o bloco atual.
} // Encerra o bloco da função request.

test('endereço inexistente em qualquer profundidade retorna a página personalizada com status 404', async () => { // Executa a chamada que produz o teste “endereço inexistente em qualquer profundidade retorna a página personalizada com status 404”.
  for (const url of ['/nao-existe', '/cursos/excel/aula-inexistente.html']) { // Percorre uma lista com 2 itens usando url.
    const response = await request(url); // Define response como o resultado aguardado de o resultado de request com url.
    assert.equal(response.status, 404); // Executa a chamada que produz a conferência de igualdade entre response.status e 404.
    assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8'); // Executa a chamada que produz a conferência de igualdade entre response.headers[o texto “Content-Type”] e o texto “text/html; charset=utf-8”.
    assert.equal(response.headers['Cache-Control'], 'no-store'); // Executa a chamada que produz a conferência de igualdade entre response.headers[o texto “Cache-Control”] e o texto “no-store”.
    assert.equal(response.body, errorPage); // Executa a chamada que produz a conferência de igualdade entre response.body e errorPage.
  } // Encerra o bloco do laço.
}); // Encerra o bloco atual.

test('HEAD de um endereço inexistente mantém status e tipo sem enviar corpo', async () => { // Executa a chamada que produz o teste “HEAD de um endereço inexistente mantém status e tipo sem enviar corpo”.
  const response = await request('/cursos/aula-inexistente', 'HEAD'); // Define response como o resultado aguardado de o resultado de request com o texto “/cursos/aula-inexistente” e o texto “HEAD”.
  assert.equal(response.status, 404); // Executa a chamada que produz a conferência de igualdade entre response.status e 404.
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8'); // Executa a chamada que produz a conferência de igualdade entre response.headers[o texto “Content-Type”] e o texto “text/html; charset=utf-8”.
  assert.equal(response.body, ''); // Executa a chamada que produz a conferência de igualdade entre response.body e o texto “”.
}); // Encerra o bloco atual.

test('páginas e estilos existentes continuam com status 200 e HEAD sem corpo', async () => { // Executa a chamada que produz o teste “páginas e estilos existentes continuam com status 200 e HEAD sem corpo”.
  const home = await request('/'); // Define home como o resultado aguardado de o resultado de request com o texto “/”.
  const stylesheet = await request('/styles/404.css'); // Define stylesheet como o resultado aguardado de o resultado de request com o texto “/styles/404.css”.
  const head = await request('/404.html', 'HEAD'); // Define head como o resultado aguardado de o resultado de request com o texto “/404.html” e o texto “HEAD”.
  assert.equal(home.status, 200); // Executa a chamada que produz a conferência de igualdade entre home.status e 200.
  assert.match(home.body, /<title>\s*Praxis\s*<\/title>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.equal(stylesheet.status, 200); // Executa a chamada que produz a conferência de igualdade entre stylesheet.status e 200.
  assert.equal(stylesheet.headers['Content-Type'], 'text/css; charset=utf-8'); // Executa a chamada que produz a conferência de igualdade entre stylesheet.headers[o texto “Content-Type”] e o texto “text/css; charset=utf-8”.
  assert.equal(head.status, 200); // Executa a chamada que produz a conferência de igualdade entre head.status e 200.
  assert.equal(head.body, ''); // Executa a chamada que produz a conferência de igualdade entre head.body e o texto “”.
}); // Encerra o bloco atual.

test('a página de erro não altera a proteção de arquivos ocultos ou fora da raiz', async () => { // Executa a chamada que produz o teste “a página de erro não altera a proteção de arquivos ocultos ou fora da raiz”.
  for (const url of ['/.env', '/.git/config', '/%2e%2e%2f.git/config']) { // Percorre uma lista com 3 itens usando url.
    const response = await request(url); // Define response como o resultado aguardado de o resultado de request com url.
    assert.equal(response.status, 403); // Executa a chamada que produz a conferência de igualdade entre response.status e 403.
    assert.equal(response.body, 'Acesso negado'); // Executa a chamada que produz a conferência de igualdade entre response.body e o texto “Acesso negado”.
  } // Encerra o bloco do laço.
}); // Encerra o bloco atual.

test('métodos não permitidos e endereços malformados preservam seus próprios erros', async () => { // Executa a chamada que produz o teste “métodos não permitidos e endereços malformados preservam seus próprios erros”.
  const post = await request('/nao-existe', 'POST'); // Define post como o resultado aguardado de o resultado de request com o texto “/nao-existe” e o texto “POST”.
  const malformed = await request('/%zz'); // Define malformed como o resultado aguardado de o resultado de request com o texto “/%zz”.
  assert.equal(post.status, 405); // Executa a chamada que produz a conferência de igualdade entre post.status e 405.
  assert.equal(post.headers.Allow, 'GET, HEAD'); // Executa a chamada que produz a conferência de igualdade entre post.headers.Allow e o texto “GET, HEAD”.
  assert.equal(malformed.status, 400); // Executa a chamada que produz a conferência de igualdade entre malformed.status e 400.
}); // Encerra o bloco atual.

test('a base dos recursos funciona em rotas profundas na raiz e no GitHub Pages do projeto', () => { // Executa a chamada que produz o teste “a base dos recursos funciona em rotas profundas na raiz e no GitHub Pages do projeto”.
  const code = errorPage.match(/<script data-page-base>([\s\S]*?)<\/script>/)[1]; // Define code como errorPage.match(…)[1].
  for (const [hostname, pathname, expected] of [ // Percorre uma lista com 4 itens usando hostname, pathname, expected.
    ['127.0.0.1', '/cursos/excel/inexistente', '/'], // Inicia uma lista com 3 itens.
    ['praxis.example.com', '/cursos/excel/inexistente', '/'], // Inicia uma lista com 3 itens.
    ['kevinoliveiraz.github.io', '/Praxis/cursos/excel/inexistente', '/Praxis/'], // Inicia uma lista com 3 itens.
    ['kevinoliveiraz.github.io', '/outro-projeto/inexistente', '/'] // Inicia uma lista com 3 itens.
  ]) { // Inicia uma lista com 4 itens.
    const base = { href: '/' }; // Define base como um objeto com href.
    vm.runInNewContext(code, { location: { hostname, pathname }, document: { getElementById: () => base } }); // Executa a chamada que produz o resultado de vm.runInNewContext com code e um objeto com location, document.
    assert.equal(base.href, expected); // Executa a chamada que produz a conferência de igualdade entre base.href e expected.
    assert.equal(new URL('styles/404.css', `https://${hostname}${base.href}`).pathname, `${expected}styles/404.css`); // Executa a chamada que produz a conferência de igualdade entre new URL(…).pathname e um texto montado com 1 valor dinâmico.
  } // Encerra o bloco do laço.
}); // Encerra o bloco atual.
