const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element, documentMock } = require('./helpers.cjs'); // Define Element, documentMock como o módulo o texto “./helpers.cjs”.
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); // Define read como uma função que recebe file.
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); // Define escapeHtml como uma função que recebe value.
const flush = () => new Promise(resolve => setImmediate(resolve)); // Define flush como uma função que recebe nenhum argumento.

async function setup(options = {}) { // Declara a função assíncrona setup com options.
  const user = options.user === undefined ? { id: 'user-1', email: 'aluno@example.com', email_confirmed_at: '2026-10-09', // Define user como um objeto com id, email, email_confirmed_at, user_metadata, app_metadata se options.user igual, inclusive no tipo, a undefined; caso contrário, options.user.
    user_metadata: { full_name: 'Kevin', picture: 'https://example.com/photo.png' }, app_metadata: { providers: ['google'] } } : options.user; // Define a propriedade user_metadata como um objeto com full_name, picture.
  const state = { user, row: options.row === undefined ? { user_id: 'user-1', nome_usuario: 'kevinoliveiraz', nome_completo: 'Kevin Oliveira', avatar_url: 'https://example.com/photo.png' } : options.row, // Define state como um objeto com user, row, matches, calls, redirects e outras propriedades.
    matches: [], calls: [], redirects: [], events: [], windowListeners: {}, getError: options.getError }; // Define a propriedade matches como uma lista vazia.
  const document = documentMock(); // Define document como o resultado de documentMock.
  const radios = ['light', 'dark', 'system'].map(value => { const element = new Element(); element.value = value; return element; }); // Define radios como uma lista transformada a partir de expressão.
  document.querySelectorAll = selector => selector === 'input[name="profile-theme"]' ? radios : []; // Atualiza document.querySelectorAll com uma função que recebe selector.
  document.getElementById('profile-content').hidden = true; // Atualiza document.getElementById(…).hidden com true (verdadeiro).
  document.getElementById('profile-fields').disabled = true; // Atualiza document.getElementById(…).disabled com true (verdadeiro).
  const window = { // Define window como um objeto com location, addEventListener, dispatchEvent, PraxisTheme.
    location: { href: 'https://example.com/Praxis/perfil.html', hash: '', replace(url) { state.redirects.push(url); }, reload() { state.reloaded = true; } }, // Define a propriedade location como um objeto com href, hash, replace, reload.
    addEventListener(name, listener) { state.windowListeners[name] = listener; }, // Define a propriedade addEventListener como uma função que recebe name, listener.
    dispatchEvent(event) { state.events.push(event); state.windowListeners[event.type]?.(event); }, // Define a propriedade dispatchEvent como uma função que recebe event.
    PraxisTheme: { getPreference: () => state.preference || 'system', setPreference(value) { state.preference = value; state.windowListeners['praxis:theme-changed']?.(); } } // Define a propriedade PraxisTheme como um objeto com getPreference, setPreference.
  }; // Encerra o objeto.
  const auth = { // Define auth como um objeto com onAuthStateChange, getUser, updateUser, resetPasswordForEmail, signOut.
    onAuthStateChange(listener) { state.authListener = listener; }, // Define a propriedade onAuthStateChange como uma função que recebe listener.
    async getUser() { return { data: { user: state.user }, error: state.getError }; }, // Define a propriedade getUser como uma função assíncrona que recebe nenhum argumento.
    async updateUser(input) { // Define a propriedade updateUser como uma função assíncrona que recebe input.
      state.calls.push(['metadata', input]); // Executa a chamada que produz a inclusão de uma lista com 2 itens ao final de state.calls.
      if (state.metadataError) return { error: state.metadataError }; // Verifica state.metadataError; se verdadeiro, retorna um objeto com error.
      state.user = { ...state.user, user_metadata: { ...state.user.user_metadata, ...input.data } }; // Atualiza state.user com um objeto com state.user, user_metadata.
      state.authListener('USER_UPDATED', { user: state.user }); // Executa a chamada que produz o resultado de state.authListener com o texto “USER_UPDATED” e um objeto com user.
      return { data: { user: state.user } }; // Retorna um objeto com data.
    }, // Encerra o bloco atual.
    async resetPasswordForEmail(address, settings) { state.calls.push(['recover', address, settings]); return { error: state.recoveryError }; }, // Define a propriedade resetPasswordForEmail como uma função assíncrona que recebe address, settings.
    async signOut(settings) { state.calls.push(['signOut', settings]); return { error: state.signoutError }; } // Define a propriedade signOut como uma função assíncrona que recebe settings.
  }; // Encerra o objeto.
  const supabase = { auth, from(table) { // Define supabase como um objeto com auth, from.
    assert.equal(table, 'usuarios'); // Executa a chamada que produz a conferência de igualdade entre table e o texto “usuarios”.
    return { // Retorna um objeto com mode, select, eq, maybeSingle, ilike e outras propriedades.
      mode: 'read', select() { return this; }, eq(column, value) { assert.equal(column, 'user_id'); this.userId = value; return this; }, // Define a propriedade mode como o texto “read”.
      async maybeSingle() { return { data: state.row, error: state.readError }; }, // Define a propriedade maybeSingle como uma função assíncrona que recebe nenhum argumento.
      ilike(column, pattern) { state.calls.push(['available', column, pattern]); return state.availabilityPromise || Promise.resolve({ data: state.matches }); }, // Define a propriedade ilike como uma função que recebe column, pattern.
      update(payload) { this.mode = 'update'; this.payload = payload; return this; }, // Define a propriedade update como uma função que recebe payload.
      insert(payload) { this.mode = 'insert'; this.payload = payload; return this; }, // Define a propriedade insert como uma função que recebe payload.
      async single() { // Define a propriedade single como uma função assíncrona que recebe nenhum argumento.
        state.calls.push([this.mode, this.payload, this.userId]); // Executa a chamada que produz a inclusão de uma lista com 3 itens ao final de state.calls.
        if (state.writeError) return { error: state.writeError }; // Verifica state.writeError; se verdadeiro, retorna um objeto com error.
        state.row = { ...state.row, ...this.payload, user_id: this.userId || this.payload.user_id }; // Atualiza state.row com um objeto com state.row, this.payload, user_id.
        return { data: state.row }; // Retorna um objeto com data.
      } // Encerra o bloco atual.
    }; // Encerra o objeto.
  } }; // Define a função que recebe table.
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } } // Declara a classe CustomEvent.
  const context = vm.createContext({ window, document, URL, CustomEvent }); // Define context como o resultado de vm.createContext com um objeto com window, document, URL, CustomEvent.
  const module = new vm.SourceTextModule(read('scripts/perfil.js'), { context }); // Define module como uma instância de vm.SourceTextModule com o resultado de read com o texto “scripts/perfil.js” e um objeto com context.
  const client = new vm.SyntheticModule(['supabase', 'escapeHtml'], function () { this.setExport('supabase', supabase); this.setExport('escapeHtml', escapeHtml); }, { context }); // Define client como uma instância de vm.SyntheticModule com uma lista com 2 itens e uma função que recebe nenhum argumento.
  const header = new vm.SourceTextModule(read('scripts/header-session.js'), { context }); // Define header como uma instância de vm.SourceTextModule com o resultado de read com o texto “scripts/header-session.js” e um objeto com context.
  const menu = new vm.SourceTextModule(read('scripts/account-menu.js'), { context }); // Define menu como uma instância de vm.SourceTextModule com o resultado de read com o texto “scripts/account-menu.js” e um objeto com context.
  await module.link(specifier => ({ './supabaseClient.js': client, './header-session.js': header, './account-menu.js': menu }[specifier])); // Aguarda o resultado de module.link com uma função que recebe specifier antes de continuar.
  await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
  await flush(); // Aguarda o resultado de flush antes de continuar.
  return { module, state, document, radios, window, auth }; // Retorna um objeto com module, state, document, radios, window e outras propriedades.
} // Encerra o bloco da função setup.
function fields(page, { fullname = 'Kevin Cardoso', username = 'novo_usuario', avatar = '' } = {}) { // Declara a função fields com page, fullname, username, avatar.
  page.document.getElementById('profile-fullname').value = fullname; // Atualiza page.document.getElementById(…).value com fullname.
  page.document.getElementById('profile-username').value = username; // Atualiza page.document.getElementById(…).value com username.
  page.document.getElementById('profile-avatar-url').value = avatar; // Atualiza page.document.getElementById(…).value com avatar.
} // Encerra o bloco da função fields.

