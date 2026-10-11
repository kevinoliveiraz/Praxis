const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element, documentMock } = require('./helpers.cjs'); // Define Element, documentMock como o módulo o texto “./helpers.cjs”.

async function setup() { // Declara a função assíncrona setup com nenhum parâmetro.
  const document = documentMock(); // Define document como o resultado de documentMock.
  const root = new Element(), trigger = new Element(), menu = new Element(); // Define root como uma instância de Element.
  const links = [new Element(), new Element(), new Element()]; // Define links como uma lista com 3 itens.
  for (const element of [root, trigger, menu, ...links]) element.ownerDocument = document; // Percorre uma lista com 4 itens usando element.
  root.children = { '[data-account-toggle]': trigger, '[data-account-menu]': menu }; // Atualiza root.children com um objeto com [data-account-toggle], [data-account-menu].
  menu.children = Object.fromEntries(links.map((element, i) => [String(i), element])); // Atualiza menu.children com o resultado de Object.fromEntries com uma lista transformada a partir de links.
  menu.lists['a, button:not(:disabled)'] = links; // Atualiza menu.lists[o texto “a, button:not(:disabled)”] com links.
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../scripts/account-menu.js'), 'utf8')); // Define module como uma instância de vm.SourceTextModule com o conteúdo do arquivo os itens de path unidos por __dirname.
  await module.link(() => {}); // Aguarda o resultado de module.link com uma função que recebe nenhum argumento antes de continuar.
  await module.evaluate(); // Aguarda o resultado de module.evaluate antes de continuar.
  const control = module.namespace.initAccountMenu(root); // Define control como o resultado de module.namespace.initAccountMenu com root.
  return { root, trigger, menu, links, document, control }; // Retorna um objeto com root, trigger, menu, links, document e outras propriedades.
} // Encerra o bloco da função setup.
function key(value) { return { key: value, preventDefault() { this.prevented = true; } }; } // Declara a função key com value.

test('foto abre e fecha o menu; clique fora fecha e mantém aria-expanded correto', async () => { // Executa a chamada que produz o teste “foto abre e fecha o menu; clique fora fecha e mantém aria-expanded correto”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  assert.equal(page.menu.hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e true (verdadeiro).
  page.trigger.listeners.click(); // Executa a chamada que produz o resultado de page.trigger.listeners.click.
  assert.equal(page.menu.hidden, false); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e false (falso).
  assert.equal(page.trigger.getAttribute('aria-expanded'), 'true'); // Executa a chamada que produz a conferência de igualdade entre o atributo o texto “aria-expanded” de page.trigger e o texto “true”.
  page.document.listeners.click({ target: page.links[0] }); // Executa a chamada que produz o resultado de page.document.listeners.click com um objeto com target.
  assert.equal(page.menu.hidden, false); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e false (falso).
  page.document.listeners.click({ target: new Element() }); // Executa a chamada que produz o resultado de page.document.listeners.click com um objeto com target.
  assert.equal(page.menu.hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e true (verdadeiro).
  assert.equal(page.trigger.getAttribute('aria-expanded'), 'false'); // Executa a chamada que produz a conferência de igualdade entre o atributo o texto “aria-expanded” de page.trigger e o texto “false”.
}); // Encerra o bloco atual.

test('setas navegam pelos links e Escape devolve o foco à foto', async () => { // Executa a chamada que produz o teste “setas navegam pelos links e Escape devolve o foco à foto”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.trigger.listeners.keydown(key('ArrowDown')); // Executa a chamada que produz o resultado de page.trigger.listeners.keydown com o resultado de key com o texto “ArrowDown”.
  assert.equal(page.document.activeElement, page.links[0]); // Executa a chamada que produz a conferência de igualdade entre page.document.activeElement e page.links[0].
  page.menu.listeners.keydown(key('End')); // Executa a chamada que produz o resultado de page.menu.listeners.keydown com o resultado de key com o texto “End”.
  assert.equal(page.document.activeElement, page.links[2]); // Executa a chamada que produz a conferência de igualdade entre page.document.activeElement e page.links[2].
  page.menu.listeners.keydown(key('ArrowUp')); // Executa a chamada que produz o resultado de page.menu.listeners.keydown com o resultado de key com o texto “ArrowUp”.
  assert.equal(page.document.activeElement, page.links[1]); // Executa a chamada que produz a conferência de igualdade entre page.document.activeElement e page.links[1].
  const escape = key('Escape'); // Define escape como o resultado de key com o texto “Escape”.
  page.document.listeners.keydown(escape); // Executa a chamada que produz o resultado de page.document.listeners.keydown com escape.
  assert.equal(escape.prevented, true); // Executa a chamada que produz a conferência de igualdade entre escape.prevented e true (verdadeiro).
  assert.equal(page.menu.hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e true (verdadeiro).
  assert.equal(page.document.activeElement, page.trigger); // Executa a chamada que produz a conferência de igualdade entre page.document.activeElement e page.trigger.
}); // Encerra o bloco atual.

test('Tab para fora fecha o menu e a troca de perfil remove os ouvintes antigos', async () => { // Executa a chamada que produz o teste “Tab para fora fecha o menu e a troca de perfil remove os ouvintes antigos”.
  const page = await setup(); // Define page como o resultado aguardado de o resultado de setup.
  page.control.open(); // Executa a chamada que produz o resultado de page.control.open.
  page.root.listeners.focusout({ relatedTarget: new Element() }); // Executa a chamada que produz o resultado de page.root.listeners.focusout com um objeto com relatedTarget.
  assert.equal(page.menu.hidden, true); // Executa a chamada que produz a conferência de igualdade entre page.menu.hidden e true (verdadeiro).
  page.control.destroy(); // Executa a chamada que produz o resultado de page.control.destroy.
  assert.equal(page.document.listeners.click, undefined); // Executa a chamada que produz a conferência de igualdade entre page.document.listeners.click e undefined.
  assert.equal(page.document.listeners.keydown, undefined); // Executa a chamada que produz a conferência de igualdade entre page.document.listeners.keydown e undefined.
  assert.equal(page.trigger.listeners.click, undefined); // Executa a chamada que produz a conferência de igualdade entre page.trigger.listeners.click e undefined.
}); // Encerra o bloco atual.
