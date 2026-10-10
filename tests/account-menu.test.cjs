const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Element, documentMock } = require('./helpers.cjs');

async function setup() {
  const document = documentMock();
  const root = new Element(), trigger = new Element(), menu = new Element();
  const links = [new Element(), new Element(), new Element()];
  for (const element of [root, trigger, menu, ...links]) element.ownerDocument = document;
  root.children = { '[data-account-toggle]': trigger, '[data-account-menu]': menu };
  menu.children = Object.fromEntries(links.map((element, i) => [String(i), element]));
  menu.lists['a, button:not(:disabled)'] = links;
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../scripts/account-menu.js'), 'utf8'));
  await module.link(() => {});
  await module.evaluate();
  const control = module.namespace.initAccountMenu(root);
  return { root, trigger, menu, links, document, control };
}
function key(value) { return { key: value, preventDefault() { this.prevented = true; } }; }

test('foto abre e fecha o menu; clique fora fecha e mantém aria-expanded correto', async () => {
  const page = await setup();
  assert.equal(page.menu.hidden, true);
  page.trigger.listeners.click();
  assert.equal(page.menu.hidden, false);
  assert.equal(page.trigger.getAttribute('aria-expanded'), 'true');
  page.document.listeners.click({ target: page.links[0] });
  assert.equal(page.menu.hidden, false);
  page.document.listeners.click({ target: new Element() });
  assert.equal(page.menu.hidden, true);
  assert.equal(page.trigger.getAttribute('aria-expanded'), 'false');
});

test('setas navegam pelos links e Escape devolve o foco à foto', async () => {
  const page = await setup();
  page.trigger.listeners.keydown(key('ArrowDown'));
  assert.equal(page.document.activeElement, page.links[0]);
  page.menu.listeners.keydown(key('End'));
  assert.equal(page.document.activeElement, page.links[2]);
  page.menu.listeners.keydown(key('ArrowUp'));
  assert.equal(page.document.activeElement, page.links[1]);
  const escape = key('Escape');
  page.document.listeners.keydown(escape);
  assert.equal(escape.prevented, true);
  assert.equal(page.menu.hidden, true);
  assert.equal(page.document.activeElement, page.trigger);
});

test('Tab para fora fecha o menu e a troca de perfil remove os ouvintes antigos', async () => {
  const page = await setup();
  page.control.open();
  page.root.listeners.focusout({ relatedTarget: new Element() });
  assert.equal(page.menu.hidden, true);
  page.control.destroy();
  assert.equal(page.document.listeners.click, undefined);
  assert.equal(page.document.listeners.keydown, undefined);
  assert.equal(page.trigger.listeners.click, undefined);
});
