const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Element } = require('./helpers.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'scripts/subscription-motion.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

class MotionElement extends Element {
  constructor() {
    super();
    this.classes = new Set();
    this.properties = new Map();
    this.animations = [];
    this.open = false;
    this.classList = {
      add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
      toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name)
    };
    this.style = { setProperty: (name, value) => this.properties.set(name, value), removeProperty: name => this.properties.delete(name) };
    this.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
  }
  animate(keyframes, options) {
    let resolve, reject;
    const animation = {
      keyframes, options, cancelled: false,
      finished: new Promise((done, failed) => { resolve = done; reject = failed; }),
      finish() { resolve(); }, cancel() { this.cancelled = true; reject(new Error('Cancelada')); }
    };
    this.animations.push(animation);
    return animation;
  }
}

function setup({ reduced = false, pointer = true, supported = true } = {}) {
  const page = new MotionElement(), title = new MotionElement(), card = new MotionElement();
  const progress = new MotionElement();
  const details = new MotionElement(), summary = new MotionElement(), board = new MotionElement();
  const observers = [], frames = new Map(), windowListeners = {}, documentListeners = {};
  let frameId = 0;
  page.children['.subscription-progress'] = progress;
  page.lists['.hero-line__text'] = [title];
  page.lists['.plan-card'] = [card];
  page.lists['.faq-list .px-details'] = [details];
  page.lists['.subscription-hero, .tools-rail, .plan-card--annual, .learning-steps'] = [board];
  details.children.summary = summary;
  details.scrollHeight = 180;
  details.getBoundingClientRect = () => ({ height: details.open ? 180 : 60 });
  summary.getBoundingClientRect = () => ({ height: 60 });
  const preferences = {
    reduced: { matches: reduced, addEventListener(name, callback) { this.listener = callback; } },
    pointer: { matches: pointer, addEventListener(name, callback) { this.listener = callback; } }
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.observed = new Set(); observers.push(this); }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
  }
  const document = {
    hidden: false, documentElement: { scrollHeight: 2000 },
    querySelector: () => page, addEventListener(name, callback) { documentListeners[name] = callback; }
  };
  const window = {
    IntersectionObserver: supported ? Observer : undefined, innerHeight: 800, scrollY: 600,
    matchMedia: query => query.includes('reduced') ? preferences.reduced : preferences.pointer,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(name, callback) { windowListeners[name] = callback; }
  };
  vm.runInNewContext(source, { document, window, IntersectionObserver: Observer });
  const clickFaq = () => {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    summary.listeners.click?.(event);
    return event;
  };
  const runFrames = () => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
  };
  return { page, title, card, progress, details, summary, board, observers,
    preferences, document, documentListeners, windowListeners, frames, clickFaq, runFrames };
}

test('movimento reduzido mantém conteúdo e FAQ nativos, sem executar entradas', () => {
  const page = setup({ reduced: true });
  page.observers[0].callback([{ target: page.title, isIntersecting: true }]);
  assert.equal(page.title.animations.length, 0);
  assert.equal(page.clickFaq().prevented, false);
  assert.equal(page.page.classes.has('motion-paused'), true);
});

test('cada entrada acontece uma vez e o foco torna o plano imediatamente visível', async () => {
  const page = setup();
  const entry = { target: page.card, isIntersecting: true };
  page.observers[0].callback([entry, entry]);
  page.observers[0].callback([entry]);
  assert.equal(page.card.animations.length, 1);
  assert.equal(page.observers[0].observed.has(page.card), false);
  page.page.listeners.focusin({ target: page.card });
  assert.equal(page.card.animations[0].cancelled, true);
  await flush();
});

test('cliques rápidos no FAQ preservam a última escolha e limpam a altura animada', async () => {
  const page = setup();
  assert.equal(page.clickFaq().prevented, true);
  page.clickFaq();
  page.clickFaq();
  assert.equal(page.details.animations.length, 3);
  assert.equal(page.details.animations[0].cancelled, true);
  assert.equal(page.details.animations[1].cancelled, true);
  page.details.animations[2].finish();
  await flush();
  assert.equal(page.details.open, true);
  assert.equal(page.details.classes.has('is-animating'), false);
  page.clickFaq();
  page.details.animations[3].finish();
  await flush();
  assert.equal(page.details.open, false);
});

test('ocultar a aba durante o fechamento do FAQ conclui a ação e para as entradas', async () => {
  const page = setup();
  page.observers[0].callback([{ target: page.title, isIntersecting: true }]);
  page.details.open = true;
  page.clickFaq();
  page.document.hidden = true;
  page.documentListeners.visibilitychange();
  assert.equal(page.details.open, false);
  assert.equal(page.details.classes.has('is-animating'), false);
  assert.equal(page.title.animations[0].cancelled, true);
  assert.equal(page.page.classes.has('motion-paused'), true);
  assert.equal(page.clickFaq().prevented, false);
  page.document.hidden = false;
  page.documentListeners.visibilitychange();
  assert.equal(page.page.classes.has('motion-paused'), false);
  await flush();
});

test('brilho dos planos ignora toque, agrupa movimentos e limpa ao sair', () => {
  const page = setup();
  page.card.listeners.pointermove({ pointerType: 'touch', clientX: 200, clientY: 150 });
  assert.equal(page.frames.size, 0);
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 100, clientY: 60 });
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 400, clientY: 300 });
  assert.equal(page.frames.size, 1);
  page.runFrames();
  assert.equal(page.card.properties.get('--spot-x'), '100%');
  assert.equal(page.card.properties.get('--tilt-x'), '-2deg');
  assert.equal(page.card.classes.has('is-pointer-active'), true);
  page.card.listeners.pointerleave();
  assert.equal(page.card.properties.size, 0);
  assert.equal(page.card.classes.has('is-pointer-active'), false);
});

test('alterar a preferência e ocultar a aba interrompem o movimento sem deixar efeitos presos', async () => {
  const page = setup();
  page.clickFaq();
  page.card.listeners.pointermove({ pointerType: 'mouse', clientX: 300, clientY: 50 });
  page.preferences.reduced.matches = true;
  page.preferences.reduced.listener();
  assert.equal(page.details.open, true);
  assert.equal(page.frames.size, 0);
  page.preferences.reduced.matches = false;
  page.preferences.reduced.listener();
  page.document.hidden = true;
  page.documentListeners.visibilitychange();
  assert.equal(page.page.classes.has('motion-paused'), true);
  page.document.hidden = false;
  page.documentListeners.visibilitychange();
  assert.equal(page.page.classes.has('motion-paused'), false);
  await flush();
});

test('sem API de animação suportada, a página continua estática e não intercepta o FAQ', () => {
  const page = setup({ supported: false });
  assert.equal(page.observers.length, 0);
  assert.equal(page.summary.listeners.click, undefined);
  assert.equal(page.page.classes.has('motion-enabled'), false);
});
