import { supabase } from './supabaseClient.js'; // Importa supabase do módulo ./supabaseClient.js.
import { userIdentity } from './header-session.js'; // Importa userIdentity do módulo ./header-session.js.

const $ = id => document.getElementById(id); // Define $ como uma função que recebe id.
const columns = 'user_id,nome_usuario,nome_completo,email,avatar_url'; // Define columns como o texto “user_id,nome_usuario,nome_completo,email,avatar_url”.
let currentUser = null, profile = null, saving = false, loading = false; // Define currentUser como null (ausência de valor).
let sessionEnded = false; // Define sessionEnded como false (falso).

function message(id, text, kind = 'error') { // Declara a função message com id, text, kind.
  $(id).textContent = text; // Atualiza $(…).textContent com text.
  $(id).dataset.kind = kind; // Atualiza $(…).dataset.kind com kind.
} // Encerra o bloco da função message.
function errorMessage(error) { // Declara a função errorMessage com error.
  if (error?.code === '23505') return 'Esse nome de usuário já está em uso. Escolha outro.'; // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “23505”; se verdadeiro, retorna o texto “Esse nome de usuário já está em uso. Escolha outro.”.
  if (error?.code === '42501') return 'Não foi possível salvar seu perfil. Tente sair e entrar novamente.'; // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “42501”; se verdadeiro, retorna o texto “Não foi possível salvar seu perfil. Tente sair e entrar novamente.”.
  if (error?.status === 429 || /rate limit|too many/i.test(error?.message || '')) return 'Aguarde um pouco antes de tentar novamente.'; // Verifica error.status com acesso opcional igual, inclusive no tipo, a 429 ou, se indisponível, o resultado de /rate limit|too many/i.test com error.message ou, se indisponível, o resultado da expressão; se verdadeiro, retorna o texto “Aguarde um pouco antes de tentar novamente.”.
  return 'Não foi possível concluir. Verifique sua conexão e tente novamente.'; // Retorna o texto “Não foi possível concluir. Verifique sua conexão e tente novamente.”.
} // Encerra o bloco da função errorMessage.
function avatar(target, user, row) { // Declara a função avatar com target, user, row.
  const { name, avatarUrl } = userIdentity(user, row); // Define name, avatarUrl como o resultado de userIdentity com user e row.
  target.replaceChildren(); // Executa a chamada que produz a substituição dos filhos de target.
  if (!avatarUrl) { target.textContent = name.charAt(0).toUpperCase(); return; } // Verifica a negação de avatarUrl; se verdadeiro, executa a atribuição de o texto de name.charAt(…) em maiúsculas a target.textContent. Encerra a função sem retornar um valor.
  const image = document.createElement('img'); // Define image como um novo elemento HTML o texto “img”.
  image.src = avatarUrl; // Atualiza image.src com avatarUrl.
  image.alt = ''; // Atualiza image.alt com o texto “”.
  image.referrerPolicy = 'no-referrer'; // Atualiza image.referrerPolicy com o texto “no-referrer”.
  image.addEventListener('error', () => { target.textContent = name.charAt(0).toUpperCase(); }); // Executa a chamada que produz o registro do evento o texto “error” em image.
  target.append(image); // Executa a chamada que produz o resultado de target.append com image.
} // Encerra o bloco da função avatar.
function renderAccount() { // Declara a função renderAccount com nenhum parâmetro.
  const identity = userIdentity(currentUser, profile); // Define identity como o resultado de userIdentity com currentUser e profile.
  $('sidebar-name').textContent = identity.name; // Atualiza $(…).textContent com identity.name.
  $('sidebar-email').textContent = identity.email; // Atualiza $(…).textContent com identity.email.
  avatar($('sidebar-avatar'), currentUser, profile); // Executa a chamada que produz o resultado de avatar com o resultado de $ com o texto “sidebar-avatar” e currentUser.
  avatar($('profile-photo'), currentUser, profile); // Executa a chamada que produz o resultado de avatar com o resultado de $ com o texto “profile-photo” e currentUser.
  $('profile-fullname').value = profile?.nome_completo || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || ''; // Atualiza $(…).value com profile.nome_completo com acesso opcional ou, se indisponível, currentUser.user_metadata.full_name com acesso opcional ou, se indisponível, currentUser.user_metadata.name com acesso opcional ou, se indisponível, o texto “”.
  $('profile-username').value = profile?.nome_usuario || currentUser.user_metadata?.nome_usuario || ''; // Atualiza $(…).value com profile.nome_usuario com acesso opcional ou, se indisponível, currentUser.user_metadata.nome_usuario com acesso opcional ou, se indisponível, o texto “”.
  $('profile-avatar-url').value = identity.avatarUrl; // Atualiza $(…).value com identity.avatarUrl.
  $('profile-email').value = currentUser.email || ''; // Atualiza $(…).value com currentUser.email ou, se indisponível, o texto “”.
  const labels = { google: 'Google', email: 'E-mail e senha' }; // Define labels como um objeto com google, email.
  const providers = currentUser.app_metadata?.providers || [currentUser.app_metadata?.provider || 'email']; // Define providers como currentUser.app_metadata.providers com acesso opcional ou, se indisponível, uma lista com 1 item.
  $('profile-provider').textContent = providers.map(provider => labels[provider] || provider).join(' · '); // Atualiza $(…).textContent com os itens de providers.map(…) unidos por o texto “·”.
  $('profile-email-status').textContent = currentUser.email_confirmed_at ? 'E-mail confirmado' : 'E-mail pendente'; // Atualiza $(…).textContent com o texto “E-mail confirmado” se currentUser.email_confirmed_at; caso contrário, o texto “E-mail pendente”.
} // Encerra o bloco da função renderAccount.

