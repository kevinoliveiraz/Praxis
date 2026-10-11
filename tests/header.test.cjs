const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element, documentMock } = require('./helpers.cjs'); // Define Element, documentMock como o módulo o texto “./helpers.cjs”.
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); // Define read como uma função que recebe file.
const headerCode = read('scripts/header.js'); // Define headerCode como o resultado de read com o texto “scripts/header.js”.
const sessionCode = read('scripts/header-session.js'); // Define sessionCode como o resultado de read com o texto “scripts/header-session.js”.
const menuCode = read('scripts/account-menu.js'); // Define menuCode como o resultado de read com o texto “scripts/account-menu.js”.
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); // Define escapeHtml como uma função que recebe value.
const flush = () => new Promise(resolve => setImmediate(resolve)); // Define flush como uma função que recebe nenhum argumento.

async function mount(subscription) { // Declara a função assíncrona mount com subscription.
  const document = documentMock(); // Define document como o resultado de documentMock.
  const header = new Element(); // Define header como uma instância de Element.
  header.dataset.subscription = String(subscription); // Atualiza header.dataset.subscription com a conversão de subscription em texto.
  document.querySelector = selector => selector === '[data-site-header]' ? header : null; // Atualiza document.querySelector com uma função que recebe selector.
  let initialized; // Define initialized como sem valor inicial.
  const context = vm.createContext({ document, console }); // Define context como o resultado de vm.createContext com um objeto com document, console.
  vm.runInContext(headerCode, context, { // Executa a chamada que produz o resultado de vm.runInContext com headerCode e context.
    importModuleDynamically: async () => { // Define a propriedade importModuleDynamically como uma função assíncrona que recebe nenhum argumento.
      const module = new vm.SyntheticModule(['initHeaderSession'], function () { // Define module como uma instância de vm.SyntheticModule com uma lista com 1 item e uma função que recebe nenhum argumento.
        this.setExport('initHeaderSession', element => { initialized = element; }); // Executa a chamada que produz o resultado de this.setExport com o texto “initHeaderSession” e uma função que recebe element.
      }, { context }); // Inicia um objeto com context.
      await module.link(() => {}); // Aguarda o resultado de module.link com uma função que recebe nenhum argumento antes de continuar.
      await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
      return module; // Retorna module.
    } // Encerra o bloco atual.
  }); // Encerra o objeto.
  await flush(); // Aguarda o resultado de flush antes de continuar.
  return { header, initialized }; // Retorna um objeto com header, initialized.
} // Encerra o bloco da função mount.

