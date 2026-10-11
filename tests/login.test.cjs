const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element, documentMock } = require('./helpers.cjs'); // Define Element, documentMock como o módulo o texto “./helpers.cjs”.
const code = fs.readFileSync(path.join(__dirname, '../scripts/login.js'), 'utf8'); // Define code como o conteúdo do arquivo os itens de path unidos por __dirname.
const uiCode = fs.readFileSync(path.join(__dirname, '../scripts/login-ui.js'), 'utf8'); // Define uiCode como o conteúdo do arquivo os itens de path unidos por __dirname.

async function setup(query = '', session = null) { // Declara a função assíncrona setup com query, session.
  const document = documentMock(); // Define document como o resultado de documentMock.
  const calls = [], redirects = []; // Define calls como uma lista vazia.
  const auth = { // Define auth como um objeto com onAuthStateChange, getSession, signInWithPassword, resetPasswordForEmail, updateUser e outras propriedades.
    onAuthStateChange(callback) { this.callback = callback; }, // Define a propriedade onAuthStateChange como uma função que recebe callback.
    async getSession() { return { data: { session }, error: null }; }, // Define a propriedade getSession como uma função assíncrona que recebe nenhum argumento.
    async signInWithPassword(input) { calls.push(['login', input]); return { data: { user: { id: 'test-user' } } }; }, // Define a propriedade signInWithPassword como uma função assíncrona que recebe input.
    async resetPasswordForEmail(address, options) { calls.push(['recover', address, options]); return {}; }, // Define a propriedade resetPasswordForEmail como uma função assíncrona que recebe address, options.
    async updateUser(input) { calls.push(['reset', input]); return { data: { user: { id: 'test-user' } } }; }, // Define a propriedade updateUser como uma função assíncrona que recebe input.
    async signInWithOAuth(input) { calls.push(['google', input]); return {}; } // Define a propriedade signInWithOAuth como uma função assíncrona que recebe input.
  }; // Encerra o objeto.
  const window = { location: { search: query, hash: '', href: `https://example.com/Praxis/login.html${query}`, replace(url) { redirects.push(url); } } }; // Define window como um objeto com location.
  const context = vm.createContext({ document, window, URL, URLSearchParams, setTimeout }); // Define context como o resultado de vm.createContext com um objeto com document, window, URL, URLSearchParams, setTimeout.
  const module = new vm.SourceTextModule(code, { context }); // Define module como uma instância de vm.SourceTextModule com code e um objeto com context.
  await module.link(() => new vm.SyntheticModule(['supabase', 'upsertUserProfile'], function () { // Aguarda o resultado de module.link com uma função que recebe nenhum argumento antes de continuar.
    this.setExport('supabase', { auth }); // Executa a chamada que produz o resultado de this.setExport com o texto “supabase” e um objeto com auth.
    this.setExport('upsertUserProfile', async user => { calls.push(['profile', user.id]); }); // Executa a chamada que produz o resultado de this.setExport com o texto “upsertUserProfile” e uma função assíncrona que recebe user.
  }, { context })); // Inicia um objeto com context.
  await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
  await new Promise(resolve => setImmediate(resolve)); // Aguarda uma instância de Promise com uma função que recebe resolve antes de continuar.
  return { document, module, auth, calls, redirects }; // Retorna um objeto com document, module, auth, calls, redirects.
} // Encerra o bloco da função setup.
test('validação local impede chamadas com e-mail inválido ou senha curta', async () => { // Executa a chamada que produz o teste “validação local impede chamadas com e-mail inválido ou senha curta”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.document.getElementById('email').value = 'invalid'; // Atualiza page.document.getElementById(…).value com o texto “invalid”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.calls.length e 0.
  page.document.getElementById('email').value = 'aluno@example.com'; // Atualiza page.document.getElementById(…).value com o texto “aluno@example.com”.
  page.document.getElementById('password').value = '123'; // Atualiza page.document.getElementById(…).value com o texto “123”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.calls.length e 0.
  assert.match(page.document.getElementById('login-msg').textContent, /6 caracteres/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
}); // Encerra o bloco atual.
test('login mantém sincronização de perfil e encaminhamento à home', async () => { // Executa a chamada que produz o teste “login mantém sincronização de perfil e encaminhamento à home”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.document.getElementById('email').value = '  ALUNO@example.com '; // Atualiza page.document.getElementById(…).value com o texto “ALUNO@example.com”.
  page.document.getElementById('password').value = 'test-password'; // Atualiza page.document.getElementById(…).value com o texto “test-password”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls[0][1].email, 'aluno@example.com'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][1].email e o texto “aluno@example.com”.
  assert.deepEqual(page.calls[1], ['profile', 'test-user']); // Executa a chamada que produz a comparação completa das estruturas informadas.
  assert.deepEqual(page.redirects, ['index.html']); // Executa a chamada que produz a comparação completa das estruturas informadas.
}); // Encerra o bloco atual.
test('erro de credenciais devolve mensagem e libera os botões', async () => { // Executa a chamada que produz o teste “erro de credenciais devolve mensagem e libera os botões”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.auth.signInWithPassword = async () => ({ error: { message: 'Invalid login credentials' } }); // Atualiza page.auth.signInWithPassword com uma função assíncrona que recebe nenhum argumento.
  page.document.getElementById('email').value = 'aluno@example.com'; // Atualiza page.document.getElementById(…).value com o texto “aluno@example.com”.
  page.document.getElementById('password').value = 'test-password'; // Atualiza page.document.getElementById(…).value com o texto “test-password”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.match(page.document.getElementById('login-msg').textContent, /incorretos/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.equal(page.document.getElementById('login-submit').disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e false (falso).
  assert.equal(page.document.getElementById('google-btn').disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e false (falso).
}); // Encerra o bloco atual.
test('recuperação solicita apenas e-mail e mantém o caminho de publicação', async () => { // Executa a chamada que produz o teste “recuperação solicita apenas e-mail e mantém o caminho de publicação”.
  const page = await setup('?modo=recuperar'); // Define page como o resultado aguardado de o resultado de setup com o texto “?modo=recuperar”.
  page.document.getElementById('email').value = 'aluno@example.com'; // Atualiza page.document.getElementById(…).value com o texto “aluno@example.com”.
  assert.equal(page.document.getElementById('password').disabled, true); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e true (verdadeiro).
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls[0][0], 'recover'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][0] e o texto “recover”.
  assert.equal(page.calls[0][2].redirectTo, 'https://example.com/Praxis/login.html?modo=redefinir'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][2].redirectTo e o texto “https://example.com/Praxis/login.html?modo=redefinir”.
  assert.equal(page.redirects.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.redirects.length e 0.
}); // Encerra o bloco atual.
test('link sem sessão retorna à solicitação de recuperação', async () => { // Executa a chamada que produz o teste “link sem sessão retorna à solicitação de recuperação”.
  const page = await setup('?modo=redefinir'); // Define page como o resultado aguardado de o resultado de setup com o texto “?modo=redefinir”.
  assert.equal(page.document.body.dataset.authMode, 'recover'); // Executa a chamada que produz a conferência de igualdade entre page.document.body.dataset.authMode e o texto “recover”.
  assert.equal(page.document.getElementById('email').disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e false (falso).
}); // Encerra o bloco atual.
test('recuperação autenticada exige confirmação antes de atualizar senha', async () => { // Executa a chamada que produz o teste “recuperação autenticada exige confirmação antes de atualizar senha”.
  const page = await setup('?modo=redefinir', { user: { id: 'test-user' } }); // Define page como o resultado aguardado de o resultado de setup com o texto “?modo=redefinir” e um objeto com user.
  assert.equal(page.redirects.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.redirects.length e 0.
  page.document.getElementById('password').value = 'new-test-password'; // Atualiza page.document.getElementById(…).value com o texto “new-test-password”.
  page.document.getElementById('confirm-password').value = 'different-password'; // Atualiza page.document.getElementById(…).value com o texto “different-password”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.calls.length e 0.
  page.document.getElementById('confirm-password').value = 'new-test-password'; // Atualiza page.document.getElementById(…).value com o texto “new-test-password”.
  await page.module.namespace.submitLogin(); // Aguarda o resultado de page.module.namespace.submitLogin antes de continuar.
  assert.equal(page.calls[0][0], 'reset'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][0] e o texto “reset”.
  assert.deepEqual(page.redirects, ['index.html']); // Executa a chamada que produz a comparação completa das estruturas informadas.
}); // Encerra o bloco atual.
test('Google volta ao login no mesmo diretório da página', async () => { // Executa a chamada que produz o teste “Google volta ao login no mesmo diretório da página”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  await page.module.namespace.loginWithGoogle(); // Aguarda o resultado de page.module.namespace.loginWithGoogle antes de continuar.
  assert.equal(page.calls[0][1].provider, 'google'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][1].provider e o texto “google”.
  assert.equal(page.calls[0][1].options.redirectTo, 'https://example.com/Praxis/login.html'); // Executa a chamada que produz a conferência de igualdade entre page.calls[0][1].options.redirectTo e o texto “https://example.com/Praxis/login.html”.
}); // Encerra o bloco atual.
test('interface lembra apenas o e-mail, remove a preferência e alterna a senha', async () => { // Executa a chamada que produz o teste “interface lembra apenas o e-mail, remove a preferência e alterna a senha”.
  const document = documentMock(); // Define document como o resultado de documentMock.
  document.body.dataset.authMode = 'login'; // Atualiza document.body.dataset.authMode com o texto “login”.
  const toggle = new Element(); // Define toggle como uma instância de Element.
  toggle.dataset.passwordToggle = 'password'; // Atualiza toggle.dataset.passwordToggle com o texto “password”.
  toggle.children['.password-eye'] = new Element(); // Atualiza toggle.children[o texto “.password-eye”] com uma instância de Element.
  toggle.children['.password-eye-off'] = new Element(); // Atualiza toggle.children[o texto “.password-eye-off”] com uma instância de Element.
  document.querySelectorAll = () => [toggle]; // Atualiza document.querySelectorAll com uma função que recebe nenhum argumento.
  const stored = new Map([['praxis-remembered-email', 'aluno@example.com']]); // Define stored como uma instância de Map com uma lista com 1 item.
  const localStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }; // Define localStorage como um objeto com getItem, setItem, removeItem.
  const context = vm.createContext({ document, localStorage }); // Define context como o resultado de vm.createContext com um objeto com document, localStorage.
  const fakeAuth = new vm.SyntheticModule(['submitLogin', 'loginWithGoogle'], function () { // Define fakeAuth como uma instância de vm.SyntheticModule com uma lista com 2 itens e uma função que recebe nenhum argumento.
    this.setExport('submitLogin', async () => {}); this.setExport('loginWithGoogle', async () => {}); // Executa a chamada que produz o resultado de this.setExport com o texto “submitLogin” e uma função assíncrona que recebe nenhum argumento.
  }, { context }); // Inicia um objeto com context.
  await fakeAuth.link(() => {}); await fakeAuth.evaluate(); // Aguarda o resultado de fakeAuth.link com uma função que recebe nenhum argumento antes de continuar.
  const script = new vm.Script(uiCode, { importModuleDynamically: () => fakeAuth }); // Define script como uma instância de vm.Script com uiCode e um objeto com importModuleDynamically.
  script.runInContext(context); // Executa a chamada que produz o resultado de script.runInContext com context.
  assert.equal(document.getElementById('email').value, 'aluno@example.com'); // Executa a chamada que produz a conferência de igualdade entre document.getElementById(…).value e o texto “aluno@example.com”.
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, true); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye”].attributes e true (verdadeiro).
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, false); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye-off”].attributes e false (falso).
  assert.equal(toggle.attributes['aria-label'], 'Mostrar senha'); // Executa a chamada que produz a conferência de igualdade entre toggle.attributes[o texto “aria-label”] e o texto “Mostrar senha”.
  document.getElementById('password').value = 'not-stored'; // Atualiza document.getElementById(…).value com o texto “not-stored”.
  toggle.listeners.click(); // Executa a chamada que produz o resultado de toggle.listeners.click.
  assert.equal(document.getElementById('password').type, 'text'); // Executa a chamada que produz a conferência de igualdade entre document.getElementById(…).type e o texto “text”.
  assert.equal(toggle.attributes['aria-label'], 'Ocultar senha'); // Executa a chamada que produz a conferência de igualdade entre toggle.attributes[o texto “aria-label”] e o texto “Ocultar senha”.
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, false); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye”].attributes e false (falso).
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, true); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye-off”].attributes e true (verdadeiro).
  toggle.listeners.click(); // Executa a chamada que produz o resultado de toggle.listeners.click.
  assert.equal(document.getElementById('password').type, 'password'); // Executa a chamada que produz a conferência de igualdade entre document.getElementById(…).type e o texto “password”.
  assert.equal('hidden' in toggle.children['.password-eye'].attributes, true); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye”].attributes e true (verdadeiro).
  assert.equal('hidden' in toggle.children['.password-eye-off'].attributes, false); // Executa a chamada que produz a conferência de igualdade entre o texto “hidden” presente em toggle.children[o texto “.password-eye-off”].attributes e false (falso).
  assert.equal(toggle.attributes['aria-label'], 'Mostrar senha'); // Executa a chamada que produz a conferência de igualdade entre toggle.attributes[o texto “aria-label”] e o texto “Mostrar senha”.
  await document.getElementById('login-form').listeners.submit({ preventDefault() {} }); // Aguarda o resultado de document.getElementById(…).listeners.submit com um objeto com preventDefault antes de continuar.
  assert.deepEqual([...stored.entries()], [['praxis-remembered-email', 'aluno@example.com']]); // Executa a chamada que produz a comparação completa das estruturas informadas.
  document.getElementById('remember-email').checked = false; // Atualiza document.getElementById(…).checked com false (falso).
  document.getElementById('remember-email').listeners.change(); // Executa a chamada que produz o resultado de document.getElementById(…).listeners.change.
  assert.equal(stored.size, 0); // Executa a chamada que produz a conferência de igualdade entre stored.size e 0.
}); // Encerra o bloco atual.