export function validateDetails({ fullname, username, avatarUrl }) { // Exporta para os outros módulos: Declara a função validateDetails com fullname, username, avatarUrl.
  if (fullname.length < 2 || fullname.length > 80) return ['profile-fullname', 'Use um nome entre 2 e 80 caracteres.']; // Verifica fullname.length menor que 2 ou, se indisponível, fullname.length maior que 80; se verdadeiro, retorna uma lista com 2 itens.
  if (!/^[A-Za-z0-9._]{3,30}$/.test(username)) return ['profile-username', 'Use de 3 a 30 caracteres: letras, números, ponto ou underline.']; // Verifica a negação de o resultado de /^[A-Za-z0-9._]{3,30}$/.test com username; se verdadeiro, retorna uma lista com 2 itens.
  if (avatarUrl) { // Verifica avatarUrl para decidir se executa este bloco.
    try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
      const url = new URL(avatarUrl); // Define url como uma instância de URL com avatarUrl.
      if (url.protocol !== 'https:' || url.username || url.password || avatarUrl.length > 1000) throw new Error('Foto inválida'); // Verifica url.protocol diferente, inclusive no tipo, de https: ou, se indisponível, url.username ou, se indisponível, url.password ou, se indisponível, avatarUrl.length maior que 1000; se verdadeiro, lança uma instância de Error com o texto “Foto inválida” para interromper o fluxo e informar a falha.
    } catch { return ['profile-avatar-url', 'Use um link HTTPS válido para a foto.']; } // Encerra a tentativa e inicia o tratamento de uma falha.
  } // Encerra o bloco da condição.
  return null; // Retorna null (ausência de valor).
} // Encerra o bloco da função validateDetails.

