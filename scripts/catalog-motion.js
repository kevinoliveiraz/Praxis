/* A entrada só começa quando cada parte do catálogo chega à área visível. */
(() => { // Inicia uma função executada imediatamente para isolar as variáveis deste script.
  const heading = document.querySelector('.catalog-head'); // Define heading como o primeiro elemento que corresponde ao seletor o texto “.catalog-head”.
  const grid = document.getElementById('catalog-grid'); // Define grid como o elemento cujo ID é o texto “catalog-grid”.
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)'); // Define motion como a consulta da preferência ou condição de tela o texto “(prefers-reduced-motion: reduce)”.
  if (!heading || !grid || motion.matches || !window.IntersectionObserver || // Verifica expressão ou, se indisponível, motion.matches ou, se indisponível, a negação de window.IntersectionObserver ou, se indisponível, a negação de window.MutationObserver ou, se indisponível, o tipo de heading.animate diferente, inclusive no tipo, de o texto “function” para decidir se executa e…
      !window.MutationObserver || typeof heading.animate !== 'function') return; // Compõe a negação de window.MutationObserver na operação atual.

  const animations = new Map(); // Define animations como uma instância de Map.
  let headingRevealed = false; // Define headingRevealed como false (falso).
  let cardsRevealed = false; // Define cardsRevealed como false (falso).
  let gridVisible = false; // Define gridVisible como false (falso).

  function reveal(element, delay = 0) { // Declara a função reveal com element, delay.
    const animation = element.animate([ // Define animation como a animação de element com os quadros e as opções informados.
      { opacity: 0, transform: 'translateY(22px)' }, // Inicia um objeto com opacity, transform.
      { opacity: 1, transform: 'translateY(0)' } // Inicia um objeto com opacity, transform.
    ], { // Inicia um objeto com duration, delay, easing, fill.
      duration: 440, // Define a propriedade duration como 440.
      delay, // Inclui a propriedade delay com o valor da variável de mesmo nome.
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)', // Define a propriedade easing como o texto “cubic-bezier(0.22, 1, 0.36, 1)”.
      fill: 'backwards' // Define a propriedade fill como o texto “backwards”.
    }); // Encerra o objeto.
    animations.set(element, animation); // Executa a chamada que produz a associação de element ao valor animation em animations.
    animation.finished.catch(() => {}).finally(() => animations.delete(element)); // Executa a chamada que produz a execução final após sucesso ou falha de animation.finished.catch(…).
  } // Encerra o bloco da função reveal.

  function finishObserving() { // Declara a função finishObserving com nenhum parâmetro.
    if (headingRevealed && cardsRevealed) observer.disconnect(); // Verifica headingRevealed e cardsRevealed; se verdadeiro, executa a desconexão do observador.
  } // Encerra o bloco da função finishObserving.

  function revealCards() { // Declara a função revealCards com nenhum parâmetro.
    if (cardsRevealed || !gridVisible || motion.matches) return; // Verifica cardsRevealed ou, se indisponível, a negação de gridVisible ou, se indisponível, motion.matches; se verdadeiro, encerra a função sem retornar um valor.
    const bounds = grid.getBoundingClientRect(); // Define bounds como as dimensões e a posição de grid.
    const visibleCards = Array.from(grid.querySelectorAll('.course-card')).filter(card => { // Define visibleCards como os itens de Array.from(…) que passam na condição.
      const rect = card.getBoundingClientRect(); // Define rect como as dimensões e a posição de card.
      return rect.right > Math.max(0, bounds.left) && // Retorna rect.right maior que Math.max(…) e rect.left menor que Math.min(…) e rect.bottom maior que 0 e rect.top menor que window.innerHeight.
        rect.left < Math.min(window.innerWidth, bounds.right) && // Acessa rect.left.
        rect.bottom > 0 && rect.top < window.innerHeight; // Acessa rect.bottom.
    }); // Encerra o bloco atual.
    if (!visibleCards.length) return; // Verifica a negação de visibleCards.length; se verdadeiro, encerra a função sem retornar um valor.

    cardsRevealed = true; // Atualiza cardsRevealed com true (verdadeiro).
    observer.unobserve(grid); // Executa a chamada que produz a interrupção do acompanhamento de grid.
    contentObserver.disconnect(); // Executa a chamada que produz a desconexão do observador.
    visibleCards.forEach((card, index) => reveal(card, index * 60)); // Executa a chamada que produz a execução da função para cada item de visibleCards.
    finishObserving(); // Executa a chamada que produz o resultado de finishObserving.
  } // Encerra o bloco da função revealCards.

  const observer = new IntersectionObserver(entries => { // Define observer como uma instância de IntersectionObserver com uma função que recebe entries e um objeto com threshold, rootMargin.
    if (motion.matches) return; // Verifica motion.matches; se verdadeiro, encerra a função sem retornar um valor.
    for (const entry of entries) { // Percorre entries usando entry.
      if (entry.target === heading && entry.isIntersecting && !headingRevealed) { // Verifica entry.target igual, inclusive no tipo, a heading e entry.isIntersecting e a negação de headingRevealed para decidir se executa este bloco.
        headingRevealed = true; // Atualiza headingRevealed com true (verdadeiro).
        observer.unobserve(heading); // Executa a chamada que produz a interrupção do acompanhamento de heading.
        reveal(heading); // Executa a chamada que produz o resultado de reveal com heading.
        finishObserving(); // Executa a chamada que produz o resultado de finishObserving.
      } else if (entry.target === grid) { // Encerra o bloco anterior e verifica entry.target igual, inclusive no tipo, a grid para decidir se executa este bloco.
        gridVisible = entry.isIntersecting; // Atualiza gridVisible com entry.isIntersecting.
        revealCards(); // Executa a chamada que produz o resultado de revealCards.
      } // Encerra o bloco da condição.
    } // Encerra o bloco do laço.
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }); // Inicia um objeto com threshold, rootMargin.

  // O catálogo pode chegar do Supabase depois que o usuário já rolou até ele.
  const contentObserver = new MutationObserver(() => { // Define contentObserver como uma instância de MutationObserver com uma função que recebe nenhum argumento.
    if (gridVisible && !cardsRevealed) window.requestAnimationFrame(revealCards); // Verifica gridVisible e a negação de cardsRevealed; se verdadeiro, executa o agendamento de uma atualização para o próximo quadro.
  }); // Encerra o bloco atual.
  contentObserver.observe(grid, { childList: true }); // Executa a chamada que produz o acompanhamento de grid pelo observador.
  observer.observe(heading); // Executa a chamada que produz o acompanhamento de heading pelo observador.
  observer.observe(grid); // Executa a chamada que produz o acompanhamento de grid pelo observador.

  grid.addEventListener('focusin', event => { // Executa a chamada que produz o registro do evento o texto “focusin” em grid.
    const card = event.target.closest?.('.course-card'); // Define card como o resultado de event.target.closest com o texto “.course-card” com acesso opcional.
    animations.get(card)?.cancel(); // Executa a chamada que produz o cancelamento da animação ou operação de animations.get(…).
  }); // Encerra o bloco atual.
  motion.addEventListener('change', event => { // Executa a chamada que produz o registro do evento o texto “change” em motion.
    if (!event.matches) return; // Verifica a negação de event.matches; se verdadeiro, encerra a função sem retornar um valor.
    observer.disconnect(); // Executa a chamada que produz a desconexão do observador.
    contentObserver.disconnect(); // Executa a chamada que produz a desconexão do observador.
    animations.forEach(animation => animation.cancel()); // Executa a chamada que produz a execução da função para cada item de animations.
    animations.clear(); // Executa a chamada que produz a limpeza dos itens de animations.
  }); // Encerra o bloco atual.
})(); // Encerra a função e sua execução imediata.
