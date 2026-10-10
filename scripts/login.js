import { supabase, upsertUserProfile } from './supabaseClient.js';

const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const confirm = document.getElementById('confirm-password');
const message = document.getElementById('login-msg');
const submit = document.getElementById('login-submit');
const google = document.getElementById('google-btn');
const params = new URLSearchParams(window.location.search);
const hash = new URLSearchParams(window.location.hash.slice(1));
let mode = params.get('modo') === 'recuperar' ? 'recover'
  : params.get('modo') === 'redefinir' || hash.get('type') === 'recovery' ? 'reset' : 'login';
let busy = false;
let redirecting = false;

function showMessage(text, type = 'error') {
  message.textContent = text;
  message.className = `login-msg ${type}`;
}

function setMode(nextMode) {
  mode = nextMode;
  const recovering = mode !== 'login';
  const resetting = mode === 'reset';
  document.body.classList.toggle('is-recovery', recovering);
  document.body.dataset.authMode = mode;
  document.getElementById('auth-title').textContent = resetting ? 'Crie sua nova senha'
    : recovering ? 'Recupere sua conta' : 'Entre na sua conta';
  document.getElementById('auth-subtitle').textContent = resetting ? 'Escolha uma senha com pelo menos 6 caracteres.'
    : recovering ? 'Enviaremos um link de recuperação para seu e-mail.' : 'Seu próximo passo começa aqui.';
  document.getElementById('email-field').hidden = resetting;
  email.disabled = resetting;
  document.getElementById('password-field').hidden = mode === 'recover';
  password.disabled = mode === 'recover';
  password.autocomplete = resetting ? 'new-password' : 'current-password';
  document.querySelector('label[for="password"]').textContent = resetting ? 'Nova senha' : 'Senha';
  document.getElementById('confirm-field').hidden = !resetting;
  confirm.disabled = !resetting;
  confirm.required = resetting;
  for (const id of ['login-options', 'auth-divider', 'google-btn', 'auth-register']) {
    document.getElementById(id).hidden = recovering;
  }
  document.getElementById('auth-return').hidden = !recovering;
  document.title = resetting ? 'Nova senha — Praxis' : recovering ? 'Recuperar conta — Praxis' : 'Login — Praxis';
  setLoading(false);
}

function setLoading(loading) {
  busy = loading;
  submit.disabled = loading;
  google.disabled = loading;
  form.setAttribute('aria-busy', String(loading));
  submit.textContent = loading ? (mode === 'recover' ? 'Enviando...' : mode === 'reset' ? 'Salvando...' : 'Entrando...')
    : mode === 'recover' ? 'Enviar link de recuperação' : mode === 'reset' ? 'Salvar nova senha' : 'Entrar';
}

function authError(error) {
  const text = error?.message?.toLowerCase() || '';
  if (text.includes('invalid') && text.includes('credentials')) return 'E-mail ou senha incorretos.';
  if (text.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Aguarde um pouco antes de tentar novamente.';
  if (text.includes('same password')) return 'Escolha uma senha diferente da senha atual.';
  if (text.includes('expired') || text.includes('session missing')) return 'O link expirou. Solicite um novo link de recuperação.';
  if (text.includes('network') || text.includes('fetch')) return 'Verifique sua conexão e tente novamente.';
  return 'Não foi possível concluir. Tente novamente em alguns instantes.';
}

async function redirectUser(user) {
  if (!user || redirecting) return;
  redirecting = true;
  try {
    await upsertUserProfile(user);
    window.location.replace('index.html');
  } catch {
    redirecting = false;
    showMessage('Erro ao preparar sua conta. Tente novamente.');
    setLoading(false);
  }
}

// Chamado pela interface local; não registra um segundo listener de submit.
export async function submitLogin() {
  if (busy || redirecting) return;
  const address = email.value.trim().toLowerCase();
  if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    showMessage('Digite um e-mail válido.');
    email.focus();
    return;
  }
  if (mode !== 'recover' && password.value.length < 6) {
    showMessage('A senha deve possuir pelo menos 6 caracteres.');
    password.focus();
    return;
  }
  if (mode === 'reset' && password.value !== confirm.value) {
    showMessage('As senhas precisam ser iguais.');
    confirm.focus();
    return;
  }
  setLoading(true);
  message.className = 'login-msg';
  try {
    if (mode === 'recover') {
      // https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
      const redirectTo = new URL('login.html?modo=redefinir', window.location.href).href;
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo });
      if (error) throw error;
      showMessage('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.', 'success');
    } else {
      const { data, error } = mode === 'reset'
        ? await supabase.auth.updateUser({ password: password.value })
        : await supabase.auth.signInWithPassword({ email: address, password: password.value });
      if (error) throw error;
      if (!data?.user) throw new Error('User missing');
      showMessage(mode === 'reset' ? 'Senha atualizada. Preparando sua conta...' : 'Login realizado com sucesso!', 'success');
      await redirectUser(data.user);
    }
  } catch (error) {
    showMessage(authError(error));
  } finally {
    if (!redirecting) setLoading(false);
  }
}

export async function loginWithGoogle() {
  if (busy || redirecting) return;
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('login.html', window.location.href).href }
    });
    if (error) throw error;
  } catch (error) {
    showMessage(authError(error));
    setLoading(false);
  }
}

setMode(mode);
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') setMode('reset');
  if (event === 'SIGNED_IN' && session?.user && mode === 'login') {
    // Fora do callback para não reentrar no bloqueio interno do cliente Auth.
    setTimeout(() => redirectUser(session.user), 0);
  }
});

async function checkSession() {
  if (params.has('error') || hash.has('error')) {
    setMode('recover');
    showMessage('O link é inválido ou expirou. Solicite um novo link de recuperação.');
    return;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (mode === 'reset' && !data.session?.user) {
      setMode('recover');
      showMessage('Solicite um link de recuperação para criar sua nova senha.');
    } else if (mode === 'login' && data.session?.user) {
      await redirectUser(data.session.user);
    }
  } catch {
    showMessage('Não foi possível verificar sua sessão. Verifique sua conexão.');
  }
}
checkSession();
