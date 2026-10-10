const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Element, documentMock } = require('./helpers.cjs');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const flush = () => new Promise(resolve => setImmediate(resolve));

async function setup(options = {}) {
  const user = options.user === undefined ? { id: 'user-1', email: 'aluno@example.com', email_confirmed_at: '2026-10-09',
    user_metadata: { full_name: 'Kevin', picture: 'https://example.com/photo.png' }, app_metadata: { providers: ['google'] } } : options.user;
  const state = { user, row: options.row === undefined ? { user_id: 'user-1', nome_usuario: 'kevinoliveiraz', nome_completo: 'Kevin Oliveira', avatar_url: 'https://example.com/photo.png' } : options.row,
    matches: [], calls: [], redirects: [], events: [], windowListeners: {}, getError: options.getError };
  const document = documentMock();
  const radios = ['light', 'dark', 'system'].map(value => { const element = new Element(); element.value = value; return element; });
  document.querySelectorAll = selector => selector === 'input[name="profile-theme"]' ? radios : [];
  document.getElementById('profile-content').hidden = true;
  document.getElementById('profile-fields').disabled = true;
  const window = {
    location: { href: 'https://example.com/Praxis/perfil.html', hash: '', replace(url) { state.redirects.push(url); }, reload() { state.reloaded = true; } },
    addEventListener(name, listener) { state.windowListeners[name] = listener; },
    dispatchEvent(event) { state.events.push(event); state.windowListeners[event.type]?.(event); },
    PraxisTheme: { getPreference: () => state.preference || 'system', setPreference(value) { state.preference = value; state.windowListeners['praxis:theme-changed']?.(); } }
  };
  const auth = {
    onAuthStateChange(listener) { state.authListener = listener; },
    async getUser() { return { data: { user: state.user }, error: state.getError }; },
    async updateUser(input) {
      state.calls.push(['metadata', input]);
      if (state.metadataError) return { error: state.metadataError };
      state.user = { ...state.user, user_metadata: { ...state.user.user_metadata, ...input.data } };
      state.authListener('USER_UPDATED', { user: state.user });
      return { data: { user: state.user } };
    },
    async resetPasswordForEmail(address, settings) { state.calls.push(['recover', address, settings]); return { error: state.recoveryError }; },
    async signOut(settings) { state.calls.push(['signOut', settings]); return { error: state.signoutError }; }
  };
  const supabase = { auth, from(table) {
    assert.equal(table, 'usuarios');
    return {
      mode: 'read', select() { return this; }, eq(column, value) { assert.equal(column, 'user_id'); this.userId = value; return this; },
      async maybeSingle() { return { data: state.row, error: state.readError }; },
      ilike(column, pattern) { state.calls.push(['available', column, pattern]); return state.availabilityPromise || Promise.resolve({ data: state.matches }); },
      update(payload) { this.mode = 'update'; this.payload = payload; return this; },
      insert(payload) { this.mode = 'insert'; this.payload = payload; return this; },
      async single() {
        state.calls.push([this.mode, this.payload, this.userId]);
        if (state.writeError) return { error: state.writeError };
        state.row = { ...state.row, ...this.payload, user_id: this.userId || this.payload.user_id };
        return { data: state.row };
      }
    };
  } };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  const context = vm.createContext({ window, document, URL, CustomEvent });
  const module = new vm.SourceTextModule(read('scripts/perfil.js'), { context });
  const client = new vm.SyntheticModule(['supabase', 'escapeHtml'], function () { this.setExport('supabase', supabase); this.setExport('escapeHtml', escapeHtml); }, { context });
  const header = new vm.SourceTextModule(read('scripts/header-session.js'), { context });
  const menu = new vm.SourceTextModule(read('scripts/account-menu.js'), { context });
  await module.link(specifier => ({ './supabaseClient.js': client, './header-session.js': header, './account-menu.js': menu }[specifier]));
  await module.evaluate();
  await flush();
  return { module, state, document, radios, window, auth };
}
function fields(page, { fullname = 'Kevin Cardoso', username = 'novo_usuario', avatar = '' } = {}) {
  page.document.getElementById('profile-fullname').value = fullname;
  page.document.getElementById('profile-username').value = username;
  page.document.getElementById('profile-avatar-url').value = avatar;
}

test('perfil exige autenticação e direciona uma sessão ausente ao login', async () => {
  const page = await setup({ user: null, getError: { name: 'AuthSessionMissingError' } });
  assert.deepEqual(page.state.redirects, ['login.html']);
  assert.equal(page.document.getElementById('profile-content').hidden, true);
  assert.equal(page.document.getElementById('profile-fields').disabled, true);
});

test('conta carrega dados reais do perfil e mostra o método de acesso', async () => {
  const page = await setup();
  assert.equal(page.document.getElementById('sidebar-name').textContent, 'kevinoliveiraz');
  assert.equal(page.document.getElementById('profile-fullname').value, 'Kevin Oliveira');
  assert.equal(page.document.getElementById('profile-provider').textContent, 'Google');
  assert.equal(page.document.getElementById('profile-content').hidden, false);
  assert.equal(page.radios[2].checked, true);
});