async function sessionSetup(user = null, lookup = async () => ({ data: { nome_usuario: 'kevinoliveiraz' } })) { // Declara a função assíncrona sessionSetup com user, lookup.
  const header = new Element(), area = new Element(), button = new Element(); // Define header como uma instância de Element.
  const guest = '<a href="login.html">Entrar</a>'; // Define guest como o texto “<a href="login.html">Entrar</a>”.
  area.innerHTML = guest; // Atualiza area.innerHTML com guest.
  area.children['#logout-btn'] = button; // Atualiza area.children[o texto “#logout-btn”] com button.
  header.children['#user-area'] = area; // Atualiza header.children[o texto “#user-area”] com area.
  const timers = [], calls = [], alerts = []; // Define timers como uma lista vazia.
  const window = { location: { href: 'curso.html?id=1' }, setTimeout(callback) { timers.push(callback); }, addEventListener() {} }; // Define window como um objeto com location, setTimeout, addEventListener.
  const auth = { // Define auth como um objeto com onAuthStateChange, getSession, signOut.
    onAuthStateChange(callback) { this.callback = callback; }, // Define a propriedade onAuthStateChange como uma função que recebe callback.
    async getSession() { return { data: { session: user ? { user } : null } }; }, // Define a propriedade getSession como uma função assíncrona que recebe nenhum argumento.
    async signOut() { calls.push('signOut'); return {}; } // Define a propriedade signOut como uma função assíncrona que recebe nenhum argumento.
  }; // Encerra o objeto.
  const supabase = { auth, from(table) { // Define supabase como um objeto com auth, from.
    assert.equal(table, 'usuarios'); // Executa a chamada que produz a conferência de igualdade entre table e o texto “usuarios”.
    return { select() { return { eq(column, id) { // Retorna um objeto com select.
      calls.push(['profile', column, id]); // Executa a chamada que produz a inclusão de uma lista com 3 itens ao final de calls.
      return { maybeSingle: lookup }; // Retorna um objeto com maybeSingle.
    } }; } }; // Define a função que recebe column, id.
  } }; // Define a função que recebe table.
  const context = vm.createContext({ window, URL, console: { error() {} }, alert: message => alerts.push(message) }); // Define context como o resultado de vm.createContext com um objeto com window, URL, console, alert.
  const module = new vm.SourceTextModule(sessionCode, { context }); // Define module como uma instância de vm.SourceTextModule com sessionCode e um objeto com context.
  await module.link(specifier => specifier === './account-menu.js' ? new vm.SourceTextModule(menuCode, { context }) : new vm.SyntheticModule(['supabase', 'escapeHtml'], function () { // Aguarda o resultado de module.link com uma função que recebe specifier antes de continuar.
    this.setExport('supabase', supabase); // Executa a chamada que produz o resultado de this.setExport com o texto “supabase” e supabase.
    this.setExport('escapeHtml', escapeHtml); // Executa a chamada que produz o resultado de this.setExport com o texto “escapeHtml” e escapeHtml.
  }, { context })); // Inicia um objeto com context.
  await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
  return { header, area, button, guest, timers, calls, alerts, window, auth, module }; // Retorna um objeto com header, area, button, guest, timers e outras propriedades.
} // Encerra o bloco da função sessionSetup.

test('home e curso usam o mesmo cabeçalho; somente a home inclui assinatura', async () => { // Executa a chamada que produz o teste “home e curso usam o mesmo cabeçalho; somente a home inclui assinatura”.
  const home = await mount(true), course = await mount(false); // Define home como o resultado aguardado de o resultado de mount com true (verdadeiro).
  assert.equal(home.initialized, home.header); // Executa a chamada que produz a conferência de igualdade entre home.initialized e home.header.
  assert.equal(course.initialized, course.header); // Executa a chamada que produz a conferência de igualdade entre course.initialized e course.header.
  const subscription = /<a href="assine-agora.html"[\s\S]*?<\/a>/; // Define subscription como o padrão de busca /<a href="assine-agora.html"[\s\S]*?<\/a>/.
  assert.match(home.header.innerHTML, subscription); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.doesNotMatch(course.header.innerHTML, subscription); // Executa a chamada que produz a verificação de que o texto não corresponde ao padrão informado.
  const normalize = markup => markup.replace(/\s+/g, ' ').trim(); // Define normalize como uma função que recebe markup.
  assert.equal(normalize(home.header.innerHTML.replace(subscription, '')), normalize(course.header.innerHTML)); // Executa a chamada que produz a conferência de igualdade entre o resultado de normalize com a substituição dos trechos de home.header.innerHTML que correspondem a subscription e o resultado de normalize com course.header.innerHTML.
  assert.equal((course.header.innerHTML.match(/data-theme-toggle/g) || []).length, 1); // Executa a chamada que produz a conferência de igualdade entre expressão.length e 1.
}); // Encerra o bloco atual.

