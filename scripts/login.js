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
   REDIRECIONAMENTO PÓS LOGIN
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

    /*
      Mantemos exatamente o fluxo que
      já funcionava anteriormente.

      Sincroniza o usuário na tabela
      usuarios e entra normalmente.
    */

    await upsertUserProfile(
      user
    );


    window.location.replace(
      'index.html'
    );


  } catch (err) {

    console.error(
      'Erro ao sincronizar perfil:',
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
   VALIDAR E-MAIL
========================================================= */

function validateEmail(
  email
) {
  const re =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  return re.test(
    email
  );
}


/* =========================================================
   VALIDAR SENHA
========================================================= */

function validatePassword(
  password
) {
  return (
    password.length >= 6
  );
}


/* =========================================================
   TRADUZIR ERROS DO SUPABASE
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
   ALTERAÇÕES DE AUTENTICAÇÃO
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
