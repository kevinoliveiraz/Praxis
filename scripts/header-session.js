import { supabase, escapeHtml } from './supabaseClient.js'; // Importa supabase, escapeHtml do módulo ./supabaseClient.js.
import { initAccountMenu } from './account-menu.js'; // Importa initAccountMenu do módulo ./account-menu.js.

const text = value => String(value || '').trim(); // Define text como uma função que recebe value.

export function userIdentity(user, profile = null) { // Exporta para os outros módulos: Declara a função userIdentity com user, profile.
  const metadata = user.user_metadata || {}; // Define metadata como user.user_metadata ou, se indisponível, um objeto vazio.
  const email = text(user.email); // Define email como o resultado de text com user.email.
  const name = text(profile?.nome_usuario) || text(metadata.nome_usuario) || // Define name como expressão ou, se indisponível, text(…) ou, se indisponível, o resultado de text com metadata.name ou, se indisponível, email ou, se indisponível, o texto “Usuário”.
    text(profile?.nome_completo) || text(metadata.full_name) || text(metadata.name) || email || 'Usuário'; // Executa a chamada que produz o resultado de text com profile.nome_completo com acesso opcional.
  const candidate = metadata.praxis_avatar_mode === 'initials' ? '' : // Define candidate como o texto “” se metadata.praxis_avatar_mode igual, inclusive no tipo, a o texto “initials”; caso contrário, o resultado de text com profile.avatar_url ou, se indisponível, o resultado de text com metadata.avatar_url ou, se indisponível, o resultado de text com metadata.picture.
    text(profile?.avatar_url) || text(metadata.avatar_url) || text(metadata.picture); // Executa a chamada que produz o resultado de text com profile.avatar_url com acesso opcional.
  let avatarUrl = ''; // Define avatarUrl como o texto “”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const url = new URL(candidate); // Define url como uma instância de URL com candidate.
    if (url.protocol === 'https:' && !url.username && !url.password) avatarUrl = url.href; // Verifica url.protocol igual, inclusive no tipo, a o texto “https:” e a negação de url.username e a negação de url.password; se verdadeiro, executa a atribuição de url.href a avatarUrl.
  } catch { /* Uma foto inválida usa as iniciais. */ }
  return { name, email, avatarUrl }; // Retorna um objeto com name, email, avatarUrl.
} // Encerra o bloco da função userIdentity.

