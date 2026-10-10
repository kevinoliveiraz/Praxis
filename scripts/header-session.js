import { supabase, escapeHtml } from './supabaseClient.js';
import { initAccountMenu } from './account-menu.js';

const text = value => String(value || '').trim();

export function userIdentity(user, profile = null) {
  const metadata = user.user_metadata || {};
  const email = text(user.email);
  const name = text(profile?.nome_usuario) || text(metadata.nome_usuario) ||
    text(profile?.nome_completo) || text(metadata.full_name) || text(metadata.name) || email || 'Usuário';
  const candidate = metadata.praxis_avatar_mode === 'initials' ? '' :
    text(profile?.avatar_url) || text(metadata.avatar_url) || text(metadata.picture);
  let avatarUrl = '';
  try {
    const url = new URL(candidate);
    if (url.protocol === 'https:' && !url.username && !url.password) avatarUrl = url.href;
  } catch { /* Uma foto inválida usa as iniciais. */ }
  return { name, email, avatarUrl };
}

export function userMarkup(user, profile = null) {
  const { name, email, avatarUrl } = userIdentity(user, profile);
  const avatar = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="Foto do usuário" class="user-avatar" referrerpolicy="no-referrer">`
    : `<div class="user-avatar-placeholder" aria-label="Avatar do usuário">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;

  return `<div class="user-info user-account">
    <button type="button" class="account-toggle" data-account-toggle aria-expanded="false" aria-controls="account-menu" aria-label="Menu da conta de ${escapeHtml(name)}">
      ${avatar}
      <span class="user-email" title="${escapeHtml(email || name)}">${escapeHtml(name)}</span>
      <svg class="account-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <nav id="account-menu" class="account-menu" data-account-menu aria-label="Menu da conta" hidden>
      <div class="account-menu__identity"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(email)}</span></div>
      <a class="account-menu__item" href="perfil.html"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>Meu perfil</a>
      <a class="account-menu__item" href="perfil.html#aparencia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>Aparência</a>
      <a class="account-menu__item" href="perfil.html#seguranca"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Segurança</a>
      <a class="account-menu__item" href="perfil.html#sessoes"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>Sessões da conta</a>
      <div class="account-menu__separator"></div>
      <button type="button" id="logout-btn" class="account-menu__item" aria-label="Sair da conta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m-7 5h12"/></svg>Sair</button>
    </nav>
  </div>`;
}

async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('user_id,nome_usuario,nome_completo,email,avatar_url').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Erro ao carregar perfil do usuário:', error);
    return null;
  }
}

async function logout(event) {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Saindo...';
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Erro ao sair:', error);
    button.disabled = false;
    button.textContent = 'Sair';
    alert('Não foi possível sair da conta. Tente novamente.');
  }
}

export async function initHeaderSession(header) {
  const userArea = header.querySelector('#user-area');
  if (!userArea) return;
  const guestMarkup = userArea.innerHTML;
  let revision = 0;
  let menu = { destroy() {}, isOpen: () => false, open() {} };

  function renderUser(user, profile) {
    const wasOpen = menu.isOpen();
    menu.destroy();
    userArea.innerHTML = userMarkup(user, profile);
    userArea.querySelector('#logout-btn')?.addEventListener('click', logout);
    menu = initAccountMenu(userArea);
    if (wasOpen) menu.open();
  }

  async function update(user, version) {
    if (version !== revision) return;
    if (!user) {
      menu.destroy();
      userArea.innerHTML = guestMarkup;
      return;
    }
    renderUser(user);
    const profile = await getUserProfile(user.id);
    // Uma consulta antiga não pode recolocar o usuário após sair ou trocar de conta.
    if (version === revision) renderUser(user, profile);
  }

  const initialRevision = revision;
  supabase.auth.onAuthStateChange((_event, session) => {
    const version = ++revision;
    // Consultas ficam fora do callback do Supabase para liberar o bloqueio de autenticação.
    window.setTimeout(() => { void update(session?.user, version); }, 0);
  });

  // A edição de perfil atualiza o cabeçalho depois de persistir os dados da conta.
  window.addEventListener('praxis:profile-updated', event => {
    if (event.detail?.user && event.detail?.profile) {
      ++revision;
      renderUser(event.detail.user, event.detail.profile);
    }
  });

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    await update(session?.user, initialRevision);
  } catch (error) {
    console.error('Erro ao verificar a sessão:', error);
    if (initialRevision === revision) userArea.innerHTML = guestMarkup;
  }
}
