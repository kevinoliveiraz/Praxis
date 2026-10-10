const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Element, documentMock } = require('./helpers.cjs');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const headerCode = read('scripts/header.js');
const sessionCode = read('scripts/header-session.js');
const menuCode = read('scripts/account-menu.js');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const flush = () => new Promise(resolve => setImmediate(resolve));

async function mount(subscription) {
  const document = documentMock();
  const header = new Element();
  header.dataset.subscription = String(subscription);
  document.querySelector = selector => selector === '[data-site-header]' ? header : null;
  let initialized;
  const context = vm.createContext({ document, console });
  vm.runInContext(headerCode, context, {
    importModuleDynamically: async () => {
      const module = new vm.SyntheticModule(['initHeaderSession'], function () {
        this.setExport('initHeaderSession', element => { initialized = element; });
      }, { context });
      await module.link(() => {});
      await module.evaluate();
      return module;
    }
  });
  await flush();
  return { header, initialized };
}

async function sessionSetup(user = null, lookup = async () => ({ data: { nome_usuario: 'kevinoliveiraz' } })) {
  const header = new Element(), area = new Element(), button = new Element();
  const guest = '<a href="login.html">Entrar</a>';
  area.innerHTML = guest;
  area.children['#logout-btn'] = button;
  header.children['#user-area'] = area;
  const timers = [], calls = [], alerts = [];
  const window = { location: { href: 'curso.html?id=1' }, setTimeout(callback) { timers.push(callback); }, addEventListener() {} };
  const auth = {
    onAuthStateChange(callback) { this.callback = callback; },
    async getSession() { return { data: { session: user ? { user } : null } }; },
    async signOut() { calls.push('signOut'); return {}; }
  };
  const supabase = { auth, from(table) {
    assert.equal(table, 'usuarios');
    return { select() { return { eq(column, id) {
      calls.push(['profile', column, id]);
      return { maybeSingle: lookup };
    } }; } };
  } };
  const context = vm.createContext({ window, URL, console: { error() {} }, alert: message => alerts.push(message) });
  const module = new vm.SourceTextModule(sessionCode, { context });
  await module.link(specifier => specifier === './account-menu.js' ? new vm.SourceTextModule(menuCode, { context }) : new vm.SyntheticModule(['supabase', 'escapeHtml'], function () {
    this.setExport('supabase', supabase);
    this.setExport('escapeHtml', escapeHtml);
  }, { context }));
  await module.evaluate();
  return { header, area, button, guest, timers, calls, alerts, window, auth, module };
}

test('home e curso usam o mesmo cabeçalho; somente a home inclui assinatura', async () => {
  const home = await mount(true), course = await mount(false);
  assert.equal(home.initialized, home.header);
  assert.equal(course.initialized, course.header);
  const subscription = /<a href="assine-agora.html"[\s\S]*?<\/a>/;
  assert.match(home.header.innerHTML, subscription);
  assert.doesNotMatch(course.header.innerHTML, subscription);
  const normalize = markup => markup.replace(/\s+/g, ' ').trim();
  assert.equal(normalize(home.header.innerHTML.replace(subscription, '')), normalize(course.header.innerHTML));
  assert.equal((course.header.innerHTML.match(/data-theme-toggle/g) || []).length, 1);
});

test('botão de tema do cabeçalho compartilhado recebe o controle ao carregar a página', async () => {
  const document = documentMock(), button = new Element(), label = new Element();
  const header = new Element();
  header.dataset.subscription = 'false';
  button.children['[data-theme-label]'] = label;
  document.querySelectorAll = () => header.innerHTML ? [button] : [];
  document.querySelector = selector => selector === '[data-site-header]' ? header : null;
  const saved = new Map();
  const window = { matchMedia: () => ({ matches: true, addEventListener() {} }), addEventListener() {} };
  const context = vm.createContext({ document, window, localStorage: {
    getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)
  }, console: { error() {} } });
  vm.runInContext(read('scripts/theme.js'), context);
  vm.runInContext(headerCode, context, { importModuleDynamically: async () => { throw new Error('Sem autenticação'); } });
  document.listeners.DOMContentLoaded();
  assert.equal(button.attributes['aria-label'], 'Ativar tema claro');
  button.listeners.click();
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(saved.get('praxis-theme'), 'light');
  assert.equal(label.textContent, 'Modo escuro');
  await flush();
});

