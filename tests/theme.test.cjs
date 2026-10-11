const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element, documentMock } = require('./helpers.cjs'); // Define Element, documentMock como o módulo o texto “./helpers.cjs”.
const code = fs.readFileSync(require('node:path').join(__dirname, '../scripts/theme.js'), 'utf8'); // Define code como o conteúdo do arquivo os itens de require(…) unidos por __dirname.

function setup({ saved = null, dark = true, blocked = false } = {}) { // Declara a função setup com saved, dark, blocked.
  const document = documentMock(); // Define document como o resultado de documentMock.
  const button = new Element(); // Define button como uma instância de Element.
  button.children['[data-theme-label]'] = new Element(); // Atualiza button.children[o texto “[data-theme-label]”] com uma instância de Element.
  document.querySelectorAll = () => [button]; // Atualiza document.querySelectorAll com uma função que recebe nenhum argumento.
  const media = { matches: dark, addEventListener(name, listener) { this.listener = listener; } }; // Define media como um objeto com matches, addEventListener.
  const storage = new Map(saved === null ? [] : [['praxis-theme', saved]]); // Define storage como uma instância de Map com uma lista vazia se saved igual, inclusive no tipo, a null (ausência de valor); caso contrário, uma lista com 1 item.
  const localStorage = { // Define localStorage como um objeto com getItem, setItem, removeItem.
    getItem(key) { if (blocked) throw Error('denied'); return storage.get(key) ?? null; }, // Define a propriedade getItem como uma função que recebe key.
    setItem(key, value) { if (blocked) throw Error('denied'); storage.set(key, value); }, // Define a propriedade setItem como uma função que recebe key, value.
    removeItem(key) { if (blocked) throw Error('denied'); storage.delete(key); } // Define a propriedade removeItem como uma função que recebe key.
  }; // Encerra o objeto.
  const window = { listeners: {}, matchMedia: () => media, addEventListener(name, listener) { this.listeners[name] = listener; } }; // Define window como um objeto com listeners, matchMedia, addEventListener.
  vm.runInNewContext(code, { document, window, localStorage }); // Executa a chamada que produz o resultado de vm.runInNewContext com code e um objeto com document, window, localStorage.
  document.listeners.DOMContentLoaded(); // Executa a chamada que produz o resultado de document.listeners.DOMContentLoaded.
  return { document, button, media, storage, window }; // Retorna um objeto com document, button, media, storage, window.
} // Encerra o bloco da função setup.
test('preferência salva prevalece sobre o sistema e continua na próxima página', () => { // Executa a chamada que produz o teste “preferência salva prevalece sobre o sistema e continua na próxima página”.
  const page = setup({ saved: 'light', dark: true }); // Define page como o resultado de setup com um objeto com saved, dark.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
  assert.equal(page.button.attributes['aria-label'], 'Ativar tema escuro'); // Executa a chamada que produz a conferência de igualdade entre page.button.attributes[o texto “aria-label”] e o texto “Ativar tema escuro”.
  page.button.listeners.click(); // Executa a chamada que produz o resultado de page.button.listeners.click.
  assert.equal(page.storage.get('praxis-theme'), 'dark'); // Executa a chamada que produz a conferência de igualdade entre o valor associado à chave o texto “praxis-theme” em page.storage e o texto “dark”.
  const next = setup({ saved: page.storage.get('praxis-theme'), dark: false }); // Define next como o resultado de setup com um objeto com saved, dark.
  assert.equal(next.document.documentElement.dataset.theme, 'dark'); // Executa a chamada que produz a conferência de igualdade entre next.document.documentElement.dataset.theme e o texto “dark”.
}); // Encerra o bloco atual.
test('segue mudanças do sistema até o usuário escolher um tema', () => { // Executa a chamada que produz o teste “segue mudanças do sistema até o usuário escolher um tema”.
  const page = setup({ saved: 'invalid', dark: false }); // Define page como o resultado de setup com um objeto com saved, dark.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
  page.media.matches = true; page.media.listener(); // Atualiza page.media.matches com true (verdadeiro).
  assert.equal(page.document.documentElement.dataset.theme, 'dark'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “dark”.
  page.button.listeners.click(); // Executa a chamada que produz o resultado de page.button.listeners.click.
  page.media.listener(); // Executa a chamada que produz o resultado de page.media.listener.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
}); // Encerra o bloco atual.
test('troca funciona com armazenamento bloqueado', () => { // Executa a chamada que produz o teste “troca funciona com armazenamento bloqueado”.
  const page = setup({ blocked: true }); // Define page como o resultado de setup com um objeto com blocked.
  page.button.listeners.click(); // Executa a chamada que produz o resultado de page.button.listeners.click.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
}); // Encerra o bloco atual.
test('sincroniza outra aba e retorna ao sistema quando a preferência é removida', () => { // Executa a chamada que produz o teste “sincroniza outra aba e retorna ao sistema quando a preferência é removida”.
  const page = setup(); // Define page como o resultado de setup.
  page.window.listeners.storage({ key: 'praxis-theme', newValue: 'light' }); // Executa a chamada que produz o resultado de page.window.listeners.storage com um objeto com key, newValue.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
  page.window.listeners.storage({ key: 'praxis-theme', newValue: null }); // Executa a chamada que produz o resultado de page.window.listeners.storage com um objeto com key, newValue.
  assert.equal(page.document.documentElement.dataset.theme, 'dark'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “dark”.
}); // Encerra o bloco atual.

test('configurações aplicam claro/escuro e permitem voltar ao tema do sistema', () => { // Executa a chamada que produz o teste “configurações aplicam claro/escuro e permitem voltar ao tema do sistema”.
  const page = setup({ saved: 'light', dark: true }); // Define page como o resultado de setup com um objeto com saved, dark.
  page.window.PraxisTheme.setPreference('dark'); // Executa a chamada que produz o resultado de page.window.PraxisTheme.setPreference com o texto “dark”.
  assert.equal(page.storage.get('praxis-theme'), 'dark'); // Executa a chamada que produz a conferência de igualdade entre o valor associado à chave o texto “praxis-theme” em page.storage e o texto “dark”.
  assert.equal(page.document.documentElement.dataset.theme, 'dark'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “dark”.
  page.window.PraxisTheme.setPreference('system'); // Executa a chamada que produz o resultado de page.window.PraxisTheme.setPreference com o texto “system”.
  assert.equal(page.storage.has('praxis-theme'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “praxis-theme” em page.storage e false (falso).
  assert.equal(page.window.PraxisTheme.getPreference(), 'system'); // Executa a chamada que produz a conferência de igualdade entre o resultado de page.window.PraxisTheme.getPreference e o texto “system”.
  page.media.matches = false; // Atualiza page.media.matches com false (falso).
  page.media.listener(); // Executa a chamada que produz o resultado de page.media.listener.
  assert.equal(page.document.documentElement.dataset.theme, 'light'); // Executa a chamada que produz a conferência de igualdade entre page.document.documentElement.dataset.theme e o texto “light”.
}); // Encerra o bloco atual.
