import { // Importa supabase do módulo ./supabaseClient.js.
  supabase // Utiliza o valor de supabase.
} from "./supabaseClient.js"; // Fornece o texto “./supabaseClient.js” à expressão atual.


/* =========================================================
   ELEMENTOS
========================================================= */

const form = // Define form como o elemento cujo ID é o texto “profile-form”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “profile-form”.
    "profile-form" // Fornece o texto “profile-form” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const usernameInput = // Define usernameInput como o elemento cujo ID é o texto “username”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “username”.
    "username" // Fornece o texto “username” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const messageElement = // Define messageElement como o elemento cujo ID é o texto “profile-msg”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “profile-msg”.
    "profile-msg" // Fornece o texto “profile-msg” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const submitButton = // Define submitButton como o elemento cujo ID é o texto “profile-submit”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “profile-submit”.
    "profile-submit" // Fornece o texto “profile-submit” à expressão atual.
  ); // Encerra a chamada de document.getElementById.

const logoutButton = // Define logoutButton como o elemento cujo ID é o texto “logout-btn”.
  document.getElementById( // Executa a chamada que produz o elemento cujo ID é o texto “logout-btn”.
    "logout-btn" // Fornece o texto “logout-btn” à expressão atual.
  ); // Encerra a chamada de document.getElementById.


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const USERNAME_REGEX = // Define USERNAME_REGEX como o padrão de busca /^[A-Za-z0-9._]{3,30}$/.
  /^[A-Za-z0-9._]{3,30}$/; // Fornece o padrão de busca /^[A-Za-z0-9._]{3,30}$/ à expressão atual.


/* =========================================================
   ESTADO
========================================================= */

let currentUser = // Define currentUser como null (ausência de valor).
  null; // Fornece null (ausência de valor) à expressão atual.

let isSaving = // Define isSaving como false (falso).
  false; // Fornece false (falso) à expressão atual.


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
   LOADING
========================================================= */

