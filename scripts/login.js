import {
  supabase,
  upsertUserProfile
} from './supabaseClient.js';


/* =========================================================
   ELEMENTOS
========================================================= */

const form =
  document.getElementById('login-form');

const emailInput =
  document.getElementById('email');

const passInput =
  document.getElementById('password');

const msg =
  document.getElementById('login-msg');

const submitBtn =
  document.getElementById('login-submit');

const googleBtn =
  document.getElementById('google-btn');


/* =========================================================
   CONTROLE DE REDIRECIONAMENTO
========================================================= */

/*
  Evita que:

  - submit do formulário
  - onAuthStateChange
  - redirectIfSigned

  tentem redirecionar ao mesmo tempo.
*/

let isRedirecting = false;


/* =========================================================
   MENSAGENS
========================================================= */

function showMsg(
  text,
  type = 'error'
) {
  if (!msg) {
    return;
  }

  msg.textContent = text;

  msg.className =
    'login-msg ' + type;
}


/* =========================================================
   CARREGAMENTO
========================================================= */

function setLoading(
  isLoading
) {
  if (!submitBtn) {
    return;
  }

  submitBtn.disabled =
    isLoading;

  submitBtn.textContent =
    isLoading
      ? 'ENTRANDO...'
      : 'LOGIN';
}


/* =========================================================
   VALIDAÇÕES
========================================================= */

function validateEmail(
  email
) {
  const re =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return re.test(email);
}


function validatePassword(
  password
) {
  return (
    password.length >= 6
  );
}


/* =========================================================
   TRADUÇÃO DE ERROS
========================================================= */

function translateAuthError(
  error
) {
  if (!error) {
    return 'Erro inesperado.';
  }

  const message =
    error.message
      ?.toLowerCase() || '';


  if (
    message.includes(
      'invalid login credentials'
    ) ||
    message.includes(
      'invalid credentials'
    )
  ) {
    return (
      'E-mail ou senha incorretos.'
    );
  }


  if (
    message.includes(
      'email not confirmed'
    )
  ) {
    return (
      'Confirme seu e-mail antes de entrar.'
    );
  }


  if (
    message.includes(
      'user not found'
    )
  ) {
    return (
      'Usuário não encontrado.'
    );
  }


  if (
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return (
      'Falha ao conectar ao servidor. Verifique sua conexão.'
    );
  }


  return (
    'Erro ao realizar login. Tente novamente mais tarde.'
  );
}


/* =========================================================
   BUSCAR PERFIL DO USUÁRIO
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
      .from('usuarios')
      .select(`
        id,
        user_id,
        nome_usuario,
        nome_completo,
        email
      `)
      .eq(
        'user_id',
        userId
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return data || null;
}


/* =========================================================
   SINCRONIZAR USERNAME DO AUTH METADATA
========================================================= */

/*
  O cadastro novo salva:

  user.user_metadata.nome_usuario

  Isso é importante caso a confirmação
  de e-mail esteja ativada.

  Quando o usuário finalmente entra,
  podemos copiar esse username para
  public.usuarios caso ainda esteja vazio.

  IMPORTANTE:

  Não usamos:
  - full_name
  - name
  - email

  como username automático.

  Isso evita criar nomes de usuário
  indesejados para login pelo Google.
*/

async function syncUsernameFromMetadata(
  user,
  profile
) {
  if (!user?.id) {
    return profile;
  }


  /*
    Se já existe username no banco,
    não fazemos absolutamente nada.
  */

  if (
    profile?.nome_usuario
      ?.trim()
  ) {
    return profile;
  }


  const metadataUsername =
    String(
      user.user_metadata
        ?.nome_usuario || ''
    ).trim();


  /*
    Google normalmente não terá
    nome_usuario no primeiro acesso.

    Nesse caso deixamos vazio e
    enviaremos para completar-perfil.html.
  */

  if (!metadataUsername) {
    return profile;
  }


  try {

    const {
      error
    } =
      await supabase
        .from('usuarios')
        .update({
          nome_usuario:
            metadataUsername
        })
        .eq(
          'user_id',
          user.id
        );


    if (error) {
      throw error;
    }


    /*
      Busca novamente o perfil para
      confirmar que foi atualizado.
    */

    const updatedProfile =
      await getUserProfile(
        user.id
      );


    return (
      updatedProfile ||
      profile
    );

  } catch (error) {

    console.error(
      'Erro ao sincronizar nome de usuário do metadata:',
      error
    );


    /*
      Não derrubamos o login.

      Se não foi possível sincronizar,
      o fluxo seguinte detectará que
      nome_usuario continua vazio e
      enviará para completar-perfil.
    */

    return profile;
  }
}


/* =========================================================
   DECIDIR DESTINO DO USUÁRIO
========================================================= */

function getUserDestination(
  profile
) {
  const username =
    String(
      profile?.nome_usuario || ''
    ).trim();


  /*
    Perfil completo.
  */

  if (username) {
    return 'index.html';
  }


  /*
    Primeiro acesso / usuário antigo /
    primeiro login Google.
  */

  return 'completar-perfil.html';
}


/* =========================================================
   REDIRECIONAMENTO PÓS-AUTENTICAÇÃO
========================================================= */