test('botão de tema do cabeçalho compartilhado recebe o controle ao carregar a página', async () => { // Executa a chamada que produz o teste “botão de tema do cabeçalho compartilhado recebe o controle ao carregar a página”.
  const document = documentMock(), button = new Element(), label = new Element(); // Define document como o resultado de documentMock.
  const header = new Element(); // Define header como uma instância de Element.
  header.dataset.subscription = 'false'; // Atualiza header.dataset.subscription com o texto “false”.
  button.children['[data-theme-label]'] = label; // Atualiza button.children[o texto “[data-theme-label]”] com label.
  document.querySelectorAll = () => header.innerHTML ? [button] : []; // Atualiza document.querySelectorAll com uma função que recebe nenhum argumento.
  document.querySelector = selector => selector === '[data-site-header]' ? header : null; // Atualiza document.querySelector com uma função que recebe selector.
  const saved = new Map(); // Define saved como uma instância de Map.
  const window = { matchMedia: () => ({ matches: true, addEventListener() {} }), addEventListener() {} }; // Define window como um objeto com matchMedia, addEventListener.
  const context = vm.createContext({ document, window, localStorage: { // Define context como o resultado de vm.createContext com um objeto com document, window, localStorage, console.
    getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) // Define a propriedade getItem como uma função que recebe key.
  }, console: { error() {} } }); // Define a propriedade console como um objeto com error.
  vm.runInContext(read('scripts/theme.js'), context); // Executa a chamada que produz o resultado de vm.runInContext com o resultado de read com o texto “scripts/theme.js” e context.
  vm.runInContext(headerCode, context, { importModuleDynamically: async () => { throw new Error('Sem autenticação'); } }); // Executa a chamada que produz o resultado de vm.runInContext com headerCode e context.
  document.listeners.DOMContentLoaded(); // Executa a chamada que produz o resultado de document.listeners.DOMContentLoaded.
  assert.equal(button.attributes['aria-label'], 'Ativar tema claro'); // Executa a chamada que produz a conferência de igualdade entre button.attributes[o texto “aria-label”] e o texto “Ativar tema claro”.
  button.listeners.click(); // Executa a chamada que produz o resultado de button.listeners.click.
  assert.equal(document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre document.documentElement.dataset.theme e o texto “light”.
  assert.equal(saved.get('praxis-theme'), 'light'); // Executa a chamada que produz a conferência de igualdade entre o valor associado à chave o texto “praxis-theme” em saved e o texto “light”.
  assert.equal(label.textContent, 'Modo escuro'); // Executa a chamada que produz a conferência de igualdade entre label.textContent e o texto “Modo escuro”.
  await flush(); // Aguarda o resultado de flush antes de continuar.
}); // Encerra o bloco atual.