test('salvar valida campos e recusa foto com protocolo inseguro antes de chamar o servidor', async () => {
  const page = await setup();
  fields(page, { avatar: 'javascript:alert(1)' });
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls.length, 0);
  assert.match(page.document.getElementById('profile-message').textContent, /HTTPS/);
  assert.equal(page.document.getElementById('profile-avatar-url').getAttribute('aria-invalid'), 'true');
  fields(page, { username: 'nome inválido' });
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls.length, 0);
});

test('nome já usado impede a gravação e mantém o formulário disponível', async () => {
  const page = await setup();
  page.state.matches = [{ user_id: 'outra-conta' }];
  fields(page);
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls.length, 1);
  assert.equal(page.state.calls[0][2], 'novo\\_usuario');
  assert.match(page.document.getElementById('profile-message').textContent, /já está em uso/);
  assert.equal(page.document.getElementById('profile-fields').disabled, false);
});

test('salva nome e iniciais no perfil e metadata, atualizando o cabeçalho sem recarregar', async () => {
  const page = await setup();
  fields(page);
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls[1][0], 'update');
  assert.equal(page.state.calls[1][2], 'user-1');
  assert.equal(page.state.row.nome_completo, 'Kevin Cardoso');
  assert.equal(page.state.row.avatar_url, null);
  assert.equal(page.state.calls[2][1].data.praxis_avatar_mode, 'initials');
  assert.equal(page.state.events.at(-1).type, 'praxis:profile-updated');
  assert.equal(page.document.getElementById('sidebar-name').textContent, 'novo_usuario');
  assert.equal(page.document.getElementById('sidebar-avatar').textContent, 'N');
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'success');
});

test('conta sem registro de perfil cria somente os dados do usuário autenticado', async () => {
  const page = await setup({ row: null });
  fields(page);
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls[1][0], 'insert');
  assert.equal(page.state.calls[1][1].user_id, 'user-1');
  assert.equal(page.state.calls[1][1].email, 'aluno@example.com');
});

test('erro de gravação não anuncia sucesso nem sincroniza metadata', async () => {
  const page = await setup();
  page.state.writeError = { code: '42501' };
  fields(page);
  await page.module.namespace.saveDetails();
  assert.equal(page.state.calls.length, 2);
  assert.equal(page.state.events.length, 0);
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'error');
  assert.equal(page.document.getElementById('profile-fields').disabled, false);
});

test('falha parcial de metadata informa o que foi salvo e permite tentar novamente', async () => {
  const page = await setup();
  page.state.metadataError = { message: 'Offline' };
  fields(page);
  await page.module.namespace.saveDetails();
  assert.equal(page.state.row.nome_usuario, 'novo_usuario');
  assert.equal(page.document.getElementById('profile-message').dataset.kind, 'warning');
  assert.match(page.document.getElementById('profile-message').textContent, /sincronização.*falhou/);
});

test('saída durante uma consulta pendente impede gravar o perfil depois', async () => {
  const page = await setup();
  let resolve;
  page.state.availabilityPromise = new Promise(done => { resolve = done; });
  fields(page);
  const pending = page.module.namespace.saveDetails();
  page.state.authListener('SIGNED_OUT', null);
  resolve({ data: [] });
  await pending;
  assert.equal(page.state.calls.length, 1);
  assert.equal(page.document.getElementById('profile-content').hidden, true);
  assert.equal(page.document.getElementById('profile-fields').disabled, true);
});

test('senha usa o e-mail autenticado e mantém o retorno no diretório da publicação', async () => {
  const page = await setup();
  await page.module.namespace.sendPasswordLink();
  assert.equal(page.state.calls[0][0], 'recover');
  assert.equal(page.state.calls[0][1], 'aluno@example.com');
  assert.equal(page.state.calls[0][2].redirectTo, 'https://example.com/Praxis/login.html?modo=redefinir');
  assert.equal(page.document.getElementById('security-message').dataset.kind, 'success');
});

test('sessões usam escopos separados: outras preserva a atual, local retorna ao login', async () => {
  const page = await setup();
  await page.module.namespace.signOutOthers();
  assert.equal(page.state.calls[0][1].scope, 'others');
  assert.equal(page.state.redirects.length, 0);
  await page.module.namespace.signOutHere();
  assert.equal(page.state.calls[1][1].scope, 'local');
  assert.deepEqual(page.state.redirects, ['login.html']);
});

test('radio de aparência usa o controlador compartilhado de todas as páginas', async () => {
  const page = await setup();
  page.radios[0].checked = true;
  page.radios[0].listeners.change();
  assert.equal(page.state.preference, 'light');
  assert.equal(page.radios[0].checked, true);
  assert.equal(page.radios[2].checked, false);
});

test('novo login preserva o nome e a foto personalizados no registro existente', async () => {
  const updates = [];
  const supabase = { from() { return {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1 } }) }) }),
    update: payload => ({ eq: async () => { updates.push(payload); return {}; } })
  }; } };
  const context = vm.createContext({});
  const module = new vm.SourceTextModule(read('scripts/supabaseClient.js'), { context });
  await module.link(() => new vm.SyntheticModule(['createClient'], function () { this.setExport('createClient', () => supabase); }, { context }));
  await module.evaluate();
  await module.namespace.upsertUserProfile({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: 'Nome do Google', avatar_url: 'https://example.com/old.png' } });
  assert.deepEqual(Object.keys(updates[0]).sort(), ['email', 'provedor_login', 'ultimo_login']);
});
