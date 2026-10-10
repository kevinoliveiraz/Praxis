/* Carregado no head, antes do CSS, para aplicar a preferência sem piscar. */
(() => {
  const key = 'praxis-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  let preference = null;

  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* O tema funciona mesmo quando o armazenamento está bloqueado. */ }

  function apply(theme) {
    root.dataset.theme = theme;
    root.dataset.themePreference = preference || 'system';
    const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-label', label);
      button.title = label;
      const text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? '#06070c' : '#fbfafb'
    );
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('praxis:theme-changed', { detail: { theme, preference: preference || 'system' } }));
    }
  }

  const systemTheme = () => system.matches ? 'dark' : 'light';
  window.PraxisTheme = {
    getPreference: () => preference || 'system',
    setPreference(value) {
      if (!valid(value) && value !== 'system') return;
      preference = valid(value) ? value : null;
      try {
        if (preference) localStorage.setItem(key, preference);
        else localStorage.removeItem(key);
      } catch { /* Preferência em memória. */ }
      apply(preference || systemTheme());
    }
  };
  apply(preference || systemTheme());

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        window.PraxisTheme.setPreference(root.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
  });

  system.addEventListener('change', () => {
    if (!preference) apply(systemTheme());
  });

  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    apply(preference || systemTheme());
  });
})();
