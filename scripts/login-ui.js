/* Interações locais continuam disponíveis se o serviço de autenticação falhar. */
(() => {
  const email = document.getElementById('email');
  const remember = document.getElementById('remember-email');
  const form = document.getElementById('login-form');
  const message = document.getElementById('login-msg');
  const key = 'praxis-remembered-email';
  try {
    const saved = localStorage.getItem(key);
    if (saved && email && remember) { email.value = saved; remember.checked = true; }
  } catch { /* A opção é dispensável para entrar. */ }
  remember?.addEventListener('change', () => {
    if (!remember.checked) {
      try { localStorage.removeItem(key); } catch { /* Sem armazenamento. */ }
    }
  });
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    const input = document.getElementById(button.dataset.passwordToggle);
    function syncVisibility() {
      const visible = input.type === 'text';
      button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      button.setAttribute('aria-pressed', String(visible));
      // SVGs usam o atributo hidden, controlado pelo CSS compartilhado.
      button.querySelector('.password-eye').toggleAttribute('hidden', !visible);
      button.querySelector('.password-eye-off').toggleAttribute('hidden', visible);
    }
    syncVisibility();
    button.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      syncVisibility();
    });
  });
  let auth = null;
  let unavailable = false;
  const ready = import('./login.js').then(module => { auth = module; }).catch(() => {
    unavailable = true;
    message.textContent = 'Não foi possível conectar ao serviço de login. Verifique sua conexão e recarregue a página.';
    message.className = 'login-msg error';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    await ready;
    if (unavailable) return;
    if (remember && document.body.dataset.authMode === 'login') {
      try {
        if (remember.checked) localStorage.setItem(key, email.value.trim());
        else localStorage.removeItem(key);
      } catch { /* Nunca salva a senha; o login continua sem esta preferência. */ }
    }
    await auth.submitLogin();
  });
  document.getElementById('google-btn').addEventListener('click', async () => {
    await ready;
    if (!unavailable) await auth.loginWithGoogle();
  });
})();