export async function saveDetails(event) { // Exporta para os outros módulos: Declara a função assíncrona saveDetails com event.
  event?.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.
  if (saving || !currentUser) return; // Verifica saving ou, se indisponível, a negação de currentUser; se verdadeiro, encerra a função sem retornar um valor.
  const values = { // Define values como um objeto com fullname, username, avatarUrl.
    fullname: $('profile-fullname').value.trim(), // Define a propriedade fullname como o texto de $(…).value sem espaços nas extremidades.
    username: $('profile-username').value.trim(), // Define a propriedade username como o texto de $(…).value sem espaços nas extremidades.
    avatarUrl: $('profile-avatar-url').value.trim() // Define a propriedade avatarUrl como o texto de $(…).value sem espaços nas extremidades.
  }; // Encerra o objeto.
  const invalid = validateDetails(values); // Define invalid como o resultado de validateDetails com values.
  if (invalid) { // Verifica invalid para decidir se executa este bloco.
    $(invalid[0]).setAttribute('aria-invalid', 'true'); // Executa a chamada que produz a definição do atributo o texto “aria-invalid” em $(…).
    $(invalid[0]).focus(); // Executa a chamada que produz o resultado de $(…).focus.
    message('profile-message', invalid[1]); // Executa a chamada que produz o resultado de message com o texto “profile-message” e invalid[1].
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  saving = true; // Atualiza saving com true (verdadeiro).
  $('profile-fields').disabled = true; // Atualiza $(…).disabled com true (verdadeiro).
  $('profile-save').textContent = 'Salvando…'; // Atualiza $(…).textContent com o texto “Salvando…”.
  message('profile-message', ''); // Executa a chamada que produz o resultado de message com o texto “profile-message” e o texto “”.
  const userId = currentUser.id; // Define userId como currentUser.id.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    if (values.username.toLowerCase() !== (profile?.nome_usuario || '').toLowerCase()) { // Verifica o texto de values.username em minúsculas diferente, inclusive no tipo, de o texto de expressão em minúsculas para decidir se executa este bloco.
      // O underline é literal no nome, não um curinga do filtro ILIKE.
      const { data, error } = await supabase.from('usuarios').select('user_id,nome_usuario') // Define data, error como o resultado aguardado de o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e a substituição dos trechos de values.username que correspondem a /_/g.
        .ilike('nome_usuario', values.username.replace(/_/g, '\\_')); // Executa a chamada que produz o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e a substituição dos trechos de values.username que correspondem a o padrão de busca /_/.
      if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
      if (data?.some(row => row.user_id !== userId)) throw { code: '23505' }; // Verifica a verificação de pelo menos um item de data que atende à condição com acesso opcional; se verdadeiro, lança um objeto com code para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.
    if (currentUser?.id !== userId) return; // Verifica currentUser.id com acesso opcional diferente, inclusive no tipo, de userId; se verdadeiro, encerra a função sem retornar um valor.
    const payload = { nome_completo: values.fullname, nome_usuario: values.username, avatar_url: values.avatarUrl || null }; // Define payload como um objeto com nome_completo, nome_usuario, avatar_url.
    const query = profile // Define query como o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a userId se profile; caso contrário, a inserção dos dados um objeto com payload, user_id, email na tabela selecionada.
      ? supabase.from('usuarios').update(payload).eq('user_id', userId) // Executa a chamada que produz o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a userId.
      : supabase.from('usuarios').insert({ ...payload, user_id: userId, email: currentUser.email }); // Executa a chamada que produz a inserção dos dados um objeto com payload, user_id, email na tabela selecionada.
    const { data: saved, error } = await query.select(columns).single(); // Define saved, error como o resultado aguardado de um único registro, exigindo sua existência.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    if (!saved || currentUser?.id !== userId) return; // Verifica a negação de saved ou, se indisponível, currentUser.id com acesso opcional diferente, inclusive no tipo, de userId; se verdadeiro, encerra a função sem retornar um valor.
    profile = saved; // Atualiza profile com saved.
    const metadata = { nome_usuario: values.username, full_name: values.fullname, name: values.fullname, // Define metadata como um objeto com nome_usuario, full_name, name, avatar_url, praxis_avatar_mode.
      avatar_url: values.avatarUrl || null, praxis_avatar_mode: values.avatarUrl ? 'photo' : 'initials' }; // Define a propriedade avatar_url como values.avatarUrl ou, se indisponível, null (ausência de valor).
    const { data: authData, error: authError } = await supabase.auth.updateUser({ data: metadata }); // Define authData, authError como o resultado aguardado de a atualização dos dados de autenticação no Supabase.
    if (currentUser?.id !== userId) return; // Verifica currentUser.id com acesso opcional diferente, inclusive no tipo, de userId; se verdadeiro, encerra a função sem retornar um valor.
    currentUser = authData?.user || { ...currentUser, user_metadata: { ...currentUser.user_metadata, ...metadata } }; // Atualiza currentUser com authData.user com acesso opcional ou, se indisponível, um objeto com currentUser, user_metadata.
    renderAccount(); // Executa a chamada que produz o resultado de renderAccount.
    window.dispatchEvent(new CustomEvent('praxis:profile-updated', { detail: { user: currentUser, profile } })); // Executa a chamada que produz o resultado de window.dispatchEvent com uma instância de CustomEvent com o texto “praxis:profile-updated” e um objeto com detail.
    message('profile-message', authError // Executa a chamada que produz o resultado de message com o texto “profile-message” e o texto “Dados salvos no perfil. A sincronização com o login falhou; tente salvar novame…” se authError; caso contrário, o texto “Suas alterações foram salvas.”.
      ? 'Dados salvos no perfil. A sincronização com o login falhou; tente salvar novamente.' // Fornece o texto “Dados salvos no perfil. A sincronização com o login falhou; tente salvar novame…” à expressão atual.
      : 'Suas alterações foram salvas.', authError ? 'warning' : 'success'); // Fornece o texto “Suas alterações foram salvas.” à expressão atual.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    message('profile-message', errorMessage(error)); // Executa a chamada que produz o resultado de message com o texto “profile-message” e o resultado de errorMessage com error.
  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.
    saving = false; // Atualiza saving com false (falso).
    $('profile-fields').disabled = !currentUser; // Atualiza $(…).disabled com a negação de currentUser.
    $('profile-save').textContent = 'Salvar alterações'; // Atualiza $(…).textContent com o texto “Salvar alterações”.
  } // Encerra o bloco atual.
} // Encerra o bloco da função saveDetails.

