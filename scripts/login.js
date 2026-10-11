import { supabase, upsertUserProfile } from './supabaseClient.js'; // Importa supabase, upsertUserProfile do módulo ./supabaseClient.js.

const form = document.getElementById('login-form'); // Define form como o elemento cujo ID é o texto “login-form”.
const email = document.getElementById('email'); // Define email como o elemento cujo ID é o texto “email”.
const password = document.getElementById('password'); // Define password como o elemento cujo ID é o texto “password”.
const confirm = document.getElementById('confirm-password'); // Define confirm como o elemento cujo ID é o texto “confirm-password”.
const message = document.getElementById('login-msg'); // Define message como o elemento cujo ID é o texto “login-msg”.
const submit = document.getElementById('login-submit'); // Define submit como o elemento cujo ID é o texto “login-submit”.
const google = document.getElementById('google-btn'); // Define google como o elemento cujo ID é o texto “google-btn”.
const params = new URLSearchParams(window.location.search); // Define params como uma instância de URLSearchParams com window.location.search.
const hash = new URLSearchParams(window.location.hash.slice(1)); // Define hash como uma instância de URLSearchParams com o resultado de window.location.hash.slice com 1.
let mode = params.get('modo') === 'recuperar' ? 'recover' // Define mode como o texto “recover” se o valor associado à chave modo em params igual, inclusive no tipo, a o texto “recuperar”; caso contrário, o texto “reset” se params.get(…) igual, inclusive no tipo, a redefinir ou, se indisponível, hash.get(…) igual, inclusive no tipo, a recovery; caso contrári…
  : params.get('modo') === 'redefinir' || hash.get('type') === 'recovery' ? 'reset' : 'login'; // Executa a chamada que produz o valor associado à chave o texto “modo” em params.
let busy = false; // Define busy como false (falso).
let redirecting = false; // Define redirecting como false (falso).

function showMessage(text, type = 'error') { // Declara a função showMessage com text, type.
  message.textContent = text; // Atualiza message.textContent com text.
  message.className = `login-msg ${type}`; // Atualiza message.className com um texto montado com 1 valor dinâmico.
} // Encerra o bloco da função showMessage.

function setMode(nextMode) { // Declara a função setMode com nextMode.
  mode = nextMode; // Atualiza mode com nextMode.
  const recovering = mode !== 'login'; // Define recovering como mode diferente, inclusive no tipo, de o texto “login”.
  const resetting = mode === 'reset'; // Define resetting como mode igual, inclusive no tipo, a o texto “reset”.
  document.body.classList.toggle('is-recovery', recovering); // Executa a chamada que produz a alternância da classe ou do estado o texto “is-recovery” em document.body.classList.
  document.body.dataset.authMode = mode; // Atualiza document.body.dataset.authMode com mode.
  document.getElementById('auth-title').textContent = resetting ? 'Crie sua nova senha' // Atualiza document.getElementById(…).textContent com o texto “Crie sua nova senha” se resetting; caso contrário, o texto “Recupere sua conta” se recovering; caso contrário, o texto “Entre na sua conta”.
    : recovering ? 'Recupere sua conta' : 'Entre na sua conta'; // Utiliza o valor de recovering.
  document.getElementById('auth-subtitle').textContent = resetting ? 'Escolha uma senha com pelo menos 6 caracteres.' // Atualiza document.getElementById(…).textContent com o texto “Escolha uma senha com pelo menos 6 caracteres.” se resetting; caso contrário, o texto “Enviaremos um link de recuperação para seu e-mail.” se recovering; caso contrário, o texto “Seu próximo passo começa aqui.”.
    : recovering ? 'Enviaremos um link de recuperação para seu e-mail.' : 'Seu próximo passo começa aqui.'; // Utiliza o valor de recovering.
  document.getElementById('email-field').hidden = resetting; // Atualiza document.getElementById(…).hidden com resetting.
  email.disabled = resetting; // Atualiza email.disabled com resetting.
  document.getElementById('password-field').hidden = mode === 'recover'; // Atualiza document.getElementById(…).hidden com mode igual, inclusive no tipo, a o texto “recover”.
  password.disabled = mode === 'recover'; // Atualiza password.disabled com mode igual, inclusive no tipo, a o texto “recover”.
  password.autocomplete = resetting ? 'new-password' : 'current-password'; // Atualiza password.autocomplete com o texto “new-password” se resetting; caso contrário, o texto “current-password”.
  document.querySelector('label[for="password"]').textContent = resetting ? 'Nova senha' : 'Senha'; // Atualiza document.querySelector(…).textContent com o texto “Nova senha” se resetting; caso contrário, o texto “Senha”.
  document.getElementById('confirm-field').hidden = !resetting; // Atualiza document.getElementById(…).hidden com a negação de resetting.
  confirm.disabled = !resetting; // Atualiza confirm.disabled com a negação de resetting.
  confirm.required = resetting; // Atualiza confirm.required com resetting.
  for (const id of ['login-options', 'auth-divider', 'google-btn', 'auth-register']) { // Percorre uma lista com 4 itens usando id.
    document.getElementById(id).hidden = recovering; // Atualiza document.getElementById(…).hidden com recovering.
  } // Encerra o bloco do laço.
  document.getElementById('auth-return').hidden = !recovering; // Atualiza document.getElementById(…).hidden com a negação de recovering.
  document.title = resetting ? 'Nova senha — Praxis' : recovering ? 'Recuperar conta — Praxis' : 'Login — Praxis'; // Atualiza document.title com o texto “Nova senha — Praxis” se resetting; caso contrário, o texto “Recuperar conta — Praxis” se recovering; caso contrário, o texto “Login — Praxis”.
  setLoading(false); // Executa a chamada que produz o resultado de setLoading com false (falso).
} // Encerra o bloco da função setMode.

