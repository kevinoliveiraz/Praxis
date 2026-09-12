import {
  supabase
} from "./supabaseClient.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const form =
  document.getElementById(
    "register-form"
  );

const usernameInput =
  document.getElementById(
    "username"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const confirmPasswordInput =
  document.getElementById(
    "confirm-password"
  );

const submitButton =
  document.getElementById(
    "register-submit"
  );

const messageElement =
  document.getElementById(
    "register-msg"
  );

const googleButton =
  document.getElementById(
    "google-register-btn"
  );


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const USERNAME_REGEX =
  /^[A-Za-z0-9._]{3,30}$/;


/* =========================================================
   HELPERS
========================================================= */

function normalizeUsername(value) {
  return String(
    value ?? ""
  )
    .trim();
}


function normalizeEmail(value) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   MENSAGENS
========================================================= */

function showMessage(
  message,
  type = ""
) {
  if (!messageElement) {
    return;
  }


  messageElement.textContent =
    message;


  messageElement.classList.remove(
    "success",
    "error"
  );


  if (type) {

    messageElement.classList.add(
      type
    );
  }
}


function clearMessage() {
  showMessage("");
}


/* =========================================================
   BOTÃO DE CADASTRO
========================================================= */

function setLoading(
  loading
) {
  if (!submitButton) {
    return;
  }


  submitButton.disabled =
    loading;


  submitButton.textContent =
    loading
      ? "CRIANDO CONTA..."
      : "CRIAR CONTA";
}


/* =========================================================
   VALIDAR NOME DE USUÁRIO
========================================================= */

function validateUsername(
  username
) {
  if (!username) {

    return (
      "Digite um nome de usuário."
    );
  }


  if (
    username.length < 3
  ) {

    return (
      "O nome de usuário precisa ter pelo menos 3 caracteres."
    );
  }


  if (
    username.length > 30
  ) {

    return (
      "O nome de usuário pode ter no máximo 30 caracteres."
    );
  }


  if (
    !USERNAME_REGEX.test(
      username
    )
  ) {

    return (
      "Use apenas letras, números, ponto e underline no nome de usuário."
    );
  }


  return "";
}


/* =========================================================
   VALIDAR E-MAIL
========================================================= */

function validateEmail(
  email
) {
  if (!email) {

    return (
      "Digite seu e-mail."
    );
  }


  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);


  if (!valid) {

    return (
      "Digite um e-mail válido."
    );
  }


  return "";
}


/* =========================================================
   VALIDAR SENHA
========================================================= */

function validatePassword(
  password,
  confirmPassword
) {
  if (!password) {

    return (
      "Digite uma senha."
    );
  }


  if (
    password.length < 6
  ) {

    return (
      "A senha precisa ter pelo menos 6 caracteres."
    );
  }


  if (
    password !==
    confirmPassword
  ) {

    return (
      "As senhas não coincidem."
    );
  }


  return "";
}


/* =========================================================
   VERIFICAR NOME DE USUÁRIO
========================================================= */

async function checkUsernameAvailable(
  username
) {
  try {

    const {
      data,
      error
    } =
      await supabase
        .from("usuarios")
        .select("user_id")
        .ilike(
          "nome_usuario",
          username
        )
        .limit(1);


    /*
      Dependendo das políticas RLS,
      usuários deslogados podem não
      conseguir consultar a tabela.

      Nesse caso a validação definitiva
      continuará sendo feita pelo índice
      UNIQUE do banco.
    */

    if (error) {

      console.warn(
        "Não foi possível verificar o nome de usuário antes do cadastro:",
        error
      );


      return true;
    }


    return !(
      Array.isArray(data) &&
      data.length > 0
    );

  } catch (error) {

    console.warn(
      "Falha ao verificar nome de usuário:",
      error
    );


    return true;
  }
}


/* =========================================================
   VERIFICAR PERFIL EXISTENTE
========================================================= */