async function action(buttonId, messageId, label, perform, success) { // Declara a função assíncrona action com buttonId, messageId, label, perform, success.
  const button = $(buttonId); // Define button como o resultado de $ com buttonId.
  if (!currentUser || button.disabled) return; // Verifica a negação de currentUser ou, se indisponível, button.disabled; se verdadeiro, encerra a função sem retornar um valor.
  const original = button.textContent; // Define original como button.textContent.
  button.disabled = true; // Atualiza button.disabled com true (verdadeiro).
  button.textContent = label; // Atualiza button.textContent com label.
  message(messageId, ''); // Executa a chamada que produz o resultado de message com messageId e o texto “”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { error } = await perform(); // Define error como o resultado aguardado de o resultado de perform.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    message(messageId, success, 'success'); // Executa a chamada que produz o resultado de message com messageId e success.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    message(messageId, errorMessage(error)); // Executa a chamada que produz o resultado de message com messageId e o resultado de errorMessage com error.
  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.
    button.disabled = false; // Atualiza button.disabled com false (falso).
    button.textContent = original; // Atualiza button.textContent com original.
  } // Encerra o bloco atual.
} // Encerra o bloco da função action.

export async function sendPasswordLink() { // Exporta para os outros módulos: Declara a função assíncrona sendPasswordLink com nenhum parâmetro.
  if (!currentUser?.email) return; // Verifica a negação de currentUser.email com acesso opcional; se verdadeiro, encerra a função sem retornar um valor.
  await action('profile-reset-password', 'security-message', 'Enviando…', () => // Aguarda o resultado de action com o texto “profile-reset-password” e o texto “security-message” antes de continuar.
    supabase.auth.resetPasswordForEmail(currentUser.email, { // Executa a chamada que produz o envio do e-mail de recuperação de senha.
      redirectTo: new URL('login.html?modo=redefinir', window.location.href).href // Define a propriedade redirectTo como new URL(…).href.
    }), 'Link solicitado. Confira seu e-mail e a pasta de spam para alterar sua senha.'); // Fornece o texto “Link solicitado. Confira seu e-mail e a pasta de spam para alterar sua senha.” à expressão atual.
} // Encerra o bloco da função sendPasswordLink.
export async function signOutOthers() { // Exporta para os outros módulos: Declara a função assíncrona signOutOthers com nenhum parâmetro.
  await action('profile-signout-others', 'sessions-message', 'Encerrando…', () => // Aguarda o resultado de action com o texto “profile-signout-others” e o texto “sessions-message” antes de continuar.
    supabase.auth.signOut({ scope: 'others' }), 'A renovação do acesso das outras sessões foi encerrada. Este navegador continua conectado.'); // Executa a chamada que produz o encerramento da sessão no Supabase.
} // Encerra o bloco da função signOutOthers.
export async function signOutHere() { // Exporta para os outros módulos: Declara a função assíncrona signOutHere com nenhum parâmetro.
  await action('profile-signout', 'sessions-message', 'Saindo…', async () => { // Aguarda o resultado de action com o texto “profile-signout” e o texto “sessions-message” antes de continuar.
    const result = await supabase.auth.signOut({ scope: 'local' }); // Define result como o resultado aguardado de o encerramento da sessão no Supabase.
    if (!result.error) window.location.replace('login.html'); // Verifica a negação de result.error; se verdadeiro, executa a substituição dos trechos de window.location que correspondem a o texto “login.html”.
    return result; // Retorna result.
  }, 'Sessão encerrada.'); // Fornece o texto “Sessão encerrada.” à expressão atual.
} // Encerra o bloco da função signOutHere.