function setLoading(loading) { // Declara a função setLoading com loading.
  busy = loading; // Atualiza busy com loading.
  submit.disabled = loading; // Atualiza submit.disabled com loading.
  google.disabled = loading; // Atualiza google.disabled com loading.
  form.setAttribute('aria-busy', String(loading)); // Executa a chamada que produz a definição do atributo o texto “aria-busy” em form.
  submit.textContent = loading ? (mode === 'recover' ? 'Enviando...' : mode === 'reset' ? 'Salvando...' : 'Entrando...') // Atualiza submit.textContent com o texto “Enviando...” se mode igual, inclusive no tipo, a o texto “recover”; caso contrário, o texto “Salvando...” se mode igual, inclusive no tipo, a reset; caso contrário, o texto “Entrando...” se loading; caso contrário, o texto “Enviar link de recuperação” se mod…
    : mode === 'recover' ? 'Enviar link de recuperação' : mode === 'reset' ? 'Salvar nova senha' : 'Entrar'; // Calcula mode igual, inclusive no tipo, a o texto “recover”.
} // Encerra o bloco da função setLoading.

function authError(error) { // Declara a função authError com error.
  const text = error?.message?.toLowerCase() || ''; // Define text como o texto de error.message em minúsculas com acesso opcional ou, se indisponível, o texto “”.
  if (text.includes('invalid') && text.includes('credentials')) return 'E-mail ou senha incorretos.'; // Verifica a verificação da presença de o texto “invalid” em text e a verificação da presença de o texto “credentials” em text; se verdadeiro, retorna o texto “E-mail ou senha incorretos.”.
  if (text.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'; // Verifica a verificação da presença de o texto “email not confirmed” em text; se verdadeiro, retorna o texto “Confirme seu e-mail antes de entrar.”.
  if (text.includes('rate limit') || text.includes('too many')) return 'Aguarde um pouco antes de tentar novamente.'; // Verifica a verificação da presença de o texto “rate limit” em text ou, se indisponível, a verificação da presença de o texto “too many” em text; se verdadeiro, retorna o texto “Aguarde um pouco antes de tentar novamente.”.
  if (text.includes('same password')) return 'Escolha uma senha diferente da senha atual.'; // Verifica a verificação da presença de o texto “same password” em text; se verdadeiro, retorna o texto “Escolha uma senha diferente da senha atual.”.
  if (text.includes('expired') || text.includes('session missing')) return 'O link expirou. Solicite um novo link de recuperação.'; // Verifica a verificação da presença de o texto “expired” em text ou, se indisponível, a verificação da presença de o texto “session missing” em text; se verdadeiro, retorna o texto “O link expirou. Solicite um novo link de recuperação.”.
  if (text.includes('network') || text.includes('fetch')) return 'Verifique sua conexão e tente novamente.'; // Verifica a verificação da presença de o texto “network” em text ou, se indisponível, a verificação da presença de o texto “fetch” em text; se verdadeiro, retorna o texto “Verifique sua conexão e tente novamente.”.
  return 'Não foi possível concluir. Tente novamente em alguns instantes.'; // Retorna o texto “Não foi possível concluir. Tente novamente em alguns instantes.”.
} // Encerra o bloco da função authError.

async function redirectUser(user) { // Declara a função assíncrona redirectUser com user.
  if (!user || redirecting) return; // Verifica a negação de user ou, se indisponível, redirecting; se verdadeiro, encerra a função sem retornar um valor.
  redirecting = true; // Atualiza redirecting com true (verdadeiro).
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    await upsertUserProfile(user); // Aguarda o resultado de upsertUserProfile com user antes de continuar.
    window.location.replace('index.html'); // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “index.html”.
  } catch { // Encerra a tentativa e inicia o tratamento de uma falha.
    redirecting = false; // Atualiza redirecting com false (falso).
    showMessage('Erro ao preparar sua conta. Tente novamente.'); // Executa a chamada que produz o resultado de showMessage com o texto “Erro ao preparar sua conta. Tente novamente.”.
    setLoading(false); // Executa a chamada que produz o resultado de setLoading com false (falso).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função redirectUser.

// Chamado pela interface local; não registra um segundo listener de submit.
export async function submitLogin() { // Exporta para os outros módulos: Declara a função assíncrona submitLogin com nenhum parâmetro.
  if (busy || redirecting) return; // Verifica busy ou, se indisponível, redirecting; se verdadeiro, encerra a função sem retornar um valor.
  const address = email.value.trim().toLowerCase(); // Define address como o texto de email.value.trim(…) em minúsculas.
  if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { // Verifica mode diferente, inclusive no tipo, de o texto “reset” e a negação de o resultado de /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test com address para decidir se executa este bloco.
    showMessage('Digite um e-mail válido.'); // Executa a chamada que produz o resultado de showMessage com o texto “Digite um e-mail válido.”.
    email.focus(); // Executa a chamada que produz o resultado de email.focus.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  if (mode !== 'recover' && password.value.length < 6) { // Verifica mode diferente, inclusive no tipo, de o texto “recover” e password.value.length menor que 6 para decidir se executa este bloco.
    showMessage('A senha deve possuir pelo menos 6 caracteres.'); // Executa a chamada que produz o resultado de showMessage com o texto “A senha deve possuir pelo menos 6 caracteres.”.
    password.focus(); // Executa a chamada que produz o resultado de password.focus.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  if (mode === 'reset' && password.value !== confirm.value) { // Verifica mode igual, inclusive no tipo, a o texto “reset” e password.value diferente, inclusive no tipo, de confirm.value para decidir se executa este bloco.
    showMessage('As senhas precisam ser iguais.'); // Executa a chamada que produz o resultado de showMessage com o texto “As senhas precisam ser iguais.”.
    confirm.focus(); // Executa a chamada que produz o resultado de confirm.focus.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  setLoading(true); // Executa a chamada que produz o resultado de setLoading com true (verdadeiro).
  message.className = 'login-msg'; // Atualiza message.className com o texto “login-msg”.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    if (mode === 'recover') { // Verifica mode igual, inclusive no tipo, a o texto “recover” para decidir se executa este bloco.
      // https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
      const redirectTo = new URL('login.html?modo=redefinir', window.location.href).href; // Define redirectTo como new URL(…).href.
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo }); // Define error como o resultado aguardado de o envio do e-mail de recuperação de senha.
      if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
      showMessage('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.', 'success'); // Executa a chamada que produz o resultado de showMessage com o texto “Se este e-mail estiver cadastrado, você receberá um link para criar uma nova se…” e o texto “success”.
    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.
      const { data, error } = mode === 'reset' // Define data, error como o resultado aguardado de a atualização dos dados de autenticação no Supabase se mode igual, inclusive no tipo, a o texto “reset”; caso contrário, o resultado aguardado de a autenticação no Supabase com e-mail e senha.
        ? await supabase.auth.updateUser({ password: password.value }) // Aguarda a atualização dos dados de autenticação no Supabase antes de continuar.
        : await supabase.auth.signInWithPassword({ email: address, password: password.value }); // Aguarda a autenticação no Supabase com e-mail e senha antes de continuar.
      if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
      if (!data?.user) throw new Error('User missing'); // Verifica a negação de data.user com acesso opcional; se verdadeiro, lança uma instância de Error com o texto “User missing” para interromper o fluxo e informar a falha.
      showMessage(mode === 'reset' ? 'Senha atualizada. Preparando sua conta...' : 'Login realizado com sucesso!', 'success'); // Executa a chamada que produz o resultado de showMessage com o texto “Senha atualizada. Preparando sua conta...” se mode igual, inclusive no tipo, a o texto “reset”; caso contrário, o texto “Login realizado com sucesso!” e o texto “success”.
      await redirectUser(data.user); // Aguarda o resultado de redirectUser com data.user antes de continuar.
    } // Encerra o bloco da condição.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    showMessage(authError(error)); // Executa a chamada que produz o resultado de showMessage com o resultado de authError com error.
  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.
    if (!redirecting) setLoading(false); // Verifica a negação de redirecting; se verdadeiro, executa o resultado de setLoading com false (falso).
  } // Encerra o bloco atual.
} // Encerra o bloco da função submitLogin.

