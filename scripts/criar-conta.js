import { // Importa supabase do módulo ./supabaseClient.js.
  supabase // Utiliza o valor de supabase.
} from "./supabaseClient.js"; // Fornece o texto “./supabaseClient.js” à expressão atual.


/* =========================================================
   ELEMENTOS
========================================================= */

const form = // Define form como o elemento cujo ID é o texto “register-form”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “register-form”.
    "register-form" // Fornece o texto “register-form” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const usernameInput = // Define usernameInput como o elemento cujo ID é o texto “username”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “username”.
    "username" // Fornece o texto “username” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const emailInput = // Define emailInput como o elemento cujo ID é o texto “email”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “email”.
    "email" // Fornece o texto “email” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const passwordInput = // Define passwordInput como o elemento cujo ID é o texto “password”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “password”.
    "password" // Fornece o texto “password” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const confirmPasswordInput = // Define confirmPasswordInput como o elemento cujo ID é o texto “confirm-password”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “confirm-password”.
    "confirm-password" // Fornece o texto “confirm-password” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const submitButton = // Define submitButton como o elemento cujo ID é o texto “register-submit”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “register-submit”.
    "register-submit" // Fornece o texto “register-submit” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const messageElement = // Define messageElement como o elemento cujo ID é o texto “register-msg”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “register-msg”.
    "register-msg" // Fornece o texto “register-msg” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const googleButton = // Define googleButton como o elemento cujo ID é o texto “google-register-btn”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “google-register-btn”.
    "google-register-btn" // Fornece o texto “google-register-btn” à expressão atual.
  ); // Encerra a chamada de document.getElementById.


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const USERNAME_REGEX = // Define USERNAME_REGEX como o padrão de busca /^[A-Za-z0-9._]{3,30}$/.
  /^[A-Za-z0-9._]{3,30}$/; // Fornece o padrão de busca /^[A-Za-z0-9._]{3,30}$/ à expressão atual.


/* =========================================================
   HELPERS
========================================================= */

function normalizeUsername(value) { // Declara a função normalizeUsername com value.
  return String( // Retorna o texto de String(…) sem espaços nas extremidades.
    value ?? "" // Calcula value ou, quando nulo, o texto “”.
  ) // Encerra a chamada de String.
    .trim(); // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
} // Encerra o bloco da função normalizeUsername.


function normalizeEmail(value) { // Declara a função normalizeEmail com value.
  return String( // Retorna o texto de String(…).trim(…) em minúsculas.
    value ?? "" // Calcula value ou, quando nulo, o texto “”.
  ) // Encerra a chamada de String.
    .trim() // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
    .toLowerCase(); // Executa a chamada que produz o texto de String(…).trim(…) em minúsculas.
} // Encerra o bloco da função normalizeEmail.


/* =========================================================
   MENSAGENS
========================================================= */

