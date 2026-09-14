import {
  supabase
} from "./supabaseClient.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const form =
  document.getElementById(
    "profile-form"
  );

const usernameInput =
  document.getElementById(
    "username"
  );

const messageElement =
  document.getElementById(
    "profile-msg"
  );

const submitButton =
  document.getElementById(
    "profile-submit"
  );

const logoutButton =
  document.getElementById(
    "logout-btn"
  );


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const USERNAME_REGEX =
  /^[A-Za-z0-9._]{3,30}$/;


/* =========================================================
   ESTADO
========================================================= */

let currentUser =
  null;

let isSaving =
  false;


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
   LOADING
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
      ? "SALVANDO..."
      : "SALVAR E CONTINUAR";
}


/* =========================================================
   NORMALIZAR USERNAME
========================================================= */

function normalizeUsername(
  value
) {
  return String(
    value ?? ""
  )
    .trim();
}


/* =========================================================
   VALIDAR USERNAME
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
      "Use apenas letras, números, ponto e underline."
    );
  }


  return "";
}


/* =========================================================
   BUSCAR PERFIL
========================================================= */

async function getUserProfile(
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
   VERIFICAR USERNAME DISPONÍVEL
========================================================= */

async function checkUsernameAvailable(
  username,
  userId
) {
  const {
    data,
    error
  } =
    await supabase
      .from("usuarios")
      .select(`
        user_id,
        nome_usuario
      `)
      .ilike(
        "nome_usuario",
        username
      );


  if (error) {
    throw error;
  }


  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {

    return true;
  }


  /*
    Caso o próprio usuário já possua
    exatamente esse username,
    não consideramos conflito.
  */

  const conflict =
    data.some(
      profile =>
        profile.user_id !== userId
    );


  return !conflict;
}


/* =========================================================
   SALVAR USERNAME
========================================================= */

async function saveUsername(
  user,
  username
) {
  if (!user?.id) {

    throw new Error(
      "Usuário inválido."
    );
  }


  const profile =
    await getUserProfile(
      user.id
    );


  /* =======================================================
     PERFIL JÁ EXISTE
  ======================================================= */

  if (profile) {

    const {
      error
    } =
      await supabase
        .from("usuarios")
        .update({
          nome_usuario:
            username
        })
        .eq(
          "user_id",
          user.id
        );


    if (error) {
      throw error;
    }


  } else {

    /* =====================================================
       PERFIL AINDA NÃO EXISTE
    ====================================================== */

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

          nome_completo:
            user.user_metadata
              ?.full_name ||
            user.user_metadata
              ?.name ||
            null,

          email:
            user.email ||
            null
        });


    if (error) {
      throw error;
    }
  }


  /* =======================================================
     SALVAR TAMBÉM NO AUTH METADATA
  ======================================================= */

  const {
    error: authError
  } =
    await supabase.auth
      .updateUser({
        data: {
          nome_usuario:
            username
        }
      });


  if (authError) {

    /*
      O perfil principal já foi salvo.

      Não bloqueamos o usuário caso apenas
      a atualização do metadata falhe.
    */

    console.warn(
      "Não foi possível atualizar o username no metadata:",
      authError
    );
  }
}


/* =========================================================
   ERRO DE USERNAME
========================================================= */

function getUsernameErrorMessage(
  error
) {
  const message =
    String(
      error?.message ||
      ""
    )
      .toLowerCase();


  if (
    error?.code === "23505" ||
    message.includes(
      "duplicate key"
    ) ||
    message.includes(
      "unique constraint"
    )
  ) {

    return (
      "Esse nome de usuário já está sendo utilizado."
    );
  }


  if (
    error?.code === "42501" ||
    message.includes(
      "row-level security"
    )
  ) {

    return (
      "Não foi possível salvar seu perfil. Verifique as permissões da conta."
    );
  }


  return (
    "Não foi possível salvar seu nome de usuário. Tente novamente."
  );
}


/* =========================================================
   VERIFICAR USUÁRIO AUTENTICADO
========================================================= */

async function loadCurrentUser() {
  try {

    const {
      data,
      error
    } =
      await supabase.auth
        .getSession();


    if (error) {
      throw error;
    }


    const session =
      data?.session ||
      null;


    /*
      Essa página só pode ser usada
      por usuário autenticado.
    */

    if (!session?.user) {

      window.location.replace(
        "login.html"
      );

      return;
    }


    currentUser =
      session.user;


    /* =====================================================
       VERIFICAR SE JÁ POSSUI USERNAME
    ====================================================== */

    const profile =
      await getUserProfile(
        currentUser.id
      );


    const currentUsername =
      String(
        profile?.nome_usuario ||
        ""
      ).trim();


    /*
      Se já existe username,
      não existe motivo para permanecer
      nesta página.
    */

    if (currentUsername) {

      window.location.replace(
        "index.html"
      );

      return;
    }


    usernameInput?.focus();


  } catch (error) {

    console.error(
      "Erro ao preparar perfil:",
      error
    );


    showMessage(
      "Não foi possível carregar sua conta. Tente novamente.",
      "error"
    );
  }
}


/* =========================================================
   FORMULÁRIO
========================================================= */

form
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        isSaving ||
        !currentUser
      ) {
        return;
      }


      clearMessage();


      const username =
        normalizeUsername(
          usernameInput?.value
        );


      /* ===================================================
         VALIDAÇÃO
      ==================================================== */

      const validationError =
        validateUsername(
          username
        );


      if (validationError) {

        showMessage(
          validationError,
          "error"
        );


        usernameInput?.focus();

        return;
      }


      isSaving =
        true;


      setLoading(
        true
      );


      try {

        /* =================================================
           VERIFICAR DISPONIBILIDADE
        ================================================== */

        const available =
          await checkUsernameAvailable(
            username,
            currentUser.id
          );


        if (!available) {

          showMessage(
            "Esse nome de usuário já está sendo utilizado.",
            "error"
          );


          usernameInput?.focus();

          return;
        }


        /* =================================================
           SALVAR
        ================================================== */

        await saveUsername(
          currentUser,
          username
        );


        showMessage(
          "Perfil concluído com sucesso!",
          "success"
        );


        window.setTimeout(
          () => {

            window.location.replace(
              "index.html"
            );

          },
          700
        );


      } catch (error) {

        console.error(
          "Erro ao concluir perfil:",
          error
        );


        showMessage(
          getUsernameErrorMessage(
            error
          ),
          "error"
        );


      } finally {

        isSaving =
          false;


        setLoading(
          false
        );
      }
    }
  );


/* =========================================================
   NORMALIZAR CAMPO DURANTE DIGITAÇÃO
========================================================= */

usernameInput
  ?.addEventListener(
    "input",
    () => {

      usernameInput.value =
        usernameInput.value
          .replace(/\s+/g, "");
    }
  );


/* =========================================================
   SAIR
========================================================= */

logoutButton
  ?.addEventListener(
    "click",
    async () => {

      logoutButton.disabled =
        true;


      logoutButton.textContent =
        "Saindo...";


      try {

        const {
          error
        } =
          await supabase.auth
            .signOut();


        if (error) {
          throw error;
        }


        window.location.replace(
          "login.html"
        );


      } catch (error) {

        console.error(
          "Erro ao sair:",
          error
        );


        showMessage(
          "Não foi possível sair da conta.",
          "error"
        );


        logoutButton.disabled =
          false;


        logoutButton.textContent =
          "Sair da conta";
      }
    }
  );


/* =========================================================
   INICIAR
========================================================= */

loadCurrentUser();
