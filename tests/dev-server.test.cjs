const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createPraxisServer } = require('../tools/dev-server.cjs');
const server = createPraxisServer();
const errorPage = fs.readFileSync(path.join(__dirname, '../404.html'), 'utf8');

// Exercita o handler HTTP e os arquivos reais, sem abrir uma porta ou um navegador.
function request(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const response = new Writable({ write(chunk, encoding, done) { chunks.push(chunk); done(); } });
    response.writeHead = (status, headers = {}) => { response.status = status; response.headers = headers; };
    response.on('error', reject);
    response.on('finish', () => resolve({ status: response.status, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    server.emit('request', { url, method }, response);
  });
}

test('endereço inexistente em qualquer profundidade retorna a página personalizada com status 404', async () => {
  for (const url of ['/nao-existe', '/cursos/excel/aula-inexistente.html']) {
    const response = await request(url);
    assert.equal(response.status, 404);
    assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(response.body, errorPage);
  }
});

test('HEAD de um endereço inexistente mantém status e tipo sem enviar corpo', async () => {
  const response = await request('/cursos/aula-inexistente', 'HEAD');
  assert.equal(response.status, 404);
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(response.body, '');
});

test('páginas e estilos existentes continuam com status 200 e HEAD sem corpo', async () => {
  const home = await request('/');
  const stylesheet = await request('/styles/404.css');
  const head = await request('/404.html', 'HEAD');
  assert.equal(home.status, 200);
  assert.match(home.body, /<title>\s*Praxis\s*<\/title>/);
  assert.equal(stylesheet.status, 200);
  assert.equal(stylesheet.headers['Content-Type'], 'text/css; charset=utf-8');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('a página de erro não altera a proteção de arquivos ocultos ou fora da raiz', async () => {
  for (const url of ['/.env', '/.git/config', '/%2e%2e%2f.git/config']) {
    const response = await request(url);
    assert.equal(response.status, 403);
    assert.equal(response.body, 'Acesso negado');
  }
});

test('métodos não permitidos e endereços malformados preservam seus próprios erros', async () => {
  const post = await request('/nao-existe', 'POST');
  const malformed = await request('/%zz');
  assert.equal(post.status, 405);
  assert.equal(post.headers.Allow, 'GET, HEAD');
  assert.equal(malformed.status, 400);
});

test('a base dos recursos funciona em rotas profundas na raiz e no GitHub Pages do projeto', () => {
  const code = errorPage.match(/<script data-page-base>([\s\S]*?)<\/script>/)[1];
  for (const [hostname, pathname, expected] of [
    ['127.0.0.1', '/cursos/excel/inexistente', '/'],
    ['praxis.example.com', '/cursos/excel/inexistente', '/'],
    ['kevinoliveiraz.github.io', '/Praxis/cursos/excel/inexistente', '/Praxis/'],
    ['kevinoliveiraz.github.io', '/outro-projeto/inexistente', '/']
  ]) {
    const base = { href: '/' };
    vm.runInNewContext(code, { location: { hostname, pathname }, document: { getElementById: () => base } });
    assert.equal(base.href, expected);
    assert.equal(new URL('styles/404.css', `https://${hostname}${base.href}`).pathname, `${expected}styles/404.css`);
  }
});
