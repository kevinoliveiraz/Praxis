/* Monta o mesmo cabeçalho antes do DOMContentLoaded, quando o tema vincula o botão. */
(() => {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  const subscription = header.dataset.subscription === 'true' ? `
    <a href="assine-agora.html" class="btn btn-primary btn-subscribe" aria-label="Assine agora">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <span class="subscribe-text">Assine agora</span>
    </a>` : '';

  header.innerHTML = `
    <div class="site-header__inner">
      <a href="index.html" class="logo" aria-label="Ir para a página inicial da Praxis">
        <img src="assets/logo.png" alt="Praxis" class="logo-image">
      </a>
      <form id="header-search" class="header-search" role="search" action="index.html#catalog-title" method="get">
        <button id="search-btn" class="header-search__button" type="submit" aria-label="Pesquisar cursos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>
          </svg>
        </button>
        <input id="search-input" name="q" type="search" placeholder="Pesquisar cursos, temas..." aria-label="Pesquisar cursos" autocomplete="off">
      </form>
      <div class="header-actions">
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Ativar tema claro">
          <svg class="theme-icon-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>
          <svg class="theme-icon-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/></svg>
          <span class="theme-toggle__label" data-theme-label>Modo claro</span>
        </button>
        <div id="user-area">
          <a href="login.html" class="btn btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Entrar</span>
          </a>
        </div>
        ${subscription}
      </div>
    </div>`;

  // O layout e o tema não dependem do carregamento do cliente de autenticação.
  import('./header-session.js')
    .then(({ initHeaderSession }) => initHeaderSession(header))
    .catch(error => console.error('Erro ao iniciar a sessão do cabeçalho:', error));
})();
