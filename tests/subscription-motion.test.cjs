const { test } = require('node:test'); // Define test como o módulo o texto “node:test”.
const assert = require('node:assert/strict'); // Define assert como o módulo o texto “node:assert/strict”.
const fs = require('node:fs'); // Define fs como o módulo o texto “node:fs”.
const path = require('node:path'); // Define path como o módulo o texto “node:path”.
const vm = require('node:vm'); // Define vm como o módulo o texto “node:vm”.
const { Element } = require('./helpers.cjs'); // Define Element como o módulo o texto “./helpers.cjs”.
const source = fs.readFileSync(path.join(__dirname, '..', 'scripts/subscription-motion.js'), 'utf8'); // Define source como o conteúdo do arquivo os itens de path unidos por __dirname.
const flush = () => new Promise(resolve => setImmediate(resolve)); // Define flush como uma função que recebe nenhum argumento.

class MotionElement extends Element { // Declara a classe MotionElement que herda de Element.
  constructor() { // Define o método constructor da classe.
    super(); // Executa a chamada que produz o resultado de super.
    this.classes = new Set(); // Atualiza this.classes com uma instância de Set.
    this.properties = new Map(); // Atualiza this.properties com uma instância de Map.
    this.animations = []; // Atualiza this.animations com uma lista vazia.
    this.open = false; // Atualiza this.open com false (falso).
    this.classList = { // Atualiza this.classList com um objeto com add, remove, contains, toggle.
      add: name => this.classes.add(name), remove: name => this.classes.delete(name), // Define a propriedade add como uma função que recebe name.
      contains: name => this.classes.has(name), // Define a propriedade contains como uma função que recebe name.
      toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name) // Define a propriedade toggle como uma função que recebe name, value.
    }; // Encerra o objeto.
    this.style = { setProperty: (name, value) => this.properties.set(name, value), removeProperty: name => this.properties.delete(name) }; // Atualiza this.style com um objeto com setProperty, removeProperty.
    this.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 }); // Atualiza this.getBoundingClientRect com uma função que recebe nenhum argumento.
  } // Encerra o bloco atual.
  animate(keyframes, options) { // Define o método animate da classe.
    let resolve, reject; // Define resolve como sem valor inicial.
    const animation = { // Define animation como um objeto com keyframes, options, cancelled, finished, finish e outras propriedades.
      keyframes, options, cancelled: false, // Inclui a propriedade keyframes com o valor da variável de mesmo nome.
      finished: new Promise((done, failed) => { resolve = done; reject = failed; }), // Define a propriedade finished como uma instância de Promise com uma função que recebe done, failed.
      finish() { resolve(); }, cancel() { this.cancelled = true; reject(new Error('Cancelada')); } // Define a propriedade finish como uma função que recebe nenhum argumento.
    }; // Encerra o objeto.
    this.animations.push(animation); // Executa a chamada que produz a inclusão de animation ao final de this.animations.
    return animation; // Retorna animation.
  } // Encerra o bloco atual.
} // Encerra a expressão ou função iniciada acima.

