/* Interações locais continuam disponíveis se o serviço de autenticação falhar. */
(() => { // Inicia uma função executada imediatamente para isolar as variáveis deste script.
  const email = document.getElementById('email'); // Define email como o elemento cujo ID é o texto “email”.
  const remember = document.getElementById('remember-email'); // Define remember como o elemento cujo ID é o texto “remember-email”.
  const form = document.getElementById('login-form'); // Define form como o elemento cujo ID é o texto “login-form”.
  const message = document.getElementById('login-msg'); // Define message como o elemento cujo ID é o texto “login-msg”.
  const key = 'praxis-remembered-email'; // Define key como o texto “praxis-remembered-email”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const saved = localStorage.getItem(key); // Define saved como o valor salvo na chave key.
    if (saved && email && remember) { email.value = saved; remember.checked = true; } // Verifica saved e email e remember; se verdadeiro, executa a atribuição de saved a email.value. Executa a atribuição de true (verdadeiro) a remember.checked.
  } catch { /* A opção é dispensável para entrar. */ }
  remember?.addEventListener('change', () => { // Executa a chamada que produz o registro do evento o texto “change” em remember.
    if (!remember.checked) { // Verifica a negação de remember.checked para decidir se executa este bloco.
      try { localStorage.removeItem(key); } catch { /* Sem armazenamento. */ }
    } // Encerra o bloco da condição.
  }); // Encerra o bloco atual.
  document.querySelectorAll('[data-password-toggle]').forEach(button => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
    const input = document.getElementById(button.dataset.passwordToggle); // Define input como o elemento cujo ID é button.dataset.passwordToggle.
    function syncVisibility() { // Declara a função syncVisibility com nenhum parâmetro.
      const visible = input.type === 'text'; // Define visible como input.type igual, inclusive no tipo, a o texto “text”.
      button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha'); // Executa a chamada que produz a definição do atributo o texto “aria-label” em button.
      button.setAttribute('aria-pressed', String(visible)); // Executa a chamada que produz a definição do atributo o texto “aria-pressed” em button.
      // SVGs usam o atributo hidden, controlado pelo CSS compartilhado.
      button.querySelector('.password-eye').toggleAttribute('hidden', !visible); // Executa a chamada que produz o resultado de button.querySelector(…).toggleAttribute com o texto “hidden” e a negação de visible.
      button.querySelector('.password-eye-off').toggleAttribute('hidden', visible); // Executa a chamada que produz o resultado de button.querySelector(…).toggleAttribute com o texto “hidden” e visible.
    } // Encerra o bloco da função syncVisibility.
    syncVisibility(); // Executa a chamada que produz o resultado de syncVisibility.
    button.addEventListener('click', () => { // Executa a chamada que produz o registro do evento o texto “click” em button.
      input.type = input.type === 'password' ? 'text' : 'password'; // Atualiza input.type com o texto “text” se input.type igual, inclusive no tipo, a o texto “password”; caso contrário, o texto “password”.
      syncVisibility(); // Executa a chamada que produz o resultado de syncVisibility.
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.
  let auth = null; // Define auth como null (ausência de valor).
  let unavailable = false; // Define unavailable como false (falso).
  const ready = import('./login.js').then(module => { auth = module; }).catch(() => { // Define ready como o tratamento de falhas de importação dinâmica.then(…).
    unavailable = true; // Atualiza unavailable com true (verdadeiro).
    message.textContent = 'Não foi possível conectar ao serviço de login. Verifique sua conexão e recarregue a página.'; // Atualiza message.textContent com o texto “Não foi possível conectar ao serviço de login. Verifique sua conexão e recarreg…”.
    message.className = 'login-msg error'; // Atualiza message.className com o texto “login-msg error”.
  }); // Encerra o bloco atual.
  form.addEventListener('submit', async event => { // Executa a chamada que produz o registro do evento o texto “submit” em form.
    event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.
    if (!form.reportValidity()) return; // Verifica a negação de o resultado de form.reportValidity; se verdadeiro, encerra a função sem retornar um valor.
    await ready; // Aguarda ready antes de continuar.
    if (unavailable) return; // Verifica unavailable; se verdadeiro, encerra a função sem retornar um valor.
    if (remember && document.body.dataset.authMode === 'login') { // Verifica remember e document.body.dataset.authMode igual, inclusive no tipo, a o texto “login” para decidir se executa este bloco.
      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
        if (remember.checked) localStorage.setItem(key, email.value.trim()); // Verifica remember.checked; se verdadeiro, executa a gravação local da chave key.
        else localStorage.removeItem(key); // Executa a chamada que produz a remoção local da chave key.
      } catch { /* Nunca salva a senha; o login continua sem esta preferência. */ }
    } // Encerra o bloco da condição.
    await auth.submitLogin(); // Aguarda o resultado de auth.submitLogin antes de continuar.
  }); // Encerra o bloco atual.
  document.getElementById('google-btn').addEventListener('click', async () => { // Executa a chamada que produz o registro do evento o texto “click” em document.getElementById(…).
    await ready; // Aguarda ready antes de continuar.
    if (!unavailable) await auth.loginWithGoogle(); // Verifica a negação de unavailable; se verdadeiro, executa o resultado aguardado de o resultado de auth.loginWithGoogle.
  }); // Encerra o bloco atual.
})(); // Encerra a função e sua execução imediata.