test('perfil exige autenticação e direciona uma sessão ausente ao login', async () => { // Executa a chamada que produz o teste “perfil exige autenticação e direciona uma sessão ausente ao login”.
  const page = await setup({ user: null, getError: { name: 'AuthSessionMissingError' } }); // Define page como o resultado aguardado de o resultado de setup com um objeto com user, getError.
  assert.deepEqual(page.state.redirects, ['login.html']); // Executa a chamada que produz a comparação completa das estruturas informadas.
  assert.equal(page.document.getElementById('profile-content').hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).hidden e true (verdadeiro).
  assert.equal(page.document.getElementById('profile-fields').disabled, true); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e true (verdadeiro).
}); // Encerra o bloco atual.

test('conta carrega dados reais do perfil e mostra o método de acesso', async () => { // Executa a chamada que produz o teste “conta carrega dados reais do perfil e mostra o método de acesso”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  assert.equal(page.document.getElementById('sidebar-name').textContent, 'kevinoliveiraz'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).textContent e o texto “kevinoliveiraz”.
  assert.equal(page.document.getElementById('profile-fullname').value, 'Kevin Oliveira'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).value e o texto “Kevin Oliveira”.
  assert.equal(page.document.getElementById('profile-provider').textContent, 'Google'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).textContent e o texto “Google”.
  assert.equal(page.document.getElementById('profile-content').hidden, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).hidden e false (falso).
  assert.equal(page.radios[2].checked, true); // Executa a chamada que produz a conferência de igualdade entre page.radios[2].checked e true (verdadeiro).
}); // Encerra o bloco atual.