function setup({ reduced = false, pointer = true, supported = true } = {}) { // Declara a função setup com reduced, pointer, supported.
  const page = new MotionElement(), title = new MotionElement(), card = new MotionElement(); // Define page como uma instância de MotionElement.
  const progress = new MotionElement(); // Define progress como uma instância de MotionElement.
  const details = new MotionElement(), summary = new MotionElement(), board = new MotionElement(); // Define details como uma instância de MotionElement.
  const observers = [], frames = new Map(), windowListeners = {}, documentListeners = {}; // Define observers como uma lista vazia.
  let frameId = 0; // Define frameId como 0.
  page.children['.subscription-progress'] = progress; // Atualiza page.children[o texto “.subscription-progress”] com progress.
  page.lists['.hero-line__text'] = [title]; // Atualiza page.lists[o texto “.hero-line__text”] com uma lista com 1 item.
  page.lists['.plan-card'] = [card]; // Atualiza page.lists[o texto “.plan-card”] com uma lista com 1 item.
  page.lists['.faq-list .px-details'] = [details]; // Atualiza page.lists[o texto “.faq-list .px-details”] com uma lista com 1 item.
  page.lists['.subscription-hero, .tools-rail, .plan-card--annual, .learning-steps'] = [board]; // Atualiza page.lists[o texto “.subscription-hero, .tools-rail, .plan-card--annual, .learning-steps”] com uma lista com 1 item.
  details.children.summary = summary; // Atualiza details.children.summary com summary.
  details.scrollHeight = 180; // Atualiza details.scrollHeight com 180.
  details.getBoundingClientRect = () => ({ height: details.open ? 180 : 60 }); // Atualiza details.getBoundingClientRect com uma função que recebe nenhum argumento.
  summary.getBoundingClientRect = () => ({ height: 60 }); // Atualiza summary.getBoundingClientRect com uma função que recebe nenhum argumento.
  const preferences = { // Define preferences como um objeto com reduced, pointer.
    reduced: { matches: reduced, addEventListener(name, callback) { this.listener = callback; } }, // Define a propriedade reduced como um objeto com matches, addEventListener.
    pointer: { matches: pointer, addEventListener(name, callback) { this.listener = callback; } } // Define a propriedade pointer como um objeto com matches, addEventListener.
  }; // Encerra o objeto.
  class Observer { // Declara a classe Observer.
    constructor(callback) { this.callback = callback; this.observed = new Set(); observers.push(this); } // Define o método constructor da classe.
    observe(element) { this.observed.add(element); } // Define o método observe da classe.
    unobserve(element) { this.observed.delete(element); } // Define o método unobserve da classe.
  } // Encerra a expressão ou função iniciada acima.
  const document = { // Define document como um objeto com hidden, documentElement, querySelector, addEventListener.
    hidden: false, documentElement: { scrollHeight: 2000 }, // Define a propriedade hidden como false (falso).
    querySelector: () => page, addEventListener(name, callback) { documentListeners[name] = callback; } // Define a propriedade querySelector como uma função que recebe nenhum argumento.
  }; // Encerra o objeto.
  const window = { // Define window como um objeto com IntersectionObserver, innerHeight, scrollY, matchMedia, requestAnimationFrame e outras propriedades.
    IntersectionObserver: supported ? Observer : undefined, innerHeight: 800, scrollY: 600, // Define a propriedade IntersectionObserver como Observer se supported; caso contrário, undefined.
    matchMedia: query => query.includes('reduced') ? preferences.reduced : preferences.pointer, // Define a propriedade matchMedia como uma função que recebe query.
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; }, // Define a propriedade requestAnimationFrame como uma função que recebe callback.
    cancelAnimationFrame(id) { frames.delete(id); }, // Define a propriedade cancelAnimationFrame como uma função que recebe id.
    addEventListener(name, callback) { windowListeners[name] = callback; } // Define a propriedade addEventListener como uma função que recebe name, callback.
  }; // Encerra o objeto.
  vm.runInNewContext(source, { document, window, IntersectionObserver: Observer }); // Executa a chamada que produz o resultado de vm.runInNewContext com source e um objeto com document, window, IntersectionObserver.
  const clickFaq = () => { // Define clickFaq como uma função que recebe nenhum argumento.
    const event = { prevented: false, preventDefault() { this.prevented = true; } }; // Define event como um objeto com prevented, preventDefault.
    summary.listeners.click?.(event); // Executa a chamada que produz o resultado de summary.listeners.click com event.
    return event; // Retorna event.
  }; // Encerra o bloco atual.
  const runFrames = () => { // Define runFrames como uma função que recebe nenhum argumento.
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); // Define pending como uma lista com 1 item.
  }; // Encerra o bloco atual.
  return { page, title, card, progress, details, summary, board, observers, // Retorna um objeto com page, title, card, progress, details e outras propriedades.
    preferences, document, documentListeners, windowListeners, frames, clickFaq, runFrames }; // Inclui a propriedade preferences com o valor da variável de mesmo nome.
} // Encerra o bloco da função setup.