function syncTheme() { // Declara a função syncTheme com nenhum parâmetro.
  const preference = window.PraxisTheme?.getPreference() || 'system'; // Define preference como o resultado de window.PraxisTheme.getPreference com acesso opcional ou, se indisponível, o texto “system”.
  document.querySelectorAll('input[name="profile-theme"]').forEach(input => { input.checked = input.value === preference; }); // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
} // Encerra o bloco da função syncTheme.
function syncNavigation() { // Declara a função syncNavigation com nenhum parâmetro.
  const hash = window.location.hash || '#dados'; // Define hash como window.location.hash ou, se indisponível, o texto “#dados”.
  document.querySelectorAll('.profile-nav a').forEach(link => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'location'); // Verifica o atributo o texto “href” de link igual, inclusive no tipo, a hash; se verdadeiro, executa a definição do atributo o texto “aria-current” em link.
    else link.removeAttribute('aria-current'); // Executa a chamada que produz a remoção do atributo o texto “aria-current” de link.
  }); // Encerra o bloco atual.
} // Encerra o bloco da função syncNavigation.

export async function loadAccount() { // Exporta para os outros módulos: Declara a função assíncrona loadAccount com nenhum parâmetro.
  if (loading) return; // Verifica loading; se verdadeiro, encerra a função sem retornar um valor.
  loading = true; // Atualiza loading com true (verdadeiro).
  $('profile-retry').hidden = true; // Atualiza $(…).hidden com true (verdadeiro).
  $('profile-content').hidden = true; // Atualiza $(…).hidden com true (verdadeiro).
  $('profile-loading').hidden = false; // Atualiza $(…).hidden com false (falso).
  $('profile-loading').textContent = 'Carregando sua conta…'; // Atualiza $(…).textContent com o texto “Carregando sua conta…”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { data, error } = await supabase.auth.getUser(); // Define data, error como o resultado aguardado de a consulta do usuário autenticado no Supabase.
    if (!data?.user && (!error || error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403)) { // Verifica a negação de data.user com acesso opcional e expressão ou, se indisponível, expressão ou, se indisponível, error.status igual, inclusive no tipo, a 401 ou, se indisponível, error.status igual, inclusive no tipo, a 403 para decidir se executa este bloco.
      window.location.replace('login.html'); // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “login.html”.
      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    const user = data.user; // Define user como data.user.
    const { data: row, error: profileError } = await supabase.from('usuarios') // Define row, profileError como o resultado aguardado de um registro ou null, sem exigir um resultado.
      .select(columns).eq('user_id', user.id).maybeSingle(); // Executa a chamada que produz a seleção das colunas columns.
    if (profileError) throw profileError; // Verifica profileError; se verdadeiro, lança profileError para interromper o fluxo e informar a falha.
    if (sessionEnded) return; // Verifica sessionEnded; se verdadeiro, encerra a função sem retornar um valor.
    currentUser = user; // Atualiza currentUser com user.
    profile = row; // Atualiza profile com row.
    renderAccount(); // Executa a chamada que produz o resultado de renderAccount.
    $('profile-fields').disabled = false; // Atualiza $(…).disabled com false (falso).
    $('profile-loading').hidden = true; // Atualiza $(…).hidden com true (verdadeiro).
    $('profile-content').hidden = false; // Atualiza $(…).hidden com false (falso).
    syncTheme(); // Executa a chamada que produz o resultado de syncTheme.
    syncNavigation(); // Executa a chamada que produz o resultado de syncNavigation.
    const section = ['#dados', '#seguranca', '#aparencia', '#sessoes'].includes(window.location.hash) ? window.location.hash.slice(1) : ''; // Define section como o resultado de window.location.hash.slice com 1 se a verificação da presença de window.location.hash em expressão; caso contrário, o texto “”.
    if (section) $(section).scrollIntoView({ block: 'start' }); // Verifica section; se verdadeiro, executa o resultado de $(…).scrollIntoView com um objeto com block.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    $('profile-loading').textContent = 'Não foi possível carregar sua conta. Tente novamente.'; // Atualiza $(…).textContent com o texto “Não foi possível carregar sua conta. Tente novamente.”.
    $('profile-retry').hidden = false; // Atualiza $(…).hidden com false (falso).
  } finally { loading = false; } // Encerra o tratamento anterior e inicia a etapa que sempre será executada.
} // Encerra o bloco da função loadAccount.