test('cabeçalho dos cursos prioriza o mesmo nome de perfil da home e mantém avatar e saída', async () => {
  const page = await sessionSetup({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: 'Kevin', picture: 'https://example.com/photo.png' } });
  await page.module.namespace.initHeaderSession(page.header);
  assert.match(page.area.innerHTML, />kevinoliveiraz<\/span>/);
  assert.match(page.area.innerHTML, /title="aluno@example.com"/);
  assert.match(page.area.innerHTML, /src="https:\/\/example.com\/photo.png"/);
  assert.deepEqual(page.calls, [['profile', 'user_id', 'user-1']]);
  await page.button.listeners.click({ currentTarget: page.button });
  assert.equal(page.window.location.href, 'login.html');
  assert.equal(page.calls.at(-1), 'signOut');
});

test('nome e avatar têm valores alternativos seguros quando o perfil não carrega', async () => {
  const page = await sessionSetup({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: '<Kevin>', picture: 'photo" onerror="alert(1)' } }, async () => ({ error: new Error('Indisponível') }));
  await page.module.namespace.initHeaderSession(page.header);
  assert.match(page.area.innerHTML, /&lt;Kevin&gt;<\/span>/);
  assert.doesNotMatch(page.area.innerHTML, /src="[^\"]*" onerror=/);
  const fallback = page.module.namespace.userMarkup({ email: 'aluno@example.com' });
  assert.match(fallback, /user-avatar-placeholder/);
  assert.match(fallback, />A<\/div>/);
  assert.match(fallback, />aluno@example.com<\/span>/);
});

test('falha ao sair mantém a página e permite repetir a ação', async () => {
  const page = await sessionSetup({ id: 'user-1' });
  await page.module.namespace.initHeaderSession(page.header);
  page.auth.signOut = async () => ({ error: new Error('Indisponível') });
  await page.button.listeners.click({ currentTarget: page.button });
  assert.equal(page.window.location.href, 'curso.html?id=1');
  assert.equal(page.button.disabled, false);
  assert.equal(page.button.textContent, 'Sair');
  assert.equal(page.alerts.length, 1);
});

test('sair durante a consulta de perfil não recoloca o usuário no cabeçalho', async () => {
  let resolveProfile;
  const pending = new Promise(resolve => { resolveProfile = resolve; });
  const page = await sessionSetup({ id: 'user-1' }, () => pending);
  const initialized = page.module.namespace.initHeaderSession(page.header);
  await flush();
  assert.match(page.area.innerHTML, /logout-btn/);
  page.auth.callback('SIGNED_OUT', null);
  await page.timers.shift()();
  assert.equal(page.area.innerHTML, page.guest);
  resolveProfile({ data: { nome_usuario: 'kevinoliveiraz' } });
  await initialized;
  assert.equal(page.area.innerHTML, page.guest);
});

test('entrar consulta o perfil fora do callback de autenticação', async () => {
  const page = await sessionSetup();
  await page.module.namespace.initHeaderSession(page.header);
  assert.equal(page.area.innerHTML, page.guest);
  page.auth.callback('SIGNED_IN', { user: { id: 'user-1' } });
  assert.equal(page.calls.length, 0);
  page.timers.shift()();
  await flush();
  assert.match(page.area.innerHTML, />kevinoliveiraz<\/span>/);
});

test('curso mantém atualização de progresso ao entrar e limpa o progresso ao sair', async () => {
  const callbackCode = read('scripts/curso.js').match(/supabase.auth.onAuthStateChange\([\s\S]*?(?=\nasync function init)/)[0];
  const calls = [], timers = [];
  let callback;
  const progress = new Map([['lesson-1', true]]);
  const context = vm.createContext({
    currentUser: null, lessons: [{ id: 'lesson-1' }], progressByLesson: progress,
    supabase: { auth: { onAuthStateChange(listener) { callback = listener; } } },
    window: { setTimeout(listener) { timers.push(listener); } },
    loadProgress: async () => calls.push('loadProgress'),
    ...Object.fromEntries(['updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome'].map(name => [name, () => calls.push(name)])),
    console
  });
  vm.runInContext(callbackCode, context);
  callback('SIGNED_IN', { user: { id: 'user-1' } });
  assert.equal(context.currentUser.id, 'user-1');
  assert.equal(calls.length, 0);
  await timers.shift()();
  assert.deepEqual(calls, ['loadProgress', 'updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome']);
  calls.length = 0;
  callback('SIGNED_OUT', null);
  assert.equal(context.currentUser, null);
  assert.equal(progress.size, 0);
  assert.deepEqual(calls, ['updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome']);
});
