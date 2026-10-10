const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { Element, documentMock } = require('./helpers.cjs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../scripts/theme.js'), 'utf8');

function setup({ saved = null, dark = true, blocked = false } = {}) {
  const document = documentMock();
  const button = new Element();
  button.children['[data-theme-label]'] = new Element();
  document.querySelectorAll = () => [button];
  const media = { matches: dark, addEventListener(name, listener) { this.listener = listener; } };
  const storage = new Map(saved === null ? [] : [['praxis-theme', saved]]);
  const localStorage = {
    getItem(key) { if (blocked) throw Error('denied'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('denied'); storage.set(key, value); },
    removeItem(key) { if (blocked) throw Error('denied'); storage.delete(key); }
  };
  const window = { listeners: {}, matchMedia: () => media, addEventListener(name, listener) { this.listeners[name] = listener; } };
  vm.runInNewContext(code, { document, window, localStorage });
  document.listeners.DOMContentLoaded();
  return { document, button, media, storage, window };
}
test('preferência salva prevalece sobre o sistema e continua na próxima página', () => {
  const page = setup({ saved: 'light', dark: true });
  assert.equal(page.document.documentElement.dataset.theme, 'light');
  assert.equal(page.button.attributes['aria-label'], 'Ativar tema escuro');
  page.button.listeners.click();
  assert.equal(page.storage.get('praxis-theme'), 'dark');
  const next = setup({ saved: page.storage.get('praxis-theme'), dark: false });
  assert.equal(next.document.documentElement.dataset.theme, 'dark');
});
test('segue mudanças do sistema até o usuário escolher um tema', () => {
  const page = setup({ saved: 'invalid', dark: false });
  assert.equal(page.document.documentElement.dataset.theme, 'light');
  page.media.matches = true; page.media.listener();
  assert.equal(page.document.documentElement.dataset.theme, 'dark');
  page.button.listeners.click();
  page.media.listener();
  assert.equal(page.document.documentElement.dataset.theme, 'light');
});
test('troca funciona com armazenamento bloqueado', () => {
  const page = setup({ blocked: true });
  page.button.listeners.click();
  assert.equal(page.document.documentElement.dataset.theme, 'light');
});
test('sincroniza outra aba e retorna ao sistema quando a preferência é removida', () => {
  const page = setup();
  page.window.listeners.storage({ key: 'praxis-theme', newValue: 'light' });
  assert.equal(page.document.documentElement.dataset.theme, 'light');
  page.window.listeners.storage({ key: 'praxis-theme', newValue: null });
  assert.equal(page.document.documentElement.dataset.theme, 'dark');
});

test('configurações aplicam claro/escuro e permitem voltar ao tema do sistema', () => {
  const page = setup({ saved: 'light', dark: true });
  page.window.PraxisTheme.setPreference('dark');
  assert.equal(page.storage.get('praxis-theme'), 'dark');
  assert.equal(page.document.documentElement.dataset.theme, 'dark');
  page.window.PraxisTheme.setPreference('system');
  assert.equal(page.storage.has('praxis-theme'), false);
  assert.equal(page.window.PraxisTheme.getPreference(), 'system');
  page.media.matches = false;
  page.media.listener();
  assert.equal(page.document.documentElement.dataset.theme, 'light');
});
