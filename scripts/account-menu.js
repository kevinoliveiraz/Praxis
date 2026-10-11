/* Disclosure com links nativos: clique, teclado, Escape e fechamento fora da conta. */
export function initAccountMenu(root) { // Exporta para os outros módulos: Declara a função initAccountMenu com root.
  const trigger = root.querySelector('[data-account-toggle]'); // Define trigger como o primeiro elemento que corresponde ao seletor o texto “[data-account-toggle]”.
  const menu = root.querySelector('[data-account-menu]'); // Define menu como o primeiro elemento que corresponde ao seletor o texto “[data-account-menu]”.
  const idle = { destroy() {}, isOpen: () => false, open() {} }; // Define idle como um objeto com destroy, isOpen, open.
  if (!trigger || !menu) return idle; // Verifica a negação de trigger ou, se indisponível, a negação de menu; se verdadeiro, retorna idle.
  const owner = root.ownerDocument || document; // Define owner como root.ownerDocument ou, se indisponível, document.
  const items = () => [...menu.querySelectorAll('a, button:not(:disabled)')]; // Define items como uma função que recebe nenhum argumento.

  function close(focus = false) { // Declara a função close com focus.
    menu.hidden = true; // Atualiza menu.hidden com true (verdadeiro).
    trigger.setAttribute('aria-expanded', 'false'); // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em trigger.
    if (focus) trigger.focus(); // Verifica focus; se verdadeiro, executa o resultado de trigger.focus.
  } // Encerra o bloco da função close.
  function open(focus = false) { // Declara a função open com focus.
    menu.hidden = false; // Atualiza menu.hidden com false (falso).
    trigger.setAttribute('aria-expanded', 'true'); // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em trigger.
    if (focus) items()[0]?.focus(); // Verifica focus; se verdadeiro, executa o resultado de items(…)[0].focus com acesso opcional.
  } // Encerra o bloco da função open.
  const toggle = () => menu.hidden ? open() : close(); // Define toggle como uma função que recebe nenhum argumento.
  const outside = event => { if (!root.contains(event.target)) close(); }; // Define outside como uma função que recebe event.
  const escape = event => { // Define escape como uma função que recebe event.
    if (event.key === 'Escape' && !menu.hidden) { // Verifica event.key igual, inclusive no tipo, a o texto “Escape” e a negação de menu.hidden para decidir se executa este bloco.
      event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.
      close(true); // Executa a chamada que produz o resultado de close com true (verdadeiro).
    } // Encerra o bloco da condição.
  }; // Encerra o bloco atual.
  const leave = event => { if (event.relatedTarget && !root.contains(event.relatedTarget)) close(); }; // Define leave como uma função que recebe event.
  const triggerKey = event => { // Define triggerKey como uma função que recebe event.
    if (event.key === 'ArrowDown') { event.preventDefault(); open(true); } // Verifica event.key igual, inclusive no tipo, a o texto “ArrowDown”; se verdadeiro, executa o cancelamento da ação padrão do evento. Executa o resultado de open com true (verdadeiro).
  }; // Encerra o bloco atual.
  const menuKey = event => { // Define menuKey como uma função que recebe event.
    const links = items(), index = links.indexOf(owner.activeElement); // Define links como o resultado de items.
    let next; // Define next como sem valor inicial.
    if (event.key === 'ArrowDown') next = (index + 1) % links.length; // Verifica event.key igual, inclusive no tipo, a o texto “ArrowDown”; se verdadeiro, executa a atribuição de index mais 1 módulo links.length a next.
    if (event.key === 'ArrowUp') next = (index - 1 + links.length) % links.length; // Verifica event.key igual, inclusive no tipo, a o texto “ArrowUp”; se verdadeiro, executa a atribuição de index menos 1 mais links.length módulo links.length a next.
    if (event.key === 'Home') next = 0; // Verifica event.key igual, inclusive no tipo, a o texto “Home”; se verdadeiro, executa a atribuição de 0 a next.
    if (event.key === 'End') next = links.length - 1; // Verifica event.key igual, inclusive no tipo, a o texto “End”; se verdadeiro, executa a atribuição de links.length menos 1 a next.
    if (next !== undefined) { event.preventDefault(); links[next]?.focus(); } // Verifica next diferente, inclusive no tipo, de undefined; se verdadeiro, executa o cancelamento da ação padrão do evento. Executa o resultado de links[next].focus com acesso opcional.
  }; // Encerra o bloco atual.
  const follow = event => { if (event.target.closest('a')) close(); }; // Define follow como uma função que recebe event.
  trigger.addEventListener('click', toggle); // Executa a chamada que produz o registro do evento o texto “click” em trigger.
  trigger.addEventListener('keydown', triggerKey); // Executa a chamada que produz o registro do evento o texto “keydown” em trigger.
  menu.addEventListener('keydown', menuKey); // Executa a chamada que produz o registro do evento o texto “keydown” em menu.
  menu.addEventListener('click', follow); // Executa a chamada que produz o registro do evento o texto “click” em menu.
  root.addEventListener('focusout', leave); // Executa a chamada que produz o registro do evento o texto “focusout” em root.
  owner.addEventListener('click', outside); // Executa a chamada que produz o registro do evento o texto “click” em owner.
  owner.addEventListener('keydown', escape); // Executa a chamada que produz o registro do evento o texto “keydown” em owner.
  close(); // Executa a chamada que produz o resultado de close.

  return { // Retorna um objeto com open, isOpen, destroy.
    open, isOpen: () => !menu.hidden, // Inclui a propriedade open com o valor da variável de mesmo nome.
    destroy() { // Define a propriedade destroy como uma função que recebe nenhum argumento.
      trigger.removeEventListener('click', toggle); // Executa a chamada que produz a remoção do observador do evento o texto “click”.
      trigger.removeEventListener('keydown', triggerKey); // Executa a chamada que produz a remoção do observador do evento o texto “keydown”.
      menu.removeEventListener('keydown', menuKey); // Executa a chamada que produz a remoção do observador do evento o texto “keydown”.
      menu.removeEventListener('click', follow); // Executa a chamada que produz a remoção do observador do evento o texto “click”.
      root.removeEventListener('focusout', leave); // Executa a chamada que produz a remoção do observador do evento o texto “focusout”.
      owner.removeEventListener('click', outside); // Executa a chamada que produz a remoção do observador do evento o texto “click”.
      owner.removeEventListener('keydown', escape); // Executa a chamada que produz a remoção do observador do evento o texto “keydown”.
    } // Encerra o bloco atual.
  }; // Encerra o objeto.
} // Encerra o bloco da função initAccountMenu.