test('movimento reduzido mantém conteúdo e FAQ nativos, sem executar entradas', () => { // Executa a chamada que produz o teste “movimento reduzido mantém conteúdo e FAQ nativos, sem executar entradas”.
  const page = setup({ reduced: true }); // Define page como o resultado de setup com um objeto com reduced.
  page.observers[0].callback([{ target: page.title, isIntersecting: true }]); // Executa a chamada que produz o resultado de page.observers[0].callback com uma lista com 1 item.
  assert.equal(page.title.animations.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.title.animations.length e 0.
  assert.equal(page.clickFaq().prevented, false); // Executa a chamada que produz a conferência de igualdade entre page.clickFaq(…).prevented e false (falso).
  assert.equal(page.page.classes.has('motion-paused'), true); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-paused” em page.page.classes e true (verdadeiro).
}); // Encerra o bloco atual.

test('cada entrada acontece uma vez e o foco torna o plano imediatamente visível', async () => { // Executa a chamada que produz o teste “cada entrada acontece uma vez e o foco torna o plano imediatamente visível”.
  const page = setup(); // Define page como o resultado de setup.
  const entry = { target: page.card, isIntersecting: true }; // Define entry como um objeto com target, isIntersecting.
  page.observers[0].callback([entry, entry]); // Executa a chamada que produz o resultado de page.observers[0].callback com uma lista com 2 itens.
  page.observers[0].callback([entry]); // Executa a chamada que produz o resultado de page.observers[0].callback com uma lista com 1 item.
  assert.equal(page.card.animations.length, 1); // Executa a chamada que produz a conferência de igualdade entre page.card.animations.length e 1.
  assert.equal(page.observers[0].observed.has(page.card), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave page.card em page.observers[0].observed e false (falso).
  page.page.listeners.focusin({ target: page.card }); // Executa a chamada que produz o resultado de page.page.listeners.focusin com um objeto com target.
  assert.equal(page.card.animations[0].cancelled, true); // Executa a chamada que produz a conferência de igualdade entre page.card.animations[0].cancelled e true (verdadeiro).
  await flush(); // Aguarda o resultado de flush antes de continuar.
}); // Encerra o bloco atual.

test('cliques rápidos no FAQ preservam a última escolha e limpam a altura animada', async () => { // Executa a chamada que produz o teste “cliques rápidos no FAQ preservam a última escolha e limpam a altura animada”.
  const page = setup(); // Define page como o resultado de setup.
  assert.equal(page.clickFaq().prevented, true); // Executa a chamada que produz a conferência de igualdade entre page.clickFaq(…).prevented e true (verdadeiro).
  page.clickFaq(); // Executa a chamada que produz o resultado de page.clickFaq.
  page.clickFaq(); // Executa a chamada que produz o resultado de page.clickFaq.
  assert.equal(page.details.animations.length, 3); // Executa a chamada que produz a conferência de igualdade entre page.details.animations.length e 3.
  assert.equal(page.details.animations[0].cancelled, true); // Executa a chamada que produz a conferência de igualdade entre page.details.animations[0].cancelled e true (verdadeiro).
  assert.equal(page.details.animations[1].cancelled, true); // Executa a chamada que produz a conferência de igualdade entre page.details.animations[1].cancelled e true (verdadeiro).
  page.details.animations[2].finish(); // Executa a chamada que produz o resultado de page.details.animations[2].finish.
  await flush(); // Aguarda o resultado de flush antes de continuar.
  assert.equal(page.details.open, true); // Executa a chamada que produz a conferência de igualdade entre page.details.open e true (verdadeiro).
  assert.equal(page.details.classes.has('is-animating'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “is-animating” em page.details.classes e false (falso).
  page.clickFaq(); // Executa a chamada que produz o resultado de page.clickFaq.
  page.details.animations[3].finish(); // Executa a chamada que produz o resultado de page.details.animations[3].finish.
  await flush(); // Aguarda o resultado de flush antes de continuar.
  assert.equal(page.details.open, false); // Executa a chamada que produz a conferência de igualdade entre page.details.open e false (falso).
}); // Encerra o bloco atual.

test('ocultar a aba durante o fechamento do FAQ conclui a ação e para as entradas', async () => { // Executa a chamada que produz o teste “ocultar a aba durante o fechamento do FAQ conclui a ação e para as entradas”.
  const page = setup(); // Define page como o resultado de setup.
  page.observers[0].callback([{ target: page.title, isIntersecting: true }]); // Executa a chamada que produz o resultado de page.observers[0].callback com uma lista com 1 item.
  page.details.open = true; // Atualiza page.details.open com true (verdadeiro).
  page.clickFaq(); // Executa a chamada que produz o resultado de page.clickFaq.
  page.document.hidden = true; // Atualiza page.document.hidden com true (verdadeiro).
  page.documentListeners.visibilitychange(); // Executa a chamada que produz o resultado de page.documentListeners.visibilitychange.
  assert.equal(page.details.open, false); // Executa a chamada que produz a conferência de igualdade entre page.details.open e false (falso).
  assert.equal(page.details.classes.has('is-animating'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “is-animating” em page.details.classes e false (falso).
  assert.equal(page.title.animations[0].cancelled, true); // Executa a chamada que produz a conferência de igualdade entre page.title.animations[0].cancelled e true (verdadeiro).
  assert.equal(page.page.classes.has('motion-paused'), true); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-paused” em page.page.classes e true (verdadeiro).
  assert.equal(page.clickFaq().prevented, false); // Executa a chamada que produz a conferência de igualdade entre page.clickFaq(…).prevented e false (falso).
  page.document.hidden = false; // Atualiza page.document.hidden com false (falso).
  page.documentListeners.visibilitychange(); // Executa a chamada que produz o resultado de page.documentListeners.visibilitychange.
  assert.equal(page.page.classes.has('motion-paused'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-paused” em page.page.classes e false (falso).
  await flush(); // Aguarda o resultado de flush antes de continuar.
}); // Encerra o bloco atual.

test('brilho dos planos ignora toque, agrupa movimentos e limpa ao sair', () => { // Executa a chamada que produz o teste “brilho dos planos ignora toque, agrupa movimentos e limpa ao sair”.
  const page = setup(); // Define page como o resultado de setup.
  page.card.listeners.pointermove({ pointerType: 'touch', clientX: 200, clientY: 150 }); // Executa a chamada que produz o resultado de page.card.listeners.pointermove com um objeto com pointerType, clientX, clientY.
  assert.equal(page.frames.size, 0); // Executa a chamada que produz a conferência de igualdade entre page.frames.size e 0.
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 100, clientY: 60 }); // Executa a chamada que produz o resultado de page.card.listeners.pointermove com um objeto com pointerType, clientX, clientY.
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 400, clientY: 300 }); // Executa a chamada que produz o resultado de page.card.listeners.pointermove com um objeto com pointerType, clientX, clientY.
  assert.equal(page.frames.size, 1); // Executa a chamada que produz a conferência de igualdade entre page.frames.size e 1.
  page.runFrames(); // Executa a chamada que produz o resultado de page.runFrames.
  assert.equal(page.card.properties.get('--spot-x'), '100%'); // Executa a chamada que produz a conferência de igualdade entre o valor associado à chave o texto “--spot-x” em page.card.properties e o texto “100%”.
  assert.equal(page.card.properties.get('--tilt-x'), '-2deg'); // Executa a chamada que produz a conferência de igualdade entre o valor associado à chave o texto “--tilt-x” em page.card.properties e o texto “-2deg”.
  assert.equal(page.card.classes.has('is-pointer-active'), true); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “is-pointer-active” em page.card.classes e true (verdadeiro).
  page.card.listeners.pointerleave(); // Executa a chamada que produz o resultado de page.card.listeners.pointerleave.
  assert.equal(page.card.properties.size, 0); // Executa a chamada que produz a conferência de igualdade entre page.card.properties.size e 0.
  assert.equal(page.card.classes.has('is-pointer-active'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “is-pointer-active” em page.card.classes e false (falso).
}); // Encerra o bloco atual.

test('alterar a preferência e ocultar a aba interrompem o movimento sem deixar efeitos presos', async () => { // Executa a chamada que produz o teste “alterar a preferência e ocultar a aba interrompem o movimento sem deixar efeitos presos”.
  const page = setup(); // Define page como o resultado de setup.
  page.clickFaq(); // Executa a chamada que produz o resultado de page.clickFaq.
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 300, clientY: 50 }); // Executa a chamada que produz o resultado de page.card.listeners.pointermove com um objeto com pointerType, clientX, clientY.
  page.preferences.reduced.matches = true; // Atualiza page.preferences.reduced.matches com true (verdadeiro).
  page.preferences.reduced.listener(); // Executa a chamada que produz o resultado de page.preferences.reduced.listener.
  assert.equal(page.details.open, true); // Executa a chamada que produz a conferência de igualdade entre page.details.open e true (verdadeiro).
  assert.equal(page.frames.size, 0); // Executa a chamada que produz a conferência de igualdade entre page.frames.size e 0.
  page.preferences.reduced.matches = false; // Atualiza page.preferences.reduced.matches com false (falso).
  page.preferences.reduced.listener(); // Executa a chamada que produz o resultado de page.preferences.reduced.listener.
  page.document.hidden = true; // Atualiza page.document.hidden com true (verdadeiro).
  page.documentListeners.visibilitychange(); // Executa a chamada que produz o resultado de page.documentListeners.visibilitychange.
  assert.equal(page.page.classes.has('motion-paused'), true); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-paused” em page.page.classes e true (verdadeiro).
  page.document.hidden = false; // Atualiza page.document.hidden com false (falso).
  page.documentListeners.visibilitychange(); // Executa a chamada que produz o resultado de page.documentListeners.visibilitychange.
  assert.equal(page.page.classes.has('motion-paused'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-paused” em page.page.classes e false (falso).
  await flush(); // Aguarda o resultado de flush antes de continuar.
}); // Encerra o bloco atual.

test('sem API de animação suportada, a página continua estática e não intercepta o FAQ', () => { // Executa a chamada que produz o teste “sem API de animação suportada, a página continua estática e não intercepta o FAQ”.
  const page = setup({ supported: false }); // Define page como o resultado de setup com um objeto com supported.
  assert.equal(page.observers.length, 0); // Executa a chamada que produz a conferência de igualdade entre page.observers.length e 0.
  assert.equal(page.summary.listeners.click, undefined); // Executa a chamada que produz a conferência de igualdade entre page.summary.listeners.click e undefined.
  assert.equal(page.page.classes.has('motion-enabled'), false); // Executa a chamada que produz a conferência de igualdade entre a verificação da chave o texto “motion-enabled” em page.page.classes e false (falso).
}); // Encerra o bloco atual.