async function handleUserRedirect(
  user
) {
  if (
    !user ||
    isRedirecting
  ) {
    return;
  }


  isRedirecting = true;


  try {

    /* =====================================================
       1. SINCRONIZA O PERFIL EXISTENTE
    ====================================================== */

    await upsertUserProfile(
      user
    );


    /* =====================================================
       2. BUSCA O PERFIL EM public.usuarios
    ====================================================== */

    let profile =
      await getUserProfile(
        user.id
      );


    /* =====================================================
       3. RECUPERA USERNAME DO CADASTRO POR E-MAIL
          SE NECESSÁRIO
    ====================================================== */

    profile =
      await syncUsernameFromMetadata(
        user,
        profile
      );


    /* =====================================================
       4. DEFINE O DESTINO
    ====================================================== */

    const destination =
      getUserDestination(
        profile
      );


    console.log(
      'Perfil autenticado:',
      profile
    );


    console.log(
      'Destino pós-login:',
      destination
    );


    /* =====================================================
       5. REDIRECIONA
    ====================================================== */

    window.location.replace(
      destination
    );


  } catch (err) {

    console.error(
      'Erro ao sincronizar perfil ou redirecionar:',
      err
    );


    showMsg(
      'Erro ao preparar sua conta. Tente novamente.'
    );


    setLoading(false);


    if (googleBtn) {
      googleBtn.disabled =
        false;
    }


    isRedirecting = false;
  }
}


/* =========================================================
   VERIFICAR SESSÃO EXISTENTE
========================================================= */

async function redirectIfSigned() {
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


    if (
      data.session?.user
    ) {

      await handleUserRedirect(
        data.session.user
      );
    }


  } catch (err) {

    console.error(
      'Erro ao verificar sessão existente:',
      err
    );
  }
}


/* =========================================================
   LOGIN COM E-MAIL E SENHA
========================================================= */

form?.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();


    const email =
      emailInput
        ?.value
        .trim()
        .toLowerCase() || '';


    const password =
      passInput?.value || '';


    /* =====================================================
       VALIDAÇÃO
    ====================================================== */

    if (
      !email ||
      !password
    ) {

      showMsg(
        'Preencha e-mail e senha.'
      );

      return;
    }


    if (
      !validateEmail(
        email
      )
    ) {

      showMsg(
        'Digite um e-mail válido.'
      );

      return;
    }


    if (
      !validatePassword(
        password
      )
    ) {

      showMsg(
        'A senha deve possuir pelo menos 6 caracteres.'
      );

      return;
    }


    setLoading(true);


    try {

      /* ===================================================
         LOGIN
      ==================================================== */

      const {
        data,
        error
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        console.error(
          'Erro no login por e-mail/senha:',
          error
        );


        showMsg(
          translateAuthError(
            error
          )
        );


        setLoading(false);

        return;
      }


      if (!data?.user) {

        showMsg(
          'Não foi possível identificar o usuário.'
        );

        setLoading(false);

        return;
      }


      showMsg(
        'Login realizado com sucesso!',
        'success'
      );


      /* ===================================================
         VERIFICA USERNAME E REDIRECIONA
      ==================================================== */

      await handleUserRedirect(
        data.user
      );


    } catch (err) {

      console.error(
        'Erro inesperado durante o login:',
        err
      );


      showMsg(
        'Erro inesperado ao realizar login.'
      );


      setLoading(false);
    }
  }
);


/* =========================================================
   LOGIN COM GOOGLE
========================================================= */

googleBtn?.addEventListener(
  'click',
  async () => {

    try {

      /*
        Evita múltiplos cliques.
      */

      googleBtn.disabled =
        true;


      const isLocal =
        window.location.hostname ===
          '127.0.0.1' ||
        window.location.hostname ===
          'localhost';


      const redirectUrl =
        isLocal
          ? `${window.location.origin}/login.html`
          : 'https://kevinoliveiraz.github.io/Praxis/login.html';


      console.log(
        'Redirecionamento OAuth:',
        redirectUrl
      );


      const {
        error
      } =
        await supabase.auth
          .signInWithOAuth({

            provider:
              'google',

            options: {
              redirectTo:
                redirectUrl
            }
          });


      if (error) {

        console.error(
          'Erro no login com Google:',
          error
        );


        showMsg(
          translateAuthError(
            error
          )
        );


        googleBtn.disabled =
          false;
      }


    } catch (err) {

      console.error(
        'Erro inesperado no login via Google:',
        err
      );


      showMsg(
        'Falha ao conectar com o serviço do Google.'
      );


      googleBtn.disabled =
        false;
    }
  }
);


/* =========================================================
   OBSERVAR ALTERAÇÕES NA AUTENTICAÇÃO
========================================================= */

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      'Evento Auth:',
      event
    );


    /*
      Depois que o Google retorna para
      login.html, o Supabase restaura a
      sessão e dispara SIGNED_IN.

      O mesmo fluxo é utilizado para
      login por e-mail.
    */

    if (
      event === 'SIGNED_IN' &&
      session?.user
    ) {

      await handleUserRedirect(
        session.user
      );
    }
  }
);


/* =========================================================
   EXECUÇÃO INICIAL
========================================================= */

redirectIfSigned();
