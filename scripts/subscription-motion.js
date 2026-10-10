/* As animações complementam a página; o conteúdo e os controles funcionam sem elas. */
(() => {
  const page = document.querySelector('.subscription-page');
  if (!page || !window.IntersectionObserver || typeof page.animate !== 'function') return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const progress = page.querySelector('.subscription-progress');
  const revealAnimations = new Map();
  const revealed = new WeakSet();
  const faqAnimations = new Map();
  const resetPointers = [];
  const canMove = () => !reduced.matches && !document.hidden;

  page.classList.add('motion-enabled');

  const groups = [
    { selector: '.hero-copy > .px-eyebrow' },
    { selector: '.hero-line__text', type: 'line', delay: 60, step: 100 },
    { selector: '.hero-description, .hero-cta, .hero-footnote', delay: 220, step: 80 },
    { selector: '.practice-scene', type: 'board', delay: 180 },
    { selector: '.hero-bottom' },
    { selector: '.section-intro > div, .section-intro > p', step: 100 },
    { selector: '.plan-card', step: 140 },
    { selector: '.benefits-heading, .learning-layout > div:first-child, .faq-intro, .closing-inner > div' },
    { selector: '.benefit', step: 75 },
    { selector: '.learning-step', step: 100 },
    { selector: '.faq-list .px-details', step: 45 },
    { selector: '.closing-inner > .px-button', delay: 140 }
  ];
  const settings = new WeakMap();
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || revealed.has(entry.target)) continue;
      revealed.add(entry.target);
      revealObserver.unobserve(entry.target);
      if (!canMove()) continue;

      const config = settings.get(entry.target);
      const start = config.type === 'line' ? 'translateY(110%)'
        : config.type === 'board' ? 'translateY(30px) scale(.96)' : 'translateY(28px)';
      const animation = entry.target.animate([
        { opacity: 0, transform: start },
        { opacity: 1, transform: 'none' }
      ], {
        duration: config.type === 'line' ? 760 : 650,
        delay: config.delay,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'backwards'
      });
      revealAnimations.set(entry.target, animation);
      animation.finished.catch(() => {}).finally(() => revealAnimations.delete(entry.target));
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });

  groups.forEach(group => {
    page.querySelectorAll(group.selector).forEach((element, index) => {
      settings.set(element, { type: group.type, delay: (group.delay || 0) + index * (group.step || 0) });
      revealObserver.observe(element);
    });
  });

  // Os movimentos contínuos só consomem recursos enquanto sua seção está visível.
  const loopObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-in-view', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.add('has-entered');
    });
  }, { threshold: 0 });
  page.querySelectorAll('.subscription-hero, .tools-rail, .plan-card--annual, .learning-steps')
    .forEach(element => loopObserver.observe(element));

  page.addEventListener('focusin', event => {
    revealAnimations.forEach((animation, element) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });

  function finishFaq(details, state) {
    if (faqAnimations.get(details) !== state) return;
    details.open = state.open;
    details.classList.remove('is-animating');
    faqAnimations.delete(details);
    state.animation.cancel();
  }

  page.querySelectorAll('.faq-list .px-details').forEach(details => {
    const summary = details.querySelector('summary');
    summary.addEventListener('click', event => {
      if (!canMove()) return;
      event.preventDefault();

      const previous = faqAnimations.get(details);
      const open = !(previous ? previous.open : details.open);
      const height = details.getBoundingClientRect().height;
      previous?.animation.cancel();
      details.open = true;
      details.classList.add('is-animating');
      const end = open ? details.scrollHeight : summary.getBoundingClientRect().height;
      const animation = details.animate([{ height: `${height}px` }, { height: `${end}px` }], {
        duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both'
      });
      const state = { animation, open };
      faqAnimations.set(details, state);
      animation.finished.then(() => finishFaq(details, state)).catch(() => {});
    });
  });

  page.querySelectorAll('.plan-card').forEach(card => {
    let frame = null;
    const reset = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      card.classList.remove('is-pointer-active');
      ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y'].forEach(name => card.style.removeProperty(name));
    };
    resetPointers.push(reset);
    card.addEventListener('pointermove', event => {
      if (!canMove() || !precisePointer.matches || event.pointerType !== 'mouse') return;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (!canMove()) return;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        card.style.setProperty('--spot-x', `${x * 100}%`);
        card.style.setProperty('--spot-y', `${y * 100}%`);
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
        card.classList.add('is-pointer-active');
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
  });

  function syncMotion() {
    page.classList.toggle('motion-paused', !canMove());
    if (!canMove()) {
      revealAnimations.forEach(animation => animation.cancel());
      revealAnimations.clear();
      faqAnimations.forEach((state, details) => finishFaq(details, state));
      resetPointers.forEach(reset => reset());
    }
  }
  reduced.addEventListener('change', syncMotion);
  precisePointer.addEventListener('change', () => resetPointers.forEach(reset => reset()));
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();

  if (progress) {
    let frame = null;
    const update = () => {
      frame = null;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const value = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
      progress.style.setProperty('--page-progress', value);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
  }
})();
