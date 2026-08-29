import { supabase, upsertUserProfile } from './supabaseClient.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const msg = document.getElementById('login-msg');
const submitBtn = document.getElementById('login-submit');
const googleBtn = document.getElementById('google-btn');

// Flag para evitar múltiplos redirecionamentos simultâneos
let isRedirecting = false;

function showMsg(text, type = 'error') {
  msg.textContent = text;
  msg.className = 'login-msg ' + type;
}

/**
 * Centraliza o redirecionamento pós-autenticação para evitar chamadas duplas
 */
async function handleUserRedirect(user) {
  if (isRedirecting) return;
  isRedirecting = true;

  try {
    await upsertUserProfile(user);

    // Caminho relativo:
    // localhost -> /index.html
    // GitHub Pages -> /skill-up/index.html
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Erro ao sincronizar perfil ou redirecionar:', err);
    showMsg('Erro ao preparar sua conta. Tente novamente.');
    isRedirecting = false;
  }
}

/**
 * Controla o estado de carregamento do botão de submit
 */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'ENTRANDO...' : 'LOGIN';
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

/**
 * Traduz erros do Supabase Auth para mensagens amigáveis em português
 */
function translateAuthError(error) {
  if (!error) return 'Erro inesperado.';

  const message = error.message?.toLowerCase() || '';

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (message.includes('user not found')) {
    return 'Usuário não encontrado.';
  }

  if (
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return 'Falha ao conectar ao servidor. Verifique sua conexão.';
  }

  return 'Erro ao realizar login. Tente novamente mais tarde.';
}

/**
 * Verifica se já existe uma sessão ativa
 */
async function redirectIfSigned() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await handleUserRedirect(data.session.user);
    }
  } catch (err) {
    console.error('Erro ao verificar sessão existente:', err);
  }
}

/**
 * LOGIN COM E-MAIL E SENHA
 */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    showMsg('Preencha e-mail e senha.');
    return;
  }

  if (!validateEmail(email)) {
    showMsg('Digite um e-mail válido.');
    return;
  }

  if (!validatePassword(password)) {
    showMsg('A senha deve possuir pelo menos 6 caracteres.');
    return;
  }

  setLoading(true);

  console.log('=== INICIANDO LOGIN ===');
  console.log('Email:', email);
  console.log('Senha possui', password.length, 'caracteres');

  try {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    console.log('=== RESPOSTA DO SUPABASE ===');
    console.log('Data:', data);
    console.log('Error:', error);

    if (error) {
      console.error('Mensagem:', error.message);
      console.error('Status:', error.status);
      console.error('Código:', error.code);

      console.error(
        'Erro no login por e-mail/senha:',
        error
      );

      showMsg(translateAuthError(error));
      setLoading(false);
      return;
    }

    showMsg(
      'Login realizado com sucesso!',
      'success'
    );

    console.log(
      'Usuário autenticado com sucesso:',
      data.user
    );

    await handleUserRedirect(data.user);

  } catch (err) {
    console.error(
      'Erro inesperado durante o login:',
      err
    );

    showMsg(
      'Erro inesperado ao realizar login.'
    );

    setLoading(false);
  }
});

/**
 * LOGIN COM GOOGLE
 *
 * Detecta automaticamente onde o site está rodando.
 *
 * LOCAL:
 * http://127.0.0.1:5500/login.html
 *
 * GITHUB PAGES:
 * https://kevinoliveiraz.github.io/skill-up/login.html
 */
googleBtn.addEventListener('click', async () => {
  try {
    // Evita vários cliques
    googleBtn.disabled = true;

    const isLocal =
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost';

    let redirectUrl;

    if (isLocal) {
      // Live Server / desenvolvimento
      redirectUrl =
        `${window.location.origin}/login.html`;
    } else {
      // GitHub Pages / produção
      redirectUrl =
        'https://kevinoliveiraz.github.io/Praxis/login.html';
    }

    console.log(
      'Redirecionamento OAuth:',
      redirectUrl
    );

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: 'google',

        options: {
          redirectTo: redirectUrl,
        },
      });

    if (error) {
      console.error(
        'Erro no login com Google:',
        error
      );

      showMsg(
        translateAuthError(error)
      );

      googleBtn.disabled = false;
    }

  } catch (err) {
    console.error(
      'Erro inesperado no login via Google:',
      err
    );

    showMsg(
      'Falha ao conectar com o serviço do Google.'
    );

    googleBtn.disabled = false;
  }
});

/**
 * Observa mudanças na autenticação
 */
supabase.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      'Evento Auth:',
      event
    );

    console.log(
      'Sessão:',
      session
    );

    if (
      event === 'SIGNED_IN' &&
      session?.user
    ) {
      await handleUserRedirect(
        session.user
      );
    }
  }
);

/**
 * Estrutura reservada para implementação futura de cadastro
 */
async function register() {
  // A ser implementado posteriormente
}

/**
 * Execução inicial
 */
redirectIfSigned();