export function userMarkup(user, profile = null) { // Exporta para os outros módulos: Declara a função userMarkup com user, profile.
  const { name, email, avatarUrl } = userIdentity(user, profile); // Define name, email, avatarUrl como o resultado de userIdentity com user e profile.
  const avatar = avatarUrl // Define avatar como um texto montado com 1 valor dinâmico se avatarUrl; caso contrário, um texto montado com 1 valor dinâmico.
    ? `<img src="${escapeHtml(avatarUrl)}" alt="Foto do usuário" class="user-avatar" referrerpolicy="no-referrer">` // Fornece um texto montado com 1 valor dinâmico à expressão atual.
    : `<div class="user-avatar-placeholder" aria-label="Avatar do usuário">${escapeHtml(name.charAt(0).toUpperCase())}</div>`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.

  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Insere um contêiner de layout com as classes “user-info user-account” com o texto “return `”.
   * Linha 2 do trecho: Insere um botão com as classes “account-toggle”.
   * Linha 3 do trecho: Insere no texto o valor calculado por ${avatar}.
   * Linha 4 do trecho: Insere um trecho de texto em linha com as classes “user-email” com o texto “${escapeHtml(name)}”.
   * Linha 5 do trecho: Insere um ícone ou desenho vetorial com as classes “account-chevron”.
   * Linha 6 do trecho: Encerra um botão.
   * Linha 7 do trecho: Insere a área de navegação identificado por “account-menu”.
   * Linha 8 do trecho: Insere um contêiner de layout com as classes “account-menu__identity” com o texto “${escapeHtml(name)}${escapeHtml(email)}”.
   * Linha 9 do trecho: Insere um link com as classes “account-menu__item” com o texto “Meu perfil”.
   * Linha 10 do trecho: Insere um link com as classes “account-menu__item” com o texto “Aparência”.
   * Linha 11 do trecho: Insere um link com as classes “account-menu__item” com o texto “Segurança”.
   * Linha 12 do trecho: Insere um link com as classes “account-menu__item” com o texto “Sessões da conta”.
   * Linha 13 do trecho: Insere um contêiner de layout com as classes “account-menu__separator”.
   * Linha 14 do trecho: Insere um botão identificado por “logout-btn” com o texto “Sair”.
   * Linha 15 do trecho: Encerra a área de navegação.
   * Linha 16 do trecho: Encerra um contêiner de layout.
   */
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
} // Encerra o bloco da função userMarkup.

async function getUserProfile(userId) { // Declara a função assíncrona getUserProfile com userId.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { data, error } = await supabase.from('usuarios') // Define data, error como o resultado aguardado de um registro ou null, sem exigir um resultado.
      .select('user_id,nome_usuario,nome_completo,email,avatar_url').eq('user_id', userId).maybeSingle(); // Executa a chamada que produz a seleção das colunas o texto “user_id,nome_usuario,nome_completo,email,avatar_url”.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    return data || null; // Retorna data ou, se indisponível, null (ausência de valor).
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    console.error('Erro ao carregar perfil do usuário:', error); // Executa a chamada que produz o registro de o texto “Erro ao carregar perfil do usuário:” no console.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função getUserProfile.

async function logout(event) { // Declara a função assíncrona logout com event.
  const button = event.currentTarget; // Define button como event.currentTarget.
  button.disabled = true; // Atualiza button.disabled com true (verdadeiro).
  button.textContent = 'Saindo...'; // Atualiza button.textContent com o texto “Saindo...”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { error } = await supabase.auth.signOut({ scope: 'local' }); // Define error como o resultado aguardado de o encerramento da sessão no Supabase.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    window.location.href = 'login.html'; // Atualiza window.location.href com o texto “login.html”.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    console.error('Erro ao sair:', error); // Executa a chamada que produz o registro de o texto “Erro ao sair:” no console.
    button.disabled = false; // Atualiza button.disabled com false (falso).
    button.textContent = 'Sair'; // Atualiza button.textContent com o texto “Sair”.
    alert('Não foi possível sair da conta. Tente novamente.'); // Executa a chamada que produz o resultado de alert com o texto “Não foi possível sair da conta. Tente novamente.”.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função logout.

export async function initHeaderSession(header) { // Exporta para os outros módulos: Declara a função assíncrona initHeaderSession com header.
  const userArea = header.querySelector('#user-area'); // Define userArea como o primeiro elemento que corresponde ao seletor o texto “#user-area”.
  if (!userArea) return; // Verifica a negação de userArea; se verdadeiro, encerra a função sem retornar um valor.
  const guestMarkup = userArea.innerHTML; // Define guestMarkup como userArea.innerHTML.
  let revision = 0; // Define revision como 0.
  let menu = { destroy() {}, isOpen: () => false, open() {} }; // Define menu como um objeto com destroy, isOpen, open.

  function renderUser(user, profile) { // Declara a função renderUser com user, profile.
    const wasOpen = menu.isOpen(); // Define wasOpen como o resultado de menu.isOpen.
    menu.destroy(); // Executa a chamada que produz o resultado de menu.destroy.
    userArea.innerHTML = userMarkup(user, profile); // Atualiza userArea.innerHTML com o resultado de userMarkup com user e profile.
    userArea.querySelector('#logout-btn')?.addEventListener('click', logout); // Executa a chamada que produz o registro do evento o texto “click” em userArea.querySelector(…).
    menu = initAccountMenu(userArea); // Atualiza menu com o resultado de initAccountMenu com userArea.
    if (wasOpen) menu.open(); // Verifica wasOpen; se verdadeiro, executa o resultado de menu.open.
  } // Encerra o bloco da função renderUser.

  async function update(user, version) { // Declara a função assíncrona update com user, version.
    if (version !== revision) return; // Verifica version diferente, inclusive no tipo, de revision; se verdadeiro, encerra a função sem retornar um valor.
    if (!user) { // Verifica a negação de user para decidir se executa este bloco.
      menu.destroy(); // Executa a chamada que produz o resultado de menu.destroy.
      userArea.innerHTML = guestMarkup; // Atualiza userArea.innerHTML com guestMarkup.
      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.
    renderUser(user); // Executa a chamada que produz o resultado de renderUser com user.
    const profile = await getUserProfile(user.id); // Define profile como o resultado aguardado de o resultado de getUserProfile com user.id.
    // Uma consulta antiga não pode recolocar o usuário após sair ou trocar de conta.
    if (version === revision) renderUser(user, profile); // Verifica version igual, inclusive no tipo, a revision; se verdadeiro, executa o resultado de renderUser com user e profile.
  } // Encerra o bloco da função update.

  const initialRevision = revision; // Define initialRevision como revision.
  supabase.auth.onAuthStateChange((_event, session) => { // Executa a chamada que produz o acompanhamento das mudanças de autenticação.
    const version = ++revision; // Define version como o incremento de revision.
    // Consultas ficam fora do callback do Supabase para liberar o bloqueio de autenticação.
    window.setTimeout(() => { void update(session?.user, version); }, 0); // Executa a chamada que produz o agendamento de uma função após 0.
  }); // Encerra o bloco atual.

  // A edição de perfil atualiza o cabeçalho depois de persistir os dados da conta.
  window.addEventListener('praxis:profile-updated', event => { // Executa a chamada que produz o registro do evento o texto “praxis:profile-updated” em window.
    if (event.detail?.user && event.detail?.profile) { // Verifica event.detail.user com acesso opcional e event.detail.profile com acesso opcional para decidir se executa este bloco.
      ++revision; // Incrementa revision.
      renderUser(event.detail.user, event.detail.profile); // Executa a chamada que produz o resultado de renderUser com event.detail.user e event.detail.profile.
    } // Encerra o bloco da condição.
  }); // Encerra o bloco atual.

  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { data: { session }, error } = await supabase.auth.getSession(); // Define session, error como o resultado aguardado de a consulta da sessão atual no Supabase.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    await update(session?.user, initialRevision); // Aguarda a atualização dos dados session.user com acesso opcional na tabela selecionada antes de continuar.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    console.error('Erro ao verificar a sessão:', error); // Executa a chamada que produz o registro de o texto “Erro ao verificar a sessão:” no console.
    if (initialRevision === revision) userArea.innerHTML = guestMarkup; // Verifica initialRevision igual, inclusive no tipo, a revision; se verdadeiro, executa a atribuição de guestMarkup a userArea.innerHTML.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função initHeaderSession.