$('account-details-form').addEventListener('submit', saveDetails); // Executa a chamada que produz o registro do evento o texto “submit” em $(…).
$('profile-reset-password').addEventListener('click', sendPasswordLink); // Executa a chamada que produz o registro do evento o texto “click” em $(…).
$('profile-signout-others').addEventListener('click', signOutOthers); // Executa a chamada que produz o registro do evento o texto “click” em $(…).
$('profile-signout').addEventListener('click', signOutHere); // Executa a chamada que produz o registro do evento o texto “click” em $(…).
$('profile-retry').addEventListener('click', loadAccount); // Executa a chamada que produz o registro do evento o texto “click” em $(…).
$('profile-use-initials').addEventListener('click', () => { // Executa a chamada que produz o registro do evento o texto “click” em $(…).
  $('profile-avatar-url').value = ''; // Atualiza $(…).value com o texto “”.
  message('profile-message', 'Clique em Salvar alterações para usar suas iniciais.', 'info'); // Executa a chamada que produz o resultado de message com o texto “profile-message” e o texto “Clique em Salvar alterações para usar suas iniciais.”.
  if (currentUser) avatar($('profile-photo'), { ...currentUser, // Verifica currentUser para decidir se executa este bloco.
    user_metadata: { ...currentUser.user_metadata, praxis_avatar_mode: 'initials' } }, profile); // Define a propriedade user_metadata como um objeto com currentUser.user_metadata, praxis_avatar_mode.
}); // Encerra o bloco atual.
document.querySelectorAll('#account-details-form input').forEach(input => input.addEventListener('input', () => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  input.removeAttribute('aria-invalid'); // Executa a chamada que produz a remoção do atributo o texto “aria-invalid” de input.
  message('profile-message', ''); // Executa a chamada que produz o resultado de message com o texto “profile-message” e o texto “”.
})); // Encerra o bloco atual.
document.querySelectorAll('input[name="profile-theme"]').forEach(input => input.addEventListener('change', () => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  if (!input.checked) return; // Verifica a negação de input.checked; se verdadeiro, encerra a função sem retornar um valor.
  window.PraxisTheme?.setPreference(input.value); // Executa a chamada que produz o resultado de window.PraxisTheme.setPreference com input.value.
  message('appearance-message', 'Tema atualizado neste navegador.', 'success'); // Executa a chamada que produz o resultado de message com o texto “appearance-message” e o texto “Tema atualizado neste navegador.”.
})); // Encerra o bloco atual.
window.addEventListener('praxis:theme-changed', syncTheme); // Executa a chamada que produz o registro do evento o texto “praxis:theme-changed” em window.
window.addEventListener('hashchange', syncNavigation); // Executa a chamada que produz o registro do evento o texto “hashchange” em window.
supabase.auth.onAuthStateChange((event, session) => { // Executa a chamada que produz o acompanhamento das mudanças de autenticação.
  if (event === 'SIGNED_OUT') { // Verifica event igual, inclusive no tipo, a o texto “SIGNED_OUT” para decidir se executa este bloco.
    sessionEnded = true; // Atualiza sessionEnded com true (verdadeiro).
    currentUser = null; // Atualiza currentUser com null (ausência de valor).
    $('profile-fields').disabled = true; // Atualiza $(…).disabled com true (verdadeiro).
    $('profile-content').hidden = true; // Atualiza $(…).hidden com true (verdadeiro).
    window.location.replace('login.html'); // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “login.html”.
  } else if (currentUser && session?.user) { // Encerra o bloco anterior e verifica currentuser e session.user com acesso opcional para decidir se executa este bloco.
    if (session.user.id !== currentUser.id) { // Verifica session.user.id diferente, inclusive no tipo, de currentUser.id para decidir se executa este bloco.
      sessionEnded = true; // Atualiza sessionEnded com true (verdadeiro).
      currentUser = null; // Atualiza currentUser com null (ausência de valor).
      $('profile-content').hidden = true; // Atualiza $(…).hidden com true (verdadeiro).
      window.location.reload(); // Executa a chamada que produz o resultado de window.location.reload.
    } else currentUser = session.user; // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.
  } // Encerra o bloco da condição.
}); // Encerra o bloco atual.
void loadAccount(); // Compõe a execução sem usar o retorno de o resultado de loadAccount na operação atual.