test('cabeçalho dos cursos prioriza o mesmo nome de perfil da home e mantém avatar e saída', async () => { // Executa a chamada que produz o teste “cabeçalho dos cursos prioriza o mesmo nome de perfil da home e mantém avatar e saída”.
  const page = await sessionSetup({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: 'Kevin', picture: 'https://example.com/photo.png' } }); // Define page como o resultado aguardado de o resultado de sessionSetup com um objeto com id, email, user_metadata.
  await page.module.namespace.initHeaderSession(page.header); // Aguarda o resultado de page.module.namespace.initHeaderSession com page.header antes de continuar.
  assert.match(page.area.innerHTML, />kevinoliveiraz<\/span>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.match(page.area.innerHTML, /title="aluno@example.com"/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.match(page.area.innerHTML, /src="https:\/\/example.com\/photo.png"/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.deepEqual(page.calls, [['profile', 'user_id', 'user-1']]); // Executa a chamada que produz a comparação completa das estruturas informadas.
  await page.button.listeners.click({ currentTarget: page.button }); // Aguarda o resultado de page.button.listeners.click com um objeto com currentTarget antes de continuar.
  assert.equal(page.window.location.href, 'login.html'); // Executa a chamada que produz a conferência de igualdade entre page.window.location.href e o texto “login.html”.
  assert.equal(page.calls.at(-1), 'signOut'); // Executa a chamada que produz a conferência de igualdade entre o resultado de page.calls.at com o negativo de 1 e o texto “signOut”.
}); // Encerra o bloco atual.

test('nome e avatar têm valores alternativos seguros quando o perfil não carrega', async () => { // Executa a chamada que produz o teste “nome e avatar têm valores alternativos seguros quando o perfil não carrega”.
  const page = await sessionSetup({ id: 'user-1', email: 'aluno@example.com', user_metadata: { full_name: '<Kevin>', picture: 'photo" onerror="alert(1)' } }, async () => ({ error: new Error('Indisponível') })); // Define page como o resultado aguardado de o resultado de sessionSetup com um objeto com id, email, user_metadata e uma função assíncrona que recebe nenhum argumento.
  await page.module.namespace.initHeaderSession(page.header); // Aguarda o resultado de page.module.namespace.initHeaderSession com page.header antes de continuar.
  assert.match(page.area.innerHTML, /&lt;Kevin&gt;<\/span>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.doesNotMatch(page.area.innerHTML, /src="[^\"]*" onerror=/); // Executa a chamada que produz a verificação de que o texto não corresponde ao padrão informado.
  const fallback = page.module.namespace.userMarkup({ email: 'aluno@example.com' }); // Define fallback como o resultado de page.module.namespace.userMarkup com um objeto com email.
  assert.match(fallback, /user-avatar-placeholder/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.match(fallback, />A<\/div>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  assert.match(fallback, />aluno@example.com<\/span>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
}); // Encerra o bloco atual.

test('falha ao sair mantém a página e permite repetir a ação', async () => { // Executa a chamada que produz o teste “falha ao sair mantém a página e permite repetir a ação”.
  const page = await sessionSetup({ id: 'user-1' }); // Define page como o resultado aguardado de o resultado de sessionSetup com um objeto com id.
  await page.module.namespace.initHeaderSession(page.header); // Aguarda o resultado de page.module.namespace.initHeaderSession com page.header antes de continuar.
  page.auth.signOut = async () => ({ error: new Error('Indisponível') }); // Atualiza page.auth.signOut com uma função assíncrona que recebe nenhum argumento.
  await page.button.listeners.click({ currentTarget: page.button }); // Aguarda o resultado de page.button.listeners.click com um objeto com currentTarget antes de continuar.
  assert.equal(page.window.location.href, 'curso.html?id=1'); // Executa a chamada que produz a conferência de igualdade entre page.window.location.href e o texto “curso.html?id=1”.
  assert.equal(page.button.disabled, false); // Executa a chamada que produz a conferência de igualdade entre page.button.disabled e false (falso).
  assert.equal(page.button.textContent, 'Sair'); // Executa a chamada que produz a conferência de igualdade entre page.button.textContent e o texto “Sair”.
  assert.equal(page.alerts.length, 1); // Executa a chamada que produz a conferência de igualdade entre page.alerts.length e 1.
}); // Encerra o bloco atual.

test('sair durante a consulta de perfil não recoloca o usuário no cabeçalho', async () => { // Executa a chamada que produz o teste “sair durante a consulta de perfil não recoloca o usuário no cabeçalho”.
  let resolveProfile; // Define resolveProfile como sem valor inicial.
  const pending = new Promise(resolve => { resolveProfile = resolve; }); // Define pending como uma instância de Promise com uma função que recebe resolve.
  const page = await sessionSetup({ id: 'user-1' }, () => pending); // Define page como o resultado aguardado de o resultado de sessionSetup com um objeto com id e uma função que recebe nenhum argumento.
  const initialized = page.module.namespace.initHeaderSession(page.header); // Define initialized como o resultado de page.module.namespace.initHeaderSession com page.header.
  await flush(); // Aguarda o resultado de flush antes de continuar.
  assert.match(page.area.innerHTML, /logout-btn/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
  page.auth.callback('SIGNED_OUT', null); // Executa a chamada que produz o resultado de page.auth.callback com o texto “SIGNED_OUT” e null (ausência de valor).
  await page.timers.shift()(); // Aguarda o resultado de page.timers.shift(…) antes de continuar.
  assert.equal(page.area.innerHTML, page.guest); // Executa a chamada que produz a conferência de igualdade entre page.area.innerHTML e page.guest.
  resolveProfile({ data: { nome_usuario: 'kevinoliveiraz' } }); // Executa a chamada que produz o resultado de resolveProfile com um objeto com data.
  await initialized; // Aguarda initialized antes de continuar.
  assert.equal(page.area.innerHTML, page.guest); // Executa a chamada que produz a conferência de igualdade entre page.area.innerHTML e page.guest.
}); // Encerra o bloco atual.

test('entrar consulta o perfil fora do callback de autenticação', async () => { // Executa a chamada que produz o teste “entrar consulta o perfil fora do callback de autenticação”.
  const page = await sessionSetup(); // Define page como o resultado aguardado de o resultado de sessionSetup.
  await page.module.namespace.initHeaderSession(page.header); // Aguarda o resultado de page.module.namespace.initHeaderSession com page.header antes de continuar.
  assert.equal(page.area.innerHTML, page.guest); // Executa a chamada que produz a conferência de igualdade entre page.area.innerHTML e page.guest.
  page.auth.callback('SIGNED_IN', { user: { id: 'user-1' } }); // Executa a chamada que produz o resultado de page.auth.callback com o texto “SIGNED_IN” e um objeto com user.
  assert.equal(page.calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.calls.length e 0.
  page.timers.shift()(); // Executa a chamada que produz o resultado de page.timers.shift(…).
  await flush(); // Aguarda o resultado de flush antes de continuar.
  assert.match(page.area.innerHTML, />kevinoliveiraz<\/span>/); // Executa a chamada que produz a verificação do texto conforme o padrão informado.
}); // Encerra o bloco atual.

test('curso mantém atualização de progresso ao entrar e limpa o progresso ao sair', async () => { // Executa a chamada que produz o teste “curso mantém atualização de progresso ao entrar e limpa o progresso ao sair”.
  const callbackCode = read('scripts/curso.js').match(/supabase.auth.onAuthStateChange\([\s\S]*?(?=\nasync function init)/)[0]; // Define callbackCode como read(…).match(…)[0].
  const calls = [], timers = []; // Define calls como uma lista vazia.
  let callback; // Define callback como sem valor inicial.
  const progress = new Map([['lesson-1', true]]); // Define progress como uma instância de Map com uma lista com 1 item.
  const context = vm.createContext({ // Define context como o resultado de vm.createContext com um objeto com currentUser, lessons, progressByLesson, supabase, window e outras propriedades.
    currentUser: null, lessons: [{ id: 'lesson-1' }], progressByLesson: progress, // Define a propriedade currentUser como null (ausência de valor).
    supabase: { auth: { onAuthStateChange(listener) { callback = listener; } } }, // Define a propriedade supabase como um objeto com auth.
    window: { setTimeout(listener) { timers.push(listener); } }, // Define a propriedade window como um objeto com setTimeout.
    loadProgress: async () => calls.push('loadProgress'), // Define a propriedade loadProgress como uma função assíncrona que recebe nenhum argumento.
    ...Object.fromEntries(['updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome'].map(name => [name, () => calls.push(name)])), // Expande o resultado de Object.fromEntries com uma lista transformada a partir de expressão dentro da lista ou do objeto.
    console // Inclui a propriedade console com o valor da variável de mesmo nome.
  }); // Encerra o objeto.
  vm.runInContext(callbackCode, context); // Executa a chamada que produz o resultado de vm.runInContext com callbackCode e context.
  callback('SIGNED_IN', { user: { id: 'user-1' } }); // Executa a chamada que produz o resultado de callback com o texto “SIGNED_IN” e um objeto com user.
  assert.equal(context.currentUser.id, 'user-1'); // Executa a chamada que produz a conferência de igualdade entre context.currentUser.id e o texto “user-1”.
  assert.equal(calls.length, 0); // Executa a chamada que produz a conferência de igualdade entre calls.length e 0.
  await timers.shift()(); // Aguarda o resultado de timers.shift(…) antes de continuar.
  assert.deepEqual(calls, ['loadProgress', 'updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome']); // Executa a chamada que produz a comparação completa das estruturas informadas.
  calls.length = 0; // Atualiza calls.length com 0.
  callback('SIGNED_OUT', null); // Executa a chamada que produz o resultado de callback com o texto “SIGNED_OUT” e null (ausência de valor).
  assert.equal(context.currentUser, null); // Executa a chamada que produz a conferência de igualdade entre context.currentUser e null (ausência de valor).
  assert.equal(progress.size, 0); // Executa a chamada que produz a conferência de igualdade entre progress.size e 0.
  assert.deepEqual(calls, ['updateProgress', 'renderLessons', 'updateLessonSelection', 'renderCourseHome']); // Executa a chamada que produz a comparação completa das estruturas informadas.
}); // Encerra o bloco atual.
