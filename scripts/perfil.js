import { supabase } from './supabaseClient.js';
import { userIdentity } from './header-session.js';

const $ = id => document.getElementById(id);
const columns = 'user_id,nome_usuario,nome_completo,email,avatar_url';
let currentUser = null, profile = null, saving = false, loading = false;
let sessionEnded = false;

function message(id, text, kind = 'error') {
  $(id).textContent = text;
  $(id).dataset.kind = kind;
}
function errorMessage(error) {
  if (error?.code === '23505') return 'Esse nome de usuário já está em uso. Escolha outro.';
  if (error?.code === '42501') return 'Não foi possível salvar seu perfil. Tente sair e entrar novamente.';
  if (error?.status === 429 || /rate limit|too many/i.test(error?.message || '')) return 'Aguarde um pouco antes de tentar novamente.';
  return 'Não foi possível concluir. Verifique sua conexão e tente novamente.';
}
function avatar(target, user, row) {
  const { name, avatarUrl } = userIdentity(user, row);
  target.replaceChildren();
  if (!avatarUrl) { target.textContent = name.charAt(0).toUpperCase(); return; }
  const image = document.createElement('img');
  image.src = avatarUrl;
  image.alt = '';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => { target.textContent = name.charAt(0).toUpperCase(); });
  target.append(image);
}
function renderAccount() {
  const identity = userIdentity(currentUser, profile);
  $('sidebar-name').textContent = identity.name;
  $('sidebar-email').textContent = identity.email;
  avatar($('sidebar-avatar'), currentUser, profile);
  avatar($('profile-photo'), currentUser, profile);
  $('profile-fullname').value = profile?.nome_completo || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
  $('profile-username').value = profile?.nome_usuario || currentUser.user_metadata?.nome_usuario || '';
  $('profile-avatar-url').value = identity.avatarUrl;
  $('profile-email').value = currentUser.email || '';
  const labels = { google: 'Google', email: 'E-mail e senha' };
  const providers = currentUser.app_metadata?.providers || [currentUser.app_metadata?.provider || 'email'];
  $('profile-provider').textContent = providers.map(provider => labels[provider] || provider).join(' · ');
  $('profile-email-status').textContent = currentUser.email_confirmed_at ? 'E-mail confirmado' : 'E-mail pendente';
}

export function validateDetails({ fullname, username, avatarUrl }) {
  if (fullname.length < 2 || fullname.length > 80) return ['profile-fullname', 'Use um nome entre 2 e 80 caracteres.'];
  if (!/^[A-Za-z0-9._]{3,30}$/.test(username)) return ['profile-username', 'Use de 3 a 30 caracteres: letras, números, ponto ou underline.'];
  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl);
      if (url.protocol !== 'https:' || url.username || url.password || avatarUrl.length > 1000) throw new Error('Foto inválida');
    } catch { return ['profile-avatar-url', 'Use um link HTTPS válido para a foto.']; }
  }
  return null;
}

export async function saveDetails(event) {
  event?.preventDefault();
  if (saving || !currentUser) return;
  const values = {
    fullname: $('profile-fullname').value.trim(),
    username: $('profile-username').value.trim(),
    avatarUrl: $('profile-avatar-url').value.trim()
  };
  const invalid = validateDetails(values);
  if (invalid) {
    $(invalid[0]).setAttribute('aria-invalid', 'true');
    $(invalid[0]).focus();
    message('profile-message', invalid[1]);
    return;
  }
  saving = true;
  $('profile-fields').disabled = true;
  $('profile-save').textContent = 'Salvando…';
  message('profile-message', '');
  const userId = currentUser.id;
  try {
    if (values.username.toLowerCase() !== (profile?.nome_usuario || '').toLowerCase()) {
      // O underline é literal no nome, não um curinga do filtro ILIKE.
      const { data, error } = await supabase.from('usuarios').select('user_id,nome_usuario')
        .ilike('nome_usuario', values.username.replace(/_/g, '\\_'));
      if (error) throw error;
      if (data?.some(row => row.user_id !== userId)) throw { code: '23505' };
    }
    if (currentUser?.id !== userId) return;
    const payload = { nome_completo: values.fullname, nome_usuario: values.username, avatar_url: values.avatarUrl || null };
    const query = profile
      ? supabase.from('usuarios').update(payload).eq('user_id', userId)
      : supabase.from('usuarios').insert({ ...payload, user_id: userId, email: currentUser.email });
    const { data: saved, error } = await query.select(columns).single();
    if (error) throw error;
    if (!saved || currentUser?.id !== userId) return;
    profile = saved;
    const metadata = { nome_usuario: values.username, full_name: values.fullname, name: values.fullname,
      avatar_url: values.avatarUrl || null, praxis_avatar_mode: values.avatarUrl ? 'photo' : 'initials' };
    const { data: authData, error: authError } = await supabase.auth.updateUser({ data: metadata });
    if (currentUser?.id !== userId) return;
    currentUser = authData?.user || { ...currentUser, user_metadata: { ...currentUser.user_metadata, ...metadata } };
    renderAccount();
    window.dispatchEvent(new CustomEvent('praxis:profile-updated', { detail: { user: currentUser, profile } }));
    message('profile-message', authError
      ? 'Dados salvos no perfil. A sincronização com o login falhou; tente salvar novamente.'
      : 'Suas alterações foram salvas.', authError ? 'warning' : 'success');
  } catch (error) {
    message('profile-message', errorMessage(error));
  } finally {
    saving = false;
    $('profile-fields').disabled = !currentUser;
    $('profile-save').textContent = 'Salvar alterações';
  }
}

