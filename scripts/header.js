/* Monta o mesmo cabeçalho antes do DOMContentLoaded, quando o tema vincula o botão. */
(() => { // Inicia uma função executada imediatamente para isolar as variáveis deste script.
  const header = document.querySelector('[data-site-header]'); // Define header como o primeiro elemento que corresponde ao seletor o texto “[data-site-header]”.
  if (!header) return; // Verifica a negação de header; se verdadeiro, encerra a função sem retornar um valor.

  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Define subscription como um texto montado com 0 valores dinâmicos se header.dataset.subscription igual, inclusive no tipo, a o texto “true”; caso contrário, o texto “”.
   * Linha 2 do trecho: Insere um link com as classes “btn btn-primary btn-subscribe”.
   * Linha 3 do trecho: Insere um ícone ou desenho vetorial.
   * Linha 4 do trecho: Insere um polígono vetorial.
   * Linha 5 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 6 do trecho: Insere um trecho de texto em linha com as classes “subscribe-text” com o texto “Assine agora”.
   * Linha 7 do trecho: Encerra um link.
   */
  const subscription = header.dataset.subscription === 'true' ? `
    <a href="assine-agora.html" class="btn btn-primary btn-subscribe" aria-label="Assine agora">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <span class="subscribe-text">Assine agora</span>
    </a>` : '';

  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza header.innerHTML com um texto montado com 1 valor dinâmico.
   * Linha 2 do trecho: Insere um contêiner de layout com as classes “site-header__inner”.
   * Linha 3 do trecho: Insere um link com as classes “logo”.
   * Linha 4 do trecho: Insere uma imagem com as classes “logo-image”.
   * Linha 5 do trecho: Encerra um link.
   * Linha 6 do trecho: Insere um formulário identificado por “header-search”.
   * Linha 7 do trecho: Insere um botão identificado por “search-btn”.
   * Linha 8 do trecho: Insere um ícone ou desenho vetorial.
   * Linha 9 do trecho: Insere um círculo vetorial.
   * Linha 10 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 11 do trecho: Encerra um botão.
   * Linha 12 do trecho: Insere um campo de entrada identificado por “search-input”.
   * Linha 13 do trecho: Encerra um formulário.
   * Linha 14 do trecho: Insere um contêiner de layout com as classes “header-actions”.
   * Linha 15 do trecho: Insere um botão com as classes “theme-toggle”.
   * Linha 16 do trecho: Insere um ícone ou desenho vetorial com as classes “theme-icon-light”.
   * Linha 17 do trecho: Insere um ícone ou desenho vetorial com as classes “theme-icon-dark”.
   * Linha 18 do trecho: Insere um trecho de texto em linha com as classes “theme-toggle__label” com o texto “Modo claro”.
   * Linha 19 do trecho: Encerra um botão.
   * Linha 20 do trecho: Insere um contêiner de layout identificado por “user-area”.
   * Linha 21 do trecho: Insere um link com as classes “btn btn-ghost”.
   * Linha 22 do trecho: Insere um ícone ou desenho vetorial.
   * Linha 23 do trecho: Insere um traçado vetorial.
   * Linha 24 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 25 do trecho: Insere um trecho de texto em linha com o texto “Entrar”.
   * Linha 26 do trecho: Encerra um link.
   * Linha 27 do trecho: Encerra um contêiner de layout.
   * Linha 28 do trecho: Insere no texto o valor calculado por ${subscription}.
   * Linha 29 do trecho: Encerra um contêiner de layout.
   * Linha 30 do trecho: Encerra um contêiner de layout.
   */
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
  import('./header-session.js') // Carrega dinamicamente o módulo o texto “./header-session.js”.
    .then(({ initHeaderSession }) => initHeaderSession(header)) // Executa a chamada que produz o tratamento do resultado de importação dinâmica quando concluído.
    .catch(error => console.error('Erro ao iniciar a sessão do cabeçalho:', error)); // Executa a chamada que produz o tratamento de falhas de importação dinâmica.then(…).
})(); // Encerra a função e sua execução imediata.