async function getExistingProfile(
  userId
) {
  if (!userId) {
    return null;
  }


  const {
    data,
    error
  } =
    await supabase
      .from("usuarios")
      .select(`
        id,
        user_id,
        nome_usuario,
        nome_completo,
        email
      `)
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return data || null;
}


/* =========================================================
   SALVAR PERFIL
========================================================= */

async function saveUserProfile({
  user,
  username,
  email
}) {
  if (!user?.id) {

    throw new Error(
      "Usuário inválido."
    );
  }


  const existingProfile =
    await getExistingProfile(
      user.id
    );


  /*
    Se o registro em public.usuarios
    já existir, atualizamos.
  */

  if (existingProfile) {

    const {
      error
    } =
      await supabase
        .from("usuarios")
        .update({
          nome_usuario:
            username,

          email:
            email
        })
        .eq(
          "user_id",
          user.id
        );


    if (error) {
      throw error;
    }


    return;
  }


  /*
    Se ainda não existir,
    criamos o perfil.
  */

  const {
    error
  } =
    await supabase
      .from("usuarios")
      .insert({
        user_id:
          user.id,

        nome_usuario:
          username,

        email:
          email,

        nome_completo:
          user.user_metadata
            ?.full_name ||
          user.user_metadata
            ?.name ||
          null
      });


  if (error) {
    throw error;
  }
}


/* =========================================================
   TRATAR ERROS DE PERFIL
========================================================= */

function getProfileErrorMessage(
  error
) {
  const message =
    String(
      error?.message ||
      ""
    )
      .toLowerCase();


  /*
    PostgreSQL:
    unique violation.
  */

  if (
    error?.code === "23505" ||
    message.includes(
      "duplicate key"
    )
  ) {

    return (
      "Esse nome de usuário já está sendo utilizado."
    );
  }


  return (
    "A conta foi criada, mas não foi possível concluir o perfil. Entre novamente para finalizar seu cadastro."
  );
}


/* =========================================================
   CADASTRO COM E-MAIL E SENHA
========================================================= */

async function registerWithEmail(
  event
) {
  event.preventDefault();


  if (
    !form ||
    !usernameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput
  ) {
    return;
  }


  clearMessage();


  const username =
    normalizeUsername(
      usernameInput.value
    );


  const email =
    normalizeEmail(
      emailInput.value
    );


  const password =
    passwordInput.value;


  const confirmPassword =
    confirmPasswordInput.value;


  /* =======================================================
     VALIDAÇÕES
  ======================================================= */

  const usernameError =
    validateUsername(
      username
    );


  if (usernameError) {

    showMessage(
      usernameError,
      "error"
    );


    usernameInput.focus();

    return;
  }


  const emailError =
    validateEmail(
      email
    );


  if (emailError) {

    showMessage(
      emailError,
      "error"
    );


    emailInput.focus();

    return;
  }


  const passwordError =
    validatePassword(
      password,
      confirmPassword
    );


  if (passwordError) {

    showMessage(
      passwordError,
      "error"
    );


    passwordInput.focus();

    return;
  }


  setLoading(true);


  try {

    /* =====================================================
       VERIFICAR USERNAME
    ====================================================== */

    const usernameAvailable =
      await checkUsernameAvailable(
        username
      );


    if (!usernameAvailable) {

      showMessage(
        "Esse nome de usuário já está sendo utilizado.",
        "error"
      );


      usernameInput.focus();

      return;
    }


    /* =====================================================
       CRIAR CONTA NO SUPABASE AUTH
    ====================================================== */

    const {
      data,
      error
    } =
      await supabase
        .auth
        .signUp({
          email,
          password,

          options: {

            /*
              Salvamos também no metadata.

              Isso garante que o nome escolhido
              continue associado ao usuário mesmo
              quando a confirmação de e-mail
              estiver habilitada.
            */

            data: {
              nome_usuario:
                username
            }
          }
        });


    if (error) {
      throw error;
    }


    const user =
      data?.user ||
      null;


    const session =
      data?.session ||
      null;


    if (!user) {

      throw new Error(
        "O Supabase não retornou o usuário criado."
      );
    }


    /* =====================================================
       SE JÁ EXISTE SESSÃO
       SALVA O PERFIL AGORA
    ====================================================== */

    if (session) {

      try {

        await saveUserProfile({
          user,
          username,
          email
        });

      } catch (profileError) {

        console.error(
          "Erro ao salvar perfil:",
          profileError
        );


        showMessage(
          getProfileErrorMessage(
            profileError
          ),
          "error"
        );


        return;
      }


      showMessage(
        "Conta criada com sucesso! Redirecionando...",
        "success"
      );


      window.setTimeout(
        () => {

          window.location.href =
            "index.html";

        },
        900
      );


      return;
    }


    /* =====================================================
       CONFIRMAÇÃO DE E-MAIL ATIVADA
    ====================================================== */

    form.reset();


    showMessage(
      "Conta criada! Confira seu e-mail para confirmar o cadastro. Depois, faça login normalmente.",
      "success"
    );


  } catch (error) {

    console.error(
      "Erro ao criar conta:",
      error
    );


    const message =
      String(
        error?.message ||
        ""
      )
        .toLowerCase();


    if (
      message.includes(
        "user already registered"
      ) ||
      message.includes(
        "already registered"
      )
    ) {

      showMessage(
        "Já existe uma conta cadastrada com este e-mail.",
        "error"
      );


    } else if (
      message.includes(
        "password"
      )
    ) {

      showMessage(
        "A senha não atende aos requisitos de segurança.",
        "error"
      );


    } else if (
      message.includes(
        "email"
      )
    ) {

      showMessage(
        "Não foi possível utilizar este e-mail.",
        "error"
      );


    } else {

      showMessage(
        "Não foi possível criar sua conta. Tente novamente.",
        "error"
      );
    }


  } finally {

    setLoading(false);
  }
}


