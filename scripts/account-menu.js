/* Disclosure com links nativos: clique, teclado, Escape e fechamento fora da conta. */
export function initAccountMenu(root) {
  const trigger = root.querySelector('[data-account-toggle]');
  const menu = root.querySelector('[data-account-menu]');
  const idle = { destroy() {}, isOpen: () => false, open() {} };
  if (!trigger || !menu) return idle;
  const owner = root.ownerDocument || document;
  const items = () => [...menu.querySelectorAll('a, button:not(:disabled)')];

  function close(focus = false) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
  }
  function open(focus = false) {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (focus) items()[0]?.focus();
  }
  const toggle = () => menu.hidden ? open() : close();
  const outside = event => { if (!root.contains(event.target)) close(); };
  const escape = event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      close(true);
    }
  };
  const leave = event => { if (event.relatedTarget && !root.contains(event.relatedTarget)) close(); };
  const triggerKey = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); open(true); }
  };
  const menuKey = event => {
    const links = items(), index = links.indexOf(owner.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % links.length;
    if (event.key === 'ArrowUp') next = (index - 1 + links.length) % links.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = links.length - 1;
    if (next !== undefined) { event.preventDefault(); links[next]?.focus(); }
  };
  const follow = event => { if (event.target.closest('a')) close(); };
  trigger.addEventListener('click', toggle);
  trigger.addEventListener('keydown', triggerKey);
  menu.addEventListener('keydown', menuKey);
  menu.addEventListener('click', follow);
  root.addEventListener('focusout', leave);
  owner.addEventListener('click', outside);
  owner.addEventListener('keydown', escape);
  close();

  return {
    open, isOpen: () => !menu.hidden,
    destroy() {
      trigger.removeEventListener('click', toggle);
      trigger.removeEventListener('keydown', triggerKey);
      menu.removeEventListener('keydown', menuKey);
      menu.removeEventListener('click', follow);
      root.removeEventListener('focusout', leave);
      owner.removeEventListener('click', outside);
      owner.removeEventListener('keydown', escape);
    }
  };
}
