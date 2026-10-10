const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Element, documentMock } = require('./helpers.cjs');
const code = fs.readFileSync(path.join(__dirname, '../scripts/login.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(__dirname, '../scripts/login-ui.js'), 'utf8');

async function setup(query = '', session = null) {
  const document = documentMock();
  const calls = [], redirects = [];
  const auth = {
    onAuthStateChange(callback) { this.callback = callback; },
    async getSession() { return { data: { session }, error: null }; },
    async signInWithPassword(input) { calls.push(['login', input]); return { data: { user: { id: 'test-user' } } }; },
    async resetPasswordForEmail(address, options) { calls.push(['recover', address, options]); return {}; },
    async updateUser(input) { calls.push(['reset', input]); return { data: { user: { id: 'test-user' } } }; },
    async signInWithOAuth(input) { calls.push(['google', input]); return {}; }
  };
  const window = { location: { search: query, hash: '', href: `https://example.com/Praxis/login.html${query}`, replace(url) { redirects.push(url); } } };
  const context = vm.createContext({ document, window, URL, URLSearchParams, setTimeout });
  const module = new vm.SourceTextModule(code, { context });
  await module.link(() => new vm.SyntheticModule(['supabase', 'upsertUserProfile'], function () {
    this.setExport('supabase', { auth });
    this.setExport('upsertUserProfile', async user => { calls.push(['profile', user.id]); });
  }, { context }));
  await module.evaluate();
  await new Promise(resolve => setImmediate(resolve));
  return { document, module, auth, calls, redirects };
}
test('validação local impede chamadas com e-mail inválido ou senha curta', async () => {
  const page = await setup();
  page.document.getElementById('email').value = 'invalid';
  await page.module.namespace.submitLogin();
  assert.equal(page.calls.length, 0);
  page.document.getElementById('email').value = 'aluno@example.com';
  page.document.getElementById('password').value = '123';
  await page.module.namespace.submitLogin();
  assert.equal(page.calls.length, 0);
  assert.match(page.document.getElementById('login-msg').textContent, /6 caracteres/);
});
test('login mantém sincronização de perfil e encaminhamento à home', async () => {
  const page = await setup();
  page.document.getElementById('email').value = '  ALUNO@example.com ';
  page.document.getElementById('password').value = 'test-password';
  await page.module.namespace.submitLogin();
  assert.equal(page.calls[0][1].email, 'aluno@example.com');
  assert.deepEqual(page.calls[1], ['profile', 'test-user']);
  assert.deepEqual(page.redirects, ['index.html']);
});
test('erro de credenciais devolve mensagem e libera os botões', async () => {
  const page = await setup();
  page.auth.signInWithPassword = async () => ({ error: { message: 'Invalid login credentials' } });
  page.document.getElementById('email').value = 'aluno@example.com';
  page.document.getElementById('password').value = 'test-password';
  await page.module.namespace.submitLogin();
  assert.match(page.document.getElementById('login-msg').textContent, /incorretos/);
  assert.equal(page.document.getElementById('login-submit').disabled, false);
  assert.equal(page.document.getElementById('google-btn').disabled, false);
});
test('recuperação solicita apenas e-mail e mantém o caminho de publicação', async () => {
  const page = await setup('?modo=recuperar');
  page.document.getElementById('email').value = 'aluno@example.com';
  assert.equal(page.document.getElementById('password').disabled, true);
  await page.module.namespace.submitLogin();
  assert.equal(page.calls[0][0], 'recover');
  assert.equal(page.calls[0][2].redirectTo, 'https://example.com/Praxis/login.html?modo=redefinir');
  assert.equal(page.redirects.length, 0);
});
test('link sem sessão retorna à solicitação de recuperação', async () => {
  const page = await setup('?modo=redefinir');
  assert.equal(page.document.body.dataset.authMode, 'recover');
  assert.equal(page.document.getElementById('email').disabled, false);
});
test('recuperação autenticada exige confirmação antes de atualizar senha', async () => {
  const page = await setup('?modo=redefinir', { user: { id: 'test-user' } });
  assert.equal(page.redirects.length, 0);
  page.document.getElementById('password').value = 'new-test-password';
  page.document.getElementById('confirm-password').value = 'different-password';
  await page.module.namespace.submitLogin();
  assert.equal(page.calls.length, 0);
  page.document.getElementById('confirm-password').value = 'new-test-password';
  await page.module.namespace.submitLogin();
  assert.equal(page.calls[0][0], 'reset');
  assert.deepEqual(page.redirects, ['index.html']);
});
test('Google volta ao login no mesmo diretório da página', async () => {
  const page = await setup();
  await page.module.namespace.loginWithGoogle();
  assert.equal(page.calls[0][1].provider, 'google');
  assert.equal(page.calls[0][1].options.redirectTo, 'https://example.com/Praxis/login.html');
});
test('interface lembra apenas o e-mail, remove a preferência e alterna a senha', async () => {
  const document = documentMock();
  document.body.dataset.authMode = 'login';
  const toggle = new Element();
  toggle.dataset.passwordToggle = 'password';
  toggle.children['.password-eye'] = new Element();
  toggle.children['.password-eye-off'] = new Element();
  document.querySelectorAll = () => [toggle];
  const stored = new Map([['praxis-remembered-email', 'aluno@example.com']]);
  const localStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  const context = vm.createContext({ document, localStorage });
  const fakeAuth = new vm.SyntheticModule(['submitLogin', 'loginWithGoogle'], function () {
    this.setExport('submitLogin', async () => {}); this.setExport('loginWithGoogle', async () => {});
  }, { context });
  await fakeAuth.link(() => {}); await fakeAuth.evaluate();
  const script = new vm.Script(uiCode, { importModuleDynamically: () => fakeAuth });
  script.runInContext(context);
  assert.equal(document.getElementById('email').value, 'aluno@example.com');
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, true);
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, false);
  assert.equal(toggle.attributes['aria-label'], 'Mostrar senha');
  document.getElementById('password').value = 'not-stored';
  toggle.listeners.click();
  assert.equal(document.getElementById('password').type, 'text');
  assert.equal(toggle.attributes['aria-label'], 'Ocultar senha');
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, false);
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, true);
  toggle.listeners.click();
  assert.equal(document.getElementById('password').type, 'password');
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, true);
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, false);
  assert.equal(toggle.attributes['aria-label'], 'Mostrar senha');
  await document.getElementById('login-form').listeners.submit({ preventDefault() {} });
  assert.deepEqual([...stored.entries()], [['praxis-remembered-email', 'aluno@example.com']]);
  document.getElementById('remember-email').checked = false;
  document.getElementById('remember-email').listeners.change();
  assert.equal(stored.size, 0);
});