function setLoading( // Declara a função setLoading com loading.
  loading // Utiliza o valor de loading.
) { // Declara a função setLoading com loading.
  if (!submitButton) { // Verifica a negação de submitButton para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  submitButton.disabled = // Atualiza submitButton.disabled com loading.
    loading; // Utiliza o valor de loading.


  submitButton.textContent = // Atualiza submitButton.textContent com o texto “SALVANDO...” se loading; caso contrário, o texto “SALVAR E CONTINUAR”.
    loading // Utiliza o valor de loading.
      ? "SALVANDO..." // Fornece o texto “SALVANDO...” à expressão atual.
      : "SALVAR E CONTINUAR"; // Fornece o texto “SALVAR E CONTINUAR” à expressão atual.
} // Encerra o bloco da função setLoading.


/* =========================================================
   NORMALIZAR USERNAME
========================================================= */

function normalizeUsername( // Declara a função normalizeUsername com value.
  value // Utiliza o valor de value.
) { // Declara a função normalizeUsername com value.
  return String( // Retorna o texto de String(…) sem espaços nas extremidades.
    value ?? "" // Calcula value ou, quando nulo, o texto “”.
  ) // Encerra a chamada de String.
    .trim(); // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
} // Encerra o bloco da função normalizeUsername.


/* =========================================================
   VALIDAR USERNAME
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

    return ( // Retorna o texto “Use apenas letras, números, ponto e underline.”.
      "Use apenas letras, números, ponto e underline." // Fornece o texto “Use apenas letras, números, ponto e underline.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ""; // Retorna o texto “”.
} // Encerra o bloco da função validateUsername.


/* =========================================================
   BUSCAR PERFIL
========================================================= */

async function getUserProfile( // Declara a função assíncrona getUserProfile com userId.
  userId // Utiliza o valor de userId.
) { // Declara a função assíncrona getUserProfile com userId.
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
} // Encerra o bloco da função getUserProfile.


/* =========================================================
   VERIFICAR USERNAME DISPONÍVEL
========================================================= */

async function checkUsernameAvailable( // Declara a função assíncrona checkUsernameAvailable com username, userId.
  username, // Utiliza o valor de username.
  userId // Utiliza o valor de userId.
) { // Declara a função assíncrona checkUsernameAvailable com username, userId.
  const { // Define data, error como o resultado aguardado de o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e username.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e username antes de continuar.
      .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “user_id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “nome_usuario” no texto da consulta.
       * Linha 4 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        user_id,
        nome_usuario
      `)
      .ilike( // Executa a chamada que produz o resultado de supabase.from(…).select(…).ilike com o texto “nome_usuario” e username.
        "nome_usuario", // Fornece o texto “nome_usuario” à expressão atual.
        username // Utiliza o valor de username.
      ); // Encerra a chamada de supabase.from(…).select(…).ilike.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de o resultado de Array.isArray com data ou, se indisponível, data.length igual, inclusive no tipo, a 0 para decidir se executa este bloco.
    !Array.isArray(data) || // Calcula a negação de o resultado de Array.isArray com data ou, se indisponível, data.length igual, inclusive no tipo, a 0.
    data.length === 0 // Acessa data.length.
  ) { // Verifica a negação de o resultado de Array.isArray com data ou, se indisponível, data.length igual, inclusive no tipo, a 0 para decidir se executa este bloco.

    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco da condição.


  /*
    Caso o próprio usuário já possua
    exatamente esse username,
    não consideramos conflito.
  */

  const conflict = // Define conflict como a verificação de pelo menos um item de data que atende à condição.
    data.some( // Executa a chamada que produz a verificação de pelo menos um item de data que atende à condição.
      profile => // Define a função que recebe profile.
        profile.user_id !== userId // Acessa profile.user_id.
    ); // Encerra a chamada de data.some.


  return !conflict; // Retorna a negação de conflict.
} // Encerra o bloco da função checkUsernameAvailable.


/* =========================================================
   SALVAR USERNAME
========================================================= */

async function saveUsername( // Declara a função assíncrona saveUsername com user, username.
  user, // Utiliza o valor de user.
  username // Utiliza o valor de username.
) { // Declara a função assíncrona saveUsername com user, username.
  if (!user?.id) { // Verifica a negação de user.id com acesso opcional para decidir se executa este bloco.

    throw new Error( // Lança uma instância de Error com o texto “Usuário inválido.” para interromper o fluxo e informar a falha.
      "Usuário inválido." // Fornece o texto “Usuário inválido.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  const profile = // Define profile como o resultado aguardado de o resultado de getUserProfile com user.id.
    await getUserProfile( // Aguarda o resultado de getUserProfile com user.id antes de continuar.
      user.id // Acessa user.id.
    ); // Encerra a chamada de getUserProfile.


  /* =======================================================
     PERFIL JÁ EXISTE
  ======================================================= */

  if (profile) { // Verifica profile para decidir se executa este bloco.

    const { // Define error como o resultado aguardado de o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe error na operação atual.
      await supabase // Aguarda o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id antes de continuar.
        .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
        .update({ // Executa a chamada que produz a atualização dos dados um objeto com nome_usuario na tabela selecionada.
          nome_usuario: // Define a propriedade nome_usuario como username.
            username // Utiliza o valor de username.
        }) // Encerra o objeto.
        .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id.
          "user_id", // Fornece o texto “user_id” à expressão atual.
          user.id // Acessa user.id.
        ); // Encerra a chamada de supabase.from(…).update(…).eq.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    /* =====================================================
       PERFIL AINDA NÃO EXISTE
    ====================================================== */

    const { // Define error como o resultado aguardado de a inserção dos dados um objeto com user_id, nome_usuario, nome_completo, email na tabela selecionada.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe error na operação atual.
      await supabase // Aguarda a inserção dos dados um objeto com user_id, nome_usuario, nome_completo, email na tabela selecionada antes de continuar.
        .from("usuarios") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
        .insert({ // Executa a chamada que produz a inserção dos dados um objeto com user_id, nome_usuario, nome_completo, email na tabela selecionada.
          user_id: // Define a propriedade user_id como user.id.
            user.id, // Acessa user.id.

          nome_usuario: // Define a propriedade nome_usuario como username.
            username, // Utiliza o valor de username.

          nome_completo: // Define a propriedade nome_completo como user.user_metadata.full_name com acesso opcional ou, se indisponível, user.user_metadata.name com acesso opcional ou, se indisponível, null (ausência de valor).
            user.user_metadata // Acessa user.user_metadata.full_name.
              ?.full_name || // Acessa user.user_metadata.full_name.
            user.user_metadata // Acessa user.user_metadata.name.
              ?.name || // Acessa user.user_metadata.name.
            null, // Fornece null (ausência de valor) à expressão atual.

          email: // Define a propriedade email como user.email ou, se indisponível, null (ausência de valor).
            user.email || // Acessa user.email.
            null // Fornece null (ausência de valor) à expressão atual.
        }); // Encerra o objeto.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.


  /* =======================================================
     SALVAR TAMBÉM NO AUTH METADATA
  ======================================================= */

  const { // Define authError como o resultado aguardado de a atualização dos dados de autenticação no Supabase.
    error: authError // Define a propriedade error como authError.
  } = // Compõe authError na operação atual.
    await supabase.auth // Aguarda a atualização dos dados de autenticação no Supabase antes de continuar.
      .updateUser({ // Executa a chamada que produz a atualização dos dados de autenticação no Supabase.
        data: { // Define a propriedade data como um objeto com nome_usuario.
          nome_usuario: // Define a propriedade nome_usuario como username.
            username // Utiliza o valor de username.
        } // Encerra o objeto.
      }); // Encerra o objeto.


  if (authError) { // Verifica authError para decidir se executa este bloco.

    /*
      O perfil principal já foi salvo.

      Não bloqueamos o usuário caso apenas
      a atualização do metadata falhe.
    */

    console.warn( // Executa a chamada que produz o registro de o texto “Não foi possível atualizar o username no metadata:” no console.
      "Não foi possível atualizar o username no metadata:", // Fornece o texto “Não foi possível atualizar o username no metadata:” à expressão atual.
      authError // Utiliza o valor de authError.
    ); // Encerra a chamada de console.warn.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função saveUsername.


/* =========================================================
   ERRO DE USERNAME
========================================================= */

function getUsernameErrorMessage( // Declara a função getUsernameErrorMessage com error.
  error // Utiliza o valor de error.
) { // Declara a função getUsernameErrorMessage com error.
  const message = // Define message como o texto de String(…) em minúsculas.
    String( // Executa a chamada que produz o texto de String(…) em minúsculas.
      error?.message || // Acessa error.message.
      "" // Fornece o texto “” à expressão atual.
    ) // Encerra a chamada de String.
      .toLowerCase(); // Executa a chamada que produz o texto de String(…) em minúsculas.


  if ( // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “23505” ou, se indisponível, a verificação da presença de duplicate key em message ou, se indisponível, a verificação da presença de o texto “unique constraint” em message para decidir se executa este bloco.
    error?.code === "23505" || // Acessa error.code.
    message.includes( // Executa a chamada que produz a verificação da presença de o texto “duplicate key” em message.
      "duplicate key" // Fornece o texto “duplicate key” à expressão atual.
    ) || // Executa a chamada que produz a verificação da presença de o texto “duplicate key” em message.
    message.includes( // Executa a chamada que produz a verificação da presença de o texto “unique constraint” em message.
      "unique constraint" // Fornece o texto “unique constraint” à expressão atual.
    ) // Encerra a chamada de message.includes.
  ) { // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “23505” ou, se indisponível, a verificação da presença de duplicate key em message ou, se indisponível, a verificação da presença de o texto “unique constraint” em message para decidir se executa este bloco.

    return ( // Retorna o texto “Esse nome de usuário já está sendo utilizado.”.
      "Esse nome de usuário já está sendo utilizado." // Fornece o texto “Esse nome de usuário já está sendo utilizado.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  if ( // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “42501” ou, se indisponível, a verificação da presença de o texto “row-level security” em message para decidir se executa este bloco.
    error?.code === "42501" || // Acessa error.code.
    message.includes( // Executa a chamada que produz a verificação da presença de o texto “row-level security” em message.
      "row-level security" // Fornece o texto “row-level security” à expressão atual.
    ) // Encerra a chamada de message.includes.
  ) { // Verifica error.code com acesso opcional igual, inclusive no tipo, a o texto “42501” ou, se indisponível, a verificação da presença de o texto “row-level security” em message para decidir se executa este bloco.

    return ( // Retorna o texto “Não foi possível salvar seu perfil. Verifique as permissões da conta.”.
      "Não foi possível salvar seu perfil. Verifique as permissões da conta." // Fornece o texto “Não foi possível salvar seu perfil. Verifique as permissões da conta.” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.
  } // Encerra o bloco da condição.


  return ( // Retorna o texto “Não foi possível salvar seu nome de usuário. Tente novamente.”.
    "Não foi possível salvar seu nome de usuário. Tente novamente." // Fornece o texto “Não foi possível salvar seu nome de usuário. Tente novamente.” à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getUsernameErrorMessage.


/* =========================================================
   VERIFICAR USUÁRIO AUTENTICADO
========================================================= */

async function loadCurrentUser() { // Declara a função assíncrona loadCurrentUser com nenhum parâmetro.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const { // Define data, error como o resultado aguardado de a consulta da sessão atual no Supabase.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase.auth // Aguarda a consulta da sessão atual no Supabase antes de continuar.
        .getSession(); // Executa a chamada que produz a consulta da sessão atual no Supabase.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    const session = // Define session como data.session com acesso opcional ou, se indisponível, null (ausência de valor).
      data?.session || // Acessa data.session.
      null; // Fornece null (ausência de valor) à expressão atual.


    /*
      Essa página só pode ser usada
      por usuário autenticado.
    */

    if (!session?.user) { // Verifica a negação de session.user com acesso opcional para decidir se executa este bloco.

      window.location.replace( // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “login.html”.
        "login.html" // Fornece o texto “login.html” à expressão atual.
      ); // Encerra a chamada de window.location.replace.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    currentUser = // Atualiza currentUser com session.user.
      session.user; // Acessa session.user.


    /* =====================================================
       VERIFICAR SE JÁ POSSUI USERNAME
    ====================================================== */

    const profile = // Define profile como o resultado aguardado de o resultado de getUserProfile com currentUser.id.
      await getUserProfile( // Aguarda o resultado de getUserProfile com currentUser.id antes de continuar.
        currentUser.id // Acessa currentUser.id.
      ); // Encerra a chamada de getUserProfile.


    const currentUsername = // Define currentUsername como o texto de String(…) sem espaços nas extremidades.
      String( // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
        profile?.nome_usuario || // Acessa profile.nome_usuario.
        "" // Fornece o texto “” à expressão atual.
      ).trim(); // Utiliza o valor de trim.


    /*
      Se já existe username,
      não existe motivo para permanecer
      nesta página.
    */

    if (currentUsername) { // Verifica currentUsername para decidir se executa este bloco.

      window.location.replace( // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “index.html”.
        "index.html" // Fornece o texto “index.html” à expressão atual.
      ); // Encerra a chamada de window.location.replace.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    usernameInput?.focus(); // Executa a chamada que produz o resultado de usernameInput.focus.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao preparar perfil:” no console.
      "Erro ao preparar perfil:", // Fornece o texto “Erro ao preparar perfil:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível carregar sua conta. Tente novamente.” e o texto “error”.
      "Não foi possível carregar sua conta. Tente novamente.", // Fornece o texto “Não foi possível carregar sua conta. Tente novamente.” à expressão atual.
      "error" // Fornece o texto “error” à expressão atual.
    ); // Encerra a chamada de showMessage.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função loadCurrentUser.


/* =========================================================
   FORMULÁRIO
========================================================= */

form // Executa a chamada que produz o registro do evento o texto “submit” em form.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “submit” em form.
    "submit", // Fornece o texto “submit” à expressão atual.
    async event => { // Define a função assíncrona que recebe event.

      event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.


      if ( // Verifica isSaving ou, se indisponível, a negação de currentUser para decidir se executa este bloco.
        isSaving || // Calcula isSaving ou, se indisponível, a negação de currentUser.
        !currentUser // Compõe a negação de currentUser na operação atual.
      ) { // Verifica isSaving ou, se indisponível, a negação de currentUser para decidir se executa este bloco.
        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.


      clearMessage(); // Executa a chamada que produz o resultado de clearMessage.


      const username = // Define username como o resultado de normalizeUsername com usernameInput.value com acesso opcional.
        normalizeUsername( // Executa a chamada que produz o resultado de normalizeUsername com usernameInput.value com acesso opcional.
          usernameInput?.value // Acessa usernameInput.value.
        ); // Encerra a chamada de normalizeUsername.


      /* ===================================================
         VALIDAÇÃO
      ==================================================== */

      const validationError = // Define validationError como o resultado de validateUsername com username.
        validateUsername( // Executa a chamada que produz o resultado de validateUsername com username.
          username // Utiliza o valor de username.
        ); // Encerra a chamada de validateUsername.


      if (validationError) { // Verifica validationError para decidir se executa este bloco.

        showMessage( // Executa a chamada que produz o resultado de showMessage com validationError e o texto “error”.
          validationError, // Utiliza o valor de validationError.
          "error" // Fornece o texto “error” à expressão atual.
        ); // Encerra a chamada de showMessage.


        usernameInput?.focus(); // Executa a chamada que produz o resultado de usernameInput.focus.

        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.


      isSaving = // Atualiza isSaving com true (verdadeiro).
        true; // Fornece true (verdadeiro) à expressão atual.


      setLoading( // Executa a chamada que produz o resultado de setLoading com true (verdadeiro).
        true // Fornece true (verdadeiro) à expressão atual.
      ); // Encerra a chamada de setLoading.


      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

        /* =================================================
           VERIFICAR DISPONIBILIDADE
        ================================================== */

        const available = // Define available como o resultado aguardado de o resultado de checkUsernameAvailable com username e currentUser.id.
          await checkUsernameAvailable( // Aguarda o resultado de checkUsernameAvailable com username e currentUser.id antes de continuar.
            username, // Utiliza o valor de username.
            currentUser.id // Acessa currentUser.id.
          ); // Encerra a chamada de checkUsernameAvailable.


        if (!available) { // Verifica a negação de available para decidir se executa este bloco.

          showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Esse nome de usuário já está sendo utilizado.” e o texto “error”.
            "Esse nome de usuário já está sendo utilizado.", // Fornece o texto “Esse nome de usuário já está sendo utilizado.” à expressão atual.
            "error" // Fornece o texto “error” à expressão atual.
          ); // Encerra a chamada de showMessage.


          usernameInput?.focus(); // Executa a chamada que produz o resultado de usernameInput.focus.

          return; // Encerra a função sem retornar um valor.
        } // Encerra o bloco da condição.


        /* =================================================
           SALVAR
        ================================================== */

        await saveUsername( // Aguarda o resultado de saveUsername com currentUser e username antes de continuar.
          currentUser, // Utiliza o valor de currentUser.
          username // Utiliza o valor de username.
        ); // Encerra a chamada de saveUsername.


        showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Perfil concluído com sucesso!” e o texto “success”.
          "Perfil concluído com sucesso!", // Fornece o texto “Perfil concluído com sucesso!” à expressão atual.
          "success" // Fornece o texto “success” à expressão atual.
        ); // Encerra a chamada de showMessage.


        window.setTimeout( // Executa a chamada que produz o agendamento de uma função após 700.
          () => { // Define a função que recebe nenhum argumento.

            window.location.replace( // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “index.html”.
              "index.html" // Fornece o texto “index.html” à expressão atual.
            ); // Encerra a chamada de window.location.replace.

          }, // Encerra o bloco atual.
          700 // Fornece 700 à expressão atual.
        ); // Encerra a chamada de window.setTimeout.


      } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

        console.error( // Executa a chamada que produz o registro de o texto “Erro ao concluir perfil:” no console.
          "Erro ao concluir perfil:", // Fornece o texto “Erro ao concluir perfil:” à expressão atual.
          error // Utiliza o valor de error.
        ); // Encerra a chamada de console.error.


        showMessage( // Executa a chamada que produz o resultado de showMessage com o resultado de getUsernameErrorMessage com error e o texto “error”.
          getUsernameErrorMessage( // Executa a chamada que produz o resultado de getUsernameErrorMessage com error.
            error // Utiliza o valor de error.
          ), // Encerra a chamada de getUsernameErrorMessage.
          "error" // Fornece o texto “error” à expressão atual.
        ); // Encerra a chamada de showMessage.


      } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.

        isSaving = // Atualiza isSaving com false (falso).
          false; // Fornece false (falso) à expressão atual.


        setLoading( // Executa a chamada que produz o resultado de setLoading com false (falso).
          false // Fornece false (falso) à expressão atual.
        ); // Encerra a chamada de setLoading.
      } // Encerra o bloco atual.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de form.addEventListener.


/* =========================================================
   NORMALIZAR CAMPO DURANTE DIGITAÇÃO
========================================================= */

usernameInput // Executa a chamada que produz o registro do evento o texto “input” em usernameInput.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “input” em usernameInput.
    "input", // Fornece o texto “input” à expressão atual.
    () => { // Define a função que recebe nenhum argumento.

      usernameInput.value = // Atualiza usernameInput.value com a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
        usernameInput.value // Executa a chamada que produz a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
          .replace(/\s+/g, ""); // Executa a chamada que produz a substituição dos trechos de usernameInput.value que correspondem a o padrão de busca /\s+/.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de usernameInput.addEventListener.


/* =========================================================
   SAIR
========================================================= */

logoutButton // Executa a chamada que produz o registro do evento o texto “click” em logoutButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em logoutButton.
    "click", // Fornece o texto “click” à expressão atual.
    async () => { // Define a função assíncrona que recebe nenhum argumento.

      logoutButton.disabled = // Atualiza logoutButton.disabled com true (verdadeiro).
        true; // Fornece true (verdadeiro) à expressão atual.


      logoutButton.textContent = // Atualiza logoutButton.textContent com o texto “Saindo...”.
        "Saindo..."; // Fornece o texto “Saindo...” à expressão atual.


      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

        const { // Define error como o resultado aguardado de o encerramento da sessão no Supabase.
          error // Inclui a propriedade error com o valor da variável de mesmo nome.
        } = // Compõe error na operação atual.
          await supabase.auth // Aguarda o encerramento da sessão no Supabase antes de continuar.
            .signOut(); // Executa a chamada que produz o encerramento da sessão no Supabase.


        if (error) { // Verifica error para decidir se executa este bloco.
          throw error; // Lança error para interromper o fluxo e informar a falha.
        } // Encerra o bloco da condição.


        window.location.replace( // Executa a chamada que produz a substituição dos trechos de window.location que correspondem a o texto “login.html”.
          "login.html" // Fornece o texto “login.html” à expressão atual.
        ); // Encerra a chamada de window.location.replace.


      } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

        console.error( // Executa a chamada que produz o registro de o texto “Erro ao sair:” no console.
          "Erro ao sair:", // Fornece o texto “Erro ao sair:” à expressão atual.
          error // Utiliza o valor de error.
        ); // Encerra a chamada de console.error.


        showMessage( // Executa a chamada que produz o resultado de showMessage com o texto “Não foi possível sair da conta.” e o texto “error”.
          "Não foi possível sair da conta.", // Fornece o texto “Não foi possível sair da conta.” à expressão atual.
          "error" // Fornece o texto “error” à expressão atual.
        ); // Encerra a chamada de showMessage.


        logoutButton.disabled = // Atualiza logoutButton.disabled com false (falso).
          false; // Fornece false (falso) à expressão atual.


        logoutButton.textContent = // Atualiza logoutButton.textContent com o texto “Sair da conta”.
          "Sair da conta"; // Fornece o texto “Sair da conta” à expressão atual.
      } // Encerra o bloco de tratamento do erro.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de logoutButton.addEventListener.


/* =========================================================
   INICIAR
========================================================= */

loadCurrentUser(); // Executa a chamada que produz o resultado de loadCurrentUser.