function showMessage( // Declara a função showMessage com message, type.
  message, // Utiliza o valor de message.
  type = "" // Utiliza o valor de type.
) { // Declara a função showMessage com message, type.
  if (!messageElement) { // Verifica a negação de messageElement para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  messageElement.textContent = // Atualiza messageElement.textContent com message.
    message; // Utiliza o valor de message.


  messageElement.classList.remove( // Executa a chamada que produz a remoção da classe o texto “success” de messageElement.classList.
    "success", // Fornece o texto “success” à expressão atual.
    "error" // Fornece o texto “error” à expressão atual.
  ); // Encerra a chamada de messageElement.classList.remove.


  if (type) { // Verifica type para decidir se executa este bloco.
    messageElement.classList.add( // Executa a chamada que produz a inclusão da classe type em messageElement.classList.
      type // Utiliza o valor de type.
    ); // Encerra a chamada de messageElement.classList.add.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função showMessage.


function clearMessage() { // Declara a função clearMessage com nenhum parâmetro.
  showMessage(""); // Executa a chamada que produz o resultado de showMessage com o texto “”.
} // Encerra o bloco da função clearMessage.


/* =========================================================
   BOTÃO DE CADASTRO
========================================================= */

function setLoading( // Declara a função setLoading com loading.
  loading // Utiliza o valor de loading.
) { // Declara a função setLoading com loading.
  if (!submitButton) { // Verifica a negação de submitButton para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  submitButton.disabled = // Atualiza submitButton.disabled com loading.
    loading; // Utiliza o valor de loading.


  submitButton.textContent = // Atualiza submitButton.textContent com o texto “CRIANDO CONTA...” se loading; caso contrário, o texto “CRIAR CONTA”.
    loading // Utiliza o valor de loading.
      ? "CRIANDO CONTA..." // Fornece o texto “CRIANDO CONTA...” à expressão atual.
      : "CRIAR CONTA"; // Fornece o texto “CRIAR CONTA” à expressão atual.
} // Encerra o bloco da função setLoading.


/* =========================================================
   VALIDAR NOME DE USUÁRIO
========================================================= */

function validateUsername( // Declara a função validateUsername com username.
  username // Utiliza o valor de username.
) { // Declara a função validateUsername com username.
  if (!username) { // Verifica a negação de username para decidir se executa este bloco.
    return ( // Retorna o texto “Digite um nome de usuário.”.
      "Digite um nome de usuário." // Fornece o texto “Digite um nome de usuário.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica username.length menor que 3 para decidir se executa este bloco.
    username.length < 3 // Acessa username.length.
  ) { // Verifica username.length menor que 3 para decidir se executa este bloco.
    return ( // Retorna o texto “O nome de usuário precisa ter pelo menos 3 caracteres.”.
      "O nome de usuário precisa ter pelo menos 3 caracteres." // Fornece o texto “O nome de usuário precisa ter pelo menos 3 caracteres.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica username.length maior que 30 para decidir se executa este bloco.
    username.length > 30 // Acessa username.length.
  ) { // Verifica username.length maior que 30 para decidir se executa este bloco.
    return ( // Retorna o texto “O nome de usuário pode ter no máximo 30 caracteres.”.
      "O nome de usuário pode ter no máximo 30 caracteres." // Fornece o texto “O nome de usuário pode ter no máximo 30 caracteres.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de o resultado de USERNAME_REGEX.test com username para decidir se executa este bloco.
    !USERNAME_REGEX.test( // Compõe a negação de o resultado de USERNAME_REGEX.test com username na operação atual.
      username // Utiliza o valor de username.
    ) // Encerra a chamada de USERNAME_REGEX.test.
  ) { // Verifica a negação de o resultado de USERNAME_REGEX.test com username para decidir se executa este bloco.
    return ( // Retorna o texto “Use apenas letras, números, ponto e underline no nome de usuário.”.
      "Use apenas letras, números, ponto e underline no nome de usuário." // Fornece o texto “Use apenas letras, números, ponto e underline no nome de usuário.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ""; // Retorna o texto “”.
} // Encerra o bloco da função validateUsername.


/* =========================================================
   VALIDAR E-MAIL
========================================================= */

function validateEmail( // Declara a função validateEmail com email.
  email // Utiliza o valor de email.
) { // Declara a função validateEmail com email.
  if (!email) { // Verifica a negação de email para decidir se executa este bloco.
    return ( // Retorna o texto “Digite seu e-mail.”.
      "Digite seu e-mail." // Fornece o texto “Digite seu e-mail.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  const valid = // Define valid como o resultado de /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test com email.
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Executa a chamada que produz o resultado de /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test com email.
      .test(email); // Executa a chamada que produz o resultado de /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test com email.


  if (!valid) { // Verifica a negação de valid para decidir se executa este bloco.
    return ( // Retorna o texto “Digite um e-mail válido.”.
      "Digite um e-mail válido." // Fornece o texto “Digite um e-mail válido.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ""; // Retorna o texto “”.
} // Encerra o bloco da função validateEmail.


/* =========================================================
   VALIDAR SENHA
========================================================= */

function validatePassword( // Declara a função validatePassword com password, confirmPassword.
  password, // Utiliza o valor de password.
  confirmPassword // Utiliza o valor de confirmPassword.
) { // Declara a função validatePassword com password, confirmPassword.
  if (!password) { // Verifica a negação de password para decidir se executa este bloco.
    return ( // Retorna o texto “Digite uma senha.”.
      "Digite uma senha." // Fornece o texto “Digite uma senha.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica password.length menor que 6 para decidir se executa este bloco.
    password.length < 6 // Acessa password.length.
  ) { // Verifica password.length menor que 6 para decidir se executa este bloco.
    return ( // Retorna o texto “A senha precisa ter pelo menos 6 caracteres.”.
      "A senha precisa ter pelo menos 6 caracteres." // Fornece o texto “A senha precisa ter pelo menos 6 caracteres.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica password diferente, inclusive no tipo, de confirmPassword para decidir se executa este bloco.
    password !== // Calcula password diferente, inclusive no tipo, de confirmPassword.
    confirmPassword // Utiliza o valor de confirmPassword.
  ) { // Verifica password diferente, inclusive no tipo, de confirmPassword para decidir se executa este bloco.
    return ( // Retorna o texto “As senhas não coincidem.”.
      "As senhas não coincidem." // Fornece o texto “As senhas não coincidem.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ""; // Retorna o texto “”.
} // Encerra o bloco da função validatePassword.


/* =========================================================
   VERIFICAR NOME DE USUÁRIO
========================================================= */

async function checkUsernameAvailable( // Declara a função assíncrona checkUsernameAvailable com username.
  username // Utiliza o valor de username.
) { // Declara a função assíncrona checkUsernameAvailable com username.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const { // Define data, error como o resultado aguardado de o resultado de supabase.from(…).select(…).ilike(…).limit com 1.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase // Aguarda o resultado de supabase.from(…).select(…).ilike(…).limit com 1 antes de continuar.
        .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
        .select("user_id") // Executa a chamada que produz a seleção das colunas o texto “user_id”.
        .ilike( // Executa a chamada que produz o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e username.
          "nome_usuario", // Fornece o texto “nome_usuario” à expressão atual.
          username // Utiliza o valor de username.
        ) // Encerra a chamada de supabase.from(…).select(…).ilike.
        .limit(1); // Executa a chamada que produz o resultado de supabase.from(…).select(…).ilike(…).limit com 1.


    /*
      Dependendo das políticas RLS,
      usuários deslogados podem não
      conseguir consultar a tabela.

      Nesse caso a validação definitiva
      continuará sendo feita pelo índice
      UNIQUE do banco.
    */

    if (error) { // Verifica error para decidir se executa este bloco.
      console.warn( // Executa a chamada que produz o registro de o texto “Não foi possível verificar o nome de usuário antes do cadastro:” no console.
        "Não foi possível verificar o nome de usuário antes do cadastro:", // Fornece o texto “Não foi possível verificar o nome de usuário antes do cadastro:” à expressão atual.
        error // Utiliza o valor de error.
      ); // Encerra a chamada de console.warn.

      return true; // Retorna true (verdadeiro).
    } // Encerra o bloco da condição.


    return !( // Retorna a negação de o resultado de Array.isArray com data e data.length maior que 0.
      Array.isArray(data) && // Executa a chamada que produz o resultado de Array.isArray com data.
      data.length > 0 // Acessa data.length.
    ); // Encerra a expressão ou função iniciada acima.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.warn( // Executa a chamada que produz o registro de o texto “Falha ao verificar nome de usuário:” no console.
      "Falha ao verificar nome de usuário:", // Fornece o texto “Falha ao verificar nome de usuário:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.warn.

    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função checkUsernameAvailable.


/* =========================================================
   VERIFICAR PERFIL EXISTENTE
========================================================= */

async function getExistingProfile( // Declara a função assíncrona getExistingProfile com userId.
  userId // Utiliza o valor de userId.
) { // Declara a função assíncrona getExistingProfile com userId.
  if (!userId) { // Verifica a negação de userId para decidir se executa este bloco.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  const { // Define data, error como o resultado aguardado de um registro ou null, sem exigir um resultado.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda um registro ou null, sem exigir um resultado antes de continuar.
      .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “user_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “nome_usuario” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “nome_completo” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “email” no texto da consulta.
       * Linha 7 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        user_id,
        nome_usuario,
        nome_completo,
        email
      `)
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “user_id” igual a userId.
        "user_id", // Fornece o texto “user_id” à expressão atual.
        userId // Utiliza o valor de userId.
      ) // Encerra a chamada de supabase.from(…).select(…).eq.
      .maybeSingle(); // Executa a chamada que produz um registro ou null, sem exigir um resultado.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  return data || null; // Retorna data ou, se indisponível, null (ausência de valor).
} // Encerra o bloco da função getExistingProfile.


/* =========================================================
   SALVAR PERFIL
========================================================= */

async function saveUserProfile({ // Declara a função assíncrona saveUserProfile com user, username, email.
  user, // Inclui a propriedade user com o valor da variável de mesmo nome.
  username, // Inclui a propriedade username com o valor da variável de mesmo nome.
  email // Inclui a propriedade email com o valor da variável de mesmo nome.
}) { // Compõe user, username, email na operação atual.
  if (!user?.id) { // Verifica a negação de user.id com acesso opcional para decidir se executa este bloco.
    throw new Error( // Lança uma instância de Error com o texto “Usuário inválido.” para interromper o fluxo e informar a falha.
      "Usuário inválido." // Fornece o texto “Usuário inválido.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  const existingProfile = // Define existingProfile como o resultado aguardado de o resultado de getExistingProfile com user.id.
    await getExistingProfile( // Aguarda o resultado de getExistingProfile com user.id antes de continuar.
      user.id // Acessa user.id.
    ); // Encerra a chamada de getExistingProfile.


  /*
    Se o registro em public.usuarios
    já existir, atualizamos.
  */

  if (existingProfile) { // Verifica existingProfile para decidir se executa este bloco.

    const { // Define error como o resultado aguardado de o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe error na operação atual.
      await supabase // Aguarda o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id antes de continuar.
        .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
        .update({ // Executa a chamada que produz a atualização dos dados um objeto com nome_usuario, email na tabela selecionada.
          nome_usuario: // Define a propriedade nome_usuario como username.
            username, // Utiliza o valor de username.

          email: // Define a propriedade email como email.
            email // Utiliza o valor de email.
        }) // Encerra o objeto.
        .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id.
          "user_id", // Fornece o texto “user_id” à expressão atual.
          user.id // Acessa user.id.
        ); // Encerra a chamada de supabase.from(…).update(…).eq.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  /*
    Se ainda não existir,
    criamos o perfil.
  */

  const { // Define error como o resultado aguardado de a inserção dos dados um objeto com user_id, nome_usuario, email, nome_completo na tabela selecionada.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe error na operação atual.
    await supabase // Aguarda a inserção dos dados um objeto com user_id, nome_usuario, email, nome_completo na tabela selecionada antes de continuar.
      .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
      .insert({ // Executa a chamada que produz a inserção dos dados um objeto com user_id, nome_usuario, email, nome_completo na tabela selecionada.
        user_id: // Define a propriedade user_id como user.id.
          user.id, // Acessa user.id.

        nome_usuario: // Define a propriedade nome_usuario como username.
          username, // Utiliza o valor de username.

        email: // Define a propriedade email como email.
          email, // Utiliza o valor de email.

        nome_completo: // Define a propriedade nome_completo como user.user_metadata.full_name com acesso opcional ou, se indisponível, user.user_metadata.name com acesso opcional ou, se indisponível, null (ausência de valor).
          user.user_metadata // Acessa user.user_metadata.full_name.
            ?.full_name || // Acessa user.user_metadata.full_name.
          user.user_metadata // Acessa user.user_metadata.name.
            ?.name || // Acessa user.user_metadata.name.
          null // Fornece null (ausência de valor) à expressão atual.
      }); // Encerra o objeto.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função saveUserProfile.


/* =========================================================
   TRATAR ERROS DE PERFIL
========================================================= */

function getProfileErrorMessage( // Declara a função getProfileErrorMessage com error.
  error // Utiliza o valor de error.
) { // Declara a função getProfileErrorMessage com error.
  const message = // Define message como o texto de String(…) em minúsculas.
    String( // Executa a chamada que produz o texto de String(…) em minúsculas.
      error?.message || // Acessa error.message.
      "" // Fornece o texto “” à expressão atual.
    ) // Encerra a chamada de String.
      .toLowerCase(); // Executa a chamada que produz o texto de String(…) em minúsculas.


  if ( // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “23505” ou, se indisponível, a verificação da presença de o texto “duplicate key” em message para decidir se executa este bloco.
    error?.code === "23505" || // Acessa error.code.
    message.includes( // Executa a chamada que produz a verificação da presença de o texto “duplicate key” em message.
      "duplicate key" // Fornece o texto “duplicate key” à expressão atual.
    ) // Encerra a chamada de message.includes.
  ) { // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “23505” ou, se indisponível, a verificação da presença de o texto “duplicate key” em message para decidir se executa este bloco.
    return ( // Retorna o texto “Esse nome de usuário já está sendo utilizado.”.
      "Esse nome de usuário já está sendo utilizado." // Fornece o texto “Esse nome de usuário já está sendo utilizado.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ( // Retorna o texto “A conta foi criada, mas não foi possível concluir o perfil. Entre novamente par…”.
    "A conta foi criada, mas não foi possível concluir o perfil. Entre novamente para finalizar seu cadastro." // Fornece o texto “A conta foi criada, mas não foi possível concluir o perfil. Entre novamente par…” à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getProfileErrorMessage.


/* =========================================================
   CADASTRO COM E-MAIL E SENHA
========================================================= */

async function registerWithEmail( // Declara a função assíncrona registerWithEmail com event.
  event // Utiliza o valor de event.
) { // Declara a função assíncrona registerWithEmail com event.
  event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.


  if ( // Verifica expressão ou, se indisponível, expressão ou, se indisponível, a negação de emailInput ou, se indisponível, a negação de passwordInput ou, se indisponível, a negação de confirmPasswordInput para decidir se executa este bloco.
    !form || // Calcula expressão ou, se indisponível, expressão ou, se indisponível, a negação de emailInput ou, se indisponível, a negação de passwordInput ou, se indisponível, a negação de confirmPasswordInput.
    !usernameInput || // Compõe a negação de usernameInput na operação atual.
    !emailInput || // Compõe a negação de emailInput na operação atual.
    !passwordInput || // Compõe a negação de passwordInput na operação atual.
    !confirmPasswordInput // Compõe a negação de confirmPasswordInput na operação atual.
  ) { // Verifica expressão ou, se indisponível, expressão ou, se indisponível, a negação de emailInput ou, se indisponível, a negação de passwordInput ou, se indisponível, a negação de confirmPasswordInput para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  clearMessage(); // Executa a chamada que produz o resultado de clearMessage.


  const username = // Define username como o resultado de normalizeUsername com usernameInput.value.
    normalizeUsername( // Executa a chamada que produz o resultado de normalizeUsername com usernameInput.value.
      usernameInput.value // Acessa usernameInput.value.
    ); // Encerra a chamada de normalizeUsername.


  const email = // Define email como o resultado de normalizeEmail com emailInput.value.
    normalizeEmail( // Executa a chamada que produz o resultado de normalizeEmail com emailInput.value.
      emailInput.value // Acessa emailInput.value.
    ); // Encerra a chamada de normalizeEmail.


  const password = // Define password como passwordInput.value.
    passwordInput.value; // Acessa passwordInput.value.


  const confirmPassword = // Define confirmPassword como confirmPasswordInput.value.
    confirmPasswordInput.value; // Acessa confirmPasswordInput.value.


  /* =======================================================
     VALIDAÇÕES
  ======================================================= */

  const usernameError = // Define usernameError como o resultado de validateUsername com username.
    validateUsername( // Executa a chamada que produz o resultado de validateUsername com username.
      username // Utiliza o valor de username.
    ); // Encerra a chamada de validateUsername.


  if (usernameError) { // Verifica usernameError para decidir se executa este bloco.

    showMessage( // Executa a chamada que produz o resultado de showMessage com usernameError e o texto “error”.
      usernameError, // Utiliza o valor de usernameError.
      "error" // Fornece o texto “error” à expressão atual.
    ); // Encerra a chamada de showMessage.


    usernameInput.focus(); // Executa a chamada que produz o resultado de usernameInput.focus.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const emailError = // Define emailError como o resultado de validateEmail com email.
    validateEmail( // Executa a chamada que produz o resultado de validateEmail com email.
      email // Utiliza o valor de email.
    ); // Encerra a chamada de validateEmail.


  if (emailError) { // Verifica emailError para decidir se executa este bloco.

    showMessage( // Executa a chamada que produz o resultado de showMessage com emailError e o texto “error”.
      emailError, // Utiliza o valor de emailError.
      "error" // Fornece o texto “error” à expressão atual.
    ); // Encerra a chamada de showMessage.


    emailInput.focus(); // Executa a chamada que produz o resultado de emailInput.focus.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const passwordError = // Define passwordError como o resultado de validatePassword com password e confirmPassword.
    validatePassword( // Executa a chamada que produz o resultado de validatePassword com password e confirmPassword.
      password, // Utiliza o valor de password.
      confirmPassword // Utiliza o valor de confirmPassword.
    ); // Encerra a chamada de validatePassword.


  if (passwordError) { // Verifica passwordError para decidir se executa este bloco.

    showMessage( // Executa a chamada que produz o resultado de showMessage com passwordError e o texto “error”.
      passwordError, // Utiliza o valor de passwordError.
      "error" // Fornece o texto “error” à expressão atual.
    ); // Encerra a chamada de showMessage.


    passwordInput.focus(); // Executa a chamada que produz o resultado de passwordInput.focus.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  setLoading(true); // Executa a chamada que produz o resultado de setLoading com true (verdadeiro).


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    /* =====================================================
       VERIFICAR USERNAME
    ====================================================== */

    const usernameAvailable = // Define usernameAvailable como o resultado aguardado de o resultado de checkUsernameAvailable com username.
      await checkUsernameAvailable( // Aguarda o resultado de checkUsernameAvailable com username antes de continuar.
        username // Utiliza o valor de username.
      ); // Encerra a chamada de checkUsernameAvailable.


    if (!usernameAvailable) { // Verifica a negação de usernameAvailable para decidir se executa este bloco.

      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Esse nome de usuário já está sendo utilizado.” e o texto “error”.
        "Esse nome de usuário já está sendo utilizado.", // Fornece o texto “Esse nome de usuário já está sendo utilizado.” à expressão atual.
        "error" // Fornece o texto “error” à expressão atual.
      ); // Encerra a chamada de showMessage.


      usernameInput.focus(); // Executa a chamada que produz o resultado de usernameInput.focus.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    /* =====================================================
       CRIAR CONTA NO SUPABASE AUTH
    ====================================================== */

    const { // Define data, error como o resultado aguardado de a criação de uma conta no Supabase.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase // Aguarda a criação de uma conta no Supabase antes de continuar.
        .auth // Acessa supabase.auth.
        .signUp({ // Executa a chamada que produz a criação de uma conta no Supabase.
          email, // Inclui a propriedade email com o valor da variável de mesmo nome.
          password, // Inclui a propriedade password com o valor da variável de mesmo nome.

          options: { // Define a propriedade options como um objeto com data.
            data: { // Define a propriedade data como um objeto com nome_usuario.
              nome_usuario: // Define a propriedade nome_usuario como username.
                username // Utiliza o valor de username.
            } // Encerra o objeto.
          } // Encerra o objeto.
        }); // Encerra o objeto.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    const user = // Define user como data.user com acesso opcional ou, se indisponível, null (ausência de valor).
      data?.user || // Acessa data.user.
      null; // Fornece null (ausência de valor) à expressão atual.


    const session = // Define session como data.session com acesso opcional ou, se indisponível, null (ausência de valor).
      data?.session || // Acessa data.session.
      null; // Fornece null (ausência de valor) à expressão atual.


    if (!user) { // Verifica a negação de user para decidir se executa este bloco.
      throw new Error( // Lança uma instância de Error com o texto “O Supabase não retornou o usuário criado.” para interromper o fluxo e informar a falha.
        "O Supabase não retornou o usuário criado." // Fornece o texto “O Supabase não retornou o usuário criado.” à expressão atual.
      ); // Encerra a expressão ou função iniciada acima.
    } // Encerra o bloco da condição.


    /* =====================================================
       SE JÁ EXISTE SESSÃO
       SALVA O PERFIL AGORA
    ====================================================== */

    if (session) { // Verifica session para decidir se executa este bloco.

      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

        await saveUserProfile({ // Aguarda o resultado de saveUserProfile com um objeto com user, username, email antes de continuar.
          user, // Inclui a propriedade user com o valor da variável de mesmo nome.
          username, // Inclui a propriedade username com o valor da variável de mesmo nome.
          email // Inclui a propriedade email com o valor da variável de mesmo nome.
        }); // Encerra o objeto.

      } catch (profileError) { // Encerra a tentativa e inicia o tratamento de uma falha.

        console.error( // Executa a chamada que produz o registro de o texto “Erro ao salvar perfil:” no console.
          "Erro ao salvar perfil:", // Fornece o texto “Erro ao salvar perfil:” à expressão atual.
          profileError // Utiliza o valor de profileError.
        ); // Encerra a chamada de console.error.


        showMessage( // Executa a chamada que produz o resultado de showMessage com o resultado de getProfileErrorMessage com profileError e o texto “error”.
          getProfileErrorMessage( // Executa a chamada que produz o resultado de getProfileErrorMessage com profileError.
            profileError // Utiliza o valor de profileError.
          ), // Encerra a chamada de getProfileErrorMessage.
          "error" // Fornece o texto “error” à expressão atual.
        ); // Encerra a chamada de showMessage.


        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco de tratamento do erro.


      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Conta criada com sucesso! Redirecionando...” e o texto “success”.
        "Conta criada com sucesso! Redirecionando...", // Fornece o texto “Conta criada com sucesso! Redirecionando...” à expressão atual.
        "success" // Fornece o texto “success” à expressão atual.
      ); // Encerra a chamada de showMessage.


      window.setTimeout( // Executa a chamada que produz o agendamento de uma função após 900.
        () => { // Define a função que recebe nenhum argumento.

          window.location.href = // Atualiza window.location.href com o texto “index.html”.
            "index.html"; // Fornece o texto “index.html” à expressão atual.

        }, // Encerra o bloco atual.
        900 // Fornece 900 à expressão atual.
      ); // Encerra a chamada de window.setTimeout.


      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    /* =====================================================
       CONFIRMAÇÃO DE E-MAIL ATIVADA
    ====================================================== */

    form.reset(); // Executa a chamada que produz o resultado de form.reset.


    showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Conta criada! Confira seu e-mail para confirmar o cadastro. Depois, faça login …” e o texto “success”.
      "Conta criada! Confira seu e-mail para confirmar o cadastro. Depois, faça login normalmente.", // Fornece o texto “Conta criada! Confira seu e-mail para confirmar o cadastro. Depois, faça login …” à expressão atual.
      "success" // Fornece o texto “success” à expressão atual.
    ); // Encerra a chamada de showMessage.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao criar conta:” no console.
      "Erro ao criar conta:", // Fornece o texto “Erro ao criar conta:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    const message = // Define message como o texto de String(…) em minúsculas.
      String( // Executa a chamada que produz o texto de String(…) em minúsculas.
        error?.message || // Acessa error.message.
        "" // Fornece o texto “” à expressão atual.
      ) // Encerra a chamada de String.
        .toLowerCase(); // Executa a chamada que produz o texto de String(…) em minúsculas.


    if ( // Verifica a verificação da presença de o texto “user already registered” em message ou, se indisponível, a verificação da presença de o texto “already registered” em message para decidir se executa este bloco.
      message.includes( // Executa a chamada que produz a verificação da presença de o texto “user already registered” em message.
        "user already registered" // Fornece o texto “user already registered” à expressão atual.
      ) || // Executa a chamada que produz a verificação da presença de o texto “user already registered” em message.
      message.includes( // Executa a chamada que produz a verificação da presença de o texto “already registered” em message.
        "already registered" // Fornece o texto “already registered” à expressão atual.
      ) // Encerra a chamada de message.includes.
    ) { // Verifica a verificação da presença de o texto “user already registered” em message ou, se indisponível, a verificação da presença de o texto “already registered” em message para decidir se executa este bloco.

      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Já existe uma conta cadastrada com este e-mail.” e o texto “error”.
        "Já existe uma conta cadastrada com este e-mail.", // Fornece o texto “Já existe uma conta cadastrada com este e-mail.” à expressão atual.
        "error" // Fornece o texto “error” à expressão atual.
      ); // Encerra a chamada de showMessage.


    } else if ( // Encerra o bloco anterior e verifica a verificação da presença de o texto “password” em message para decidir se executa este bloco.
      message.includes( // Executa a chamada que produz a verificação da presença de o texto “password” em message.
        "password" // Fornece o texto “password” à expressão atual.
      ) // Encerra a chamada de message.includes.
    ) { // Verifica a verificação da presença de o texto “password” em message para decidir se executa este bloco.

      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “A senha não atende aos requisitos de segurança.” e o texto “error”.
        "A senha não atende aos requisitos de segurança.", // Fornece o texto “A senha não atende aos requisitos de segurança.” à expressão atual.
        "error" // Fornece o texto “error” à expressão atual.
      ); // Encerra a chamada de showMessage.


    } else if ( // Encerra o bloco anterior e verifica a verificação da presença de o texto “email” em message para decidir se executa este bloco.
      message.includes( // Executa a chamada que produz a verificação da presença de o texto “email” em message.
        "email" // Fornece o texto “email” à expressão atual.
      ) // Encerra a chamada de message.includes.
    ) { // Verifica a verificação da presença de o texto “email” em message para decidir se executa este bloco.

      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível utilizar este e-mail.” e o texto “error”.
        "Não foi possível utilizar este e-mail.", // Fornece o texto “Não foi possível utilizar este e-mail.” à expressão atual.
        "error" // Fornece o texto “error” à expressão atual.
      ); // Encerra a chamada de showMessage.


    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível criar sua conta. Tente novamente.” e o texto “error”.
        "Não foi possível criar sua conta. Tente novamente.", // Fornece o texto “Não foi possível criar sua conta. Tente novamente.” à expressão atual.
        "error" // Fornece o texto “error” à expressão atual.
      ); // Encerra a chamada de showMessage.
    } // Encerra o bloco da condição.


  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.

    setLoading(false); // Executa a chamada que produz o resultado de setLoading com false (falso).
  } // Encerra o bloco atual.
} // Encerra o bloco da função registerWithEmail.


/* =========================================================
   URL DE REDIRECIONAMENTO GOOGLE
========================================================= */

function getGoogleRedirectUrl() { // Declara a função getGoogleRedirectUrl com nenhum parâmetro.
  const isLocal = // Define isLocal como window.location.hostname igual, inclusive no tipo, a o texto “127.0.0.1” ou, se indisponível, window.location.hostname igual, inclusive no tipo, a o texto “localhost”.
    window.location.hostname === // Acessa window.location.hostname.
      "127.0.0.1" || // Fornece o texto “127.0.0.1” à expressão atual.
    window.location.hostname === // Acessa window.location.hostname.
      "localhost"; // Fornece o texto “localhost” à expressão atual.


  if (isLocal) { // Verifica isLocal para decidir se executa este bloco.
    return ( // Retorna um texto montado com 1 valor dinâmico.
      `${window.location.origin}/login.html` // Fornece um texto montado com 1 valor dinâmico à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ( // Retorna o texto “https://kevinoliveiraz.github.io/Praxis/login.html”.
    "https://kevinoliveiraz.github.io/Praxis/login.html" // Fornece o texto “https://kevinoliveiraz.github.io/Praxis/login.html” à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getGoogleRedirectUrl.


/* =========================================================
   CADASTRO / LOGIN COM GOOGLE
========================================================= */

async function registerWithGoogle() { // Declara a função assíncrona registerWithGoogle com nenhum parâmetro.
  clearMessage(); // Executa a chamada que produz o resultado de clearMessage.


  if (!googleButton) { // Verifica a negação de googleButton para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  googleButton.disabled = // Atualiza googleButton.disabled com true (verdadeiro).
    true; // Fornece true (verdadeiro) à expressão atual.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const redirectUrl = // Define redirectUrl como o resultado de getGoogleRedirectUrl.
      getGoogleRedirectUrl(); // Executa a chamada que produz o resultado de getGoogleRedirectUrl.


    console.log( // Executa a chamada que produz o registro de o texto “Iniciando autenticação com Google...” no console.
      "Iniciando autenticação com Google..." // Fornece o texto “Iniciando autenticação com Google...” à expressão atual.
    ); // Encerra a chamada de console.log.


    console.log( // Executa a chamada que produz o registro de o texto “Redirect URL:” no console.
      "Redirect URL:", // Fornece o texto “Redirect URL:” à expressão atual.
      redirectUrl // Utiliza o valor de redirectUrl.
    ); // Encerra a chamada de console.log.


    const { // Define data, error como o resultado aguardado de a autenticação no Supabase com o provedor escolhido.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase // Aguarda a autenticação no Supabase com o provedor escolhido antes de continuar.
        .auth // Acessa supabase.auth.
        .signInWithOAuth({ // Executa a chamada que produz a autenticação no Supabase com o provedor escolhido.
          provider: // Define a propriedade provider como o texto “google”.
            "google", // Fornece o texto “google” à expressão atual.

          options: { // Define a propriedade options como um objeto com redirectTo.
            redirectTo: // Define a propriedade redirectTo como redirectUrl.
              redirectUrl // Utiliza o valor de redirectUrl.
          } // Encerra o objeto.
        }); // Encerra o objeto.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    console.log( // Executa a chamada que produz o registro de o texto “Resposta OAuth:” no console.
      "Resposta OAuth:", // Fornece o texto “Resposta OAuth:” à expressão atual.
      data // Utiliza o valor de data.
    ); // Encerra a chamada de console.log.


    /*
      O Supabase normalmente inicia
      o redirecionamento automaticamente.

      Caso a navegação não aconteça
      automaticamente, usamos a URL
      retornada pelo OAuth.
    */

    if (data?.url) { // Verifica data.url com acesso opcional para decidir se executa este bloco.

      window.location.assign( // Executa a chamada que produz o resultado de window.location.assign com data.url.
        data.url // Acessa data.url.
      ); // Encerra a chamada de window.location.assign.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    throw new Error( // Lança uma instância de Error com o texto “O Supabase não retornou a URL de autenticação do Google.” para interromper o fluxo e informar a falha.
      "O Supabase não retornou a URL de autenticação do Google." // Fornece o texto “O Supabase não retornou a URL de autenticação do Google.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao continuar com Google:” no console.
      "Erro ao continuar com Google:", // Fornece o texto “Erro ao continuar com Google:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível continuar com o Google. Tente novamente.” e o texto “error”.
      "Não foi possível continuar com o Google. Tente novamente.", // Fornece o texto “Não foi possível continuar com o Google. Tente novamente.” à expressão atual.
      "error" // Fornece o texto “error” à expressão atual.
    ); // Encerra a chamada de showMessage.


    googleButton.disabled = // Atualiza googleButton.disabled com false (falso).
      false; // Fornece false (falso) à expressão atual.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função registerWithGoogle.


/* =========================================================
   NORMALIZAR USERNAME ENQUANTO DIGITA
========================================================= */

usernameInput // Executa a chamada que produz o registro do evento o texto “input” em usernameInput.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “input” em usernameInput.
    "input", // Fornece o texto “input” à expressão atual.
    () => { // Define a função que recebe nenhum argumento.

      /*
        Remove espaços automaticamente.

        Não convertemos para minúsculas,
        porque o usuário pode preferir
        visualizar letras maiúsculas.

        O índice UNIQUE do Supabase
        considera Kevin e kevin iguais.
      */

      usernameInput.value = // Atualiza usernameInput.value com a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
        usernameInput.value // Executa a chamada que produz a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
          .replace(/\s+/g, ""); // Executa a chamada que produz a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de usernameInput.addEventListener.


/* =========================================================
   EVENTOS
========================================================= */

form // Executa a chamada que produz o registro do evento o texto “submit” em form.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “submit” em form.
    "submit", // Fornece o texto “submit” à expressão atual.
    registerWithEmail // Utiliza o valor de registerWithEmail.
  ); // Encerra a chamada de form.addEventListener.


googleButton // Executa a chamada que produz o registro do evento o texto “click” em googleButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em googleButton.
    "click", // Fornece o texto “click” à expressão atual.
    registerWithGoogle // Utiliza o valor de registerWithGoogle.
  ); // Encerra a chamada de googleButton.addEventListener.