async function action(buttonId, messageId, label, perform, success) {
  const button = $(buttonId);
  if (!currentUser || button.disabled) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  message(messageId, '');
  try {
    const { error } = await perform();
    if (error) throw error;
    message(messageId, success, 'success');
  } catch (error) {
    message(messageId, errorMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

export async function sendPasswordLink() {
  if (!currentUser?.email) return;
  await action('profile-reset-password', 'security-message', 'Enviando…', () =>
    supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: new URL('login.html?modo=redefinir', window.location.href).href
    }), 'Link solicitado. Confira seu e-mail e a pasta de spam para alterar sua senha.');
}
export async function signOutOthers() {
  await action('profile-signout-others', 'sessions-message', 'Encerrando…', () =>
    supabase.auth.signOut({ scope: 'others' }), 'A renovação do acesso das outras sessões foi encerrada. Este navegador continua conectado.');
}
export async function signOutHere() {
  await action('profile-signout', 'sessions-message', 'Saindo…', async () => {
    const result = await supabase.auth.signOut({ scope: 'local' });
    if (!result.error) window.location.replace('login.html');
    return result;
  }, 'Sessão encerrada.');
}

function syncTheme() {
  const preference = window.PraxisTheme?.getPreference() || 'system';
  document.querySelectorAll('input[name="profile-theme"]').forEach(input => { input.checked = input.value === preference; });
}
function syncNavigation() {
  const hash = window.location.hash || '#dados';
  document.querySelectorAll('.profile-nav a').forEach(link => {
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

export async function loadAccount() {
  if (loading) return;
  loading = true;
  $('profile-retry').hidden = true;
  $('profile-content').hidden = true;
  $('profile-loading').hidden = false;
  $('profile-loading').textContent = 'Carregando sua conta…';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!data?.user && (!error || error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403)) {
      window.location.replace('login.html');
      return;
    }
    if (error) throw error;
    const user = data.user;
    const { data: row, error: profileError } = await supabase.from('usuarios')
      .select(columns).eq('user_id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (sessionEnded) return;
    currentUser = user;
    profile = row;
    renderAccount();
    $('profile-fields').disabled = false;
    $('profile-loading').hidden = true;
    $('profile-content').hidden = false;
    syncTheme();
    syncNavigation();
    const section = ['#dados', '#seguranca', '#aparencia', '#sessoes'].includes(window.location.hash) ? window.location.hash.slice(1) : '';
    if (section) $(section).scrollIntoView({ block: 'start' });
  } catch (error) {
    $('profile-loading').textContent = 'Não foi possível carregar sua conta. Tente novamente.';
    $('profile-retry').hidden = false;
  } finally { loading = false; }
}

$('account-details-form').addEventListener('submit', saveDetails);
$('profile-reset-password').addEventListener('click', sendPasswordLink);
$('profile-signout-others').addEventListener('click', signOutOthers);
$('profile-signout').addEventListener('click', signOutHere);
$('profile-retry').addEventListener('click', loadAccount);
$('profile-use-initials').addEventListener('click', () => {
  $('profile-avatar-url').value = '';
  message('profile-message', 'Clique em Salvar alterações para usar suas iniciais.', 'info');
  if (currentUser) avatar($('profile-photo'), { ...currentUser,
    user_metadata: { ...currentUser.user_metadata, praxis_avatar_mode: 'initials' } }, profile);
});
document.querySelectorAll('#account-details-form input').forEach(input => input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  message('profile-message', '');
}));
document.querySelectorAll('input[name="profile-theme"]').forEach(input => input.addEventListener('change', () => {
  if (!input.checked) return;
  window.PraxisTheme?.setPreference(input.value);
  message('appearance-message', 'Tema atualizado neste navegador.', 'success');
}));
window.addEventListener('praxis:theme-changed', syncTheme);
window.addEventListener('hashchange', syncNavigation);
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    sessionEnded = true;
    currentUser = null;
    $('profile-fields').disabled = true;
    $('profile-content').hidden = true;
    window.location.replace('login.html');
  } else if (currentUser && session?.user) {
    if (session.user.id !== currentUser.id) {
      sessionEnded = true;
      currentUser = null;
      $('profile-content').hidden = true;
      window.location.reload();
    } else currentUser = session.user;
  }
});
void loadAccount();