export async function loginWithGoogle() { // Exporta para os outros módulos: Declara a função assíncrona loginWithGoogle com nenhum parâmetro.
  if (busy || redirecting) return; // Verifica busy ou, se indisponível, redirecting; se verdadeiro, encerra a função sem retornar um valor.
  setLoading(true); // Executa a chamada que produz o resultado de setLoading com true (verdadeiro).
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { error } = await supabase.auth.signInWithOAuth({ // Define error como o resultado aguardado de a autenticação no Supabase com o provedor escolhido.
      provider: 'google', // Define a propriedade provider como o texto “google”.
      options: { redirectTo: new URL('login.html', window.location.href).href } // Define a propriedade options como um objeto com redirectTo.
    }); // Encerra o objeto.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    showMessage(authError(error)); // Executa a chamada que produz o resultado de showMessage com o resultado de authError com error.
    setLoading(false); // Executa a chamada que produz o resultado de setLoading com false (falso).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função loginWithGoogle.

setMode(mode); // Executa a chamada que produz o resultado de setMode com mode.
supabase.auth.onAuthStateChange((event, session) => { // Executa a chamada que produz o acompanhamento das mudanças de autenticação.
  if (event === 'PASSWORD_RECOVERY') setMode('reset'); // Verifica event igual, inclusive no tipo, a o texto “PASSWORD_RECOVERY”; se verdadeiro, executa o resultado de setMode com o texto “reset”.
  if (event === 'SIGNED_IN' && session?.user && mode === 'login') { // Verifica event igual, inclusive no tipo, a o texto “SIGNED_IN” e session.user com acesso opcional e mode igual, inclusive no tipo, a o texto “login” para decidir se executa este bloco.
    // Fora do callback para não reentrar no bloqueio interno do cliente Auth.
    setTimeout(() => redirectUser(session.user), 0); // Executa a chamada que produz o agendamento de uma função após 0.
  } // Encerra o bloco da condição.
}); // Encerra o bloco atual.

async function checkSession() { // Declara a função assíncrona checkSession com nenhum parâmetro.
  if (params.has('error') || hash.has('error')) { // Verifica a verificação da chave o texto “error” em params ou, se indisponível, a verificação da chave o texto “error” em hash para decidir se executa este bloco.
    setMode('recover'); // Executa a chamada que produz o resultado de setMode com o texto “recover”.
    showMessage('O link é inválido ou expirou. Solicite um novo link de recuperação.'); // Executa a chamada que produz o resultado de showMessage com o texto “O link é inválido ou expirou. Solicite um novo link de recuperação.”.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { data, error } = await supabase.auth.getSession(); // Define data, error como o resultado aguardado de a consulta da sessão atual no Supabase.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    if (mode === 'reset' && !data.session?.user) { // Verifica mode igual, inclusive no tipo, a o texto “reset” e a negação de data.session.user com acesso opcional para decidir se executa este bloco.
      setMode('recover'); // Executa a chamada que produz o resultado de setMode com o texto “recover”.
      showMessage('Solicite um link de recuperação para criar sua nova senha.'); // Executa a chamada que produz o resultado de showMessage com o texto “Solicite um link de recuperação para criar sua nova senha.”.
    } else if (mode === 'login' && data.session?.user) { // Encerra o bloco anterior e verifica mode igual, inclusive no tipo, a o texto “login” e data.session.user com acesso opcional para decidir se executa este bloco.
      await redirectUser(data.session.user); // Aguarda o resultado de redirectUser com data.session.user antes de continuar.
    } // Encerra o bloco da condição.
  } catch { // Encerra a tentativa e inicia o tratamento de uma falha.
    showMessage('Não foi possível verificar sua sessão. Verifique sua conexão.'); // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível verificar sua sessão. Verifique sua conexão.”.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função checkSession.
checkSession(); // Executa a chamada que produz o resultado de checkSession.