/* =========================================================
   URL DE REDIRECIONAMENTO GOOGLE
========================================================= */

function getGoogleRedirectUrl() {
  const isLocal =
    window.location.hostname ===
      "127.0.0.1" ||
    window.location.hostname ===
      "localhost";


  /*
    Nesta etapa o Google volta para
    login.html.

    Na próxima etapa vamos fazer o
    login verificar se nome_usuario
    existe e, se estiver vazio,
    redirecionar para completar-perfil.html.
  */

  if (isLocal) {

    return (
      `${window.location.origin}/login.html`
    );
  }


  return (
    "https://kevinoliveiraz.github.io/Praxis/login.html"
  );
}


/* =========================================================
   CADASTRO / LOGIN COM GOOGLE
========================================================= */

async function registerWithGoogle() {
  clearMessage();


  if (googleButton) {

    googleButton.disabled =
      true;
  }


  try {

    const redirectUrl =
      getGoogleRedirectUrl();


    const {
      error
    } =
      await supabase
        .auth
        .signInWithOAuth({
          provider:
            "google",

          options: {
            redirectTo:
              redirectUrl
          }
        });


    if (error) {
      throw error;
    }


  } catch (error) {

    console.error(
      "Erro ao continuar com Google:",
      error
    );


    showMessage(
      "Não foi possível continuar com o Google. Tente novamente.",
      "error"
    );


    if (googleButton) {

      googleButton.disabled =
        false;
    }
  }
}


/* =========================================================
   NORMALIZAR USERNAME ENQUANTO DIGITA
========================================================= */

usernameInput
  ?.addEventListener(
    "input",
    () => {

      /*
        Remove espaços automaticamente.

        Não convertemos para minúsculas,
        porque o usuário pode preferir
        visualizar letras maiúsculas.

        O índice UNIQUE no Supabase já
        considera Kevin e kevin iguais.
      */

      usernameInput.value =
        usernameInput.value
          .replace(/\s+/g, "");
    }
  );


/* =========================================================
   EVENTOS
========================================================= */

form
  ?.addEventListener(
    "submit",
    registerWithEmail
  );


googleButton
  ?.addEventListener(
    "click",
    registerWithGoogle
  );
