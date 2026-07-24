/**
 * ===========================================================================
 * login.js — TODA a página login.html é montada por este arquivo.
 * O HTML só tem uma div vazia (#app); aqui a gente cria o fundo, a logo
 * e o formulário. A autenticação com o Supabase entra na próxima etapa.
 * ===========================================================================
 */

const ICONES_LOGIN = {
  usuario: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z"/></svg>`,
  senha: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1Zm2 0h8V8a4 4 0 1 0-8 0v2Zm4 5a1.5 1.5 0 0 0-.75 2.8V19h1.5v-1.2A1.5 1.5 0 0 0 12 15Z"/></svg>`,
  google: `<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.25v3.11A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.25a12 12 0 0 0 0 10.76l4.02-3.11Z"/><path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.25 6.62l4.02 3.11C6.22 6.87 8.87 4.75 12 4.75Z"/></svg>`,
};

document.addEventListener("DOMContentLoaded", () => {
  renderizarLogin();
  configurarFormulario();
});

function renderizarLogin() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="login-bg">
      <img src="assets/vector1.png" alt="" class="login-vector1" />
    </div>

    <div class="login-card">
      <div class="login-logo">
        <img src="assets/logo.png" alt="Logo SkillUp" />
      </div>

      <div id="loginMessage" class="login-message" hidden></div>

      <form id="formLogin" novalidate>
        <div class="login-field">
          <label for="loginUsuario">Username</label>
          <div class="login-field-row">
            ${ICONES_LOGIN.usuario}
            <input type="text" id="loginUsuario" autocomplete="username" required />
          </div>
        </div>

        <div class="login-field">
          <label for="loginSenha">Password</label>
          <div class="login-field-row">
            ${ICONES_LOGIN.senha}
            <input type="password" id="loginSenha" autocomplete="current-password" required />
          </div>
        </div>

        <div class="login-forgot">
          <a href="#" id="linkEsqueciSenha">Forgot Password?</a>
        </div>

        <button type="submit" class="login-submit" id="loginSubmit">LOGIN</button>
      </form>

      <button type="button" class="login-google" id="loginGoogle" aria-label="Entrar com Google">
        ${ICONES_LOGIN.google}
      </button>
    </div>
  `;
}

/** Liga os eventos do formulário. Por enquanto só cuida do visual;
 *  a autenticação real com o Supabase entra na próxima etapa. */
function configurarFormulario() {
  const form = document.getElementById("formLogin");

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    // TODO: próxima etapa -> chamar o Supabase aqui (signInWithPassword)
    console.log("Login enviado (autenticação ainda não conectada).");
  });

  document.getElementById("linkEsqueciSenha").addEventListener("click", (evento) => {
    evento.preventDefault();
    // TODO: próxima etapa -> fluxo de recuperação de senha
    console.log("Fluxo de 'esqueci senha' ainda não implementado.");
  });

  document.getElementById("loginGoogle").addEventListener("click", () => {
    // TODO: próxima etapa -> supabase.auth.signInWithOAuth({ provider: 'google' })
    console.log("Login com Google ainda não implementado.");
  });
}
