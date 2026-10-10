class Element {
  constructor() {
    this.value = ''; this.type = 'password'; this.disabled = false; this.hidden = false;
    this.checked = false; this.textContent = ''; this.dataset = {}; this.attributes = {};
    this.listeners = {}; this.children = {};
    this.nodes = []; this.lists = {};
    this.classList = { toggle() {} };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  toggleAttribute(name, force) {
    if (force) this.attributes[name] = '';
    else delete this.attributes[name];
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  removeEventListener(name, listener) { if (this.listeners[name] === listener) delete this.listeners[name]; }
  querySelector(selector) { return this.children[selector] || null; }
  querySelectorAll(selector) { return this.lists[selector] || []; }
  replaceChildren(...nodes) { this.nodes = nodes; this.textContent = ''; }
  append(node) { this.nodes.push(node); node.ownerDocument = this.ownerDocument; }
  contains(node) { return node === this || this.nodes.some(child => child.contains(node)) || Object.values(this.children).some(child => child.contains(node)); }
  focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView() { this.scrolled = true; }
  reportValidity() { return this.valid !== false; }
}
function documentMock() {
  const ids = new Map();
  const document = {
    documentElement: new Element(), body: new Element(), listeners: {}, title: '',
    getElementById(id) { if (!ids.has(id)) { const element = new Element(); element.ownerDocument = this; ids.set(id, element); } return ids.get(id); },
    createElement() { const element = new Element(); element.ownerDocument = this; return element; },
    querySelector(selector) { return this.getElementById(selector); },
    querySelectorAll() { return []; },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    removeEventListener(name, listener) { if (this.listeners[name] === listener) delete this.listeners[name]; }
  };
  return document;
}
module.exports = { Element, documentMock };
