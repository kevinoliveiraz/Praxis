class Element { // Declara a classe Element.
  constructor() { // Define o método constructor da classe.
    this.value = ''; this.type = 'password'; this.disabled = false; this.hidden = false; // Atualiza this.value com o texto “”.
    this.checked = false; this.textContent = ''; this.dataset = {}; this.attributes = {}; // Atualiza this.checked com false (falso).
    this.listeners = {}; this.children = {}; // Atualiza this.listeners com um objeto vazio.
    this.nodes = []; this.lists = {}; // Atualiza this.nodes com uma lista vazia.
    this.classList = { toggle() {} }; // Atualiza this.classList com um objeto com toggle.
  } // Encerra o bloco atual.
  setAttribute(name, value) { this.attributes[name] = value; } // Define o método setAttribute da classe.
  getAttribute(name) { return this.attributes[name] ?? null; } // Define o método getAttribute da classe.
  removeAttribute(name) { delete this.attributes[name]; } // Define o método removeAttribute da classe.
  toggleAttribute(name, force) { // Define o método toggleAttribute da classe.
    if (force) this.attributes[name] = ''; // Verifica force; se verdadeiro, executa a atribuição de o texto “” a this.attributes[name].
    else delete this.attributes[name]; // Compõe a remoção de this.attributes[name] na operação atual.
  } // Encerra o bloco atual.
  addEventListener(name, listener) { this.listeners[name] = listener; } // Define o método addEventListener da classe.
  removeEventListener(name, listener) { if (this.listeners[name] === listener) delete this.listeners[name]; } // Define o método removeEventListener da classe.
  querySelector(selector) { return this.children[selector] || null; } // Define o método querySelector da classe.
  querySelectorAll(selector) { return this.lists[selector] || []; } // Define o método querySelectorAll da classe.
  replaceChildren(...nodes) { this.nodes = nodes; this.textContent = ''; } // Define o método replaceChildren da classe.
  append(node) { this.nodes.push(node); node.ownerDocument = this.ownerDocument; } // Define o método append da classe.
  contains(node) { return node === this || this.nodes.some(child => child.contains(node)) || Object.values(this.children).some(child => child.contains(node)); } // Define o método contains da classe.
  focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; } // Define o método focus da classe.
  scrollIntoView() { this.scrolled = true; } // Define o método scrollIntoView da classe.
  reportValidity() { return this.valid !== false; } // Define o método reportValidity da classe.
} // Encerra a expressão ou função iniciada acima.
function documentMock() { // Declara a função documentMock com nenhum parâmetro.
  const ids = new Map(); // Define ids como uma instância de Map.
  const document = { // Define document como um objeto com documentElement, body, listeners, title, getElementById e outras propriedades.
    documentElement: new Element(), body: new Element(), listeners: {}, title: '', // Define a propriedade documentElement como uma instância de Element.
    getElementById(id) { if (!ids.has(id)) { const element = new Element(); element.ownerDocument = this; ids.set(id, element); } return ids.get(id); }, // Define a propriedade getElementById como uma função que recebe id.
    createElement() { const element = new Element(); element.ownerDocument = this; return element; }, // Define a propriedade createElement como uma função que recebe nenhum argumento.
    querySelector(selector) { return this.getElementById(selector); }, // Define a propriedade querySelector como uma função que recebe selector.
    querySelectorAll() { return []; }, // Define a propriedade querySelectorAll como uma função que recebe nenhum argumento.
    addEventListener(name, listener) { this.listeners[name] = listener; }, // Define a propriedade addEventListener como uma função que recebe name, listener.
    removeEventListener(name, listener) { if (this.listeners[name] === listener) delete this.listeners[name]; } // Define a propriedade removeEventListener como uma função que recebe name, listener.
  }; // Encerra o objeto.
  return document; // Retorna document.
} // Encerra o bloco da função documentMock.
module.exports = { Element, documentMock }; // Atualiza module.exports com um objeto com Element, documentMock.
