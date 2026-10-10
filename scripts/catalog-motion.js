/* A entrada só começa quando cada parte do catálogo chega à área visível. */
(() => {
  const heading = document.querySelector('.catalog-head');
  const grid = document.getElementById('catalog-grid');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!heading || !grid || motion.matches || !window.IntersectionObserver ||
      !window.MutationObserver || typeof heading.animate !== 'function') return;

  const animations = new Map();
  let headingRevealed = false;
  let cardsRevealed = false;
  let gridVisible = false;

  function reveal(element, delay = 0) {
    const animation = element.animate([
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 440,
      delay,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards'
    });
    animations.set(element, animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(element));
  }

  function finishObserving() {
    if (headingRevealed && cardsRevealed) observer.disconnect();
  }

  function revealCards() {
    if (cardsRevealed || !gridVisible || motion.matches) return;
    const bounds = grid.getBoundingClientRect();
    const visibleCards = Array.from(grid.querySelectorAll('.course-card')).filter(card => {
      const rect = card.getBoundingClientRect();
      return rect.right > Math.max(0, bounds.left) &&
        rect.left < Math.min(window.innerWidth, bounds.right) &&
        rect.bottom > 0 && rect.top < window.innerHeight;
    });
    if (!visibleCards.length) return;

    cardsRevealed = true;
    observer.unobserve(grid);
    contentObserver.disconnect();
    visibleCards.forEach((card, index) => reveal(card, index * 60));
    finishObserving();
  }

  const observer = new IntersectionObserver(entries => {
    if (motion.matches) return;
    for (const entry of entries) {
      if (entry.target === heading && entry.isIntersecting && !headingRevealed) {
        headingRevealed = true;
        observer.unobserve(heading);
        reveal(heading);
        finishObserving();
      } else if (entry.target === grid) {
        gridVisible = entry.isIntersecting;
        revealCards();
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

  // O catálogo pode chegar do Supabase depois que o usuário já rolou até ele.
  const contentObserver = new MutationObserver(() => {
    if (gridVisible && !cardsRevealed) window.requestAnimationFrame(revealCards);
  });
  contentObserver.observe(grid, { childList: true });
  observer.observe(heading);
  observer.observe(grid);

  grid.addEventListener('focusin', event => {
    const card = event.target.closest?.('.course-card');
    animations.get(card)?.cancel();
  });
  motion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    contentObserver.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
  });
})();
