/* As animações complementam a página; o conteúdo e os controles funcionam sem elas. */
(() => { // Inicia uma função executada imediatamente para isolar as variáveis deste script.
  const page = document.querySelector('.subscription-page'); // Define page como o primeiro elemento que corresponde ao seletor o texto “.subscription-page”.
  if (!page || !window.IntersectionObserver || typeof page.animate !== 'function') return; // Verifica a negação de page ou, se indisponível, a negação de window.IntersectionObserver ou, se indisponível, o tipo de page.animate diferente, inclusive no tipo, de o texto “function”; se verdadeiro, encerra a função sem retornar um valor.

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); // Define reduced como a consulta da preferência ou condição de tela o texto “(prefers-reduced-motion: reduce)”.
  const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)'); // Define precisePointer como a consulta da preferência ou condição de tela o texto “(hover: hover) and (pointer: fine)”.
  const progress = page.querySelector('.subscription-progress'); // Define progress como o primeiro elemento que corresponde ao seletor o texto “.subscription-progress”.
  const revealAnimations = new Map(); // Define revealAnimations como uma instância de Map.
  const revealed = new WeakSet(); // Define revealed como uma instância de WeakSet.
  const faqAnimations = new Map(); // Define faqAnimations como uma instância de Map.
  const resetPointers = []; // Define resetPointers como uma lista vazia.
  const canMove = () => !reduced.matches && !document.hidden; // Define canMove como uma função que recebe nenhum argumento.

  page.classList.add('motion-enabled'); // Executa a chamada que produz a inclusão da classe o texto “motion-enabled” em page.classList.

  const groups = [ // Define groups como uma lista com 12 itens.
    { selector: '.hero-copy > .px-eyebrow' }, // Inicia um objeto com selector.
    { selector: '.hero-line__text', type: 'line', delay: 60, step: 100 }, // Inicia um objeto com selector, type, delay, step.
    { selector: '.hero-description, .hero-cta, .hero-footnote', delay: 220, step: 80 }, // Inicia um objeto com selector, delay, step.
    { selector: '.practice-scene', type: 'board', delay: 180 }, // Inicia um objeto com selector, type, delay.
    { selector: '.hero-bottom' }, // Inicia um objeto com selector.
    { selector: '.section-intro > div, .section-intro > p', step: 100 }, // Inicia um objeto com selector, step.
    { selector: '.plan-card', step: 140 }, // Inicia um objeto com selector, step.
    { selector: '.benefits-heading, .learning-layout > div:first-child, .faq-intro, .closing-inner > div' }, // Inicia um objeto com selector.
    { selector: '.benefit', step: 75 }, // Inicia um objeto com selector, step.
    { selector: '.learning-step', step: 100 }, // Inicia um objeto com selector, step.
    { selector: '.faq-list .px-details', step: 45 }, // Inicia um objeto com selector, step.
    { selector: '.closing-inner > .px-button', delay: 140 } // Inicia um objeto com selector, delay.
  ]; // Encerra a lista.
  const settings = new WeakMap(); // Define settings como uma instância de WeakMap.
  const revealObserver = new IntersectionObserver(entries => { // Define revealObserver como uma instância de IntersectionObserver com uma função que recebe entries e um objeto com threshold, rootMargin.
    for (const entry of entries) { // Percorre entries usando entry.
      if (!entry.isIntersecting || revealed.has(entry.target)) continue; // Verifica a negação de entry.isIntersecting ou, se indisponível, a verificação da chave entry.target em revealed; se verdadeiro, avança para a próxima iteração do laço.
      revealed.add(entry.target); // Executa a chamada que produz o resultado de revealed.add com entry.target.
      revealObserver.unobserve(entry.target); // Executa a chamada que produz a interrupção do acompanhamento de entry.target.
      if (!canMove()) continue; // Verifica a negação de o resultado de canMove; se verdadeiro, avança para a próxima iteração do laço.

      const config = settings.get(entry.target); // Define config como o valor associado à chave entry.target em settings.
      const start = config.type === 'line' ? 'translateY(110%)' // Define start como o texto “translateY(110%)” se config.type igual, inclusive no tipo, a o texto “line”; caso contrário, o texto “translateY(30px) scale(.96)” se config.type igual, inclusive no tipo, a o texto “board”; caso contrário, o texto “translateY(28px)”.
        : config.type === 'board' ? 'translateY(30px) scale(.96)' : 'translateY(28px)'; // Acessa config.type.
      const animation = entry.target.animate([ // Define animation como a animação de entry.target com os quadros e as opções informados.
        { opacity: 0, transform: start }, // Inicia um objeto com opacity, transform.
        { opacity: 1, transform: 'none' } // Inicia um objeto com opacity, transform.
      ], { // Inicia um objeto com duration, delay, easing, fill.
        duration: config.type === 'line' ? 760 : 650, // Define a propriedade duration como 760 se config.type igual, inclusive no tipo, a o texto “line”; caso contrário, 650.
        delay: config.delay, // Define a propriedade delay como config.delay.
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Define a propriedade easing como o texto “cubic-bezier(0.16, 1, 0.3, 1)”.
        fill: 'backwards' // Define a propriedade fill como o texto “backwards”.
      }); // Encerra o objeto.
      revealAnimations.set(entry.target, animation); // Executa a chamada que produz a associação de entry.target ao valor animation em revealAnimations.
      animation.finished.catch(() => {}).finally(() => revealAnimations.delete(entry.target)); // Executa a chamada que produz a execução final após sucesso ou falha de animation.finished.catch(…).
    } // Encerra o bloco do laço.
  }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' }); // Inicia um objeto com threshold, rootMargin.

  groups.forEach(group => { // Executa a chamada que produz a execução da função para cada item de groups.
    page.querySelectorAll(group.selector).forEach((element, index) => { // Executa a chamada que produz a execução da função para cada item de page.querySelectorAll(…).
      settings.set(element, { type: group.type, delay: (group.delay || 0) + index * (group.step || 0) }); // Executa a chamada que produz a associação de element ao valor um objeto com type, delay em settings.
      revealObserver.observe(element); // Executa a chamada que produz o acompanhamento de element pelo observador.
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.

  // Os movimentos contínuos só consomem recursos enquanto sua seção está visível.
  const loopObserver = new IntersectionObserver(entries => { // Define loopObserver como uma instância de IntersectionObserver com uma função que recebe entries e um objeto com threshold.
    entries.forEach(entry => { // Executa a chamada que produz a execução da função para cada item de entries.
      entry.target.classList.toggle('is-in-view', entry.isIntersecting); // Executa a chamada que produz a alternância da classe ou do estado o texto “is-in-view” em entry.target.classList.
      if (entry.isIntersecting) entry.target.classList.add('has-entered'); // Verifica entry.isIntersecting; se verdadeiro, executa a inclusão da classe o texto “has-entered” em entry.target.classList.
    }); // Encerra o bloco atual.
  }, { threshold: 0 }); // Inicia um objeto com threshold.
  page.querySelectorAll('.subscription-hero, .tools-rail, .plan-card--annual, .learning-steps') // Executa a chamada que produz a execução da função para cada item de page.querySelectorAll(…).
    .forEach(element => loopObserver.observe(element)); // Executa a chamada que produz a execução da função para cada item de page.querySelectorAll(…).

  page.addEventListener('focusin', event => { // Executa a chamada que produz o registro do evento o texto “focusin” em page.
    revealAnimations.forEach((animation, element) => { // Executa a chamada que produz a execução da função para cada item de revealAnimations.
      if (element.contains(event.target)) animation.cancel(); // Verifica a verificação de event.target dentro de element; se verdadeiro, executa o cancelamento da animação ou operação de animation.
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.

  function finishFaq(details, state) { // Declara a função finishFaq com details, state.
    if (faqAnimations.get(details) !== state) return; // Verifica o valor associado à chave details em faqAnimations diferente, inclusive no tipo, de state; se verdadeiro, encerra a função sem retornar um valor.
    details.open = state.open; // Atualiza details.open com state.open.
    details.classList.remove('is-animating'); // Executa a chamada que produz a remoção da classe o texto “is-animating” de details.classList.
    faqAnimations.delete(details); // Executa a chamada que produz a remoção da chave details de faqAnimations.
    state.animation.cancel(); // Executa a chamada que produz o cancelamento da animação ou operação de state.animation.
  } // Encerra o bloco da função finishFaq.

  page.querySelectorAll('.faq-list .px-details').forEach(details => { // Executa a chamada que produz a execução da função para cada item de page.querySelectorAll(…).
    const summary = details.querySelector('summary'); // Define summary como o primeiro elemento que corresponde ao seletor o texto “summary”.
    summary.addEventListener('click', event => { // Executa a chamada que produz o registro do evento o texto “click” em summary.
      if (!canMove()) return; // Verifica a negação de o resultado de canMove; se verdadeiro, encerra a função sem retornar um valor.
      event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.

      const previous = faqAnimations.get(details); // Define previous como o valor associado à chave details em faqAnimations.
      const open = !(previous ? previous.open : details.open); // Define open como a negação de previous.open se previous; caso contrário, details.open.
      const height = details.getBoundingClientRect().height; // Define height como details.getBoundingClientRect(…).height.
      previous?.animation.cancel(); // Executa a chamada que produz o cancelamento da animação ou operação de previous.animation.
      details.open = true; // Atualiza details.open com true (verdadeiro).
      details.classList.add('is-animating'); // Executa a chamada que produz a inclusão da classe o texto “is-animating” em details.classList.
      const end = open ? details.scrollHeight : summary.getBoundingClientRect().height; // Define end como details.scrollHeight se open; caso contrário, summary.getBoundingClientRect(…).height.
      const animation = details.animate([{ height: `${height}px` }, { height: `${end}px` }], { // Define animation como a animação de details com os quadros e as opções informados.
        duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' // Define a propriedade duration como 340.
      }); // Encerra o objeto.
      const state = { animation, open }; // Define state como um objeto com animation, open.
      faqAnimations.set(details, state); // Executa a chamada que produz a associação de details ao valor state em faqAnimations.
      animation.finished.then(() => finishFaq(details, state)).catch(() => {}); // Executa a chamada que produz o tratamento de falhas de animation.finished.then(…).
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.

  page.querySelectorAll('.plan-card').forEach(card => { // Executa a chamada que produz a execução da função para cada item de page.querySelectorAll(…).
    let frame = null; // Define frame como null (ausência de valor).
    const reset = () => { // Define reset como uma função que recebe nenhum argumento.
      if (frame !== null) window.cancelAnimationFrame(frame); // Verifica frame diferente, inclusive no tipo, de null (ausência de valor); se verdadeiro, executa o cancelamento do quadro agendado frame.
      frame = null; // Atualiza frame com null (ausência de valor).
      card.classList.remove('is-pointer-active'); // Executa a chamada que produz a remoção da classe o texto “is-pointer-active” de card.classList.
      ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y'].forEach(name => card.style.removeProperty(name)); // Executa a chamada que produz a execução da função para cada item de expressão.
    }; // Encerra o bloco atual.
    resetPointers.push(reset); // Executa a chamada que produz a inclusão de reset ao final de resetPointers.
    card.addEventListener('pointermove', event => { // Executa a chamada que produz o registro do evento o texto “pointermove” em card.
      if (!canMove() || !precisePointer.matches || event.pointerType !== 'mouse') return; // Verifica a negação de o resultado de canMove ou, se indisponível, a negação de precisePointer.matches ou, se indisponível, event.pointerType diferente, inclusive no tipo, de o texto “mouse”; se verdadeiro, encerra a função sem retornar um valor.
      if (frame !== null) window.cancelAnimationFrame(frame); // Verifica frame diferente, inclusive no tipo, de null (ausência de valor); se verdadeiro, executa o cancelamento do quadro agendado frame.
      frame = window.requestAnimationFrame(() => { // Atualiza frame com o agendamento de uma atualização para o próximo quadro.
        frame = null; // Atualiza frame com null (ausência de valor).
        if (!canMove()) return; // Verifica a negação de o resultado de canMove; se verdadeiro, encerra a função sem retornar um valor.
        const rect = card.getBoundingClientRect(); // Define rect como as dimensões e a posição de card.
        if (!rect.width || !rect.height) return; // Verifica a negação de rect.width ou, se indisponível, a negação de rect.height; se verdadeiro, encerra a função sem retornar um valor.
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); // Define x como o maior valor entre os argumentos.
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)); // Define y como o maior valor entre os argumentos.
        card.style.setProperty('--spot-x', `${x * 100}%`); // Executa a chamada que produz a definição da propriedade CSS o texto “--spot-x” em card.style.
        card.style.setProperty('--spot-y', `${y * 100}%`); // Executa a chamada que produz a definição da propriedade CSS o texto “--spot-y” em card.style.
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`); // Executa a chamada que produz a definição da propriedade CSS o texto “--tilt-x” em card.style.
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`); // Executa a chamada que produz a definição da propriedade CSS o texto “--tilt-y” em card.style.
        card.classList.add('is-pointer-active'); // Executa a chamada que produz a inclusão da classe o texto “is-pointer-active” em card.classList.
      }); // Encerra o bloco atual.
    }); // Encerra o bloco atual.
    card.addEventListener('pointerleave', reset); // Executa a chamada que produz o registro do evento o texto “pointerleave” em card.
    card.addEventListener('pointercancel', reset); // Executa a chamada que produz o registro do evento o texto “pointercancel” em card.
  }); // Encerra o bloco atual.

  function syncMotion() { // Declara a função syncMotion com nenhum parâmetro.
    page.classList.toggle('motion-paused', !canMove()); // Executa a chamada que produz a alternância da classe ou do estado o texto “motion-paused” em page.classList.
    if (!canMove()) { // Verifica a negação de o resultado de canMove para decidir se executa este bloco.
      revealAnimations.forEach(animation => animation.cancel()); // Executa a chamada que produz a execução da função para cada item de revealAnimations.
      revealAnimations.clear(); // Executa a chamada que produz a limpeza dos itens de revealAnimations.
      faqAnimations.forEach((state, details) => finishFaq(details, state)); // Executa a chamada que produz a execução da função para cada item de faqAnimations.
      resetPointers.forEach(reset => reset()); // Executa a chamada que produz a execução da função para cada item de resetPointers.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da função syncMotion.
  reduced.addEventListener('change', syncMotion); // Executa a chamada que produz o registro do evento o texto “change” em reduced.
  precisePointer.addEventListener('change', () => resetPointers.forEach(reset => reset())); // Executa a chamada que produz o registro do evento o texto “change” em precisePointer.
  document.addEventListener('visibilitychange', syncMotion); // Executa a chamada que produz o registro do evento o texto “visibilitychange” em document.
  syncMotion(); // Executa a chamada que produz o resultado de syncMotion.

  if (progress) { // Verifica progress para decidir se executa este bloco.
    let frame = null; // Define frame como null (ausência de valor).
    const update = () => { // Define update como uma função que recebe nenhum argumento.
      frame = null; // Atualiza frame com null (ausência de valor).
      const distance = document.documentElement.scrollHeight - window.innerHeight; // Define distance como document.documentElement.scrollHeight menos window.innerHeight.
      const value = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0; // Define value como o maior valor entre os argumentos se distance maior que 0; caso contrário, 0.
      progress.style.setProperty('--page-progress', value); // Executa a chamada que produz a definição da propriedade CSS o texto “--page-progress” em progress.style.
    }; // Encerra o bloco atual.
    const schedule = () => { // Define schedule como uma função que recebe nenhum argumento.
      if (frame === null) frame = window.requestAnimationFrame(update); // Verifica frame igual, inclusive no tipo, a null (ausência de valor); se verdadeiro, executa a atribuição de o agendamento de uma atualização para o próximo quadro a frame.
    }; // Encerra o bloco atual.
    window.addEventListener('scroll', schedule, { passive: true }); // Executa a chamada que produz o registro do evento o texto “scroll” em window.
    window.addEventListener('resize', schedule); // Executa a chamada que produz o registro do evento o texto “resize” em window.
    update(); // Executa a chamada que produz a atualização dos dados o valor informado na tabela selecionada.
  } // Encerra o bloco da condição.
})(); // Encerra a função e sua execução imediata.