test('salvar valida campos e recusa foto com protocolo inseguro antes de chamar o servidor', async () => { // Executa a chamada que produz o teste “salvar valida campos e recusa foto com protocolo inseguro antes de chamar o servidor”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  fields(page, { avatar: 'javascript:alert(1)' }); // Executa a chamada que produz o resultado de fields com page e um objeto com avatar.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.state.calls.length e 0.
  assert.match(page.document.getElementById('profile-message').textContent, /HTTPS/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.equal(page.document.getElementById('profile-avatar-url').getAttribute('aria-invalid'), 'true'); // Executa a chamada que produz a conferência de igualdade entre o atributo o texto “aria-invalid” de page.document.getElementById(…) e o texto “true”.
  fields(page, { username: 'nome inválido' }); // Executa a chamada que produz o resultado de fields com page e um objeto com username.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.state.calls.length e 0.
}); // Encerra o bloco atual.

test('nome já usado impede a gravação e mantém o formulário disponível', async () => { // Executa a chamada que produz o teste “nome já usado impede a gravação e mantém o formulário disponível”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.state.matches = [{ user_id: 'outra-conta' }]; // Atualiza page.state.matches com uma lista com 1 item.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls.length, 1); // Executa a chamada que produz a conferência de igualdade entre page.state.calls.length e 1.
  assert.equal(page.state.calls[0][2], 'novo\\_usuario'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[0][2] e o texto “novo\_usuario”.
  assert.match(page.document.getElementById('profile-message').textContent, /já está em uso/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.equal(page.document.getElementById('profile-fields').disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e false (falso).
}); // Encerra o bloco atual.

test('salva nome e iniciais no perfil e metadata, atualizando o cabeçalho sem recarregar', async () => { // Executa a chamada que produz o teste “salva nome e iniciais no perfil e metadata, atualizando o cabeçalho sem recarregar”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls[1][0], 'update'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][0] e o texto “update”.
  assert.equal(page.state.calls[1][2], 'user-1'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][2] e o texto “user-1”.
  assert.equal(page.state.row.nome_completo, 'Kevin Cardoso'); // Executa a chamada que produz a conferência de igualdade entre page.state.row.nome_completo e o texto “Kevin Cardoso”.
  assert.equal(page.state.row.avatar_url, null); // Executa a chamada que produz a conferência de igualdade entre page.state.row.avatar_url e null (ausência de valor).
  assert.equal(page.state.calls[2][1].data.praxis_avatar_mode, 'initials'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[2][1].data.praxis_avatar_mode e o texto “initials”.
  assert.equal(page.state.events.at(-1).type, 'praxis:profile-updated'); // Executa a chamada que produz a conferência de igualdade entre page.state.events.at(…).type e o texto “praxis:profile-updated”.
  assert.equal(page.document.getElementById('sidebar-name').textContent, 'novo_usuario'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).textContent e o texto “novo_usuario”.
  assert.equal(page.document.getElementById('sidebar-avatar').textContent, 'N'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).textContent e o texto “N”.
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'success'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).dataset.kind e o texto “success”.
}); // Encerra o bloco atual.

test('conta sem registro de perfil cria somente os dados do usuário autenticado', async () => { // Executa a chamada que produz o teste “conta sem registro de perfil cria somente os dados do usuário autenticado”.
  const page = await setup({ row: null }); // Define page como o resultado aguardado de o resultado de setup com um objeto com row.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls[1][0], 'insert'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][0] e o texto “insert”.
  assert.equal(page.state.calls[1][1].user_id, 'user-1'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][1].user_id e o texto “user-1”.
  assert.equal(page.state.calls[1][1].email, 'aluno@example.com'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][1].email e o texto “aluno@example.com”.
}); // Encerra o bloco atual.

test('erro de gravação não anuncia sucesso nem sincroniza metadata', async () => { // Executa a chamada que produz o teste “erro de gravação não anuncia sucesso nem sincroniza metadata”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.state.writeError = { code: '42501' }; // Atualiza page.state.writeError com um objeto com code.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.calls.length, 2); // Executa a chamada que produz a conferência de igualdade entre page.state.calls.length e 2.
  assert.equal(page.state.events.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.state.events.length e 0.
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'error'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).dataset.kind e o texto “error”.
  assert.equal(page.document.getElementById('profile-fields').disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e false (falso).
}); // Encerra o bloco atual.

test('falha parcial de metadata informa o que foi salvo e permite tentar novamente', async () => { // Executa a chamada que produz o teste “falha parcial de metadata informa o que foi salvo e permite tentar novamente”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.state.metadataError = { message: 'Offline' }; // Atualiza page.state.metadataError com um objeto com message.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  await page.module.namespace.saveDetails(); // Aguarda o resultado de page.module.namespace.saveDetails antes de continuar.
  assert.equal(page.state.row.nome_usuario, 'novo_usuario'); // Executa a chamada que produz a conferência de igualdade entre page.state.row.nome_usuario e o texto “novo_usuario”.
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'warning'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).dataset.kind e o texto “warning”.
  assert.match(page.document.getElementById('profile-message').textContent, /sincronização.*falhou/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
}); // Encerra o bloco atual.

test('saída durante uma consulta pendente impede gravar o perfil depois', async () => { // Executa a chamada que produz o teste “saída durante uma consulta pendente impede gravar o perfil depois”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  let resolve; // Define resolve como sem valor inicial.
  page.state.availabilityPromise = new Promise(done => { resolve = done; }); // Atualiza page.state.availabilityPromise com uma instância de Promise com uma função que recebe done.
  fields(page); // Executa a chamada que produz o resultado de fields com page.
  const pending = page.module.namespace.saveDetails(); // Define pending como o resultado de page.module.namespace.saveDetails.
  page.state.authListener('SIGNED_OUT', null); // Executa a chamada que produz o resultado de page.state.authListener com o texto “SIGNED_OUT” e null (ausência de valor).
  resolve({ data: [] }); // Executa a chamada que produz o resultado de resolve com um objeto com data.
  await pending; // Aguarda pending antes de continuar.
  assert.equal(page.state.calls.length, 1); // Executa a chamada que produz a conferência de igualdade entre page.state.calls.length e 1.
  assert.equal(page.document.getElementById('profile-content').hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).hidden e true (verdadeiro).
  assert.equal(page.document.getElementById('profile-fields').disabled, true); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).disabled e true (verdadeiro).
}); // Encerra o bloco atual.

test('senha usa o e-mail autenticado e mantém o retorno no diretório da publicação', async () => { // Executa a chamada que produz o teste “senha usa o e-mail autenticado e mantém o retorno no diretório da publicação”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  await page.module.namespace.sendPasswordLink(); // Aguarda o resultado de page.module.namespace.sendPasswordLink antes de continuar.
  assert.equal(page.state.calls[0][0], 'recover'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[0][0] e o texto “recover”.
  assert.equal(page.state.calls[0][1], 'aluno@example.com'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[0][1] e o texto “aluno@example.com”.
  assert.equal(page.state.calls[0][2].redirectTo, 'https://example.com/Praxis/login.html?modo=redefinir'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[0][2].redirectTo e o texto “https://example.com/Praxis/login.html?modo=redefinir”.
  assert.equal(page.document.getElementById('security-message').dataset.kind, 'success'); // Executa a chamada que produz a conferência de igualdade entre page.document.getElementById(…).dataset.kind e o texto “success”.
}); // Encerra o bloco atual.

test('sessões usam escopos separados: outras preserva a atual, local retorna ao login', async () => { // Executa a chamada que produz o teste “sessões usam escopos separados: outras preserva a atual, local retorna ao login”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  await page.module.namespace.signOutOthers(); // Aguarda o resultado de page.module.namespace.signOutOthers antes de continuar.
  assert.equal(page.state.calls[0][1].scope, 'others'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[0][1].scope e o texto “others”.
  assert.equal(page.state.redirects.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.state.redirects.length e 0.
  await page.module.namespace.signOutHere(); // Aguarda o resultado de page.module.namespace.signOutHere antes de continuar.
  assert.equal(page.state.calls[1][1].scope, 'local'); // Executa a chamada que produz a conferência de igualdade entre page.state.calls[1][1].scope e o texto “local”.
  assert.deepEqual(page.state.redirects, ['login.html']); // Executa a chamada que produz a comparação completa das estruturas informadas.
}); // Encerra o bloco atual.

test('radio de aparência usa o controlador compartilhado de todas as páginas', async () => { // Executa a chamada que produz o teste “radio de aparência usa o controlador compartilhado de todas as páginas”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.radios[0].checked = true; // Atualiza page.radios[0].checked com true (verdadeiro).
  page.radios[0].listeners.change(); // Executa a chamada que produz o resultado de page.radios[0].listeners.change.
  assert.equal(page.state.preference, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.state.preference e o texto “light”.
  assert.equal(page.radios[0].checked, true); // Executa a chamada que produz a conferência de igualdade entre page.radios[0].checked e true (verdadeiro).
  assert.equal(page.radios[2].checked, false); // Executa a chamada que produz a conferência de igualdade entre page.radios[2].checked e false (falso).
}); // Encerra o bloco atual.

test('novo login preserva o nome e a foto personalizados no registro existente', async () => { // Executa a chamada que produz o teste “novo login preserva o nome e a foto personalizados no registro existente”.
  const updates = []; // Define updates como uma lista vazia.
  const supabase = { from() { return { // Define supabase como um objeto com from.
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1 } }) }) }), // Define a propriedade select como uma função que recebe nenhum argumento.
    update: payload => ({ eq: async () => { updates.push(payload); return {}; } }) // Define a propriedade update como uma função que recebe payload.
  }; } }; // Inicia um objeto com select, update.
  const context = vm.createContext({}); // Define context como o resultado de vm.createContext com um objeto vazio.
  const module = new vm.SourceTextModule(read('scripts/supabaseClient.js'), { context }); // Define module como uma instância de vm.SourceTextModule com o resultado de read com o texto “scripts/supabaseClient.js” e um objeto com context.
  await module.link(() => new vm.SyntheticModule(['createClient'], function () { this.setExport('createClient', () => supabase); }, { context })); // Aguarda o resultado de module.link com uma função que recebe nenhum argumento antes de continuar.
  await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
  await module.namespace.upsertUserProfile({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: 'Nome do Google', avatar_url: 'https://example.com/old.png' } }); // Aguarda o resultado de module.namespace.upsertUserProfile com um objeto com id, email, user_metadata antes de continuar.
  assert.deepEqual(Object.keys(updates[0]).sort(), ['email', 'provedor_login', 'ultimo_login']); // Executa a chamada que produz a comparação completa das estruturas informadas.
}); // Encerra o bloco atual.
