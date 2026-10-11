import { // Importa supabase, escapeHtml do módulo ./supabaseClient.js.
  supabase, // Utiliza o valor de supabase.
  escapeHtml // Utiliza o valor de escapeHtml.
} from "./supabaseClient.js"; // Fornece o texto “./supabaseClient.js” à expressão atual.


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

/* =========================================================
   IDENTIFICAR O CURSO PELA URL
========================================================= */

function getCourseIdFromUrl() { // cria uma função que descobre qual curso deve ser carregado a partir da URL
  const params = // cria uma constante para armazenar os parâmetros presentes na URL
    new URLSearchParams( // cria um objeto próprio do navegador para leitura dos parâmetros da URL
      window.location.search // envia somente a parte da URL que começa após o caractere ?
    ); // encerra a criação do leitor de parâmetros

  const courseId = // cria uma constante que armazenará o identificador numérico do curso
    Number( // converte o valor recebido pela URL para o tipo Number
      params.get("id") // lê o parâmetro chamado id, como em curso.html?id=1
    ); // encerra a conversão para número

  return ( // retorna o ID somente quando ele for um número inteiro positivo
    Number.isInteger(courseId) && // verifica se o valor convertido é um número inteiro
    courseId > 0 // verifica se o identificador é maior que zero
  ) // Encerra a expressão ou função iniciada acima.
    ? courseId // devolve o ID válido para ser usado nas consultas do Supabase
    : null; // devolve null quando a URL não contém um ID de curso válido
} // encerra a função que identifica o curso pela URL

const COURSE_ID = // cria a constante usada por toda a página para identificar o curso atual
  getCourseIdFromUrl(); // executa a leitura do parâmetro id assim que o módulo JavaScript é carregado

const SLIDES_BUCKET = "slides"; // Define SLIDES_BUCKET como o texto “slides”.
const MATERIALS_BUCKET = "materiais"; // Define MATERIALS_BUCKET como o texto “materiais”.

const SIGNED_URL_EXPIRES_IN = 60 * 60; // Define SIGNED_URL_EXPIRES_IN como 60 vezes 60.
const SLIDE_TRANSITION_MS = 280; // Define SLIDE_TRANSITION_MS como 280.

const COURSE_HISTORY_KEY = // Define COURSE_HISTORY_KEY como o texto “praxisCourseView”.
  "praxisCourseView"; // Fornece o texto “praxisCourseView” à expressão atual.


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) => // Define $ como uma função que recebe id.
  document.getElementById(id); // Executa a chamada que produz o elemento cujo ID é id.


/* =========================================================
   ESTADO
========================================================= */

let currentUser = null; // Define currentUser como null (ausência de valor).

let course = null; // Define course como null (ausência de valor).

let modules = []; // Define modules como uma lista vazia.
let lessons = []; // Define lessons como uma lista vazia.
let slides = []; // Define slides como uma lista vazia.
let materials = []; // Define materials como uma lista vazia.
let progressRows = []; // Define progressRows como uma lista vazia.


/* =========================================================
   MAPAS
========================================================= */

const slidesByLesson = new Map(); // Define slidesByLesson como uma instância de Map.
const materialsByLesson = new Map(); // Define materialsByLesson como uma instância de Map.
const progressByLesson = new Map(); // Define progressByLesson como uma instância de Map.


/* =========================================================
   NAVEGAÇÃO
========================================================= */

let currentLessonIndex = 0; // Define currentLessonIndex como 0.
let currentSlideIndex = 0; // Define currentSlideIndex como 0.

let slideRenderVersion = 0; // Define slideRenderVersion como 0.

let currentCourseView = // Define currentCourseView como o texto “home”.
  "home"; // Fornece o texto “home” à expressão atual.

let courseHistoryReady = // Define courseHistoryReady como false (falso).
  false; // Fornece false (falso) à expressão atual.


/* =========================================================
   TRANSIÇÃO DOS SLIDES
========================================================= */

let isSlideTransitioning = false; // Define isSlideTransitioning como false (falso).

let activeSlideLayer = 0; // Define activeSlideLayer como 0.
let visibleSlideKey = ""; // Define visibleSlideKey como o texto “”.


/* =========================================================
   TELA CHEIA
========================================================= */

let usingFullscreenFallback = false; // Define usingFullscreenFallback como false (falso).


/* =========================================================
   CACHE
========================================================= */

const slideUrlCache = new Map(); // Define slideUrlCache como uma instância de Map.

const preloadedSlideUrls = // Define preloadedSlideUrls como uma instância de Set.
  new Set(); // Cria uma instância de Set.


/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value) { // Declara a função normalizeText com value.
  return String(value ?? "").trim(); // Retorna o texto de String(…) sem espaços nas extremidades.
} // Encerra o bloco da função normalizeText.


function normalizeNumber( // Declara a função normalizeNumber com value, fallback.
  value, // Utiliza o valor de value.
  fallback = 0 // Utiliza o valor de fallback.
) { // Declara a função normalizeNumber com value, fallback.
  const parsed = // Define parsed como a conversão de value em número.
    Number(value); // Executa a chamada que produz a conversão de value em número.

  return Number.isFinite(parsed) // Retorna parsed se a verificação de que parsed é um número finito; caso contrário, fallback.
    ? parsed // Utiliza o valor de parsed.
    : fallback; // Utiliza o valor de fallback.
} // Encerra o bloco da função normalizeNumber.


function isHttpUrl(value) { // Declara a função isHttpUrl com value.
  const text = // Define text como o resultado de normalizeText com value.
    normalizeText(value); // Executa a chamada que produz o resultado de normalizeText com value.

  return ( // Retorna a verificação do início de text com o texto “https://” ou, se indisponível, a verificação do início de text com o texto “http://”.
    text.startsWith("https://") || // Executa a chamada que produz a verificação do início de text com o texto “https://”.
    text.startsWith("http://") // Executa a chamada que produz a verificação do início de text com o texto “http://”.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função isHttpUrl.


function wait(ms) { // Declara a função wait com ms.
  return new Promise( // Retorna uma instância de Promise com uma função que recebe resolve.
    (resolve) => { // Define a função que recebe resolve.
      window.setTimeout( // Executa a chamada que produz o agendamento de uma função após ms.
        resolve, // Utiliza o valor de resolve.
        ms // Utiliza o valor de ms.
      ); // Encerra a chamada de window.setTimeout.
    } // Encerra o bloco atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função wait.


/* =========================================================
   HISTÓRICO INTERNO DO CURSO
========================================================= */

function getCourseHistoryState() { // Declara a função getCourseHistoryState com nenhum parâmetro.
  return ( // Retorna window.history.state[COURSE_HISTORY_KEY] com acesso opcional ou, se indisponível, null (ausência de valor).
    window.history.state?.[ // Acessa window.history.state[COURSE_HISTORY_KEY].
      COURSE_HISTORY_KEY // Utiliza o valor de COURSE_HISTORY_KEY.
    ] || // Acessa window.history.state[COURSE_HISTORY_KEY] com acesso opcional.
    null // Fornece null (ausência de valor) à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getCourseHistoryState.


function isCourseHistoryState( // Declara a função isCourseHistoryState com state.
  state // Utiliza o valor de state.
) { // Declara a função isCourseHistoryState com state.
  return ( // Retorna state e a conversão de state.courseId em número igual, inclusive no tipo, a COURSE_ID.
    state && // Calcula state e a conversão de state.courseId em número igual, inclusive no tipo, a COURSE_ID.
    Number(state.courseId) === // Executa a chamada que produz a conversão de state.courseId em número.
      COURSE_ID // Utiliza o valor de COURSE_ID.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função isCourseHistoryState.


/* =========================================================
   ESTADO HOME
========================================================= */

function createHomeHistoryState() { // Declara a função createHomeHistoryState com nenhum parâmetro.
  return { // Retorna um objeto com courseId, view.
    courseId: // Define a propriedade courseId como COURSE_ID.
      COURSE_ID, // Utiliza o valor de COURSE_ID.

    view: // Define a propriedade view como o texto “home”.
      "home" // Fornece o texto “home” à expressão atual.
  }; // Encerra o objeto.
} // Encerra o bloco da função createHomeHistoryState.


/* =========================================================
   ESTADO AULA
========================================================= */

function createLessonHistoryState( // Declara a função createLessonHistoryState com lessonIndex, slideIndex.
  lessonIndex, // Utiliza o valor de lessonIndex.
  slideIndex = 0 // Utiliza o valor de slideIndex.
) { // Declara a função createLessonHistoryState com lessonIndex, slideIndex.
  return { // Retorna um objeto com courseId, view, lessonIndex, slideIndex.
    courseId: // Define a propriedade courseId como COURSE_ID.
      COURSE_ID, // Utiliza o valor de COURSE_ID.

    view: // Define a propriedade view como o texto “lesson”.
      "lesson", // Fornece o texto “lesson” à expressão atual.

    lessonIndex: // Define a propriedade lessonIndex como o resultado de normalizeNumber com lessonIndex e 0.
      normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com lessonIndex e 0.
        lessonIndex, // Utiliza o valor de lessonIndex.
        0 // Fornece 0 à expressão atual.
      ), // Encerra a chamada de normalizeNumber.

    slideIndex: // Define a propriedade slideIndex como o resultado de normalizeNumber com slideIndex e 0.
      normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com slideIndex e 0.
        slideIndex, // Utiliza o valor de slideIndex.
        0 // Fornece 0 à expressão atual.
      ) // Encerra a chamada de normalizeNumber.
  }; // Encerra o objeto.
} // Encerra o bloco da função createLessonHistoryState.


/* =========================================================
   SUBSTITUIR ESTADO
========================================================= */

function replaceCourseHistoryState( // Declara a função replaceCourseHistoryState com courseState.
  courseState // Utiliza o valor de courseState.
) { // Declara a função replaceCourseHistoryState com courseState.
  window.history.replaceState( // Executa a chamada que produz o resultado de window.history.replaceState com um objeto com expressão, COURSE_HISTORY_KEY e o texto “”.
    { // Inicia um objeto com expressão, COURSE_HISTORY_KEY.
      ...(window.history.state || {}), // Expande window.history.state ou, se indisponível, um objeto vazio dentro da lista ou do objeto.

      [COURSE_HISTORY_KEY]: // Define a propriedade COURSE_HISTORY_KEY como courseState.
        courseState // Utiliza o valor de courseState.
    }, // Encerra o objeto.
    "", // Fornece o texto “” à expressão atual.
    window.location.href // Acessa window.location.href.
  ); // Encerra a chamada de window.history.replaceState.
} // Encerra o bloco da função replaceCourseHistoryState.


/* =========================================================
   ADICIONAR ESTADO
========================================================= */

function pushCourseHistoryState( // Declara a função pushCourseHistoryState com courseState.
  courseState // Utiliza o valor de courseState.
) { // Declara a função pushCourseHistoryState com courseState.
  window.history.pushState( // Executa a chamada que produz o resultado de window.history.pushState com um objeto com expressão, COURSE_HISTORY_KEY e o texto “”.
    { // Inicia um objeto com expressão, COURSE_HISTORY_KEY.
      ...(window.history.state || {}), // Expande window.history.state ou, se indisponível, um objeto vazio dentro da lista ou do objeto.

      [COURSE_HISTORY_KEY]: // Define a propriedade COURSE_HISTORY_KEY como courseState.
        courseState // Utiliza o valor de courseState.
    }, // Encerra o objeto.
    "", // Fornece o texto “” à expressão atual.
    window.location.href // Acessa window.location.href.
  ); // Encerra a chamada de window.history.pushState.
} // Encerra o bloco da função pushCourseHistoryState.


/* =========================================================
   INICIALIZAR HISTÓRICO
========================================================= */

function initializeCourseHistory() { // Declara a função initializeCourseHistory com nenhum parâmetro.
  if ( // Verifica courseHistoryReady para decidir se executa este bloco.
    courseHistoryReady // Utiliza o valor de courseHistoryReady.
  ) { // Verifica courseHistoryReady para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const existingState = // Define existingState como o resultado de getCourseHistoryState.
    getCourseHistoryState(); // Executa a chamada que produz o resultado de getCourseHistoryState.


  /*
    Se já existe um estado válido
    desta página, preservamos.

    Isso é importante quando o
    navegador usa voltar/avançar.
  */

  if ( // Verifica a negação de o resultado de isCourseHistoryState com existingState para decidir se executa este bloco.
    !isCourseHistoryState( // Compõe a negação de o resultado de isCourseHistoryState com existingState na operação atual.
      existingState // Utiliza o valor de existingState.
    ) // Encerra a chamada de isCourseHistoryState.
  ) { // Verifica a negação de o resultado de isCourseHistoryState com existingState para decidir se executa este bloco.

    replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com o resultado de createHomeHistoryState.
      createHomeHistoryState() // Executa a chamada que produz o resultado de createHomeHistoryState.
    ); // Encerra a chamada de replaceCourseHistoryState.
  } // Encerra o bloco da condição.


  courseHistoryReady = // Atualiza courseHistoryReady com true (verdadeiro).
    true; // Fornece true (verdadeiro) à expressão atual.
} // Encerra o bloco da função initializeCourseHistory.


/* =========================================================
   ABRIR AULA CRIANDO ETAPA
========================================================= */

async function openLessonFromUser( // Declara a função assíncrona openLessonFromUser com lessonIndex, slideIndex.
  lessonIndex, // Utiliza o valor de lessonIndex.
  slideIndex = 0 // Utiliza o valor de slideIndex.
) { // Declara a função assíncrona openLessonFromUser com lessonIndex, slideIndex.
  if ( // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    lessonIndex < 0 || // Calcula lessonIndex menor que 0.
    lessonIndex >= lessons.length // Calcula lessonIndex maior ou igual a lessons.length.
  ) { // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com lessonIndex na operação atual.
      lessonIndex // Utiliza o valor de lessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const state = // Define state como o resultado de createLessonHistoryState com lessonIndex e slideIndex.
    createLessonHistoryState( // Executa a chamada que produz o resultado de createLessonHistoryState com lessonIndex e slideIndex.
      lessonIndex, // Utiliza o valor de lessonIndex.
      slideIndex // Utiliza o valor de slideIndex.
    ); // Encerra a chamada de createLessonHistoryState.


  /*
    HOME -> AULA

    Criamos uma nova entrada.
    Assim o voltar retorna à home.
  */

  if ( // Verifica currentCourseView igual, inclusive no tipo, a o texto “home” para decidir se executa este bloco.
    currentCourseView === // Calcula currentCourseView igual, inclusive no tipo, a o texto “home”.
    "home" // Fornece o texto “home” à expressão atual.
  ) { // Verifica currentCourseView igual, inclusive no tipo, a o texto “home” para decidir se executa este bloco.

    pushCourseHistoryState( // Executa a chamada que produz o resultado de pushCourseHistoryState com state.
      state // Utiliza o valor de state.
    ); // Encerra a chamada de pushCourseHistoryState.

  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    /*
      AULA -> OUTRA AULA

      Não criamos várias entradas
      consecutivas de aula.

      Apenas atualizamos a etapa
      atual para continuar tendo:

      Aula -> Home -> Catálogo.
    */

    replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com state.
      state // Utiliza o valor de state.
    ); // Encerra a chamada de replaceCourseHistoryState.
  } // Encerra o bloco da condição.


  await selectLesson( // Aguarda o resultado de selectLesson com lessonIndex e slideIndex antes de continuar.
    lessonIndex, // Utiliza o valor de lessonIndex.
    slideIndex // Utiliza o valor de slideIndex.
  ); // Encerra a chamada de selectLesson.
} // Encerra o bloco da função openLessonFromUser.


/* =========================================================
   VOLTAR PELO HISTÓRICO
========================================================= */

function goBackInHistory() { // Declara a função goBackInHistory com nenhum parâmetro.
  /*
    Dentro de uma aula existe
    obrigatoriamente a entrada
    anterior da home do curso.
  */

  if ( // Verifica currentCourseView igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.
    currentCourseView === // Calcula currentCourseView igual, inclusive no tipo, a o texto “lesson”.
    "lesson" // Fornece o texto “lesson” à expressão atual.
  ) { // Verifica currentCourseView igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.

    window.history.back(); // Executa a chamada que produz o resultado de window.history.back.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  /*
    Na home, se chegamos aqui através
    de outra página do próprio site,
    continuamos o histórico normalmente.
  */

  let hasUsefulReferrer = // Define hasUsefulReferrer como false (falso).
    false; // Fornece false (falso) à expressão atual.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    if (document.referrer) { // Verifica document.referrer para decidir se executa este bloco.

      const referrerUrl = // Define referrerUrl como uma instância de URL com document.referrer.
        new URL( // Cria uma instância de URL com document.referrer.
          document.referrer // Acessa document.referrer.
        ); // Encerra a expressão ou função iniciada acima.


      hasUsefulReferrer = // Atualiza hasUsefulReferrer com referrerUrl.origin igual, inclusive no tipo, a window.location.origin.
        referrerUrl.origin === // Acessa referrerUrl.origin.
        window.location.origin; // Acessa window.location.origin.
    } // Encerra o bloco da condição.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.debug( // Executa a chamada que produz o registro de o texto “Não foi possível analisar o referrer:” no console.
      "Não foi possível analisar o referrer:", // Fornece o texto “Não foi possível analisar o referrer:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.debug.
  } // Encerra o bloco de tratamento do erro.


  if ( // Verifica hasUsefulReferrer e window.history.length maior que 1 para decidir se executa este bloco.
    hasUsefulReferrer && // Calcula hasUsefulReferrer e window.history.length maior que 1.
    window.history.length > 1 // Acessa window.history.length.
  ) { // Verifica hasUsefulReferrer e window.history.length maior que 1 para decidir se executa este bloco.

    window.history.back(); // Executa a chamada que produz o resultado de window.history.back.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  /*
    Página aberta diretamente:
    fallback para o catálogo.
  */

  window.location.href = // Atualiza window.location.href com o texto “index.html”.
    "index.html"; // Fornece o texto “index.html” à expressão atual.
} // Encerra o bloco da função goBackInHistory.


/* =========================================================
   CURSO PADRÃO
========================================================= */

function getDefaultCourse() { // Declara a função getDefaultCourse com nenhum parâmetro.
  return { // Retorna um objeto com id, nome, descricao, categoria.
    id: COURSE_ID, // Define a propriedade id como COURSE_ID.

    nome: // Define a propriedade nome como o texto “Curso Praxis”.
      "Curso Praxis", // Fornece o texto “Curso Praxis” à expressão atual.

    descricao: // Define a propriedade descricao como o texto “Conteúdo prático do curso selecionado.”.
      "Conteúdo prático do curso selecionado.", // Fornece o texto “Conteúdo prático do curso selecionado.” à expressão atual.

    categoria: // Define a propriedade categoria como o texto “Curso”.
      "Curso" // Fornece o texto “Curso” à expressão atual.
  }; // Encerra o objeto.
} // Encerra o bloco da função getDefaultCourse.


/* =========================================================
   STORAGE
========================================================= */

async function getStorageUrl( // Declara a função assíncrona getStorageUrl com bucket, path.
  bucket, // Utiliza o valor de bucket.
  path // Utiliza o valor de path.
) { // Declara a função assíncrona getStorageUrl com bucket, path.
  const filePath = // Define filePath como o resultado de normalizeText com path.
    normalizeText(path); // Executa a chamada que produz o resultado de normalizeText com path.


  if (!filePath) { // Verifica a negação de filePath para decidir se executa este bloco.
    return ""; // Retorna o texto “”.
  } // Encerra o bloco da condição.


  if (isHttpUrl(filePath)) { // Verifica o resultado de isHttpUrl com filePath para decidir se executa este bloco.
    return filePath; // Retorna filePath.
  } // Encerra o bloco da condição.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const { // Define data, error como o resultado aguardado de uma URL temporária autorizada para filePath.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase // Aguarda uma URL temporária autorizada para filePath antes de continuar.
        .storage // Acessa supabase.storage.
        .from(bucket) // Executa a chamada que produz a referência à tabela ou ao bucket bucket.
        .createSignedUrl( // Executa a chamada que produz uma URL temporária autorizada para filePath.
          filePath, // Utiliza o valor de filePath.
          SIGNED_URL_EXPIRES_IN // Utiliza o valor de SIGNED_URL_EXPIRES_IN.
        ); // Encerra a chamada de supabase.storage.from(…).createSignedUrl.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    return ( // Retorna data.signedUrl com acesso opcional ou, se indisponível, o texto “”.
      data?.signedUrl || // Acessa data.signedUrl.
      "" // Fornece o texto “” à expressão atual.
    ); // Encerra a expressão ou função iniciada acima.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de um texto montado com 2 valores dinâmicos no console.
      `Erro ao gerar URL do Storage (${bucket}/${filePath}):`, // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    return ""; // Retorna o texto “”.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função getStorageUrl.


/* =========================================================
   URL DO SLIDE
========================================================= */

async function getSlideUrl(slide) { // Declara a função assíncrona getSlideUrl com slide.
  if (!slide) { // Verifica a negação de slide para decidir se executa este bloco.
    return ""; // Retorna o texto “”.
  } // Encerra o bloco da condição.


  const path = // Define path como o resultado de normalizeText com slide.imagem_path.
    normalizeText( // Executa a chamada que produz o resultado de normalizeText com slide.imagem_path.
      slide.imagem_path // Acessa slide.imagem_path.
    ); // Encerra a chamada de normalizeText.


  if (!path) { // Verifica a negação de path para decidir se executa este bloco.
    return ""; // Retorna o texto “”.
  } // Encerra o bloco da condição.


  if ( // Verifica a verificação da chave path em slideUrlCache para decidir se executa este bloco.
    slideUrlCache.has(path) // Executa a chamada que produz a verificação da chave path em slideUrlCache.
  ) { // Verifica a verificação da chave path em slideUrlCache para decidir se executa este bloco.

    return slideUrlCache.get( // Retorna o valor associado à chave path em slideUrlCache.
      path // Utiliza o valor de path.
    ); // Encerra a chamada de slideUrlCache.get.
  } // Encerra o bloco da condição.


  const url = // Define url como o resultado aguardado de o resultado de getStorageUrl com SLIDES_BUCKET e path.
    await getStorageUrl( // Aguarda o resultado de getStorageUrl com SLIDES_BUCKET e path antes de continuar.
      SLIDES_BUCKET, // Utiliza o valor de SLIDES_BUCKET.
      path // Utiliza o valor de path.
    ); // Encerra a chamada de getStorageUrl.


  if (url) { // Verifica url para decidir se executa este bloco.

    slideUrlCache.set( // Executa a chamada que produz a associação de path ao valor url em slideUrlCache.
      path, // Utiliza o valor de path.
      url // Utiliza o valor de url.
    ); // Encerra a chamada de slideUrlCache.set.
  } // Encerra o bloco da condição.


  return url; // Retorna url.
} // Encerra o bloco da função getSlideUrl.


/* =========================================================
   PRÉ-CARREGAR IMAGEM
========================================================= */

function preloadImage(url) { // Declara a função preloadImage com url.
  if (!url) { // Verifica a negação de url para decidir se executa este bloco.

    return Promise.reject( // Retorna o resultado de Promise.reject com uma instância de Error com o texto “URL do slide vazia.”.
      new Error( // Cria uma instância de Error com o texto “URL do slide vazia.”.
        "URL do slide vazia." // Fornece o texto “URL do slide vazia.” à expressão atual.
      ) // Encerra a expressão ou função iniciada acima.
    ); // Encerra a chamada de Promise.reject.
  } // Encerra o bloco da condição.


  if ( // Verifica a verificação da chave url em preloadedSlideUrls para decidir se executa este bloco.
    preloadedSlideUrls.has(url) // Executa a chamada que produz a verificação da chave url em preloadedSlideUrls.
  ) { // Verifica a verificação da chave url em preloadedSlideUrls para decidir se executa este bloco.

    return Promise.resolve(); // Retorna o resultado de Promise.resolve.
  } // Encerra o bloco da condição.


  return new Promise( // Retorna uma instância de Promise com uma função que recebe resolve, reject.
    ( // Define a função que recebe resolve, reject.
      resolve, // Utiliza o valor de resolve.
      reject // Utiliza o valor de reject.
    ) => { // Define a função que recebe resolve, reject.

      const image = // Define image como uma instância de Image.
        new Image(); // Cria uma instância de Image.


      image.decoding = // Atualiza image.decoding com o texto “async”.
        "async"; // Fornece o texto “async” à expressão atual.


      image.onload = () => { // Atualiza image.onload com uma função que recebe nenhum argumento.

        preloadedSlideUrls.add( // Executa a chamada que produz o resultado de preloadedSlideUrls.add com url.
          url // Utiliza o valor de url.
        ); // Encerra a chamada de preloadedSlideUrls.add.


        resolve(); // Executa a chamada que produz o resultado de resolve.
      }; // Encerra o bloco atual.


      image.onerror = () => { // Atualiza image.onerror com uma função que recebe nenhum argumento.

        reject( // Executa a chamada que produz o resultado de reject com uma instância de Error com um texto montado com 1 valor dinâmico.
          new Error( // Cria uma instância de Error com um texto montado com 1 valor dinâmico.
            `Não foi possível carregar ${url}` // Fornece um texto montado com 1 valor dinâmico à expressão atual.
          ) // Encerra a expressão ou função iniciada acima.
        ); // Encerra a chamada de reject.
      }; // Encerra o bloco atual.


      image.src = // Atualiza image.src com url.
        url; // Utiliza o valor de url.
    } // Encerra o bloco atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função preloadImage.


/* =========================================================
   VIEW DA AULA
========================================================= */

function getLessonView() { // Declara a função getLessonView com nenhum parâmetro.
  return ( // Retorna o resultado de $ com o texto “lesson-view” ou, se indisponível, o primeiro elemento que corresponde ao seletor o texto “.lesson-main”.
    $("lesson-view") || // Executa a chamada que produz o resultado de $ com o texto “lesson-view”.
    document.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.lesson-main”.
      ".lesson-main" // Fornece o texto “.lesson-main” à expressão atual.
    ) // Encerra a chamada de document.querySelector.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getLessonView.


/* =========================================================
   CRIAR HOME DO CURSO
========================================================= */

function ensureCourseHome() { // Declara a função ensureCourseHome com nenhum parâmetro.
  let home = // Define home como o resultado de $ com o texto “course-home”.
    $("course-home"); // Executa a chamada que produz o resultado de $ com o texto “course-home”.


  if (home) { // Verifica home para decidir se executa este bloco.
    return home; // Retorna home.
  } // Encerra o bloco da condição.


  const lessonView = // Define lessonView como o resultado de getLessonView.
    getLessonView(); // Executa a chamada que produz o resultado de getLessonView.


  if (!lessonView) { // Verifica a negação de lessonView para decidir se executa este bloco.

    console.error( // Executa a chamada que produz o registro de o texto “Não foi possível encontrar .lesson-main.” no console.
      "Não foi possível encontrar .lesson-main." // Fornece o texto “Não foi possível encontrar .lesson-main.” à expressão atual.
    ); // Encerra a chamada de console.error.

    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  lessonView.id = // Atualiza lessonView.id com o texto “lesson-view”.
    "lesson-view"; // Fornece o texto “lesson-view” à expressão atual.


  home = // Atualiza home com um novo elemento HTML o texto “section”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “section”.
      "section" // Fornece o texto “section” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  home.id = // Atualiza home.id com o texto “course-home”.
    "course-home"; // Fornece o texto “course-home” à expressão atual.


  home.className = // Atualiza home.className com o texto “course-home”.
    "course-home"; // Fornece o texto “course-home” à expressão atual.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza home.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um contêiner de layout com as classes “course-home-inner”.
   * Linha 4 do trecho: Insere o cabeçalho com as classes “course-home-header”.
   * Linha 6 do trecho: Insere um contêiner de layout com as classes “course-home-eyebrow”.
   * Linha 7 do trecho: Compõe o trecho de texto “CONTEÚDO DO CURSO” sem modificá-lo.
   * Linha 8 do trecho: Encerra um contêiner de layout.
   * Linha 10 do trecho: Insere o título principal com o texto “<h1”.
   * Linha 11 do trecho: Compõe o trecho de texto “id="course-home-title"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “class="course-home-title"” sem modificá-lo.
   * Linha 13 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 14 do trecho: Inclui o campo “Curso” no texto da consulta.
   * Linha 15 do trecho: Encerra o título principal.
   * Linha 17 do trecho: Insere um parágrafo com o texto “<p”.
   * Linha 18 do trecho: Compõe o trecho de texto “id="course-home-description"” sem modificá-lo.
   * Linha 19 do trecho: Compõe o trecho de texto “class="course-home-description"” sem modificá-lo.
   * Linha 20 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 21 do trecho: Compõe o trecho de texto “Carregando conteúdo...” sem modificá-lo.
   * Linha 22 do trecho: Encerra um parágrafo.
   * Linha 25 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 26 do trecho: Compõe o trecho de texto “class="course-home-progress"” sem modificá-lo.
   * Linha 27 do trecho: Compõe o trecho de texto “aria-label="Progresso geral do curso"” sem modificá-lo.
   * Linha 28 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 30 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 31 do trecho: Compõe o trecho de texto “class="course-home-progress-info"” sem modificá-lo.
   * Linha 32 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 33 do trecho: Insere um trecho de texto em linha.
   * Linha 34 do trecho: Compõe o trecho de texto “Seu progresso” sem modificá-lo.
   * Linha 35 do trecho: Encerra um trecho de texto em linha.
   * Linha 37 do trecho: Insere um texto com destaque semântico com o texto “<strong”.
   * Linha 38 do trecho: Compõe o trecho de texto “id="course-home-progress-text"” sem modificá-lo.
   * Linha 39 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 40 do trecho: Compõe o trecho de texto “0%” sem modificá-lo.
   * Linha 41 do trecho: Encerra um texto com destaque semântico.
   * Linha 42 do trecho: Encerra um contêiner de layout.
   * Linha 45 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 46 do trecho: Compõe o trecho de texto “class="course-home-progress-track"” sem modificá-lo.
   * Linha 47 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 48 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 49 do trecho: Compõe o trecho de texto “id="course-home-progress-fill"” sem modificá-lo.
   * Linha 50 do trecho: Compõe o trecho de texto “class="course-home-progress-fill"” sem modificá-lo.
   * Linha 51 do trecho: Conclui a declaração da tag e de seus atributos.
   * Linha 52 do trecho: Encerra um contêiner de layout.
   * Linha 54 do trecho: Encerra um contêiner de layout.
   * Linha 56 do trecho: Encerra o cabeçalho.
   * Linha 59 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 60 do trecho: Compõe o trecho de texto “id="course-home-modules"” sem modificá-lo.
   * Linha 61 do trecho: Compõe o trecho de texto “class="course-home-modules"” sem modificá-lo.
   * Linha 62 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 63 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 64 do trecho: Compõe o trecho de texto “class="course-home-loading"” sem modificá-lo.
   * Linha 65 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 66 do trecho: Compõe o trecho de texto “Carregando módulos...” sem modificá-lo.
   * Linha 67 do trecho: Encerra um contêiner de layout.
   * Linha 68 do trecho: Encerra um contêiner de layout.
   * Linha 70 do trecho: Encerra um contêiner de layout.
   * Linha 71 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  home.innerHTML = `
    <div class="course-home-inner">

      <header class="course-home-header">

        <div class="course-home-eyebrow">
          CONTEÚDO DO CURSO
        </div>

        <h1
          id="course-home-title"
          class="course-home-title"
        >
          Curso
        </h1>

        <p
          id="course-home-description"
          class="course-home-description"
        >
          Carregando conteúdo...
        </p>


        <div
          class="course-home-progress"
          aria-label="Progresso geral do curso"
        >

          <div
            class="course-home-progress-info"
          >
            <span>
              Seu progresso
            </span>

            <strong
              id="course-home-progress-text"
            >
              0%
            </strong>
          </div>


          <div
            class="course-home-progress-track"
          >
            <div
              id="course-home-progress-fill"
              class="course-home-progress-fill"
            ></div>
          </div>

        </div>

      </header>


      <div
        id="course-home-modules"
        class="course-home-modules"
      >
        <div
          class="course-home-loading"
        >
          Carregando módulos...
        </div>
      </div>

    </div>
  `;


  lessonView.parentNode // Executa a chamada que produz a inserção de home antes do nó de referência.
    ?.insertBefore( // Executa a chamada que produz a inserção de home antes do nó de referência.
      home, // Utiliza o valor de home.
      lessonView // Utiliza o valor de lessonView.
    ); // Encerra a chamada de lessonView.parentNode.insertBefore.


  ensureBackToCourseHomeButton(); // Executa a chamada que produz o resultado de ensureBackToCourseHomeButton.


  return home; // Retorna home.
} // Encerra o bloco da função ensureCourseHome.


/* =========================================================
   VOLTAR À HOME
========================================================= */

function ensureBackToCourseHomeButton() { // Declara a função ensureBackToCourseHomeButton com nenhum parâmetro.
  const lessonView = // Define lessonView como o resultado de getLessonView.
    getLessonView(); // Executa a chamada que produz o resultado de getLessonView.


  if (!lessonView) { // Verifica a negação de lessonView para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica o primeiro elemento que corresponde ao seletor o texto “[data-back-course-home]” para decidir se executa este bloco.
    lessonView.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-back-course-home]”.
      "[data-back-course-home]" // Fornece o texto “[data-back-course-home]” à expressão atual.
    ) // Encerra a chamada de lessonView.querySelector.
  ) { // Verifica o primeiro elemento que corresponde ao seletor o texto “[data-back-course-home]” para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const button = // Define button como um novo elemento HTML o texto “button”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “button”.
      "button" // Fornece o texto “button” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  button.type = // Atualiza button.type com o texto “button”.
    "button"; // Fornece o texto “button” à expressão atual.


  button.className = // Atualiza button.className com o texto “back-to-course-home”.
    "back-to-course-home"; // Fornece o texto “back-to-course-home” à expressão atual.


  button.setAttribute( // Executa a chamada que produz a definição do atributo o texto “data-back-course-home” em button.
    "data-back-course-home", // Fornece o texto “data-back-course-home” à expressão atual.
    "" // Fornece o texto “” à expressão atual.
  ); // Encerra a chamada de button.setAttribute.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza button.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um trecho de texto em linha com o texto “<span”.
   * Linha 3 do trecho: Compõe o trecho de texto “class="back-to-course-home-icon"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “←” sem modificá-lo.
   * Linha 7 do trecho: Encerra um trecho de texto em linha.
   * Linha 9 do trecho: Insere um trecho de texto em linha.
   * Linha 10 do trecho: Compõe o trecho de texto “Voltar ao conteúdo” sem modificá-lo.
   * Linha 11 do trecho: Encerra um trecho de texto em linha.
   * Linha 12 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  button.innerHTML = `
    <span
      class="back-to-course-home-icon"
      aria-hidden="true"
    >
      ←
    </span>

    <span>
      Voltar ao conteúdo
    </span>
  `;


  /*
    Agora o botão também usa
    o histórico real.

    Aula -> Home.
  */

  button.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em button.
    "click", // Fornece o texto “click” à expressão atual.
    goBackInHistory // Utiliza o valor de goBackInHistory.
  ); // Encerra a chamada de button.addEventListener.


  lessonView.insertBefore( // Executa a chamada que produz a inserção de button antes do nó de referência.
    button, // Utiliza o valor de button.
    lessonView.firstChild // Acessa lessonView.firstChild.
  ); // Encerra a chamada de lessonView.insertBefore.
} // Encerra o bloco da função ensureBackToCourseHomeButton.


/* =========================================================
   MOSTRAR HOME
========================================================= */

async function showCourseHome() { // Declara a função assíncrona showCourseHome com nenhum parâmetro.
  if ( // Verifica o resultado de isPresentationActive para decidir se executa este bloco.
    isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
  ) { // Verifica o resultado de isPresentationActive para decidir se executa este bloco.

    await exitPresentationMode(); // Aguarda o resultado de exitPresentationMode antes de continuar.
  } // Encerra o bloco da condição.


  closeAllSidebars(); // Executa a chamada que produz o resultado de closeAllSidebars.


  const home = // Define home como o resultado de ensureCourseHome.
    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.


  const lessonView = // Define lessonView como o resultado de getLessonView.
    getLessonView(); // Executa a chamada que produz o resultado de getLessonView.


  if (!home) { // Verifica a negação de home para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  currentCourseView = // Atualiza currentCourseView com o texto “home”.
    "home"; // Fornece o texto “home” à expressão atual.


  home.hidden = // Atualiza home.hidden com false (falso).
    false; // Fornece false (falso) à expressão atual.


  home.classList.add( // Executa a chamada que produz a inclusão da classe o texto “is-visible” em home.classList.
    "is-visible" // Fornece o texto “is-visible” à expressão atual.
  ); // Encerra a chamada de home.classList.add.


  if (lessonView) { // Verifica lessonView para decidir se executa este bloco.

    lessonView.hidden = // Atualiza lessonView.hidden com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.


    lessonView.classList.remove( // Executa a chamada que produz a remoção da classe o texto “is-visible” de lessonView.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de lessonView.classList.remove.
  } // Encerra o bloco da condição.


  renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.


  window.scrollTo({ // Executa a chamada que produz o resultado de window.scrollTo com um objeto com top, behavior.
    top: 0, // Define a propriedade top como 0.
    behavior: "smooth" // Define a propriedade behavior como o texto “smooth”.
  }); // Encerra o objeto.
} // Encerra o bloco da função showCourseHome.


/* =========================================================
   MOSTRAR AULA
========================================================= */

function showLessonView() { // Declara a função showLessonView com nenhum parâmetro.
  const home = // Define home como o resultado de ensureCourseHome.
    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.


  const lessonView = // Define lessonView como o resultado de getLessonView.
    getLessonView(); // Executa a chamada que produz o resultado de getLessonView.


  currentCourseView = // Atualiza currentCourseView com o texto “lesson”.
    "lesson"; // Fornece o texto “lesson” à expressão atual.


  if (home) { // Verifica home para decidir se executa este bloco.

    home.hidden = // Atualiza home.hidden com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.


    home.classList.remove( // Executa a chamada que produz a remoção da classe o texto “is-visible” de home.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de home.classList.remove.
  } // Encerra o bloco da condição.


  if (lessonView) { // Verifica lessonView para decidir se executa este bloco.

    lessonView.hidden = // Atualiza lessonView.hidden com false (falso).
      false; // Fornece false (falso) à expressão atual.


    lessonView.classList.add( // Executa a chamada que produz a inclusão da classe o texto “is-visible” em lessonView.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de lessonView.classList.add.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função showLessonView.


/* =========================================================
   CONCLUSÃO
========================================================= */

function isLessonCompleted( // Declara a função isLessonCompleted com lesson.
  lesson // Utiliza o valor de lesson.
) { // Declara a função isLessonCompleted com lesson.
  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  return Boolean( // Retorna a conversão de progressByLesson.get(…).concluida com acesso opcional em verdadeiro ou falso.
    progressByLesson.get( // Executa a chamada que produz o valor associado à chave a conversão de lesson.id em número em progressByLesson.
      Number( // Executa a chamada que produz a conversão de lesson.id em número.
        lesson.id // Acessa lesson.id.
      ) // Encerra a chamada de Number.
    )?.concluida // Utiliza o valor de concluida.
  ); // Encerra a chamada de Boolean.
} // Encerra o bloco da função isLessonCompleted.


/* =========================================================
   REGRA 1 — BLOQUEIO SEQUENCIAL
========================================================= */

function isLessonUnlocked( // Declara a função isLessonUnlocked com lessonIndex.
  lessonIndex // Utiliza o valor de lessonIndex.
) { // Declara a função isLessonUnlocked com lessonIndex.
  if ( // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    lessonIndex < 0 || // Calcula lessonIndex menor que 0.
    lessonIndex >= lessons.length // Calcula lessonIndex maior ou igual a lessons.length.
  ) { // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  if ( // Verifica lessonIndex igual, inclusive no tipo, a 0 para decidir se executa este bloco.
    lessonIndex === 0 // Calcula lessonIndex igual, inclusive no tipo, a 0.
  ) { // Verifica lessonIndex igual, inclusive no tipo, a 0 para decidir se executa este bloco.
    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco da condição.


  for ( // Repete o bloco enquanto index menor que lessonIndex, atualizando a atribuição de 1 a index.
    let index = 0; // Define index como 0.
    index < lessonIndex; // Calcula index menor que lessonIndex.
    index += 1 // Atualiza index += usando 1.
  ) { // Repete o bloco enquanto index menor que lessonIndex, atualizando a atribuição de 1 a index.

    const previousLesson = // Define previousLesson como lessons[index].
      lessons[index]; // Acessa lessons[index].


    if ( // Verifica a negação de o resultado de isLessonCompleted com previousLesson para decidir se executa este bloco.
      !isLessonCompleted( // Compõe a negação de o resultado de isLessonCompleted com previousLesson na operação atual.
        previousLesson // Utiliza o valor de previousLesson.
      ) // Encerra a chamada de isLessonCompleted.
    ) { // Verifica a negação de o resultado de isLessonCompleted com previousLesson para decidir se executa este bloco.

      return false; // Retorna false (falso).
    } // Encerra o bloco da condição.
  } // Encerra o bloco atual.


  return true; // Retorna true (verdadeiro).
} // Encerra o bloco da função isLessonUnlocked.


/* =========================================================
   STATUS DO CARD
========================================================= */

function getCourseHomeLessonStatus( // Declara a função getCourseHomeLessonStatus com lesson, lessonIndex.
  lesson, // Utiliza o valor de lesson.
  lessonIndex // Utiliza o valor de lessonIndex.
) { // Declara a função getCourseHomeLessonStatus com lesson, lessonIndex.
  const unlocked = // Define unlocked como o resultado de isLessonUnlocked com lessonIndex.
    isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com lessonIndex.
      lessonIndex // Utiliza o valor de lessonIndex.
    ); // Encerra a chamada de isLessonUnlocked.


  if (!unlocked) { // Verifica a negação de unlocked para decidir se executa este bloco.

    return { // Retorna um objeto com className, label, locked.
      className: // Define a propriedade className como o texto “is-locked”.
        "is-locked", // Fornece o texto “is-locked” à expressão atual.

      label: // Define a propriedade label como o texto “Bloqueado”.
        "Bloqueado", // Fornece o texto “Bloqueado” à expressão atual.

      locked: // Define a propriedade locked como true (verdadeiro).
        true // Fornece true (verdadeiro) à expressão atual.
    }; // Encerra o objeto.
  } // Encerra o bloco da condição.


  if ( // Verifica o resultado de isLessonCompleted com lesson para decidir se executa este bloco.
    isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
      lesson // Utiliza o valor de lesson.
    ) // Encerra a chamada de isLessonCompleted.
  ) { // Verifica o resultado de isLessonCompleted com lesson para decidir se executa este bloco.

    return { // Retorna um objeto com className, label, locked.
      className: // Define a propriedade className como o texto “is-completed”.
        "is-completed", // Fornece o texto “is-completed” à expressão atual.

      label: // Define a propriedade label como o texto “Concluído”.
        "Concluído", // Fornece o texto “Concluído” à expressão atual.

      locked: // Define a propriedade locked como false (falso).
        false // Fornece false (falso) à expressão atual.
    }; // Encerra o objeto.
  } // Encerra o bloco da condição.


  return { // Retorna um objeto com className, label, locked.
    className: // Define a propriedade className como o texto “is-available”.
      "is-available", // Fornece o texto “is-available” à expressão atual.

    label: // Define a propriedade label como o texto “Disponível”.
      "Disponível", // Fornece o texto “Disponível” à expressão atual.

    locked: // Define a propriedade locked como false (falso).
      false // Fornece false (falso) à expressão atual.
  }; // Encerra o objeto.
} // Encerra o bloco da função getCourseHomeLessonStatus.


/* =========================================================
   ÍCONE DO CARD
========================================================= */

function getCourseHomeLessonIcon() { // Declara a função getCourseHomeLessonIcon com nenhum parâmetro.
  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Retorna um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 3 do trecho: Compõe o trecho de texto “width="38"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “height="38"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 7 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 8 do trecho: Compõe o trecho de texto “stroke-width="1.7"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 13 do trecho: Insere um traçado vetorial com o texto “<path”.
   * Linha 14 do trecho: Compõe o trecho de texto “d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"” sem modificá-lo.
   * Linha 15 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 17 do trecho: Insere um traçado vetorial com o texto “<path”.
   * Linha 18 do trecho: Compõe o trecho de texto “d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"” sem modificá-lo.
   * Linha 19 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 20 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 21 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  return `
    <svg
      width="38"
      height="38"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      />

      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      />
    </svg>
  `;
} // Encerra o bloco da função getCourseHomeLessonIcon.


/* =========================================================
   ÍCONE DE CADEADO
========================================================= */

function getLockIcon( // Declara a função getLockIcon com size.
  size = 18 // Utiliza o valor de size.
) { // Declara a função getLockIcon com size.
  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Retorna um texto montado com 2 valores dinâmicos.
   * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 3 do trecho: Compõe o trecho de texto “width="${size}"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “height="${size}"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 7 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 8 do trecho: Compõe o trecho de texto “stroke-width="2"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 13 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 14 do trecho: Compõe o trecho de texto “x="5"” sem modificá-lo.
   * Linha 15 do trecho: Compõe o trecho de texto “y="11"” sem modificá-lo.
   * Linha 16 do trecho: Compõe o trecho de texto “width="14"” sem modificá-lo.
   * Linha 17 do trecho: Compõe o trecho de texto “height="10"” sem modificá-lo.
   * Linha 18 do trecho: Compõe o trecho de texto “rx="2"” sem modificá-lo.
   * Linha 19 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 21 do trecho: Insere um traçado vetorial com o texto “<path”.
   * Linha 22 do trecho: Compõe o trecho de texto “d="M8 11V7a4 4 0 0 1 8 0v4"” sem modificá-lo.
   * Linha 23 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 24 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 25 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
      />

      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
      />
    </svg>
  `;
} // Encerra o bloco da função getLockIcon.


/* =========================================================
   ÍCONE CONCLUÍDO
========================================================= */

function getCompletedIcon( // Declara a função getCompletedIcon com size.
  size = 15 // Utiliza o valor de size.
) { // Declara a função getCompletedIcon com size.
  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Retorna um texto montado com 2 valores dinâmicos.
   * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 3 do trecho: Compõe o trecho de texto “width="${size}"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “height="${size}"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 7 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 8 do trecho: Compõe o trecho de texto “stroke-width="3"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 13 do trecho: Insere uma sequência de segmentos vetoriais com o texto “<polyline”.
   * Linha 14 do trecho: Compõe o trecho de texto “points="20 6 9 17 4 12"” sem modificá-lo.
   * Linha 15 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 16 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 17 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polyline
        points="20 6 9 17 4 12"
      />
    </svg>
  `;
} // Encerra o bloco da função getCompletedIcon.


/* =========================================================
   ÍCONE DISPONÍVEL
========================================================= */

function getAvailableIcon() { // Declara a função getAvailableIcon com nenhum parâmetro.
  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Retorna um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um trecho de texto em linha com o texto “<span”.
   * Linha 3 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “•” sem modificá-lo.
   * Linha 6 do trecho: Encerra um trecho de texto em linha.
   * Linha 7 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  return `
    <span
      aria-hidden="true"
    >
      •
    </span>
  `;
} // Encerra o bloco da função getAvailableIcon.


/* =========================================================
   ÍCONE DO STATUS
========================================================= */

function getStatusIcon( // Declara a função getStatusIcon com status.
  status // Utiliza o valor de status.
) { // Declara a função getStatusIcon com status.
  if ( // Verifica status.locked para decidir se executa este bloco.
    status.locked // Acessa status.locked.
  ) { // Verifica status.locked para decidir se executa este bloco.

    return getLockIcon( // Retorna o resultado de getLockIcon com 15.
      15 // Fornece 15 à expressão atual.
    ); // Encerra a chamada de getLockIcon.
  } // Encerra o bloco da condição.


  if ( // Verifica status.className igual, inclusive no tipo, a o texto “is-completed” para decidir se executa este bloco.
    status.className === // Acessa status.className.
    "is-completed" // Fornece o texto “is-completed” à expressão atual.
  ) { // Verifica status.className igual, inclusive no tipo, a o texto “is-completed” para decidir se executa este bloco.

    return getCompletedIcon( // Retorna o resultado de getCompletedIcon com 15.
      15 // Fornece 15 à expressão atual.
    ); // Encerra a chamada de getCompletedIcon.
  } // Encerra o bloco da condição.


  return getAvailableIcon(); // Retorna o resultado de getAvailableIcon.
} // Encerra o bloco da função getStatusIcon.


/* =========================================================
   HOME DO CURSO
========================================================= */

function renderCourseHome() { // Declara a função renderCourseHome com nenhum parâmetro.
  const home = // Define home como o resultado de ensureCourseHome.
    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.


  if (!home) { // Verifica a negação de home para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const title = // Define title como o resultado de $ com o texto “course-home-title”.
    $("course-home-title"); // Executa a chamada que produz o resultado de $ com o texto “course-home-title”.


  const description = // Define description como o resultado de $ com o texto “course-home-description”.
    $("course-home-description"); // Executa a chamada que produz o resultado de $ com o texto “course-home-description”.


  const modulesContainer = // Define modulesContainer como o resultado de $ com o texto “course-home-modules”.
    $("course-home-modules"); // Executa a chamada que produz o resultado de $ com o texto “course-home-modules”.


  if (title) { // Verifica title para decidir se executa este bloco.

    title.textContent = // Atualiza title.textContent com course.nome com acesso opcional ou, se indisponível, o texto “Curso Praxis”.
      course?.nome || // Acessa course.nome.
      "Curso Praxis"; // Fornece o texto “Curso Praxis” à expressão atual.
  } // Encerra o bloco da condição.


  if (description) { // Verifica description para decidir se executa este bloco.

    description.textContent = // Atualiza description.textContent com course.descricao com acesso opcional ou, se indisponível, o texto “Escolha uma aula para começar.”.
      course?.descricao || // Acessa course.descricao.
      "Escolha uma aula para começar."; // Fornece o texto “Escolha uma aula para começar.” à expressão atual.
  } // Encerra o bloco da condição.


  if (!modulesContainer) { // Verifica a negação de modulesContainer para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if (!modules.length) { // Verifica a negação de modules.length para decidir se executa este bloco.

    /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
     * Linha 1 do trecho: Atualiza modulesContainer.innerHTML com um texto montado com 0 valores dinâmicos.
     * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
     * Linha 3 do trecho: Compõe o trecho de texto “class="course-home-empty"” sem modificá-lo.
     * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
     * Linha 5 do trecho: Compõe o trecho de texto “Nenhum módulo publicado” sem modificá-lo.
     * Linha 6 do trecho: Compõe o trecho de texto “foi encontrado.” sem modificá-lo.
     * Linha 7 do trecho: Encerra um contêiner de layout.
     * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
     */
    modulesContainer.innerHTML = `
      <div
        class="course-home-empty"
      >
        Nenhum módulo publicado
        foi encontrado.
      </div>
    `;


    updateCourseHomeProgress(); // Executa a chamada que produz o resultado de updateCourseHomeProgress.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  modulesContainer.innerHTML = // Atualiza modulesContainer.innerHTML com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  modules.forEach( // Executa a chamada que produz a execução da função para cada item de modules.
    ( // Define a função que recebe module, moduleIndex.
      module, // Utiliza o valor de module.
      moduleIndex // Utiliza o valor de moduleIndex.
    ) => { // Define a função que recebe module, moduleIndex.

      const moduleLessons = // Define moduleLessons como os itens de lessons que passam na condição.
        lessons.filter( // Executa a chamada que produz os itens de lessons que passam na condição.
          (lesson) => // Define a função que recebe lesson.
            Number( // Executa a chamada que produz a conversão de lesson.modulo_id em número.
              lesson.modulo_id // Acessa lesson.modulo_id.
            ) === // Executa a chamada que produz a conversão de lesson.modulo_id em número.
            Number( // Executa a chamada que produz a conversão de module.id em número.
              module.id // Acessa module.id.
            ) // Encerra a chamada de Number.
        ); // Encerra a chamada de lessons.filter.


      const moduleNumber = // Define moduleNumber como o resultado de normalizeNumber com module.ordem e moduleIndex mais 1.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com module.ordem e moduleIndex mais 1.
          module.ordem, // Acessa module.ordem.
          moduleIndex + 1 // Calcula moduleIndex mais 1.
        ); // Encerra a chamada de normalizeNumber.


      const moduleSection = // Define moduleSection como um novo elemento HTML o texto “section”.
        document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “section”.
          "section" // Fornece o texto “section” à expressão atual.
        ); // Encerra a chamada de document.createElement.


      moduleSection.className = // Atualiza moduleSection.className com o texto “course-home-module”.
        "course-home-module"; // Fornece o texto “course-home-module” à expressão atual.


      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Atualiza moduleSection.innerHTML com um texto montado com 3 valores dinâmicos.
       * Linha 2 do trecho: Insere o cabeçalho com o texto “<header”.
       * Linha 3 do trecho: Compõe o trecho de texto “class="course-home-module-header"” sem modificá-lo.
       * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
       * Linha 6 do trecho: Insere um contêiner de layout com o texto “<div”.
       * Linha 7 do trecho: Compõe o trecho de texto “class="course-home-module-label"” sem modificá-lo.
       * Linha 8 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
       * Linha 9 do trecho: Compõe o trecho de texto “MÓDULO ${moduleNumber}” sem modificá-lo.
       * Linha 10 do trecho: Encerra um contêiner de layout.
       * Linha 13 do trecho: Insere um título de seção com o texto “<h2”.
       * Linha 14 do trecho: Compõe o trecho de texto “class="course-home-module-title"” sem modificá-lo.
       * Linha 15 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
       * Linha 16 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
       * Linha 17 do trecho: Compõe o trecho de texto “module.nome ||” sem modificá-lo.
       * Linha 18 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       * Linha 19 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
       * Linha 20 do trecho: Encerra um título de seção.
       * Linha 23 do trecho: Insere no texto o valor calculado por ${.
       * Linha 24 do trecho: Compõe o trecho de texto “module.descricao” sem modificá-lo.
       * Linha 26 do trecho: Fornece um texto montado com 1 valor dinâmico à expressão atual.
       * Linha 27 do trecho: Insere um parágrafo com o texto “<p”.
       * Linha 28 do trecho: Compõe o trecho de texto “class="course-home-module-description"” sem modificá-lo.
       * Linha 29 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
       * Linha 30 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
       * Linha 31 do trecho: Compõe o trecho de texto “module.descricao” sem modificá-lo.
       * Linha 32 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
       * Linha 33 do trecho: Encerra um parágrafo.
       * Linha 34 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       * Linha 36 do trecho: Compõe o trecho de texto “: ""” sem modificá-lo.
       * Linha 37 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
       * Linha 39 do trecho: Encerra o cabeçalho.
       * Linha 42 do trecho: Insere um contêiner de layout com o texto “<div”.
       * Linha 43 do trecho: Compõe o trecho de texto “class="course-home-lessons"” sem modificá-lo.
       * Linha 44 do trecho: Conclui a declaração da tag e de seus atributos.
       * Linha 45 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      moduleSection.innerHTML = `
        <header
          class="course-home-module-header"
        >

          <div
            class="course-home-module-label"
          >
            MÓDULO ${moduleNumber}
          </div>


          <h2
            class="course-home-module-title"
          >
            ${escapeHtml(
              module.nome ||
              `Módulo ${moduleNumber}`
            )}
          </h2>


          ${
            module.descricao

              ? `
                <p
                  class="course-home-module-description"
                >
                  ${escapeHtml(
                    module.descricao
                  )}
                </p>
              `

              : ""
          }

        </header>


        <div
          class="course-home-lessons"
        ></div>
      `;


      const cardsContainer = // Define cardsContainer como o primeiro elemento que corresponde ao seletor o texto “.course-home-lessons”.
        moduleSection.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.course-home-lessons”.
          ".course-home-lessons" // Fornece o texto “.course-home-lessons” à expressão atual.
        ); // Encerra a chamada de moduleSection.querySelector.


      if (!cardsContainer) { // Verifica a negação de cardsContainer para decidir se executa este bloco.
        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.


      if (!moduleLessons.length) { // Verifica a negação de moduleLessons.length para decidir se executa este bloco.

        /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
         * Linha 1 do trecho: Atualiza cardsContainer.innerHTML com um texto montado com 0 valores dinâmicos.
         * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
         * Linha 3 do trecho: Compõe o trecho de texto “class="course-home-empty"” sem modificá-lo.
         * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
         * Linha 5 do trecho: Compõe o trecho de texto “Nenhuma aula publicada” sem modificá-lo.
         * Linha 6 do trecho: Compõe o trecho de texto “neste módulo.” sem modificá-lo.
         * Linha 7 do trecho: Encerra um contêiner de layout.
         * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
         */
        cardsContainer.innerHTML = `
          <div
            class="course-home-empty"
          >
            Nenhuma aula publicada
            neste módulo.
          </div>
        `;

      } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

        moduleLessons.forEach( // Executa a chamada que produz a execução da função para cada item de moduleLessons.
          (lesson) => { // Define a função que recebe lesson.

            const globalIndex = // Define globalIndex como o resultado de lessons.findIndex com uma função que recebe item.
              lessons.findIndex( // Executa a chamada que produz o resultado de lessons.findIndex com uma função que recebe item.
                (item) => // Define a função que recebe item.
                  Number( // Executa a chamada que produz a conversão de item.id em número.
                    item.id // Acessa item.id.
                  ) === // Executa a chamada que produz a conversão de item.id em número.
                  Number( // Executa a chamada que produz a conversão de lesson.id em número.
                    lesson.id // Acessa lesson.id.
                  ) // Encerra a chamada de Number.
              ); // Encerra a chamada de lessons.findIndex.


            if ( // Verifica globalIndex menor que 0 para decidir se executa este bloco.
              globalIndex < 0 // Calcula globalIndex menor que 0.
            ) { // Verifica globalIndex menor que 0 para decidir se executa este bloco.
              return; // Encerra a função sem retornar um valor.
            } // Encerra o bloco da condição.


            const lessonNumber = // Define lessonNumber como o resultado de getLessonNumber com lesson.
              getLessonNumber( // Executa a chamada que produz o resultado de getLessonNumber com lesson.
                lesson // Utiliza o valor de lesson.
              ); // Encerra a chamada de getLessonNumber.


            const lessonName = // Define lessonName como lesson.nome ou, se indisponível, um texto montado com 1 valor dinâmico.
              lesson.nome || // Acessa lesson.nome.
              `Aula ${lessonNumber}`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.


            const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
              getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
                lesson // Utiliza o valor de lesson.
              ); // Encerra a chamada de getLessonSlides.


            const status = // Define status como o resultado de getCourseHomeLessonStatus com lesson e globalIndex.
              getCourseHomeLessonStatus( // Executa a chamada que produz o resultado de getCourseHomeLessonStatus com lesson e globalIndex.
                lesson, // Utiliza o valor de lesson.
                globalIndex // Utiliza o valor de globalIndex.
              ); // Encerra a chamada de getCourseHomeLessonStatus.


            const card = // Define card como um novo elemento HTML o texto “button”.
              document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “button”.
                "button" // Fornece o texto “button” à expressão atual.
              ); // Encerra a chamada de document.createElement.


            card.type = // Atualiza card.type com o texto “button”.
              "button"; // Fornece o texto “button” à expressão atual.


            card.className = // Atualiza card.className com um texto montado com 1 valor dinâmico.
              `course-home-lesson-card ${status.className}`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.


            card.dataset.lessonIndex = // Atualiza card.dataset.lessonIndex com a conversão de globalIndex em texto.
              String( // Executa a chamada que produz a conversão de globalIndex em texto.
                globalIndex // Utiliza o valor de globalIndex.
              ); // Encerra a chamada de String.


            card.dataset.lessonId = // Atualiza card.dataset.lessonId com a conversão de lesson.id em texto.
              String( // Executa a chamada que produz a conversão de lesson.id em texto.
                lesson.id // Acessa lesson.id.
              ); // Encerra a chamada de String.


            if ( // Verifica status.locked para decidir se executa este bloco.
              status.locked // Acessa status.locked.
            ) { // Verifica status.locked para decidir se executa este bloco.

              card.disabled = // Atualiza card.disabled com true (verdadeiro).
                true; // Fornece true (verdadeiro) à expressão atual.


              card.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-disabled” em card.
                "aria-disabled", // Fornece o texto “aria-disabled” à expressão atual.
                "true" // Fornece o texto “true” à expressão atual.
              ); // Encerra a chamada de card.setAttribute.


              card.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-label” em card.
                "aria-label", // Fornece o texto “aria-label” à expressão atual.
                `Aula ${lessonNumber} ${lessonName} bloqueada. Conclua as aulas anteriores primeiro.` // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
              ); // Encerra a chamada de card.setAttribute.

            } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

              card.disabled = // Atualiza card.disabled com false (falso).
                false; // Fornece false (falso) à expressão atual.


              card.removeAttribute( // Executa a chamada que produz a remoção do atributo o texto “aria-disabled” de card.
                "aria-disabled" // Fornece o texto “aria-disabled” à expressão atual.
              ); // Encerra a chamada de card.removeAttribute.


              card.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-label” em card.
                "aria-label", // Fornece o texto “aria-label” à expressão atual.
                `Abrir aula ${lessonNumber} ${lessonName}` // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
              ); // Encerra a chamada de card.setAttribute.
            } // Encerra o bloco da condição.


            let slidesText = // Define slidesText como o texto “Sem slides”.
              "Sem slides"; // Fornece o texto “Sem slides” à expressão atual.


            if ( // Verifica lessonSlides.length igual, inclusive no tipo, a 1 para decidir se executa este bloco.
              lessonSlides.length === 1 // Acessa lessonSlides.length.
            ) { // Verifica lessonSlides.length igual, inclusive no tipo, a 1 para decidir se executa este bloco.

              slidesText = // Atualiza slidesText com o texto “1 slide”.
                "1 slide"; // Fornece o texto “1 slide” à expressão atual.

            } else if ( // Encerra o bloco anterior e verifica lessonslides.length maior que 1 para decidir se executa este bloco.
              lessonSlides.length > 1 // Acessa lessonSlides.length.
            ) { // Verifica lessonSlides.length maior que 1 para decidir se executa este bloco.

              slidesText = // Atualiza slidesText com um texto montado com 1 valor dinâmico.
                `${lessonSlides.length} slides`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
            } // Encerra o bloco da condição.


            /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
             * Linha 1 do trecho: Atualiza card.innerHTML com um texto montado com 7 valores dinâmicos.
             * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
             * Linha 3 do trecho: Compõe o trecho de texto “class="course-home-lesson-icon"” sem modificá-lo.
             * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 5 do trecho: Insere no texto o valor calculado por ${.
             * Linha 6 do trecho: Compõe o trecho de texto “status.locked” sem modificá-lo.
             * Linha 8 do trecho: Compõe o trecho de texto “? getLockIcon(” sem modificá-lo.
             * Linha 9 do trecho: Inclui o campo “38” no texto da consulta.
             * Linha 10 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
             * Linha 12 do trecho: Compõe o trecho de texto “: getCourseHomeLessonIcon()” sem modificá-lo.
             * Linha 13 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
             * Linha 14 do trecho: Encerra um contêiner de layout.
             * Linha 17 do trecho: Insere um contêiner de layout com o texto “<div”.
             * Linha 18 do trecho: Compõe o trecho de texto “class="course-home-lesson-content"” sem modificá-lo.
             * Linha 19 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 21 do trecho: Insere um contêiner de layout com o texto “<div”.
             * Linha 22 do trecho: Compõe o trecho de texto “class="course-home-lesson-number"” sem modificá-lo.
             * Linha 23 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 24 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
             * Linha 25 do trecho: Inclui o campo “lessonNumber” no texto da consulta.
             * Linha 26 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
             * Linha 27 do trecho: Encerra um contêiner de layout.
             * Linha 30 do trecho: Insere um subtítulo com o texto “<h3”.
             * Linha 31 do trecho: Compõe o trecho de texto “class="course-home-lesson-title"” sem modificá-lo.
             * Linha 32 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 33 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
             * Linha 34 do trecho: Inclui o campo “lessonName” no texto da consulta.
             * Linha 35 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
             * Linha 36 do trecho: Encerra um subtítulo.
             * Linha 39 do trecho: Insere um contêiner de layout com o texto “<div”.
             * Linha 40 do trecho: Compõe o trecho de texto “class="course-home-lesson-meta"” sem modificá-lo.
             * Linha 41 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 42 do trecho: Insere no texto o valor calculado por ${.
             * Linha 43 do trecho: Compõe o trecho de texto “status.locked” sem modificá-lo.
             * Linha 45 do trecho: Compõe o trecho de texto “? "Conclua a aula anterior para liberar"” sem modificá-lo.
             * Linha 47 do trecho: Compõe o trecho de texto “: escapeHtml(” sem modificá-lo.
             * Linha 48 do trecho: Inclui o campo “slidesText” no texto da consulta.
             * Linha 49 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
             * Linha 50 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
             * Linha 51 do trecho: Encerra um contêiner de layout.
             * Linha 53 do trecho: Encerra um contêiner de layout.
             * Linha 56 do trecho: Insere um contêiner de layout com o texto “<div”.
             * Linha 57 do trecho: Compõe o trecho de texto “class="course-home-lesson-status ${status.className}"” sem modificá-lo.
             * Linha 58 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 60 do trecho: Insere um trecho de texto em linha com o texto “<span”.
             * Linha 61 do trecho: Compõe o trecho de texto “class="course-home-status-icon"” sem modificá-lo.
             * Linha 62 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
             * Linha 63 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 64 do trecho: Insere no texto o valor calculado por ${getStatusIcon(.
             * Linha 65 do trecho: Inclui o campo “status” no texto da consulta.
             * Linha 66 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
             * Linha 67 do trecho: Encerra um trecho de texto em linha.
             * Linha 69 do trecho: Insere um trecho de texto em linha.
             * Linha 70 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
             * Linha 71 do trecho: Compõe o trecho de texto “status.label” sem modificá-lo.
             * Linha 72 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
             * Linha 73 do trecho: Encerra um trecho de texto em linha.
             * Linha 75 do trecho: Encerra um contêiner de layout.
             * Linha 76 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
             */
            card.innerHTML = `
              <div
                class="course-home-lesson-icon"
              >
                ${
                  status.locked

                    ? getLockIcon(
                        38
                      )

                    : getCourseHomeLessonIcon()
                }
              </div>


              <div
                class="course-home-lesson-content"
              >

                <div
                  class="course-home-lesson-number"
                >
                  ${escapeHtml(
                    lessonNumber
                  )}
                </div>


                <h3
                  class="course-home-lesson-title"
                >
                  ${escapeHtml(
                    lessonName
                  )}
                </h3>


                <div
                  class="course-home-lesson-meta"
                >
                  ${
                    status.locked

                      ? "Conclua a aula anterior para liberar"

                      : escapeHtml(
                          slidesText
                        )
                  }
                </div>

              </div>


              <div
                class="course-home-lesson-status ${status.className}"
              >

                <span
                  class="course-home-status-icon"
                  aria-hidden="true"
                >
                  ${getStatusIcon(
                    status
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    status.label
                  )}
                </span>

              </div>
            `;


            if ( // Verifica a negação de status.locked para decidir se executa este bloco.
              !status.locked // Compõe a negação de status.locked na operação atual.
            ) { // Verifica a negação de status.locked para decidir se executa este bloco.

              card.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em card.
                "click", // Fornece o texto “click” à expressão atual.
                async () => { // Define a função assíncrona que recebe nenhum argumento.

                  if ( // Verifica isSlideTransitioning para decidir se executa este bloco.
                    isSlideTransitioning // Utiliza o valor de isSlideTransitioning.
                  ) { // Verifica isSlideTransitioning para decidir se executa este bloco.
                    return; // Encerra a função sem retornar um valor.
                  } // Encerra o bloco da condição.


                  await openLessonFromUser( // Aguarda o resultado de openLessonFromUser com globalIndex e 0 antes de continuar.
                    globalIndex, // Utiliza o valor de globalIndex.
                    0 // Fornece 0 à expressão atual.
                  ); // Encerra a chamada de openLessonFromUser.
                } // Encerra o bloco atual.
              ); // Encerra a chamada de card.addEventListener.
            } // Encerra o bloco da condição.


            cardsContainer.appendChild( // Executa a chamada que produz a inserção de card como filho de cardsContainer.
              card // Utiliza o valor de card.
            ); // Encerra a chamada de cardsContainer.appendChild.
          } // Encerra o bloco atual.
        ); // Encerra a chamada de moduleLessons.forEach.
      } // Encerra o bloco da condição.


      modulesContainer.appendChild( // Executa a chamada que produz a inserção de moduleSection como filho de modulesContainer.
        moduleSection // Utiliza o valor de moduleSection.
      ); // Encerra a chamada de modulesContainer.appendChild.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de modules.forEach.


  updateCourseHomeProgress(); // Executa a chamada que produz o resultado de updateCourseHomeProgress.
} // Encerra o bloco da função renderCourseHome.


/* =========================================================
   PROGRESSO DA HOME
========================================================= */

function updateCourseHomeProgress() { // Declara a função updateCourseHomeProgress com nenhum parâmetro.
  const total = // Define total como lessons.length.
    lessons.length; // Acessa lessons.length.


  const completed = // Define completed como lessons.filter(…).length.
    lessons.filter( // Executa a chamada que produz os itens de lessons que passam na condição.
      (lesson) => // Define a função que recebe lesson.
        isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
          lesson // Utiliza o valor de lesson.
        ) // Encerra a chamada de isLessonCompleted.
    ).length; // Utiliza o valor de length.


  const percentage = // Define percentage como o arredondamento de expressão vezes 100 para o inteiro mais próximo se total; caso contrário, 0.
    total // Utiliza o valor de total.

      ? Math.round( // Executa a chamada que produz o arredondamento de completed dividido por total vezes 100 para o inteiro mais próximo.
          ( // Calcula completed dividido por total vezes 100.
            completed / // Calcula completed dividido por total.
            total // Utiliza o valor de total.
          ) * // Calcula completed dividido por total vezes 100.
          100 // Fornece 100 à expressão atual.
        ) // Encerra a chamada de Math.round.

      : 0; // Fornece 0 à expressão atual.


  const text = // Define text como o resultado de $ com o texto “course-home-progress-text”.
    $("course-home-progress-text"); // Executa a chamada que produz o resultado de $ com o texto “course-home-progress-text”.


  const fill = // Define fill como o resultado de $ com o texto “course-home-progress-fill”.
    $("course-home-progress-fill"); // Executa a chamada que produz o resultado de $ com o texto “course-home-progress-fill”.


  if (text) { // Verifica text para decidir se executa este bloco.

    text.textContent = // Atualiza text.textContent com um texto montado com 1 valor dinâmico.
      `${percentage}%`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
  } // Encerra o bloco da condição.


  if (fill) { // Verifica fill para decidir se executa este bloco.

    fill.style.width = // Atualiza fill.style.width com um texto montado com 1 valor dinâmico.
      `${percentage}%`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função updateCourseHomeProgress.


/* =========================================================
   FULLSCREEN — HELPERS
========================================================= */

function getPresentationStage() { // Declara a função getPresentationStage com nenhum parâmetro.
  return $("slide-stage"); // Retorna o resultado de $ com o texto “slide-stage”.
} // Encerra o bloco da função getPresentationStage.


function getNativeFullscreenElement() { // Declara a função getNativeFullscreenElement com nenhum parâmetro.
  return ( // Retorna document.fullscreenElement ou, se indisponível, document.webkitFullscreenElement ou, se indisponível, null (ausência de valor).
    document.fullscreenElement || // Acessa document.fullscreenElement.
    document.webkitFullscreenElement || // Acessa document.webkitFullscreenElement.
    null // Fornece null (ausência de valor) à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getNativeFullscreenElement.


function isPresentationActive() { // Declara a função isPresentationActive com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if (!stage) { // Verifica a negação de stage para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  const fullscreenElement = // Define fullscreenElement como o resultado de getNativeFullscreenElement.
    getNativeFullscreenElement(); // Executa a chamada que produz o resultado de getNativeFullscreenElement.


  return ( // Retorna fullscreenElement igual, inclusive no tipo, a stage ou, se indisponível, usingFullscreenFallback ou, se indisponível, a verificação de o texto “is-presentation-fallback” dentro de stage.classList.
    fullscreenElement === stage || // Calcula fullscreenElement igual, inclusive no tipo, a stage.
    usingFullscreenFallback || // Utiliza o valor de usingFullscreenFallback.
    stage.classList.contains( // Executa a chamada que produz a verificação de o texto “is-presentation-fallback” dentro de stage.classList.
      "is-presentation-fallback" // Fornece o texto “is-presentation-fallback” à expressão atual.
    ) // Encerra a chamada de stage.classList.contains.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função isPresentationActive.


/* =========================================================
   FULLSCREEN NATIVO
========================================================= */

async function requestNativeFullscreen( // Declara a função assíncrona requestNativeFullscreen com element.
  element // Utiliza o valor de element.
) { // Declara a função assíncrona requestNativeFullscreen com element.
  if (!element) { // Verifica a negação de element para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    if ( // Verifica o tipo de element.requestFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.
      typeof element.requestFullscreen === // Calcula o tipo de element.requestFullscreen igual, inclusive no tipo, a o texto “function”.
      "function" // Fornece o texto “function” à expressão atual.
    ) { // Verifica o tipo de element.requestFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.

      await element.requestFullscreen(); // Aguarda o resultado de element.requestFullscreen antes de continuar.

      return true; // Retorna true (verdadeiro).
    } // Encerra o bloco da condição.


    if ( // Verifica o tipo de element.webkitRequestFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.
      typeof element.webkitRequestFullscreen === // Calcula o tipo de element.webkitRequestFullscreen igual, inclusive no tipo, a o texto “function”.
      "function" // Fornece o texto “function” à expressão atual.
    ) { // Verifica o tipo de element.webkitRequestFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.

      element.webkitRequestFullscreen(); // Executa a chamada que produz o resultado de element.webkitRequestFullscreen.

      return true; // Retorna true (verdadeiro).
    } // Encerra o bloco da condição.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.warn( // Executa a chamada que produz o registro de o texto “Fullscreen nativo não disponível. Usando fallback.” no console.
      "Fullscreen nativo não disponível. Usando fallback.", // Fornece o texto “Fullscreen nativo não disponível. Usando fallback.” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.warn.
  } // Encerra o bloco de tratamento do erro.


  return false; // Retorna false (falso).
} // Encerra o bloco da função requestNativeFullscreen.


/* =========================================================
   SAIR DO FULLSCREEN
========================================================= */

async function exitNativeFullscreen() { // Declara a função assíncrona exitNativeFullscreen com nenhum parâmetro.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    if ( // Verifica o tipo de document.exitFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.
      typeof document.exitFullscreen === // Calcula o tipo de document.exitFullscreen igual, inclusive no tipo, a o texto “function”.
      "function" // Fornece o texto “function” à expressão atual.
    ) { // Verifica o tipo de document.exitFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.

      await document.exitFullscreen(); // Aguarda o resultado de document.exitFullscreen antes de continuar.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    if ( // Verifica o tipo de document.webkitExitFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.
      typeof document.webkitExitFullscreen === // Calcula o tipo de document.webkitExitFullscreen igual, inclusive no tipo, a o texto “function”.
      "function" // Fornece o texto “function” à expressão atual.
    ) { // Verifica o tipo de document.webkitExitFullscreen igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.

      document.webkitExitFullscreen(); // Executa a chamada que produz o resultado de document.webkitExitFullscreen.
    } // Encerra o bloco da condição.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.warn( // Executa a chamada que produz o registro de o texto “Não foi possível sair do fullscreen nativo:” no console.
      "Não foi possível sair do fullscreen nativo:", // Fornece o texto “Não foi possível sair do fullscreen nativo:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.warn.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função exitNativeFullscreen.


/* =========================================================
   FALLBACK FULLSCREEN
========================================================= */

function activateFullscreenFallback() { // Declara a função activateFullscreenFallback com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if (!stage) { // Verifica a negação de stage para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  usingFullscreenFallback = // Atualiza usingFullscreenFallback com true (verdadeiro).
    true; // Fornece true (verdadeiro) à expressão atual.


  stage.classList.add( // Executa a chamada que produz a inclusão da classe o texto “is-presentation-fallback” em stage.classList.
    "is-presentation-fallback" // Fornece o texto “is-presentation-fallback” à expressão atual.
  ); // Encerra a chamada de stage.classList.add.


  document.body.classList.add( // Executa a chamada que produz a inclusão da classe o texto “presentation-mode-active” em document.body.classList.
    "presentation-mode-active" // Fornece o texto “presentation-mode-active” à expressão atual.
  ); // Encerra a chamada de document.body.classList.add.


  syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
} // Encerra o bloco da função activateFullscreenFallback.


function deactivateFullscreenFallback() { // Declara a função deactivateFullscreenFallback com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  usingFullscreenFallback = // Atualiza usingFullscreenFallback com false (falso).
    false; // Fornece false (falso) à expressão atual.


  stage?.classList.remove( // Executa a chamada que produz a remoção da classe o texto “is-presentation-fallback” de stage.classList.
    "is-presentation-fallback" // Fornece o texto “is-presentation-fallback” à expressão atual.
  ); // Encerra a chamada de stage.classList.remove.


  document.body.classList.remove( // Executa a chamada que produz a remoção da classe o texto “presentation-mode-active” de document.body.classList.
    "presentation-mode-active" // Fornece o texto “presentation-mode-active” à expressão atual.
  ); // Encerra a chamada de document.body.classList.remove.


  syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
} // Encerra o bloco da função deactivateFullscreenFallback.


/* =========================================================
   ENTRAR NA APRESENTAÇÃO
========================================================= */

async function enterPresentationMode() { // Declara a função assíncrona enterPresentationMode com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if ( // Verifica a negação de stage ou, se indisponível, o resultado de isPresentationActive para decidir se executa este bloco.
    !stage || // Calcula a negação de stage ou, se indisponível, o resultado de isPresentationActive.
    isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
  ) { // Verifica a negação de stage ou, se indisponível, o resultado de isPresentationActive para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  closeAllSidebars(); // Executa a chamada que produz o resultado de closeAllSidebars.


  stage.classList.add( // Executa a chamada que produz a inclusão da classe o texto “presentation-entering” em stage.classList.
    "presentation-entering" // Fornece o texto “presentation-entering” à expressão atual.
  ); // Encerra a chamada de stage.classList.add.


  const nativeWorked = // Define nativeWorked como o resultado aguardado de o resultado de requestNativeFullscreen com stage.
    await requestNativeFullscreen( // Aguarda o resultado de requestNativeFullscreen com stage antes de continuar.
      stage // Utiliza o valor de stage.
    ); // Encerra a chamada de requestNativeFullscreen.


  if (!nativeWorked) { // Verifica a negação de nativeWorked para decidir se executa este bloco.

    activateFullscreenFallback(); // Executa a chamada que produz o resultado de activateFullscreenFallback.
  } // Encerra o bloco da condição.


  stage.classList.remove( // Executa a chamada que produz a remoção da classe o texto “presentation-entering” de stage.classList.
    "presentation-entering" // Fornece o texto “presentation-entering” à expressão atual.
  ); // Encerra a chamada de stage.classList.remove.


  syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
} // Encerra o bloco da função enterPresentationMode.


/* =========================================================
   SAIR DA APRESENTAÇÃO
========================================================= */

async function exitPresentationMode() { // Declara a função assíncrona exitPresentationMode com nenhum parâmetro.
  if ( // Verifica usingFullscreenFallback para decidir se executa este bloco.
    usingFullscreenFallback // Utiliza o valor de usingFullscreenFallback.
  ) { // Verifica usingFullscreenFallback para decidir se executa este bloco.

    deactivateFullscreenFallback(); // Executa a chamada que produz o resultado de deactivateFullscreenFallback.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica o resultado de getNativeFullscreenElement para decidir se executa este bloco.
    getNativeFullscreenElement() // Executa a chamada que produz o resultado de getNativeFullscreenElement.
  ) { // Verifica o resultado de getNativeFullscreenElement para decidir se executa este bloco.

    await exitNativeFullscreen(); // Aguarda o resultado de exitNativeFullscreen antes de continuar.
  } // Encerra o bloco da condição.


  syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
} // Encerra o bloco da função exitPresentationMode.


/* =========================================================
   ALTERNAR APRESENTAÇÃO
========================================================= */

async function togglePresentationMode() { // Declara a função assíncrona togglePresentationMode com nenhum parâmetro.
  if ( // Verifica o resultado de isPresentationActive para decidir se executa este bloco.
    isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
  ) { // Verifica o resultado de isPresentationActive para decidir se executa este bloco.

    await exitPresentationMode(); // Aguarda o resultado de exitPresentationMode antes de continuar.

  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    await enterPresentationMode(); // Aguarda o resultado de enterPresentationMode antes de continuar.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função togglePresentationMode.


/* =========================================================
   UI DA APRESENTAÇÃO
========================================================= */

function syncPresentationUI() { // Declara a função syncPresentationUI com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if (!stage) { // Verifica a negação de stage para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const active = // Define active como o resultado de isPresentationActive.
    isPresentationActive(); // Executa a chamada que produz o resultado de isPresentationActive.


  stage.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “is-presentation” em stage.classList.
    "is-presentation", // Fornece o texto “is-presentation” à expressão atual.
    active // Utiliza o valor de active.
  ); // Encerra a chamada de stage.classList.toggle.


  const toggleButton = // Define toggleButton como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-toggle]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-toggle]”.
      "[data-presentation-toggle]" // Fornece o texto “[data-presentation-toggle]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  if (toggleButton) { // Verifica toggleButton para decidir se executa este bloco.

    toggleButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-label” em toggleButton.
      "aria-label", // Fornece o texto “aria-label” à expressão atual.
      active // Utiliza o valor de active.
        ? "Sair da tela cheia" // Fornece o texto “Sair da tela cheia” à expressão atual.
        : "Abrir em tela cheia" // Fornece o texto “Abrir em tela cheia” à expressão atual.
    ); // Encerra a chamada de toggleButton.setAttribute.


    toggleButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “title” em toggleButton.
      "title", // Fornece o texto “title” à expressão atual.
      active // Utiliza o valor de active.
        ? "Sair da tela cheia" // Fornece o texto “Sair da tela cheia” à expressão atual.
        : "Tela cheia" // Fornece o texto “Tela cheia” à expressão atual.
    ); // Encerra a chamada de toggleButton.setAttribute.


    const label = // Define label como o primeiro elemento que corresponde ao seletor o texto “.presentation-toggle-label”.
      toggleButton.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.presentation-toggle-label”.
        ".presentation-toggle-label" // Fornece o texto “.presentation-toggle-label” à expressão atual.
      ); // Encerra a chamada de toggleButton.querySelector.


    if (label) { // Verifica label para decidir se executa este bloco.

      label.textContent = // Atualiza label.textContent com o texto “Sair” se active; caso contrário, o texto “Tela cheia”.
        active // Utiliza o valor de active.
          ? "Sair" // Fornece o texto “Sair” à expressão atual.
          : "Tela cheia"; // Fornece o texto “Tela cheia” à expressão atual.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.


  const controls = // Define controls como o primeiro elemento que corresponde ao seletor o texto “.presentation-controls”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.presentation-controls”.
      ".presentation-controls" // Fornece o texto “.presentation-controls” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  if (controls) { // Verifica controls para decidir se executa este bloco.

    controls.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “is-visible” em controls.classList.
      "is-visible", // Fornece o texto “is-visible” à expressão atual.
      active // Utiliza o valor de active.
    ); // Encerra a chamada de controls.classList.toggle.
  } // Encerra o bloco da condição.


  updatePresentationNavigation(); // Executa a chamada que produz o resultado de updatePresentationNavigation.
} // Encerra o bloco da função syncPresentationUI.


/* =========================================================
   CONTROLES DA APRESENTAÇÃO
========================================================= */

function bindPresentationControls( // Declara a função bindPresentationControls com stage.
  stage // Utiliza o valor de stage.
) { // Declara a função bindPresentationControls com stage.
  if (!stage) { // Verifica a negação de stage para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const toggle = // Define toggle como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-toggle]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-toggle]”.
      "[data-presentation-toggle]" // Fornece o texto “[data-presentation-toggle]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  const previous = // Define previous como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-previous]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-previous]”.
      "[data-presentation-previous]" // Fornece o texto “[data-presentation-previous]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  const next = // Define next como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-next]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-next]”.
      "[data-presentation-next]" // Fornece o texto “[data-presentation-next]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  toggle?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em toggle.
    "click", // Fornece o texto “click” à expressão atual.
    async (event) => { // Define a função assíncrona que recebe event.

      event.stopPropagation(); // Executa a chamada que produz a interrupção da propagação do evento.

      await togglePresentationMode(); // Aguarda o resultado de togglePresentationMode antes de continuar.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de toggle.addEventListener.


  previous?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em previous.
    "click", // Fornece o texto “click” à expressão atual.
    async (event) => { // Define a função assíncrona que recebe event.

      event.stopPropagation(); // Executa a chamada que produz a interrupção da propagação do evento.

      await goPrevious(); // Aguarda o resultado de goPrevious antes de continuar.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de previous.addEventListener.


  next?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em next.
    "click", // Fornece o texto “click” à expressão atual.
    async (event) => { // Define a função assíncrona que recebe event.

      event.stopPropagation(); // Executa a chamada que produz a interrupção da propagação do evento.

      await goNext(); // Aguarda o resultado de goNext antes de continuar.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de next.addEventListener.


  syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
} // Encerra o bloco da função bindPresentationControls.


/* =========================================================
   VIEWER
========================================================= */

function ensureSlideViewer() { // Declara a função ensureSlideViewer com nenhum parâmetro.
  const currentLesson = // Define currentLesson como o resultado de $ com o texto “current-lesson”.
    $("current-lesson"); // Executa a chamada que produz o resultado de $ com o texto “current-lesson”.


  if (!currentLesson) { // Verifica a negação de currentLesson para decidir se executa este bloco.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  let viewer = // Define viewer como o primeiro elemento que corresponde ao seletor o texto “.slide-viewer”.
    currentLesson.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-viewer”.
      ".slide-viewer" // Fornece o texto “.slide-viewer” à expressão atual.
    ); // Encerra a chamada de currentLesson.querySelector.


  if ( // Verifica viewer e o primeiro elemento que corresponde ao seletor .slide-layer-a e o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b” para decidir se executa este bloco.
    viewer && // Calcula viewer e o primeiro elemento que corresponde ao seletor .slide-layer-a e o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b”.
    viewer.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-layer-a”.
      ".slide-layer-a" // Fornece o texto “.slide-layer-a” à expressão atual.
    ) && // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-layer-a”.
    viewer.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b”.
      ".slide-layer-b" // Fornece o texto “.slide-layer-b” à expressão atual.
    ) // Encerra a chamada de viewer.querySelector.
  ) { // Verifica viewer e o primeiro elemento que corresponde ao seletor .slide-layer-a e o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b” para decidir se executa este bloco.

    syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.

    return viewer; // Retorna viewer.
  } // Encerra o bloco da condição.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza currentLesson.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 3 do trecho: Compõe o trecho de texto “id="slide-stage"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “class="slide-stage"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 7 do trecho: Insere um botão com o texto “<button”.
   * Linha 8 do trecho: Compõe o trecho de texto “type="button"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “class="presentation-toggle"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “data-presentation-toggle” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-label="Abrir em tela cheia"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “title="Tela cheia"” sem modificá-lo.
   * Linha 13 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 15 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 16 do trecho: Compõe o trecho de texto “width="20"” sem modificá-lo.
   * Linha 17 do trecho: Compõe o trecho de texto “height="20"” sem modificá-lo.
   * Linha 18 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 19 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 20 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 21 do trecho: Compõe o trecho de texto “stroke-width="2"” sem modificá-lo.
   * Linha 22 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 23 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 24 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 25 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 26 do trecho: Insere um traçado vetorial.
   * Linha 27 do trecho: Insere um traçado vetorial.
   * Linha 28 do trecho: Insere um traçado vetorial.
   * Linha 29 do trecho: Insere um traçado vetorial.
   * Linha 30 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 32 do trecho: Insere um trecho de texto em linha com o texto “<span”.
   * Linha 33 do trecho: Compõe o trecho de texto “class="presentation-toggle-label"” sem modificá-lo.
   * Linha 34 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 35 do trecho: Compõe o trecho de texto “Tela cheia” sem modificá-lo.
   * Linha 36 do trecho: Encerra um trecho de texto em linha.
   * Linha 38 do trecho: Encerra um botão.
   * Linha 41 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 42 do trecho: Compõe o trecho de texto “class="slide-viewer"” sem modificá-lo.
   * Linha 43 do trecho: Compõe o trecho de texto “aria-live="polite"” sem modificá-lo.
   * Linha 44 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 46 do trecho: Insere uma imagem com o texto “<img”.
   * Linha 47 do trecho: Compõe o trecho de texto “class="slide-layer slide-layer-a"” sem modificá-lo.
   * Linha 48 do trecho: Compõe o trecho de texto “alt=""” sem modificá-lo.
   * Linha 49 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 51 do trecho: Insere uma imagem com o texto “<img”.
   * Linha 52 do trecho: Compõe o trecho de texto “class="slide-layer slide-layer-b"” sem modificá-lo.
   * Linha 53 do trecho: Compõe o trecho de texto “alt=""” sem modificá-lo.
   * Linha 54 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 56 do trecho: Encerra um contêiner de layout.
   * Linha 59 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 60 do trecho: Compõe o trecho de texto “class="presentation-controls"” sem modificá-lo.
   * Linha 61 do trecho: Compõe o trecho de texto “aria-label="Controles da apresentação"” sem modificá-lo.
   * Linha 62 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 64 do trecho: Insere um botão com o texto “<button”.
   * Linha 65 do trecho: Compõe o trecho de texto “type="button"” sem modificá-lo.
   * Linha 66 do trecho: Compõe o trecho de texto “class="presentation-nav-btn presentation-prev"” sem modificá-lo.
   * Linha 67 do trecho: Compõe o trecho de texto “data-presentation-previous” sem modificá-lo.
   * Linha 68 do trecho: Compõe o trecho de texto “aria-label="Slide anterior"” sem modificá-lo.
   * Linha 69 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 71 do trecho: Insere um trecho de texto em linha.
   * Linha 72 do trecho: Compõe o trecho de texto “←” sem modificá-lo.
   * Linha 73 do trecho: Encerra um trecho de texto em linha.
   * Linha 75 do trecho: Insere um trecho de texto em linha com o texto “<span”.
   * Linha 76 do trecho: Compõe o trecho de texto “class="presentation-nav-text"” sem modificá-lo.
   * Linha 77 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 78 do trecho: Inclui o campo “Anterior” no texto da consulta.
   * Linha 79 do trecho: Encerra um trecho de texto em linha.
   * Linha 81 do trecho: Encerra um botão.
   * Linha 84 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 85 do trecho: Compõe o trecho de texto “class="presentation-counter"” sem modificá-lo.
   * Linha 86 do trecho: Compõe o trecho de texto “data-presentation-counter” sem modificá-lo.
   * Linha 87 do trecho: Compõe o trecho de texto “aria-live="polite"” sem modificá-lo.
   * Linha 88 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 89 do trecho: Compõe o trecho de texto “1 / 1” sem modificá-lo.
   * Linha 90 do trecho: Encerra um contêiner de layout.
   * Linha 93 do trecho: Insere um botão com o texto “<button”.
   * Linha 94 do trecho: Compõe o trecho de texto “type="button"” sem modificá-lo.
   * Linha 95 do trecho: Compõe o trecho de texto “class="presentation-nav-btn presentation-next"” sem modificá-lo.
   * Linha 96 do trecho: Compõe o trecho de texto “data-presentation-next” sem modificá-lo.
   * Linha 97 do trecho: Compõe o trecho de texto “aria-label="Próximo slide"” sem modificá-lo.
   * Linha 98 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 100 do trecho: Insere um trecho de texto em linha com o texto “<span”.
   * Linha 101 do trecho: Compõe o trecho de texto “class="presentation-nav-text"” sem modificá-lo.
   * Linha 102 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 103 do trecho: Compõe o trecho de texto “Próxima” sem modificá-lo.
   * Linha 104 do trecho: Encerra um trecho de texto em linha.
   * Linha 106 do trecho: Insere um trecho de texto em linha.
   * Linha 107 do trecho: Compõe o trecho de texto “→” sem modificá-lo.
   * Linha 108 do trecho: Encerra um trecho de texto em linha.
   * Linha 110 do trecho: Encerra um botão.
   * Linha 112 do trecho: Encerra um contêiner de layout.
   * Linha 114 do trecho: Encerra um contêiner de layout.
   * Linha 115 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  currentLesson.innerHTML = `
    <div
      id="slide-stage"
      class="slide-stage"
    >

      <button
        type="button"
        class="presentation-toggle"
        data-presentation-toggle
        aria-label="Abrir em tela cheia"
        title="Tela cheia"
      >

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
          <path d="M16 3h3a2 2 0 0 1 2 2v3"/>
          <path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>

        <span
          class="presentation-toggle-label"
        >
          Tela cheia
        </span>

      </button>


      <div
        class="slide-viewer"
        aria-live="polite"
      >

        <img
          class="slide-layer slide-layer-a"
          alt=""
        >

        <img
          class="slide-layer slide-layer-b"
          alt=""
        >

      </div>


      <div
        class="presentation-controls"
        aria-label="Controles da apresentação"
      >

        <button
          type="button"
          class="presentation-nav-btn presentation-prev"
          data-presentation-previous
          aria-label="Slide anterior"
        >

          <span aria-hidden="true">
            ←
          </span>

          <span
            class="presentation-nav-text"
          >
            Anterior
          </span>

        </button>


        <div
          class="presentation-counter"
          data-presentation-counter
          aria-live="polite"
        >
          1 / 1
        </div>


        <button
          type="button"
          class="presentation-nav-btn presentation-next"
          data-presentation-next
          aria-label="Próximo slide"
        >

          <span
            class="presentation-nav-text"
          >
            Próxima
          </span>

          <span aria-hidden="true">
            →
          </span>

        </button>

      </div>

    </div>
  `;


  viewer = // Atualiza viewer com o primeiro elemento que corresponde ao seletor o texto “.slide-viewer”.
    currentLesson.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-viewer”.
      ".slide-viewer" // Fornece o texto “.slide-viewer” à expressão atual.
    ); // Encerra a chamada de currentLesson.querySelector.


  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if ( // Verifica a negação de viewer ou, se indisponível, a negação de stage para decidir se executa este bloco.
    !viewer || // Calcula a negação de viewer ou, se indisponível, a negação de stage.
    !stage // Compõe a negação de stage na operação atual.
  ) { // Verifica a negação de viewer ou, se indisponível, a negação de stage para decidir se executa este bloco.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  viewer.style.position = // Atualiza viewer.style.position com o texto “relative”.
    "relative"; // Fornece o texto “relative” à expressão atual.


  viewer.style.overflow = // Atualiza viewer.style.overflow com o texto “hidden”.
    "hidden"; // Fornece o texto “hidden” à expressão atual.


  const images = // Define images como todos os elementos que correspondem ao seletor o texto “.slide-layer”.
    viewer.querySelectorAll( // Executa a chamada que produz todos os elementos que correspondem ao seletor o texto “.slide-layer”.
      ".slide-layer" // Fornece o texto “.slide-layer” à expressão atual.
    ); // Encerra a chamada de viewer.querySelectorAll.


  images.forEach( // Executa a chamada que produz a execução da função para cada item de images.
    ( // Define a função que recebe image, index.
      image, // Utiliza o valor de image.
      index // Utiliza o valor de index.
    ) => { // Define a função que recebe image, index.

      image.style.position = // Atualiza image.style.position com o texto “absolute”.
        "absolute"; // Fornece o texto “absolute” à expressão atual.


      image.style.inset = // Atualiza image.style.inset com o texto “0”.
        "0"; // Fornece o texto “0” à expressão atual.


      image.style.width = // Atualiza image.style.width com o texto “100%”.
        "100%"; // Fornece o texto “100%” à expressão atual.


      image.style.height = // Atualiza image.style.height com o texto “100%”.
        "100%"; // Fornece o texto “100%” à expressão atual.


      image.style.objectFit = // Atualiza image.style.objectFit com o texto “contain”.
        "contain"; // Fornece o texto “contain” à expressão atual.


      image.style.objectPosition = // Atualiza image.style.objectPosition com o texto “center”.
        "center"; // Fornece o texto “center” à expressão atual.


      image.style.background = // Atualiza image.style.background com o texto “transparent”.
        "transparent"; // Fornece o texto “transparent” à expressão atual.


      image.style.transition = // Atualiza image.style.transition com um texto montado com 2 valores dinâmicos.
        `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


      image.style.animation = // Atualiza image.style.animation com o texto “none”.
        "none"; // Fornece o texto “none” à expressão atual.


      image.style.willChange = // Atualiza image.style.willChange com o texto “opacity, transform”.
        "opacity, transform"; // Fornece o texto “opacity, transform” à expressão atual.


      image.style.opacity = // Atualiza image.style.opacity com o texto “1” se index igual, inclusive no tipo, a 0; caso contrário, o texto “0”.
        index === 0 // Calcula index igual, inclusive no tipo, a 0.
          ? "1" // Fornece o texto “1” à expressão atual.
          : "0"; // Fornece o texto “0” à expressão atual.


      image.style.transform = // Atualiza image.style.transform com o texto “scale(1)”.
        "scale(1)"; // Fornece o texto “scale(1)” à expressão atual.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de images.forEach.


  activeSlideLayer = // Atualiza activeSlideLayer com 0.
    0; // Fornece 0 à expressão atual.


  visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  bindPresentationControls( // Executa a chamada que produz o resultado de bindPresentationControls com stage.
    stage // Utiliza o valor de stage.
  ); // Encerra a chamada de bindPresentationControls.


  return viewer; // Retorna viewer.
} // Encerra o bloco da função ensureSlideViewer.


/* =========================================================
   CAMADAS
========================================================= */

function getSlideLayers(viewer) { // Declara a função getSlideLayers com viewer.
  if (!viewer) { // Verifica a negação de viewer para decidir se executa este bloco.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  const layerA = // Define layerA como o primeiro elemento que corresponde ao seletor o texto “.slide-layer-a”.
    viewer.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-layer-a”.
      ".slide-layer-a" // Fornece o texto “.slide-layer-a” à expressão atual.
    ); // Encerra a chamada de viewer.querySelector.


  const layerB = // Define layerB como o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b”.
    viewer.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.slide-layer-b”.
      ".slide-layer-b" // Fornece o texto “.slide-layer-b” à expressão atual.
    ); // Encerra a chamada de viewer.querySelector.


  if ( // Verifica a negação de layerA ou, se indisponível, a negação de layerB para decidir se executa este bloco.
    !layerA || // Calcula a negação de layerA ou, se indisponível, a negação de layerB.
    !layerB // Compõe a negação de layerB na operação atual.
  ) { // Verifica a negação de layerA ou, se indisponível, a negação de layerB para decidir se executa este bloco.
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco da condição.


  return { // Retorna um objeto com layerA, layerB.
    layerA, // Inclui a propriedade layerA com o valor da variável de mesmo nome.
    layerB // Inclui a propriedade layerB com o valor da variável de mesmo nome.
  }; // Encerra o objeto.
} // Encerra o bloco da função getSlideLayers.


/* =========================================================
   PRIMEIRO SLIDE
========================================================= */

function showInitialSlide( // Declara a função showInitialSlide com viewer, url, alt.
  viewer, // Utiliza o valor de viewer.
  url, // Utiliza o valor de url.
  alt // Utiliza o valor de alt.
) { // Declara a função showInitialSlide com viewer, url, alt.
  const layers = // Define layers como o resultado de getSlideLayers com viewer.
    getSlideLayers(viewer); // Executa a chamada que produz o resultado de getSlideLayers com viewer.


  if (!layers) { // Verifica a negação de layers para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const { // Define layerA, layerB como layers.
    layerA, // Inclui a propriedade layerA com o valor da variável de mesmo nome.
    layerB // Inclui a propriedade layerB com o valor da variável de mesmo nome.
  } = layers; // Utiliza o valor de layers.


  layerA.style.transition = // Atualiza layerA.style.transition com o texto “none”.
    "none"; // Fornece o texto “none” à expressão atual.


  layerB.style.transition = // Atualiza layerB.style.transition com o texto “none”.
    "none"; // Fornece o texto “none” à expressão atual.


  layerA.src = // Atualiza layerA.src com url.
    url; // Utiliza o valor de url.


  layerA.alt = // Atualiza layerA.alt com alt.
    alt; // Utiliza o valor de alt.


  layerA.style.opacity = // Atualiza layerA.style.opacity com o texto “1”.
    "1"; // Fornece o texto “1” à expressão atual.


  layerA.style.transform = // Atualiza layerA.style.transform com o texto “scale(1)”.
    "scale(1)"; // Fornece o texto “scale(1)” à expressão atual.


  layerB.style.opacity = // Atualiza layerB.style.opacity com o texto “0”.
    "0"; // Fornece o texto “0” à expressão atual.


  layerB.removeAttribute( // Executa a chamada que produz a remoção do atributo o texto “src” de layerB.
    "src" // Fornece o texto “src” à expressão atual.
  ); // Encerra a chamada de layerB.removeAttribute.


  void layerA.offsetWidth; // Compõe a execução sem usar o retorno de layerA.offsetWidth na operação atual.


  layerA.style.transition = // Atualiza layerA.style.transition com um texto montado com 2 valores dinâmicos.
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


  layerB.style.transition = // Atualiza layerB.style.transition com um texto montado com 2 valores dinâmicos.
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


  activeSlideLayer = // Atualiza activeSlideLayer com 0.
    0; // Fornece 0 à expressão atual.
} // Encerra o bloco da função showInitialSlide.


/* =========================================================
   CROSSFADE
========================================================= */

async function crossfadeSlide( // Declara a função assíncrona crossfadeSlide com viewer, url, alt.
  viewer, // Utiliza o valor de viewer.
  url, // Utiliza o valor de url.
  alt // Utiliza o valor de alt.
) { // Declara a função assíncrona crossfadeSlide com viewer, url, alt.
  const layers = // Define layers como o resultado de getSlideLayers com viewer.
    getSlideLayers(viewer); // Executa a chamada que produz o resultado de getSlideLayers com viewer.


  if (!layers) { // Verifica a negação de layers para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const { // Define layerA, layerB como layers.
    layerA, // Inclui a propriedade layerA com o valor da variável de mesmo nome.
    layerB // Inclui a propriedade layerB com o valor da variável de mesmo nome.
  } = layers; // Utiliza o valor de layers.


  const currentImage = // Define currentImage como layerA se activeSlideLayer igual, inclusive no tipo, a 0; caso contrário, layerB.
    activeSlideLayer === 0 // Calcula activeSlideLayer igual, inclusive no tipo, a 0.
      ? layerA // Utiliza o valor de layerA.
      : layerB; // Utiliza o valor de layerB.


  const incomingImage = // Define incomingImage como layerB se activeSlideLayer igual, inclusive no tipo, a 0; caso contrário, layerA.
    activeSlideLayer === 0 // Calcula activeSlideLayer igual, inclusive no tipo, a 0.
      ? layerB // Utiliza o valor de layerB.
      : layerA; // Utiliza o valor de layerA.


  incomingImage.style.transition = // Atualiza incomingImage.style.transition com o texto “none”.
    "none"; // Fornece o texto “none” à expressão atual.


  incomingImage.style.opacity = // Atualiza incomingImage.style.opacity com o texto “0”.
    "0"; // Fornece o texto “0” à expressão atual.


  incomingImage.style.transform = // Atualiza incomingImage.style.transform com o texto “scale(1.008)”.
    "scale(1.008)"; // Fornece o texto “scale(1.008)” à expressão atual.


  incomingImage.src = // Atualiza incomingImage.src com url.
    url; // Utiliza o valor de url.


  incomingImage.alt = // Atualiza incomingImage.alt com alt.
    alt; // Utiliza o valor de alt.


  void incomingImage.offsetWidth; // Compõe a execução sem usar o retorno de incomingImage.offsetWidth na operação atual.


  incomingImage.style.transition = // Atualiza incomingImage.style.transition com um texto montado com 2 valores dinâmicos.
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


  currentImage.style.transition = // Atualiza currentImage.style.transition com um texto montado com 2 valores dinâmicos.
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


  incomingImage.style.opacity = // Atualiza incomingImage.style.opacity com o texto “1”.
    "1"; // Fornece o texto “1” à expressão atual.


  incomingImage.style.transform = // Atualiza incomingImage.style.transform com o texto “scale(1)”.
    "scale(1)"; // Fornece o texto “scale(1)” à expressão atual.


  currentImage.style.opacity = // Atualiza currentImage.style.opacity com o texto “0”.
    "0"; // Fornece o texto “0” à expressão atual.


  currentImage.style.transform = // Atualiza currentImage.style.transform com o texto “scale(0.992)”.
    "scale(0.992)"; // Fornece o texto “scale(0.992)” à expressão atual.


  await wait( // Aguarda o resultado de wait com SLIDE_TRANSITION_MS mais 30 antes de continuar.
    SLIDE_TRANSITION_MS + 30 // Calcula SLIDE_TRANSITION_MS mais 30.
  ); // Encerra a chamada de wait.


  currentImage.style.transform = // Atualiza currentImage.style.transform com o texto “scale(1)”.
    "scale(1)"; // Fornece o texto “scale(1)” à expressão atual.


  activeSlideLayer = // Atualiza activeSlideLayer com 1 se activeSlideLayer igual, inclusive no tipo, a 0; caso contrário, 0.
    activeSlideLayer === 0 // Calcula activeSlideLayer igual, inclusive no tipo, a 0.
      ? 1 // Fornece 1 à expressão atual.
      : 0; // Fornece 0 à expressão atual.
} // Encerra o bloco da função crossfadeSlide.


/* =========================================================
   PRÉ-CARREGAR SLIDE
========================================================= */

async function preloadSlideAt( // Declara a função assíncrona preloadSlideAt com lessonIndex, slideIndex.
  lessonIndex, // Utiliza o valor de lessonIndex.
  slideIndex // Utiliza o valor de slideIndex.
) { // Declara a função assíncrona preloadSlideAt com lessonIndex, slideIndex.
  if ( // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com lessonIndex na operação atual.
      lessonIndex // Utiliza o valor de lessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lesson = // Define lesson como lessons[lessonIndex].
    lessons[ // Acessa lessons[lessonIndex].
      lessonIndex // Utiliza o valor de lessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonSlides.


  const slide = // Define slide como lessonSlides[slideIndex].
    lessonSlides[ // Acessa lessonSlides[slideIndex].
      slideIndex // Utiliza o valor de slideIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  if (!slide) { // Verifica a negação de slide para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const url = // Define url como o resultado aguardado de o resultado de getSlideUrl com slide.
      await getSlideUrl( // Aguarda o resultado de getSlideUrl com slide antes de continuar.
        slide // Utiliza o valor de slide.
      ); // Encerra a chamada de getSlideUrl.


    if (url) { // Verifica url para decidir se executa este bloco.

      await preloadImage( // Aguarda o resultado de preloadImage com url antes de continuar.
        url // Utiliza o valor de url.
      ); // Encerra a chamada de preloadImage.
    } // Encerra o bloco da condição.

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.debug( // Executa a chamada que produz o registro de o texto “Pré-carregamento ignorado:” no console.
      "Pré-carregamento ignorado:", // Fornece o texto “Pré-carregamento ignorado:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.debug.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função preloadSlideAt.


function preloadNearbySlides() { // Declara a função preloadNearbySlides com nenhum parâmetro.
  preloadSlideAt( // Executa a chamada que produz o resultado de preloadSlideAt com currentLessonIndex e currentSlideIndex mais 1.
    currentLessonIndex, // Utiliza o valor de currentLessonIndex.
    currentSlideIndex + 1 // Calcula currentSlideIndex mais 1.
  ); // Encerra a chamada de preloadSlideAt.


  preloadSlideAt( // Executa a chamada que produz o resultado de preloadSlideAt com currentLessonIndex e currentSlideIndex menos 1.
    currentLessonIndex, // Utiliza o valor de currentLessonIndex.
    currentSlideIndex - 1 // Calcula currentSlideIndex menos 1.
  ); // Encerra a chamada de preloadSlideAt.


  const nextLessonIndex = // Define nextLessonIndex como currentLessonIndex mais 1.
    currentLessonIndex + 1; // Calcula currentLessonIndex mais 1.


  if ( // Verifica nextLessonIndex menor que lessons.length e o resultado de isLessonUnlocked com nextLessonIndex para decidir se executa este bloco.
    nextLessonIndex < // Calcula nextLessonIndex menor que lessons.length.
      lessons.length && // Acessa lessons.length.
    isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com nextLessonIndex.
      nextLessonIndex // Utiliza o valor de nextLessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica nextLessonIndex menor que lessons.length e o resultado de isLessonUnlocked com nextLessonIndex para decidir se executa este bloco.

    preloadSlideAt( // Executa a chamada que produz o resultado de preloadSlideAt com nextLessonIndex e 0.
      nextLessonIndex, // Utiliza o valor de nextLessonIndex.
      0 // Fornece 0 à expressão atual.
    ); // Encerra a chamada de preloadSlideAt.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função preloadNearbySlides.


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function loadUserSession() { // Declara a função assíncrona loadUserSession com nenhum parâmetro.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const { data: { session }, error } = await supabase.auth.getSession(); // Define session, error como o resultado aguardado de a consulta da sessão atual no Supabase.
    if (error) throw error; // Verifica error; se verdadeiro, lança error para interromper o fluxo e informar a falha.
    currentUser = session?.user || null; // Atualiza currentUser com session.user com acesso opcional ou, se indisponível, null (ausência de valor).
    return currentUser; // Retorna currentUser.
  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
    console.error('Erro ao carregar sessão:', error); // Executa a chamada que produz o registro de o texto “Erro ao carregar sessão:” no console.
    currentUser = null; // Atualiza currentUser com null (ausência de valor).
    return null; // Retorna null (ausência de valor).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função loadUserSession.

/* LIMPAR MAPAS */
function clearDataMaps() { // Declara a função clearDataMaps com nenhum parâmetro.
  slidesByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de slidesByLesson.

  materialsByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de materialsByLesson.

  progressByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de progressByLesson.

  slideUrlCache.clear(); // Executa a chamada que produz a limpeza dos itens de slideUrlCache.

  preloadedSlideUrls.clear(); // Executa a chamada que produz a limpeza dos itens de preloadedSlideUrls.

  visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
    ""; // Fornece o texto “” à expressão atual.

  activeSlideLayer = // Atualiza activeSlideLayer com 0.
    0; // Fornece 0 à expressão atual.
} // Encerra o bloco da função clearDataMaps.


/* =========================================================
   CARREGAR CURSO
========================================================= */

async function loadCourse() { // Declara a função assíncrona loadCourse com nenhum parâmetro.
  const { // Define data, error como o resultado aguardado de um registro ou null, sem exigir um resultado.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda um registro ou null, sem exigir um resultado antes de continuar.
      .from("catalogo") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “catalogo”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “nome” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “descricao” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “categoria” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “imagem_capa_url” no texto da consulta.
       * Linha 7 do trecho: Inclui o campo “status” no texto da consulta.
       * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        nome,
        descricao,
        categoria,
        imagem_capa_url,
        status
      `)
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “id” igual a COURSE_ID.
        "id", // Fornece o texto “id” à expressão atual.
        COURSE_ID // Utiliza o valor de COURSE_ID.
      ) // Encerra a chamada de supabase.from(…).select(…).eq.
      .maybeSingle(); // Executa a chamada que produz um registro ou null, sem exigir um resultado.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  course = // Atualiza course com data ou, se indisponível, o resultado de getDefaultCourse.
    data || // Calcula data ou, se indisponível, o resultado de getDefaultCourse.
    getDefaultCourse(); // Executa a chamada que produz o resultado de getDefaultCourse.
} // Encerra o bloco da função loadCourse.


/* =========================================================
   CARREGAR MÓDULOS
========================================================= */

async function loadModules() { // Declara a função assíncrona loadModules com nenhum parâmetro.
  const { // Define data, error como o resultado aguardado de a ordenação por o texto “ordem”.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda a ordenação por o texto “ordem” antes de continuar.
      .from("modulos") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “modulos”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “curso_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “nome” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “descricao” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “ordem” no texto da consulta.
       * Linha 7 do trecho: Inclui o campo “status” no texto da consulta.
       * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        curso_id,
        nome,
        descricao,
        ordem,
        status
      `)
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “curso_id” igual a COURSE_ID.
        "curso_id", // Fornece o texto “curso_id” à expressão atual.
        COURSE_ID // Utiliza o valor de COURSE_ID.
      ) // Encerra a chamada de supabase.from(…).select(…).eq.
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…).eq(…), filtrada por o texto “status” igual a o texto “publicado”.
        "status", // Fornece o texto “status” à expressão atual.
        "publicado" // Fornece o texto “publicado” à expressão atual.
      ) // Encerra a chamada de supabase.from(…).select(…).eq(…).eq.
      .order( // Executa a chamada que produz a ordenação por o texto “ordem”.
        "ordem", // Fornece o texto “ordem” à expressão atual.
        { // Inicia um objeto com ascending.
          ascending: true // Define a propriedade ascending como true (verdadeiro).
        } // Encerra o objeto.
      ); // Encerra a chamada de supabase.from(…).select(…).eq(…).eq(…).order.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  modules = // Atualiza modules com data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
    Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
      ? data // Utiliza o valor de data.
      : []; // Inicia uma lista vazia.
} // Encerra o bloco da função loadModules.


/* =========================================================
   CARREGAR AULAS
========================================================= */

async function loadLessons() { // Declara a função assíncrona loadLessons com nenhum parâmetro.
  if (!modules.length) { // Verifica a negação de modules.length para decidir se executa este bloco.

    lessons = []; // Atualiza lessons com uma lista vazia.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const moduleIds = // Define moduleIds como uma lista transformada a partir de modules.
    modules.map( // Executa a chamada que produz uma lista transformada a partir de modules.
      (module) => // Define a função que recebe module.
        module.id // Acessa module.id.
    ); // Encerra a chamada de modules.map.


  const { // Define data, error como o resultado aguardado de a ordenação por o texto “ordem”.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda a ordenação por o texto “ordem” antes de continuar.
      .from("aulas") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “aulas”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “modulo_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “nome” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “descricao” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “ordem” no texto da consulta.
       * Linha 7 do trecho: Inclui o campo “status” no texto da consulta.
       * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        modulo_id,
        nome,
        descricao,
        ordem,
        status
      `)
      .in( // Executa a chamada que produz o resultado de supabase.from(…).select(…).in com o texto “modulo_id” e moduleIds.
        "modulo_id", // Fornece o texto “modulo_id” à expressão atual.
        moduleIds // Utiliza o valor de moduleIds.
      ) // Encerra a chamada de supabase.from(…).select(…).in.
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…).in(…), filtrada por o texto “status” igual a o texto “publicado”.
        "status", // Fornece o texto “status” à expressão atual.
        "publicado" // Fornece o texto “publicado” à expressão atual.
      ) // Encerra a chamada de supabase.from(…).select(…).in(…).eq.
      .order( // Executa a chamada que produz a ordenação por o texto “ordem”.
        "ordem", // Fornece o texto “ordem” à expressão atual.
        { // Inicia um objeto com ascending.
          ascending: true // Define a propriedade ascending como true (verdadeiro).
        } // Encerra o objeto.
      ); // Encerra a chamada de supabase.from(…).select(…).in(…).eq(…).order.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  const rawLessons = // Define rawLessons como data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
    Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
      ? data // Utiliza o valor de data.
      : []; // Inicia uma lista vazia.


  lessons = // Atualiza lessons com a ordenação dos itens de rawLessons.map(…).
    rawLessons // Executa a chamada que produz a ordenação dos itens de rawLessons.map(…).
      .map( // Executa a chamada que produz uma lista transformada a partir de rawLessons.
        (lesson) => { // Define a função que recebe lesson.

          const module = // Define module como o primeiro item de modules que passa na condição.
            modules.find( // Executa a chamada que produz o primeiro item de modules que passa na condição.
              (item) => // Define a função que recebe item.
                Number( // Executa a chamada que produz a conversão de item.id em número.
                  item.id // Acessa item.id.
                ) === // Executa a chamada que produz a conversão de item.id em número.
                Number( // Executa a chamada que produz a conversão de lesson.modulo_id em número.
                  lesson.modulo_id // Acessa lesson.modulo_id.
                ) // Encerra a chamada de Number.
            ); // Encerra a chamada de modules.find.


          return { // Retorna um objeto com lesson, module.
            ...lesson, // Expande lesson dentro da lista ou do objeto.

            module: // Define a propriedade module como module ou, se indisponível, null (ausência de valor).
              module || // Calcula module ou, se indisponível, null (ausência de valor).
              null // Fornece null (ausência de valor) à expressão atual.
          }; // Encerra o objeto.
        } // Encerra o bloco atual.
      ) // Encerra a chamada de rawLessons.map.
      .sort( // Executa a chamada que produz a ordenação dos itens de rawLessons.map(…).
        ( // Define a função que recebe a, b.
          a, // Utiliza o valor de a.
          b // Utiliza o valor de b.
        ) => { // Define a função que recebe a, b.

          const moduleA = // Define moduleA como o resultado de normalizeNumber com a.module.ordem com acesso opcional.
            normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com a.module.ordem com acesso opcional.
              a.module?.ordem // Acessa a.module.ordem.
            ); // Encerra a chamada de normalizeNumber.


          const moduleB = // Define moduleB como o resultado de normalizeNumber com b.module.ordem com acesso opcional.
            normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com b.module.ordem com acesso opcional.
              b.module?.ordem // Acessa b.module.ordem.
            ); // Encerra a chamada de normalizeNumber.


          if ( // Verifica moduleA diferente, inclusive no tipo, de moduleB para decidir se executa este bloco.
            moduleA !== // Calcula moduleA diferente, inclusive no tipo, de moduleB.
            moduleB // Utiliza o valor de moduleB.
          ) { // Verifica moduleA diferente, inclusive no tipo, de moduleB para decidir se executa este bloco.

            return ( // Retorna moduleA menos moduleB.
              moduleA - // Calcula moduleA menos moduleB.
              moduleB // Utiliza o valor de moduleB.
            ); // Encerra a expressão ou função iniciada acima.
          } // Encerra o bloco da condição.


          return ( // Retorna o resultado de normalizeNumber com a.ordem menos o resultado de normalizeNumber com b.ordem.
            normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com a.ordem.
              a.ordem // Acessa a.ordem.
            ) - // Executa a chamada que produz o resultado de normalizeNumber com a.ordem.
            normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com b.ordem.
              b.ordem // Acessa b.ordem.
            ) // Encerra a chamada de normalizeNumber.
          ); // Encerra a expressão ou função iniciada acima.
        } // Encerra o bloco atual.
      ); // Encerra a chamada de rawLessons.map(…).sort.
} // Encerra o bloco da função loadLessons.


/* =========================================================
   CARREGAR SLIDES
========================================================= */

async function loadSlides() { // Declara a função assíncrona loadSlides com nenhum parâmetro.
  slidesByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de slidesByLesson.


  if (!lessons.length) { // Verifica a negação de lessons.length para decidir se executa este bloco.

    slides = []; // Atualiza slides com uma lista vazia.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lessonIds = // Define lessonIds como uma lista transformada a partir de lessons.
    lessons.map( // Executa a chamada que produz uma lista transformada a partir de lessons.
      (lesson) => // Define a função que recebe lesson.
        lesson.id // Acessa lesson.id.
    ); // Encerra a chamada de lessons.map.


  const { // Define data, error como o resultado aguardado de a ordenação por o texto “ordem”.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda a ordenação por o texto “ordem” antes de continuar.
      .from("slides") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “slides”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “aula_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “titulo” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “imagem_path” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “ordem” no texto da consulta.
       * Linha 7 do trecho: Inclui o campo “status” no texto da consulta.
       * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        aula_id,
        titulo,
        imagem_path,
        ordem,
        status
      `)
      .in( // Executa a chamada que produz o resultado de supabase.from(…).select(…).in com o texto “aula_id” e lessonIds.
        "aula_id", // Fornece o texto “aula_id” à expressão atual.
        lessonIds // Utiliza o valor de lessonIds.
      ) // Encerra a chamada de supabase.from(…).select(…).in.
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…).in(…), filtrada por o texto “status” igual a o texto “publicado”.
        "status", // Fornece o texto “status” à expressão atual.
        "publicado" // Fornece o texto “publicado” à expressão atual.
      ) // Encerra a chamada de supabase.from(…).select(…).in(…).eq.
      .order( // Executa a chamada que produz a ordenação por o texto “ordem”.
        "ordem", // Fornece o texto “ordem” à expressão atual.
        { // Inicia um objeto com ascending.
          ascending: true // Define a propriedade ascending como true (verdadeiro).
        } // Encerra o objeto.
      ); // Encerra a chamada de supabase.from(…).select(…).in(…).eq(…).order.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  slides = // Atualiza slides com data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
    Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
      ? data // Utiliza o valor de data.
      : []; // Inicia uma lista vazia.


  slides.forEach( // Executa a chamada que produz a execução da função para cada item de slides.
    (slide) => { // Define a função que recebe slide.

      const lessonId = // Define lessonId como a conversão de slide.aula_id em número.
        Number( // Executa a chamada que produz a conversão de slide.aula_id em número.
          slide.aula_id // Acessa slide.aula_id.
        ); // Encerra a chamada de Number.


      if ( // Verifica a negação de a verificação da chave lessonId em slidesByLesson para decidir se executa este bloco.
        !slidesByLesson.has( // Compõe a negação de a verificação da chave lessonId em slidesByLesson na operação atual.
          lessonId // Utiliza o valor de lessonId.
        ) // Encerra a chamada de slidesByLesson.has.
      ) { // Verifica a negação de a verificação da chave lessonId em slidesByLesson para decidir se executa este bloco.

        slidesByLesson.set( // Executa a chamada que produz a associação de lessonId ao valor uma lista vazia em slidesByLesson.
          lessonId, // Utiliza o valor de lessonId.
          [] // Inicia uma lista vazia.
        ); // Encerra a chamada de slidesByLesson.set.
      } // Encerra o bloco da condição.


      slidesByLesson // Executa a chamada que produz a inclusão de slide ao final de slidesByLesson.get(…).
        .get(lessonId) // Executa a chamada que produz o valor associado à chave lessonId em slidesByLesson.
        .push( // Executa a chamada que produz a inclusão de slide ao final de slidesByLesson.get(…).
          slide // Utiliza o valor de slide.
        ); // Encerra a chamada de slidesByLesson.get(…).push.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de slides.forEach.


  slidesByLesson.forEach( // Executa a chamada que produz a execução da função para cada item de slidesByLesson.
    (lessonSlides) => { // Define a função que recebe lessonSlides.

      lessonSlides.sort( // Executa a chamada que produz a ordenação dos itens de lessonSlides.
        ( // Define a função que recebe a, b.
          a, // Utiliza o valor de a.
          b // Utiliza o valor de b.
        ) => // Define a função que recebe a, b.
          normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com a.ordem.
            a.ordem // Acessa a.ordem.
          ) - // Executa a chamada que produz o resultado de normalizeNumber com a.ordem.
          normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com b.ordem.
            b.ordem // Acessa b.ordem.
          ) // Encerra a chamada de normalizeNumber.
      ); // Encerra a chamada de lessonSlides.sort.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de slidesByLesson.forEach.
} // Encerra o bloco da função loadSlides.


/* =========================================================
   CARREGAR MATERIAIS
========================================================= */

async function loadMaterials() { // Declara a função assíncrona loadMaterials com nenhum parâmetro.
  materialsByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de materialsByLesson.


  if (!lessons.length) { // Verifica a negação de lessons.length para decidir se executa este bloco.

    materials = []; // Atualiza materials com uma lista vazia.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lessonIds = // Define lessonIds como uma lista transformada a partir de lessons.
    lessons.map( // Executa a chamada que produz uma lista transformada a partir de lessons.
      (lesson) => // Define a função que recebe lesson.
        lesson.id // Acessa lesson.id.
    ); // Encerra a chamada de lessons.map.


  const { // Define data, error como o resultado aguardado de a ordenação por o texto “ordem”.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda a ordenação por o texto “ordem” antes de continuar.
      .from("materiais") // Executa a chamada que produz a referência à tabela ou ao bucket o texto “materiais”.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “aula_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “nome” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “arquivo_path” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “tipo” no texto da consulta.
       * Linha 7 do trecho: Inclui o campo “ordem” no texto da consulta.
       * Linha 8 do trecho: Inclui o campo “status” no texto da consulta.
       * Linha 9 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        aula_id,
        nome,
        arquivo_path,
        tipo,
        ordem,
        status
      `)
      .in( // Executa a chamada que produz o resultado de supabase.from(…).select(…).in com o texto “aula_id” e lessonIds.
        "aula_id", // Fornece o texto “aula_id” à expressão atual.
        lessonIds // Utiliza o valor de lessonIds.
      ) // Encerra a chamada de supabase.from(…).select(…).in.
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…).in(…), filtrada por o texto “status” igual a o texto “publicado”.
        "status", // Fornece o texto “status” à expressão atual.
        "publicado" // Fornece o texto “publicado” à expressão atual.
      ) // Encerra a chamada de supabase.from(…).select(…).in(…).eq.
      .order( // Executa a chamada que produz a ordenação por o texto “ordem”.
        "ordem", // Fornece o texto “ordem” à expressão atual.
        { // Inicia um objeto com ascending.
          ascending: true // Define a propriedade ascending como true (verdadeiro).
        } // Encerra o objeto.
      ); // Encerra a chamada de supabase.from(…).select(…).in(…).eq(…).order.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  materials = // Atualiza materials com data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
    Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
      ? data // Utiliza o valor de data.
      : []; // Inicia uma lista vazia.


  materials.forEach( // Executa a chamada que produz a execução da função para cada item de materials.
    (material) => { // Define a função que recebe material.

      const lessonId = // Define lessonId como a conversão de material.aula_id em número.
        Number( // Executa a chamada que produz a conversão de material.aula_id em número.
          material.aula_id // Acessa material.aula_id.
        ); // Encerra a chamada de Number.


      if ( // Verifica a negação de a verificação da chave lessonId em materialsByLesson para decidir se executa este bloco.
        !materialsByLesson.has( // Compõe a negação de a verificação da chave lessonId em materialsByLesson na operação atual.
          lessonId // Utiliza o valor de lessonId.
        ) // Encerra a chamada de materialsByLesson.has.
      ) { // Verifica a negação de a verificação da chave lessonId em materialsByLesson para decidir se executa este bloco.

        materialsByLesson.set( // Executa a chamada que produz a associação de lessonId ao valor uma lista vazia em materialsByLesson.
          lessonId, // Utiliza o valor de lessonId.
          [] // Inicia uma lista vazia.
        ); // Encerra a chamada de materialsByLesson.set.
      } // Encerra o bloco da condição.


      materialsByLesson // Executa a chamada que produz a inclusão de material ao final de materialsByLesson.get(…).
        .get(lessonId) // Executa a chamada que produz o valor associado à chave lessonId em materialsByLesson.
        .push( // Executa a chamada que produz a inclusão de material ao final de materialsByLesson.get(…).
          material // Utiliza o valor de material.
        ); // Encerra a chamada de materialsByLesson.get(…).push.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de materials.forEach.
} // Encerra o bloco da função loadMaterials.


/* =========================================================
   CARREGAR PROGRESSO
========================================================= */

async function loadProgress() { // Declara a função assíncrona loadProgress com nenhum parâmetro.
  progressByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de progressByLesson.

  progressRows = []; // Atualiza progressRows com uma lista vazia.


  if ( // Verifica a negação de currentUser ou, se indisponível, a negação de lessons.length para decidir se executa este bloco.
    !currentUser || // Calcula a negação de currentUser ou, se indisponível, a negação de lessons.length.
    !lessons.length // Compõe a negação de lessons.length na operação atual.
  ) { // Verifica a negação de currentUser ou, se indisponível, a negação de lessons.length para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lessonIds = // Define lessonIds como uma lista transformada a partir de lessons.
    lessons.map( // Executa a chamada que produz uma lista transformada a partir de lessons.
      (lesson) => // Define a função que recebe lesson.
        lesson.id // Acessa lesson.id.
    ); // Encerra a chamada de lessons.map.


  const { // Define data, error como o resultado aguardado de o resultado de supabase.from(…).select(…).eq(…).in com o texto “aula_id” e lessonIds.
    data, // Inclui a propriedade data com o valor da variável de mesmo nome.
    error // Inclui a propriedade error com o valor da variável de mesmo nome.
  } = // Compõe data, error na operação atual.
    await supabase // Aguarda o resultado de supabase.from(…).select(…).eq(…).in com o texto “aula_id” e lessonIds antes de continuar.
      .from( // Executa a chamada que produz a referência à tabela ou ao bucket o texto “progresso_aulas”.
        "progresso_aulas" // Fornece o texto “progresso_aulas” à expressão atual.
      ) // Encerra a chamada de supabase.from.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
       * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
       * Linha 3 do trecho: Inclui o campo “user_id” no texto da consulta.
       * Linha 4 do trecho: Inclui o campo “aula_id” no texto da consulta.
       * Linha 5 do trecho: Inclui o campo “concluida” no texto da consulta.
       * Linha 6 do trecho: Inclui o campo “concluida_em” no texto da consulta.
       * Linha 7 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      .select(`
        id,
        user_id,
        aula_id,
        concluida,
        concluida_em
      `)
      .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “user_id” igual a currentUser.id.
        "user_id", // Fornece o texto “user_id” à expressão atual.
        currentUser.id // Acessa currentUser.id.
      ) // Encerra a chamada de supabase.from(…).select(…).eq.
      .in( // Executa a chamada que produz o resultado de supabase.from(…).select(…).eq(…).in com o texto “aula_id” e lessonIds.
        "aula_id", // Fornece o texto “aula_id” à expressão atual.
        lessonIds // Utiliza o valor de lessonIds.
      ); // Encerra a chamada de supabase.from(…).select(…).eq(…).in.


  if (error) { // Verifica error para decidir se executa este bloco.
    throw error; // Lança error para interromper o fluxo e informar a falha.
  } // Encerra o bloco da condição.


  progressRows = // Atualiza progressRows com data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
    Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
      ? data // Utiliza o valor de data.
      : []; // Inicia uma lista vazia.


  progressRows.forEach( // Executa a chamada que produz a execução da função para cada item de progressRows.
    (row) => { // Define a função que recebe row.

      progressByLesson.set( // Executa a chamada que produz a associação de a conversão de row.aula_id em número ao valor row em progressByLesson.
        Number( // Executa a chamada que produz a conversão de row.aula_id em número.
          row.aula_id // Acessa row.aula_id.
        ), // Encerra a chamada de Number.
        row // Utiliza o valor de row.
      ); // Encerra a chamada de progressByLesson.set.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de progressRows.forEach.
} // Encerra o bloco da função loadProgress.


/* =========================================================
   CARREGAR CURSO SELECIONADO
========================================================= */

async function loadSelectedCourse() { // Declara a função assíncrona loadSelectedCourse com nenhum parâmetro.
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    clearDataMaps(); // Executa a chamada que produz o resultado de clearDataMaps.


    await loadCourse(); // Aguarda o resultado de loadCourse antes de continuar.

    await loadModules(); // Aguarda o resultado de loadModules antes de continuar.

    await loadLessons(); // Aguarda o resultado de loadLessons antes de continuar.


    await Promise.all([ // Aguarda o resultado de Promise.all com uma lista com 3 itens antes de continuar.
      loadSlides(), // Executa a chamada que produz o resultado de loadSlides.
      loadMaterials(), // Executa a chamada que produz o resultado de loadMaterials.
      loadProgress() // Executa a chamada que produz o resultado de loadProgress.
    ]); // Encerra a lista.


    renderCourseHeader(); // Executa a chamada que produz o resultado de renderCourseHeader.

    renderLessons(); // Executa a chamada que produz o resultado de renderLessons.

    await renderDownloads(); // Aguarda o resultado de renderDownloads antes de continuar.


    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.

    renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.

    updateProgress(); // Executa a chamada que produz o resultado de updateProgress.


    initializeCourseHistory(); // Executa a chamada que produz o resultado de initializeCourseHistory.


    const historyState = // Define historyState como o resultado de getCourseHistoryState.
      getCourseHistoryState(); // Executa a chamada que produz o resultado de getCourseHistoryState.


    /*
      Se a página foi restaurada pelo
      navegador em estado de aula,
      reabrimos essa aula.
    */

    if ( // Verifica o resultado de isCourseHistoryState com historyState e historyState.view igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.
      isCourseHistoryState( // Executa a chamada que produz o resultado de isCourseHistoryState com historyState.
        historyState // Utiliza o valor de historyState.
      ) && // Executa a chamada que produz o resultado de isCourseHistoryState com historyState.
      historyState.view === // Acessa historyState.view.
        "lesson" // Fornece o texto “lesson” à expressão atual.
    ) { // Verifica o resultado de isCourseHistoryState com historyState e historyState.view igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.

      const lessonIndex = // Define lessonIndex como o resultado de normalizeNumber com historyState.lessonIndex e 0.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com historyState.lessonIndex e 0.
          historyState.lessonIndex, // Acessa historyState.lessonIndex.
          0 // Fornece 0 à expressão atual.
        ); // Encerra a chamada de normalizeNumber.


      const slideIndex = // Define slideIndex como o resultado de normalizeNumber com historyState.slideIndex e 0.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com historyState.slideIndex e 0.
          historyState.slideIndex, // Acessa historyState.slideIndex.
          0 // Fornece 0 à expressão atual.
        ); // Encerra a chamada de normalizeNumber.


      if ( // Verifica o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
        isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com lessonIndex.
          lessonIndex // Utiliza o valor de lessonIndex.
        ) // Encerra a chamada de isLessonUnlocked.
      ) { // Verifica o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.

        await selectLesson( // Aguarda o resultado de selectLesson com lessonIndex e slideIndex antes de continuar.
          lessonIndex, // Utiliza o valor de lessonIndex.
          slideIndex // Utiliza o valor de slideIndex.
        ); // Encerra a chamada de selectLesson.

        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.
    } // Encerra o bloco da condição.


    /*
      Estado padrão:
      home dos módulos.
    */

    replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com o resultado de createHomeHistoryState.
      createHomeHistoryState() // Executa a chamada que produz o resultado de createHomeHistoryState.
    ); // Encerra a chamada de replaceCourseHistoryState.


    await showCourseHome(); // Aguarda o resultado de showCourseHome antes de continuar.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao carregar curso:” no console.
      "Erro ao carregar curso:", // Fornece o texto “Erro ao carregar curso:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    course = // Atualiza course com course ou, se indisponível, o resultado de getDefaultCourse.
      course || // Calcula course ou, se indisponível, o resultado de getDefaultCourse.
      getDefaultCourse(); // Executa a chamada que produz o resultado de getDefaultCourse.


    modules = []; // Atualiza modules com uma lista vazia.
    lessons = []; // Atualiza lessons com uma lista vazia.
    slides = []; // Atualiza slides com uma lista vazia.
    materials = []; // Atualiza materials com uma lista vazia.
    progressRows = []; // Atualiza progressRows com uma lista vazia.


    clearDataMaps(); // Executa a chamada que produz o resultado de clearDataMaps.


    renderCourseHeader(); // Executa a chamada que produz o resultado de renderCourseHeader.

    renderNoLessons(); // Executa a chamada que produz o resultado de renderNoLessons.

    await renderDownloads(); // Aguarda o resultado de renderDownloads antes de continuar.

    updateProgress(); // Executa a chamada que produz o resultado de updateProgress.

    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.

    renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.


    initializeCourseHistory(); // Executa a chamada que produz o resultado de initializeCourseHistory.


    replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com o resultado de createHomeHistoryState.
      createHomeHistoryState() // Executa a chamada que produz o resultado de createHomeHistoryState.
    ); // Encerra a chamada de replaceCourseHistoryState.


    await showCourseHome(); // Aguarda o resultado de showCourseHome antes de continuar.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função loadSelectedCourse.


/* =========================================================
   CABEÇALHO
========================================================= */

function renderCourseHeader() { // Declara a função renderCourseHeader com nenhum parâmetro.
  const courseName = // Define courseName como course.nome com acesso opcional ou, se indisponível, o texto “Curso Praxis”.
    course?.nome || // Acessa course.nome.
    "Curso Praxis"; // Fornece o texto “Curso Praxis” à expressão atual.


  const breadcrumb = // Define breadcrumb como o resultado de $ com o texto “breadcrumb-course”.
    $("breadcrumb-course"); // Executa a chamada que produz o resultado de $ com o texto “breadcrumb-course”.


  if (breadcrumb) { // Verifica breadcrumb para decidir se executa este bloco.

    breadcrumb.textContent = // Atualiza breadcrumb.textContent com courseName.
      courseName; // Utiliza o valor de courseName.
  } // Encerra o bloco da condição.


  document.title = // Atualiza document.title com um texto montado com 1 valor dinâmico.
    `${courseName} — Praxis`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
} // Encerra o bloco da função renderCourseHeader.


/* =========================================================
   NUMERAÇÃO
========================================================= */

function getLessonNumber( // Declara a função getLessonNumber com lesson.
  lesson // Utiliza o valor de lesson.
) { // Declara a função getLessonNumber com lesson.
  const moduleOrder = // Define moduleOrder como o resultado de normalizeNumber com lesson.module.ordem com acesso opcional e 1.
    normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com lesson.module.ordem com acesso opcional e 1.
      lesson?.module?.ordem, // Acessa lesson.module.ordem.
      1 // Fornece 1 à expressão atual.
    ); // Encerra a chamada de normalizeNumber.


  const lessonOrder = // Define lessonOrder como o resultado de normalizeNumber com lesson.ordem com acesso opcional e 1.
    normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com lesson.ordem com acesso opcional e 1.
      lesson?.ordem, // Acessa lesson.ordem.
      1 // Fornece 1 à expressão atual.
    ); // Encerra a chamada de normalizeNumber.


  return ( // Retorna um texto montado com 2 valores dinâmicos.
    `${moduleOrder}.${lessonOrder}` // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getLessonNumber.


/* =========================================================
   SLIDES DA AULA
========================================================= */

function getLessonSlides( // Declara a função getLessonSlides com lesson.
  lesson // Utiliza o valor de lesson.
) { // Declara a função getLessonSlides com lesson.
  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return []; // Retorna uma lista vazia.
  } // Encerra o bloco da condição.


  return ( // Retorna o valor associado à chave a conversão de lesson.id em número em slidesByLesson ou, se indisponível, uma lista vazia.
    slidesByLesson.get( // Executa a chamada que produz o valor associado à chave a conversão de lesson.id em número em slidesByLesson.
      Number( // Executa a chamada que produz a conversão de lesson.id em número.
        lesson.id // Acessa lesson.id.
      ) // Encerra a chamada de Number.
    ) || // Executa a chamada que produz o valor associado à chave a conversão de lesson.id em número em slidesByLesson.
    [] // Inicia uma lista vazia.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getLessonSlides.


/* =========================================================
   MATERIAIS DA AULA
========================================================= */

function getLessonMaterials( // Declara a função getLessonMaterials com lesson.
  lesson // Utiliza o valor de lesson.
) { // Declara a função getLessonMaterials com lesson.
  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return []; // Retorna uma lista vazia.
  } // Encerra o bloco da condição.


  return ( // Retorna o valor associado à chave a conversão de lesson.id em número em materialsByLesson ou, se indisponível, uma lista vazia.
    materialsByLesson.get( // Executa a chamada que produz o valor associado à chave a conversão de lesson.id em número em materialsByLesson.
      Number( // Executa a chamada que produz a conversão de lesson.id em número.
        lesson.id // Acessa lesson.id.
      ) // Encerra a chamada de Number.
    ) || // Executa a chamada que produz o valor associado à chave a conversão de lesson.id em número em materialsByLesson.
    [] // Inicia uma lista vazia.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getLessonMaterials.


/* =========================================================
   SIDEBAR DE AULAS
========================================================= */

function renderLessons() { // Declara a função renderLessons com nenhum parâmetro.
  const container = // Define container como o resultado de $ com o texto “lessons-container”.
    $("lessons-container"); // Executa a chamada que produz o resultado de $ com o texto “lessons-container”.


  if (!container) { // Verifica a negação de container para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  container.innerHTML = // Atualiza container.innerHTML com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  if (!modules.length) { // Verifica a negação de modules.length para decidir se executa este bloco.

    renderNoLessons(); // Executa a chamada que produz o resultado de renderNoLessons.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  modules.forEach( // Executa a chamada que produz a execução da função para cada item de modules.
    ( // Define a função que recebe module, moduleIndex.
      module, // Utiliza o valor de module.
      moduleIndex // Utiliza o valor de moduleIndex.
    ) => { // Define a função que recebe module, moduleIndex.

      const moduleLessons = // Define moduleLessons como os itens de lessons que passam na condição.
        lessons.filter( // Executa a chamada que produz os itens de lessons que passam na condição.
          (lesson) => // Define a função que recebe lesson.
            Number( // Executa a chamada que produz a conversão de lesson.modulo_id em número.
              lesson.modulo_id // Acessa lesson.modulo_id.
            ) === // Executa a chamada que produz a conversão de lesson.modulo_id em número.
            Number( // Executa a chamada que produz a conversão de module.id em número.
              module.id // Acessa module.id.
            ) // Encerra a chamada de Number.
        ); // Encerra a chamada de lessons.filter.


      const moduleBlock = // Define moduleBlock como um novo elemento HTML o texto “div”.
        document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “div”.
          "div" // Fornece o texto “div” à expressão atual.
        ); // Encerra a chamada de document.createElement.


      moduleBlock.className = // Atualiza moduleBlock.className com o texto “module-block”.
        "module-block"; // Fornece o texto “module-block” à expressão atual.


      const moduleNumber = // Define moduleNumber como o resultado de normalizeNumber com module.ordem e moduleIndex mais 1.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com module.ordem e moduleIndex mais 1.
          module.ordem, // Acessa module.ordem.
          moduleIndex + 1 // Calcula moduleIndex mais 1.
        ); // Encerra a chamada de normalizeNumber.


      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Atualiza moduleBlock.innerHTML com um texto montado com 2 valores dinâmicos.
       * Linha 2 do trecho: Insere um contêiner de layout com as classes “module-label”.
       * Linha 3 do trecho: Compõe o trecho de texto “MÓDULO ${moduleNumber}” sem modificá-lo.
       * Linha 4 do trecho: Encerra um contêiner de layout.
       * Linha 6 do trecho: Insere um contêiner de layout com as classes “module-title”.
       * Linha 7 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
       * Linha 8 do trecho: Compõe o trecho de texto “module.nome ||” sem modificá-lo.
       * Linha 9 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       * Linha 10 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
       * Linha 11 do trecho: Encerra um contêiner de layout.
       * Linha 13 do trecho: Insere uma lista sem numeração com o texto “<ul”.
       * Linha 14 do trecho: Compõe o trecho de texto “class="lesson-list"” sem modificá-lo.
       * Linha 15 do trecho: Conclui a declaração da tag e de seus atributos.
       * Linha 16 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       */
      moduleBlock.innerHTML = `
        <div class="module-label">
          MÓDULO ${moduleNumber}
        </div>

        <div class="module-title">
          ${escapeHtml(
            module.nome ||
            `Módulo ${moduleNumber}`
          )}
        </div>

        <ul
          class="lesson-list"
        ></ul>
      `;


      const list = // Define list como o primeiro elemento que corresponde ao seletor o texto “.lesson-list”.
        moduleBlock.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.lesson-list”.
          ".lesson-list" // Fornece o texto “.lesson-list” à expressão atual.
        ); // Encerra a chamada de moduleBlock.querySelector.


      moduleLessons.forEach( // Executa a chamada que produz a execução da função para cada item de moduleLessons.
        (lesson) => { // Define a função que recebe lesson.

          const globalIndex = // Define globalIndex como o resultado de lessons.findIndex com uma função que recebe item.
            lessons.findIndex( // Executa a chamada que produz o resultado de lessons.findIndex com uma função que recebe item.
              (item) => // Define a função que recebe item.
                Number( // Executa a chamada que produz a conversão de item.id em número.
                  item.id // Acessa item.id.
                ) === // Executa a chamada que produz a conversão de item.id em número.
                Number( // Executa a chamada que produz a conversão de lesson.id em número.
                  lesson.id // Acessa lesson.id.
                ) // Encerra a chamada de Number.
            ); // Encerra a chamada de lessons.findIndex.


          if ( // Verifica globalIndex menor que 0 para decidir se executa este bloco.
            globalIndex < 0 // Calcula globalIndex menor que 0.
          ) { // Verifica globalIndex menor que 0 para decidir se executa este bloco.
            return; // Encerra a função sem retornar um valor.
          } // Encerra o bloco da condição.


          const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
            getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
              lesson // Utiliza o valor de lesson.
            ); // Encerra a chamada de getLessonSlides.


          const completed = // Define completed como o resultado de isLessonCompleted com lesson.
            isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
              lesson // Utiliza o valor de lesson.
            ); // Encerra a chamada de isLessonCompleted.


          const unlocked = // Define unlocked como o resultado de isLessonUnlocked com globalIndex.
            isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com globalIndex.
              globalIndex // Utiliza o valor de globalIndex.
            ); // Encerra a chamada de isLessonUnlocked.


          const li = // Define li como um novo elemento HTML o texto “li”.
            document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “li”.
              "li" // Fornece o texto “li” à expressão atual.
            ); // Encerra a chamada de document.createElement.


          li.className = // Atualiza li.className com o texto “lesson”.
            "lesson"; // Fornece o texto “lesson” à expressão atual.


          li.dataset.lessonIndex = // Atualiza li.dataset.lessonIndex com a conversão de globalIndex em texto.
            String( // Executa a chamada que produz a conversão de globalIndex em texto.
              globalIndex // Utiliza o valor de globalIndex.
            ); // Encerra a chamada de String.


          li.dataset.lessonId = // Atualiza li.dataset.lessonId com a conversão de lesson.id em texto.
            String( // Executa a chamada que produz a conversão de lesson.id em texto.
              lesson.id // Acessa lesson.id.
            ); // Encerra a chamada de String.


          li.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “is-locked” em li.classList.
            "is-locked", // Fornece o texto “is-locked” à expressão atual.
            !unlocked // Compõe a negação de unlocked na operação atual.
          ); // Encerra a chamada de li.classList.toggle.


          li.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-disabled” em li.
            "aria-disabled", // Fornece o texto “aria-disabled” à expressão atual.
            unlocked // Utiliza o valor de unlocked.
              ? "false" // Fornece o texto “false” à expressão atual.
              : "true" // Fornece o texto “true” à expressão atual.
          ); // Encerra a chamada de li.setAttribute.


          const lessonNumber = // Define lessonNumber como o resultado de getLessonNumber com lesson.
            getLessonNumber( // Executa a chamada que produz o resultado de getLessonNumber com lesson.
              lesson // Utiliza o valor de lesson.
            ); // Encerra a chamada de getLessonNumber.


          const rawLessonName = // Define rawLessonName como lesson.nome ou, se indisponível, um texto montado com 1 valor dinâmico.
            lesson.nome || // Acessa lesson.nome.
            `Aula ${lessonNumber}`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.


          const lessonName = // Define lessonName como o resultado de escapeHtml com rawLessonName.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com rawLessonName.
              rawLessonName // Utiliza o valor de rawLessonName.
            ); // Encerra a chamada de escapeHtml.


          const slidesLabel = // Define slidesLabel como o texto “1 slide” se lessonSlides.length igual, inclusive no tipo, a 1; caso contrário, um texto montado com 1 valor dinâmico se lessonSlides.length; caso contrário, o texto “—”.
            lessonSlides.length // Acessa lessonSlides.length.

              ? ( // Calcula o texto “1 slide” se lessonSlides.length igual, inclusive no tipo, a 1; caso contrário, um texto montado com 1 valor dinâmico se lessonSlides.length; caso contrário, o texto “—”.
                lessonSlides.length === 1 // Acessa lessonSlides.length.
                  ? "1 slide" // Fornece o texto “1 slide” à expressão atual.
                  : `${lessonSlides.length} slides` // Fornece um texto montado com 1 valor dinâmico à expressão atual.
              ) // Encerra a expressão ou função iniciada acima.

              : "—"; // Fornece o texto “—” à expressão atual.


          /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
           * Linha 1 do trecho: Atualiza li.innerHTML com um texto montado com 7 valores dinâmicos.
           * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
           * Linha 3 do trecho: Compõe o trecho de texto “class="lesson-status"” sem modificá-lo.
           * Linha 4 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 5 do trecho: Insere no texto o valor calculado por ${.
           * Linha 6 do trecho: Compõe o trecho de texto “!unlocked” sem modificá-lo.
           * Linha 8 do trecho: Compõe o trecho de texto “? getLockIcon(” sem modificá-lo.
           * Linha 9 do trecho: Inclui o campo “12” no texto da consulta.
           * Linha 10 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
           * Linha 12 do trecho: Compõe o trecho de texto “: completed” sem modificá-lo.
           * Linha 14 do trecho: Compõe o trecho de texto “? getCompletedIcon(” sem modificá-lo.
           * Linha 15 do trecho: Inclui o campo “10” no texto da consulta.
           * Linha 16 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
           * Linha 18 do trecho: Compõe o trecho de texto “: ""” sem modificá-lo.
           * Linha 19 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
           * Linha 20 do trecho: Encerra um contêiner de layout.
           * Linha 23 do trecho: Insere um contêiner de layout com as classes “lesson-num”.
           * Linha 24 do trecho: Insere no texto o valor calculado por ${escapeHtml(.
           * Linha 25 do trecho: Inclui o campo “lessonNumber” no texto da consulta.
           * Linha 26 do trecho: Compõe o trecho de texto “)}” sem modificá-lo.
           * Linha 27 do trecho: Encerra um contêiner de layout.
           * Linha 30 do trecho: Insere um contêiner de layout com as classes “lesson-name”.
           * Linha 31 do trecho: Insere no texto o valor calculado por ${lessonName}.
           * Linha 32 do trecho: Encerra um contêiner de layout.
           * Linha 35 do trecho: Insere um contêiner de layout com as classes “lesson-duration”.
           * Linha 36 do trecho: Insere no texto o valor calculado por ${.
           * Linha 37 do trecho: Inclui o campo “unlocked” no texto da consulta.
           * Linha 38 do trecho: Compõe o trecho de texto “? escapeHtml(” sem modificá-lo.
           * Linha 39 do trecho: Inclui o campo “slidesLabel” no texto da consulta.
           * Linha 40 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
           * Linha 41 do trecho: Compõe o trecho de texto “: "Bloqueado"” sem modificá-lo.
           * Linha 42 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
           * Linha 43 do trecho: Encerra um contêiner de layout.
           * Linha 46 do trecho: Insere um botão com o texto “<button”.
           * Linha 47 do trecho: Compõe o trecho de texto “type="button"” sem modificá-lo.
           * Linha 48 do trecho: Compõe o trecho de texto “class="lesson-play"” sem modificá-lo.
           * Linha 49 do trecho: Compõe o trecho de texto “aria-label="${” sem modificá-lo.
           * Linha 50 do trecho: Inclui o campo “unlocked” no texto da consulta.
           * Linha 51 do trecho: Fornece um texto montado com 1 valor dinâmico à expressão atual.
           * Linha 52 do trecho: Fornece um texto montado com 1 valor dinâmico à expressão atual.
           * Linha 53 do trecho: Compõe o trecho de texto “}"” sem modificá-lo.
           * Linha 54 do trecho: Insere no texto o valor calculado por ${.
           * Linha 55 do trecho: Inclui o campo “unlocked” no texto da consulta.
           * Linha 56 do trecho: Compõe o trecho de texto “? ""” sem modificá-lo.
           * Linha 57 do trecho: Compõe o trecho de texto “: "disabled"” sem modificá-lo.
           * Linha 58 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
           * Linha 59 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 61 do trecho: Insere no texto o valor calculado por ${.
           * Linha 62 do trecho: Inclui o campo “unlocked” no texto da consulta.
           * Linha 64 do trecho: Fornece um texto montado com 0 valores dinâmicos à expressão atual.
           * Linha 65 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
           * Linha 66 do trecho: Compõe o trecho de texto “width="10"” sem modificá-lo.
           * Linha 67 do trecho: Compõe o trecho de texto “height="10"” sem modificá-lo.
           * Linha 68 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
           * Linha 69 do trecho: Compõe o trecho de texto “fill="currentColor"” sem modificá-lo.
           * Linha 70 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
           * Linha 71 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 72 do trecho: Insere um traçado vetorial com o texto “<path”.
           * Linha 73 do trecho: Compõe o trecho de texto “d="M8 5v14l11-7z"” sem modificá-lo.
           * Linha 74 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
           * Linha 75 do trecho: Encerra um ícone ou desenho vetorial.
           * Linha 76 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           * Linha 78 do trecho: Compõe o trecho de texto “: getLockIcon(” sem modificá-lo.
           * Linha 79 do trecho: Inclui o campo “11” no texto da consulta.
           * Linha 80 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
           * Linha 81 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
           * Linha 83 do trecho: Encerra um botão.
           * Linha 84 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           */
          li.innerHTML = `
            <div
              class="lesson-status"
            >
              ${
                !unlocked

                  ? getLockIcon(
                      12
                    )

                  : completed

                    ? getCompletedIcon(
                        10
                      )

                    : ""
              }
            </div>


            <div class="lesson-num">
              ${escapeHtml(
                lessonNumber
              )}
            </div>


            <div class="lesson-name">
              ${lessonName}
            </div>


            <div class="lesson-duration">
              ${
                unlocked
                  ? escapeHtml(
                      slidesLabel
                    )
                  : "Bloqueado"
              }
            </div>


            <button
              type="button"
              class="lesson-play"
              aria-label="${
                unlocked
                  ? `Abrir ${lessonName}`
                  : `${lessonName} bloqueada`
              }"
              ${
                unlocked
                  ? ""
                  : "disabled"
              }
            >

              ${
                unlocked

                  ? `
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 5v14l11-7z"
                      />
                    </svg>
                  `

                  : getLockIcon(
                      11
                    )
              }

            </button>
          `;


          if ( // Verifica unlocked para decidir se executa este bloco.
            unlocked // Utiliza o valor de unlocked.
          ) { // Verifica unlocked para decidir se executa este bloco.

            li.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em li.
              "click", // Fornece o texto “click” à expressão atual.
              async () => { // Define a função assíncrona que recebe nenhum argumento.

                if ( // Verifica isSlideTransitioning para decidir se executa este bloco.
                  isSlideTransitioning // Utiliza o valor de isSlideTransitioning.
                ) { // Verifica isSlideTransitioning para decidir se executa este bloco.
                  return; // Encerra a função sem retornar um valor.
                } // Encerra o bloco da condição.


                await openLessonFromUser( // Aguarda o resultado de openLessonFromUser com globalIndex e 0 antes de continuar.
                  globalIndex, // Utiliza o valor de globalIndex.
                  0 // Fornece 0 à expressão atual.
                ); // Encerra a chamada de openLessonFromUser.


                closeAllSidebars(); // Executa a chamada que produz o resultado de closeAllSidebars.
              } // Encerra o bloco atual.
            ); // Encerra a chamada de li.addEventListener.
          } // Encerra o bloco da condição.


          list?.appendChild( // Executa a chamada que produz a inserção de li como filho de list.
            li // Utiliza o valor de li.
          ); // Encerra a chamada de list.appendChild.
        } // Encerra o bloco atual.
      ); // Encerra a chamada de moduleLessons.forEach.


      container.appendChild( // Executa a chamada que produz a inserção de moduleBlock como filho de container.
        moduleBlock // Utiliza o valor de moduleBlock.
      ); // Encerra a chamada de container.appendChild.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de modules.forEach.


  updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.
} // Encerra o bloco da função renderLessons.


/* =========================================================
   SELECIONAR AULA
========================================================= */

async function selectLesson( // Declara a função assíncrona selectLesson com lessonIndex, slideIndex.
  lessonIndex, // Utiliza o valor de lessonIndex.
  slideIndex = 0 // Utiliza o valor de slideIndex.
) { // Declara a função assíncrona selectLesson com lessonIndex, slideIndex.
  if ( // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    lessonIndex < 0 || // Calcula lessonIndex menor que 0.
    lessonIndex >= // Calcula lessonIndex maior ou igual a lessons.length.
      lessons.length // Acessa lessons.length.
  ) { // Verifica lessonIndex menor que 0 ou, se indisponível, lessonIndex maior ou igual a lessons.length para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com lessonIndex na operação atual.
      lessonIndex // Utiliza o valor de lessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.

    console.warn( // Executa a chamada que produz o registro de o texto “Aula bloqueada. Conclua as aulas anteriores primeiro.” no console.
      "Aula bloqueada. Conclua as aulas anteriores primeiro." // Fornece o texto “Aula bloqueada. Conclua as aulas anteriores primeiro.” à expressão atual.
    ); // Encerra a chamada de console.warn.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica isSlideTransitioning para decidir se executa este bloco.
    isSlideTransitioning // Utiliza o valor de isSlideTransitioning.
  ) { // Verifica isSlideTransitioning para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  showLessonView(); // Executa a chamada que produz o resultado de showLessonView.


  currentLessonIndex = // Atualiza currentLessonIndex com lessonIndex.
    lessonIndex; // Utiliza o valor de lessonIndex.


  const lesson = // Define lesson como lessons[currentLessonIndex].
    lessons[ // Acessa lessons[currentLessonIndex].
      currentLessonIndex // Utiliza o valor de currentLessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonSlides.


  if (!lessonSlides.length) { // Verifica a negação de lessonSlides.length para decidir se executa este bloco.

    currentSlideIndex = // Atualiza currentSlideIndex com 0.
      0; // Fornece 0 à expressão atual.

  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    currentSlideIndex = // Atualiza currentSlideIndex com o maior valor entre os argumentos.
      Math.max( // Executa a chamada que produz o maior valor entre os argumentos.
        0, // Fornece 0 à expressão atual.
        Math.min( // Executa a chamada que produz o menor valor entre os argumentos.
          slideIndex, // Utiliza o valor de slideIndex.
          lessonSlides.length - 1 // Acessa lessonSlides.length.
        ) // Encerra a chamada de Math.min.
      ); // Encerra a chamada de Math.max.
  } // Encerra o bloco da condição.


  visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.


  await renderCurrentLesson(); // Aguarda o resultado de renderCurrentLesson antes de continuar.


  updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

  updateProgress(); // Executa a chamada que produz o resultado de updateProgress.


  window.scrollTo({ // Executa a chamada que produz o resultado de window.scrollTo com um objeto com top, behavior.
    top: 0, // Define a propriedade top como 0.
    behavior: "smooth" // Define a propriedade behavior como o texto “smooth”.
  }); // Encerra o objeto.
} // Encerra o bloco da função selectLesson.


/* =========================================================
   SELEÇÃO VISUAL
========================================================= */

function updateLessonSelection() { // Declara a função updateLessonSelection com nenhum parâmetro.
  document // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
    .querySelectorAll( // Executa a chamada que produz todos os elementos que correspondem ao seletor o texto “.lesson”.
      ".lesson" // Fornece o texto “.lesson” à expressão atual.
    ) // Encerra a chamada de document.querySelectorAll.
    .forEach( // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
      (item) => { // Define a função que recebe item.

        const index = // Define index como a conversão de item.dataset.lessonIndex em número.
          Number( // Executa a chamada que produz a conversão de item.dataset.lessonIndex em número.
            item.dataset // Acessa item.dataset.lessonIndex.
              .lessonIndex // Acessa item.dataset.lessonIndex.
          ); // Encerra a chamada de Number.


        const lesson = // Define lesson como lessons[index].
          lessons[ // Acessa lessons[index].
            index // Utiliza o valor de index.
          ]; // Encerra a expressão ou função iniciada acima.


        if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
          return; // Encerra a função sem retornar um valor.
        } // Encerra o bloco da condição.


        const unlocked = // Define unlocked como o resultado de isLessonUnlocked com index.
          isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com index.
            index // Utiliza o valor de index.
          ); // Encerra a chamada de isLessonUnlocked.


        const isCurrent = // Define isCurrent como unlocked e index igual, inclusive no tipo, a currentLessonIndex.
          unlocked && // Calcula unlocked e index igual, inclusive no tipo, a currentLessonIndex.
          index === // Calcula index igual, inclusive no tipo, a currentLessonIndex.
            currentLessonIndex; // Utiliza o valor de currentLessonIndex.


        const isDone = // Define isDone como o resultado de isLessonCompleted com lesson.
          isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
            lesson // Utiliza o valor de lesson.
          ); // Encerra a chamada de isLessonCompleted.


        item.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “active” em item.classList.
          "active", // Fornece o texto “active” à expressão atual.
          isCurrent // Utiliza o valor de isCurrent.
        ); // Encerra a chamada de item.classList.toggle.


        item.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “done” em item.classList.
          "done", // Fornece o texto “done” à expressão atual.
          isDone // Utiliza o valor de isDone.
        ); // Encerra a chamada de item.classList.toggle.


        item.classList.toggle( // Executa a chamada que produz a alternância da classe ou do estado o texto “is-locked” em item.classList.
          "is-locked", // Fornece o texto “is-locked” à expressão atual.
          !unlocked // Compõe a negação de unlocked na operação atual.
        ); // Encerra a chamada de item.classList.toggle.


        item.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-disabled” em item.
          "aria-disabled", // Fornece o texto “aria-disabled” à expressão atual.
          unlocked // Utiliza o valor de unlocked.
            ? "false" // Fornece o texto “false” à expressão atual.
            : "true" // Fornece o texto “true” à expressão atual.
        ); // Encerra a chamada de item.setAttribute.


        const status = // Define status como o primeiro elemento que corresponde ao seletor o texto “.lesson-status”.
          item.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.lesson-status”.
            ".lesson-status" // Fornece o texto “.lesson-status” à expressão atual.
          ); // Encerra a chamada de item.querySelector.


        const playButton = // Define playButton como o primeiro elemento que corresponde ao seletor o texto “.lesson-play”.
          item.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.lesson-play”.
            ".lesson-play" // Fornece o texto “.lesson-play” à expressão atual.
          ); // Encerra a chamada de item.querySelector.


        const duration = // Define duration como o primeiro elemento que corresponde ao seletor o texto “.lesson-duration”.
          item.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.lesson-duration”.
            ".lesson-duration" // Fornece o texto “.lesson-duration” à expressão atual.
          ); // Encerra a chamada de item.querySelector.


        if (status) { // Verifica status para decidir se executa este bloco.

          if (!unlocked) { // Verifica a negação de unlocked para decidir se executa este bloco.

            status.innerHTML = // Atualiza status.innerHTML com o resultado de getLockIcon com 12.
              getLockIcon( // Executa a chamada que produz o resultado de getLockIcon com 12.
                12 // Fornece 12 à expressão atual.
              ); // Encerra a chamada de getLockIcon.

          } else if (isDone) { // Encerra o bloco anterior e verifica isdone para decidir se executa este bloco.

            status.innerHTML = // Atualiza status.innerHTML com o resultado de getCompletedIcon com 10.
              getCompletedIcon( // Executa a chamada que produz o resultado de getCompletedIcon com 10.
                10 // Fornece 10 à expressão atual.
              ); // Encerra a chamada de getCompletedIcon.

          } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

            status.innerHTML = // Atualiza status.innerHTML com o texto “”.
              ""; // Fornece o texto “” à expressão atual.
          } // Encerra o bloco da condição.
        } // Encerra o bloco da condição.


        if (playButton) { // Verifica playButton para decidir se executa este bloco.

          playButton.disabled = // Atualiza playButton.disabled com a negação de unlocked.
            !unlocked; // Compõe a negação de unlocked na operação atual.


          if (!unlocked) { // Verifica a negação de unlocked para decidir se executa este bloco.

            playButton.innerHTML = // Atualiza playButton.innerHTML com o resultado de getLockIcon com 11.
              getLockIcon( // Executa a chamada que produz o resultado de getLockIcon com 11.
                11 // Fornece 11 à expressão atual.
              ); // Encerra a chamada de getLockIcon.

          } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

            /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
             * Linha 1 do trecho: Atualiza playButton.innerHTML com um texto montado com 0 valores dinâmicos.
             * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
             * Linha 3 do trecho: Compõe o trecho de texto “width="10"” sem modificá-lo.
             * Linha 4 do trecho: Compõe o trecho de texto “height="10"” sem modificá-lo.
             * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
             * Linha 6 do trecho: Compõe o trecho de texto “fill="currentColor"” sem modificá-lo.
             * Linha 7 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
             * Linha 8 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
             * Linha 9 do trecho: Insere um traçado vetorial com o texto “<path”.
             * Linha 10 do trecho: Compõe o trecho de texto “d="M8 5v14l11-7z"” sem modificá-lo.
             * Linha 11 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
             * Linha 12 do trecho: Encerra um ícone ou desenho vetorial.
             * Linha 13 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
             */
            playButton.innerHTML = `
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M8 5v14l11-7z"
                />
              </svg>
            `;
          } // Encerra o bloco da condição.
        } // Encerra o bloco da condição.


        if (duration) { // Verifica duration para decidir se executa este bloco.

          const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
            getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
              lesson // Utiliza o valor de lesson.
            ); // Encerra a chamada de getLessonSlides.


          if (!unlocked) { // Verifica a negação de unlocked para decidir se executa este bloco.

            duration.textContent = // Atualiza duration.textContent com o texto “Bloqueado”.
              "Bloqueado"; // Fornece o texto “Bloqueado” à expressão atual.

          } else if ( // Encerra o bloco anterior e verifica lessonslides.length igual, inclusive no tipo, a 1 para decidir se executa este bloco.
            lessonSlides.length === 1 // Acessa lessonSlides.length.
          ) { // Verifica lessonSlides.length igual, inclusive no tipo, a 1 para decidir se executa este bloco.

            duration.textContent = // Atualiza duration.textContent com o texto “1 slide”.
              "1 slide"; // Fornece o texto “1 slide” à expressão atual.

          } else if ( // Encerra o bloco anterior e verifica lessonslides.length maior que 1 para decidir se executa este bloco.
            lessonSlides.length > 1 // Acessa lessonSlides.length.
          ) { // Verifica lessonSlides.length maior que 1 para decidir se executa este bloco.

            duration.textContent = // Atualiza duration.textContent com um texto montado com 1 valor dinâmico.
              `${lessonSlides.length} slides`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.

          } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

            duration.textContent = // Atualiza duration.textContent com o texto “—”.
              "—"; // Fornece o texto “—” à expressão atual.
          } // Encerra o bloco da condição.
        } // Encerra o bloco da condição.
      } // Encerra o bloco atual.
    ); // Encerra a chamada de document.querySelectorAll(…).forEach.
} // Encerra o bloco da função updateLessonSelection.


/* =========================================================
   RENDERIZAR AULA
========================================================= */

async function renderCurrentLesson() { // Declara a função assíncrona renderCurrentLesson com nenhum parâmetro.
  const lesson = // Define lesson como lessons[currentLessonIndex].
    lessons[ // Acessa lessons[currentLessonIndex].
      currentLessonIndex // Utiliza o valor de currentLessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de o resultado de isLessonUnlocked com currentLessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com currentLessonIndex na operação atual.
      currentLessonIndex // Utiliza o valor de currentLessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com currentLessonIndex para decidir se executa este bloco.

    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  const title = // Define title como o resultado de $ com o texto “lesson-title”.
    $("lesson-title"); // Executa a chamada que produz o resultado de $ com o texto “lesson-title”.


  const description = // Define description como o resultado de $ com o texto “lesson-description”.
    $("lesson-description"); // Executa a chamada que produz o resultado de $ com o texto “lesson-description”.


  const currentLesson = // Define currentLesson como o resultado de $ com o texto “current-lesson”.
    $("current-lesson"); // Executa a chamada que produz o resultado de $ com o texto “current-lesson”.


  if (!currentLesson) { // Verifica a negação de currentLesson para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  const lessonNumber = // Define lessonNumber como o resultado de getLessonNumber com lesson.
    getLessonNumber( // Executa a chamada que produz o resultado de getLessonNumber com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonNumber.


  const lessonName = // Define lessonName como lesson.nome ou, se indisponível, um texto montado com 1 valor dinâmico.
    lesson.nome || // Acessa lesson.nome.
    `Aula ${lessonNumber}`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.


  if (title) { // Verifica title para decidir se executa este bloco.

    title.textContent = // Atualiza title.textContent com um texto montado com 2 valores dinâmicos.
      `${lessonNumber} ${lessonName}`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
  } // Encerra o bloco da condição.


  if (description) { // Verifica description para decidir se executa este bloco.

    description.textContent = // Atualiza description.textContent com lesson.descricao ou, se indisponível, lesson.module.descricao com acesso opcional ou, se indisponível, course.descricao com acesso opcional ou, se indisponível, o texto “Conteúdo prático do curso selecionado.”.
      lesson.descricao || // Acessa lesson.descricao.
      lesson.module?.descricao || // Acessa lesson.module.descricao.
      course?.descricao || // Acessa course.descricao.
      "Conteúdo prático do curso selecionado."; // Fornece o texto “Conteúdo prático do curso selecionado.” à expressão atual.
  } // Encerra o bloco da condição.


  const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonSlides.


  if (!lessonSlides.length) { // Verifica a negação de lessonSlides.length para decidir se executa este bloco.

    visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
      ""; // Fornece o texto “” à expressão atual.


    currentLesson.innerHTML = // Atualiza currentLesson.innerHTML com o resultado de getSlidePlaceholder.
      getSlidePlaceholder(); // Executa a chamada que produz o resultado de getSlidePlaceholder.


    renderSlideCounter( // Executa a chamada que produz o resultado de renderSlideCounter com 0 e 0.
      0, // Fornece 0 à expressão atual.
      0 // Fornece 0 à expressão atual.
    ); // Encerra a chamada de renderSlideCounter.


    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco da condição.


  const slide = // Define slide como lessonSlides[currentSlideIndex].
    lessonSlides[ // Acessa lessonSlides[currentSlideIndex].
      currentSlideIndex // Utiliza o valor de currentSlideIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  if (!slide) { // Verifica a negação de slide para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  const slideKey = // Define slideKey como um texto montado com 2 valores dinâmicos.
    `${lesson.id}:${slide.id}`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.


  if ( // Verifica visibleSlideKey igual, inclusive no tipo, a slideKey para decidir se executa este bloco.
    visibleSlideKey === // Calcula visibleSlideKey igual, inclusive no tipo, a slideKey.
    slideKey // Utiliza o valor de slideKey.
  ) { // Verifica visibleSlideKey igual, inclusive no tipo, a slideKey para decidir se executa este bloco.

    renderSlideCounter( // Executa a chamada que produz o resultado de renderSlideCounter com currentSlideIndex mais 1 e lessonSlides.length.
      currentSlideIndex + 1, // Calcula currentSlideIndex mais 1.
      lessonSlides.length // Acessa lessonSlides.length.
    ); // Encerra a chamada de renderSlideCounter.


    syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.


    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco da condição.


  const renderVersion = // Define renderVersion como o incremento de slideRenderVersion.
    ++slideRenderVersion; // Incrementa slideRenderVersion.


  isSlideTransitioning = // Atualiza isSlideTransitioning com true (verdadeiro).
    true; // Fornece true (verdadeiro) à expressão atual.


  updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const slideUrl = // Define slideUrl como o resultado aguardado de o resultado de getSlideUrl com slide.
      await getSlideUrl( // Aguarda o resultado de getSlideUrl com slide antes de continuar.
        slide // Utiliza o valor de slide.
      ); // Encerra a chamada de getSlideUrl.


    if ( // Verifica renderVersion diferente, inclusive no tipo, de slideRenderVersion para decidir se executa este bloco.
      renderVersion !== // Calcula renderVersion diferente, inclusive no tipo, de slideRenderVersion.
      slideRenderVersion // Utiliza o valor de slideRenderVersion.
    ) { // Verifica renderVersion diferente, inclusive no tipo, de slideRenderVersion para decidir se executa este bloco.
      return false; // Retorna false (falso).
    } // Encerra o bloco da condição.


    if (!slideUrl) { // Verifica a negação de slideUrl para decidir se executa este bloco.

      throw new Error( // Lança uma instância de Error com o texto “URL do slide não encontrada.” para interromper o fluxo e informar a falha.
        "URL do slide não encontrada." // Fornece o texto “URL do slide não encontrada.” à expressão atual.
      ); // Encerra a expressão ou função iniciada acima.
    } // Encerra o bloco da condição.


    await preloadImage( // Aguarda o resultado de preloadImage com slideUrl antes de continuar.
      slideUrl // Utiliza o valor de slideUrl.
    ); // Encerra a chamada de preloadImage.


    if ( // Verifica renderVersion diferente, inclusive no tipo, de slideRenderVersion para decidir se executa este bloco.
      renderVersion !== // Calcula renderVersion diferente, inclusive no tipo, de slideRenderVersion.
      slideRenderVersion // Utiliza o valor de slideRenderVersion.
    ) { // Verifica renderVersion diferente, inclusive no tipo, de slideRenderVersion para decidir se executa este bloco.
      return false; // Retorna false (falso).
    } // Encerra o bloco da condição.


    const slideTitle = // Define slideTitle como o resultado de normalizeText com slide.titulo.
      normalizeText( // Executa a chamada que produz o resultado de normalizeText com slide.titulo.
        slide.titulo // Acessa slide.titulo.
      ); // Encerra a chamada de normalizeText.


    const alt = // Define alt como slideTitle ou, se indisponível, um texto montado com 2 valores dinâmicos.
      slideTitle || // Calcula slideTitle ou, se indisponível, um texto montado com 2 valores dinâmicos.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       * Linha 2 do trecho: Compõe o trecho de texto “currentSlideIndex + 1” sem modificá-lo.
       * Linha 3 do trecho: Compõe expressão na operação atual.
       */
      `Slide ${
        currentSlideIndex + 1
      } da aula ${lessonName}`;


    const viewer = // Define viewer como o resultado de ensureSlideViewer.
      ensureSlideViewer(); // Executa a chamada que produz o resultado de ensureSlideViewer.


    if (!viewer) { // Verifica a negação de viewer para decidir se executa este bloco.

      throw new Error( // Lança uma instância de Error com o texto “Viewer não encontrado.” para interromper o fluxo e informar a falha.
        "Viewer não encontrado." // Fornece o texto “Viewer não encontrado.” à expressão atual.
      ); // Encerra a expressão ou função iniciada acima.
    } // Encerra o bloco da condição.


    if (!visibleSlideKey) { // Verifica a negação de visibleSlideKey para decidir se executa este bloco.

      showInitialSlide( // Executa a chamada que produz o resultado de showInitialSlide com viewer e slideUrl.
        viewer, // Utiliza o valor de viewer.
        slideUrl, // Utiliza o valor de slideUrl.
        alt // Utiliza o valor de alt.
      ); // Encerra a chamada de showInitialSlide.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      await crossfadeSlide( // Aguarda o resultado de crossfadeSlide com viewer e slideUrl antes de continuar.
        viewer, // Utiliza o valor de viewer.
        slideUrl, // Utiliza o valor de slideUrl.
        alt // Utiliza o valor de alt.
      ); // Encerra a chamada de crossfadeSlide.
    } // Encerra o bloco da condição.


    visibleSlideKey = // Atualiza visibleSlideKey com slideKey.
      slideKey; // Utiliza o valor de slideKey.


    renderSlideCounter( // Executa a chamada que produz o resultado de renderSlideCounter com currentSlideIndex mais 1 e lessonSlides.length.
      currentSlideIndex + 1, // Calcula currentSlideIndex mais 1.
      lessonSlides.length // Acessa lessonSlides.length.
    ); // Encerra a chamada de renderSlideCounter.


    preloadNearbySlides(); // Executa a chamada que produz o resultado de preloadNearbySlides.


    syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.


    return true; // Retorna true (verdadeiro).

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao carregar slide:” no console.
      "Erro ao carregar slide:", // Fornece o texto “Erro ao carregar slide:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    if (!visibleSlideKey) { // Verifica a negação de visibleSlideKey para decidir se executa este bloco.

      currentLesson.innerHTML = // Atualiza currentLesson.innerHTML com o resultado de getSlidePlaceholder com o texto “Não foi possível carregar este slide.”.
        getSlidePlaceholder( // Executa a chamada que produz o resultado de getSlidePlaceholder com o texto “Não foi possível carregar este slide.”.
          "Não foi possível carregar este slide." // Fornece o texto “Não foi possível carregar este slide.” à expressão atual.
        ); // Encerra a chamada de getSlidePlaceholder.
    } // Encerra o bloco da condição.


    return false; // Retorna false (falso).

  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.

    if ( // Verifica renderVersion igual, inclusive no tipo, a slideRenderVersion para decidir se executa este bloco.
      renderVersion === // Calcula renderVersion igual, inclusive no tipo, a slideRenderVersion.
      slideRenderVersion // Utiliza o valor de slideRenderVersion.
    ) { // Verifica renderVersion igual, inclusive no tipo, a slideRenderVersion para decidir se executa este bloco.

      isSlideTransitioning = // Atualiza isSlideTransitioning com false (falso).
        false; // Fornece false (falso) à expressão atual.


      updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.
    } // Encerra o bloco da condição.
  } // Encerra o bloco atual.
} // Encerra o bloco da função renderCurrentLesson.


/* =========================================================
   CONTADOR
========================================================= */

function renderSlideCounter( // Declara a função renderSlideCounter com current, total.
  current, // Utiliza o valor de current.
  total // Utiliza o valor de total.
) { // Declara a função renderSlideCounter com current, total.
  const counter = // Define counter como o resultado de $ com o texto “slide-counter”.
    $("slide-counter"); // Executa a chamada que produz o resultado de $ com o texto “slide-counter”.


  if (counter) { // Verifica counter para decidir se executa este bloco.

    if (!total) { // Verifica a negação de total para decidir se executa este bloco.

      counter.textContent = // Atualiza counter.textContent com o texto “Nenhum slide”.
        "Nenhum slide"; // Fornece o texto “Nenhum slide” à expressão atual.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      counter.textContent = // Atualiza counter.textContent com um texto montado com 2 valores dinâmicos.
        `${current} de ${total}`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.


  const presentationCounter = // Define presentationCounter como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-counter]”.
    document.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-counter]”.
      "[data-presentation-counter]" // Fornece o texto “[data-presentation-counter]” à expressão atual.
    ); // Encerra a chamada de document.querySelector.


  if (presentationCounter) { // Verifica presentationCounter para decidir se executa este bloco.

    presentationCounter.textContent = // Atualiza presentationCounter.textContent com um texto montado com 2 valores dinâmicos se total; caso contrário, o texto “0 / 0”.
      total // Utiliza o valor de total.
        ? `${current} / ${total}` // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
        : "0 / 0"; // Fornece o texto “0 / 0” à expressão atual.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função renderSlideCounter.


/* =========================================================
   PLACEHOLDER
========================================================= */

function getSlidePlaceholder( // Declara a função getSlidePlaceholder com message.
  message = // Utiliza o valor de message.
    "Os slides do Supabase serão exibidos exatamente neste espaço." // Fornece o texto “Os slides do Supabase serão exibidos exatamente neste espaço.” à expressão atual.
) { // Declara a função getSlidePlaceholder com message.
  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Retorna um texto montado com 1 valor dinâmico.
   * Linha 2 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 3 do trecho: Compõe o trecho de texto “id="slide-stage"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “class="slide-stage"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 7 do trecho: Insere um contêiner de layout com o texto “<div”.
   * Linha 8 do trecho: Compõe o trecho de texto “class="slide-placeholder"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “aria-label="Área reservada para os slides do curso"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 12 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 13 do trecho: Compõe o trecho de texto “class="slide-placeholder-svg"” sem modificá-lo.
   * Linha 14 do trecho: Compõe o trecho de texto “viewBox="0 0 1600 900"” sem modificá-lo.
   * Linha 15 do trecho: Compõe o trecho de texto “role="img"” sem modificá-lo.
   * Linha 16 do trecho: Compõe o trecho de texto “aria-label="Área demonstrativa do slide"” sem modificá-lo.
   * Linha 17 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 19 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 20 do trecho: Compõe o trecho de texto “width="1600"” sem modificá-lo.
   * Linha 21 do trecho: Compõe o trecho de texto “height="900"” sem modificá-lo.
   * Linha 22 do trecho: Compõe o trecho de texto “rx="34"” sem modificá-lo.
   * Linha 23 do trecho: Compõe o trecho de texto “fill="#07110b"” sem modificá-lo.
   * Linha 24 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 26 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 27 do trecho: Compõe o trecho de texto “x="2"” sem modificá-lo.
   * Linha 28 do trecho: Compõe o trecho de texto “y="2"” sem modificá-lo.
   * Linha 29 do trecho: Compõe o trecho de texto “width="1596"” sem modificá-lo.
   * Linha 30 do trecho: Compõe o trecho de texto “height="896"” sem modificá-lo.
   * Linha 31 do trecho: Compõe o trecho de texto “rx="32"” sem modificá-lo.
   * Linha 32 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 33 do trecho: Compõe o trecho de texto “stroke="#193522"” sem modificá-lo.
   * Linha 34 do trecho: Compõe o trecho de texto “stroke-width="4"” sem modificá-lo.
   * Linha 35 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 37 do trecho: Insere um círculo vetorial com o texto “<circle”.
   * Linha 38 do trecho: Compõe o trecho de texto “cx="1350"” sem modificá-lo.
   * Linha 39 do trecho: Compõe o trecho de texto “cy="170"” sem modificá-lo.
   * Linha 40 do trecho: Compõe o trecho de texto “r="270"” sem modificá-lo.
   * Linha 41 do trecho: Compõe o trecho de texto “fill="#0e2918"” sem modificá-lo.
   * Linha 42 do trecho: Compõe o trecho de texto “opacity=".72"” sem modificá-lo.
   * Linha 43 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 45 do trecho: Insere um círculo vetorial com o texto “<circle”.
   * Linha 46 do trecho: Compõe o trecho de texto “cx="1415"” sem modificá-lo.
   * Linha 47 do trecho: Compõe o trecho de texto “cy="705"” sem modificá-lo.
   * Linha 48 do trecho: Compõe o trecho de texto “r="230"” sem modificá-lo.
   * Linha 49 do trecho: Compõe o trecho de texto “fill="#102118"” sem modificá-lo.
   * Linha 50 do trecho: Compõe o trecho de texto “opacity=".58"” sem modificá-lo.
   * Linha 51 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 53 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 54 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 55 do trecho: Compõe o trecho de texto “y="110"” sem modificá-lo.
   * Linha 56 do trecho: Compõe o trecho de texto “width="170"” sem modificá-lo.
   * Linha 57 do trecho: Compõe o trecho de texto “height="38"” sem modificá-lo.
   * Linha 58 do trecho: Compõe o trecho de texto “rx="19"” sem modificá-lo.
   * Linha 59 do trecho: Compõe o trecho de texto “fill="#dfff00"” sem modificá-lo.
   * Linha 60 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 62 do trecho: Insere o elemento text com o texto “<text”.
   * Linha 63 do trecho: Compõe o trecho de texto “x="195"” sem modificá-lo.
   * Linha 64 do trecho: Compõe o trecho de texto “y="136"” sem modificá-lo.
   * Linha 65 do trecho: Compõe o trecho de texto “text-anchor="middle"” sem modificá-lo.
   * Linha 66 do trecho: Compõe o trecho de texto “font-family="Inter, Arial, sans-serif"” sem modificá-lo.
   * Linha 67 do trecho: Compõe o trecho de texto “font-size="18"” sem modificá-lo.
   * Linha 68 do trecho: Compõe o trecho de texto “font-weight="800"” sem modificá-lo.
   * Linha 69 do trecho: Compõe o trecho de texto “fill="#071008"” sem modificá-lo.
   * Linha 70 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 71 do trecho: Inclui o campo “SLIDE” no texto da consulta.
   * Linha 72 do trecho: Encerra o elemento text.
   * Linha 74 do trecho: Insere o elemento text com o texto “<text”.
   * Linha 75 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 76 do trecho: Compõe o trecho de texto “y="255"” sem modificá-lo.
   * Linha 77 do trecho: Compõe o trecho de texto “font-family="Inter, Arial, sans-serif"” sem modificá-lo.
   * Linha 78 do trecho: Compõe o trecho de texto “font-size="72"” sem modificá-lo.
   * Linha 79 do trecho: Compõe o trecho de texto “font-weight="800"” sem modificá-lo.
   * Linha 80 do trecho: Compõe o trecho de texto “fill="#ffffff"” sem modificá-lo.
   * Linha 81 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 82 do trecho: Compõe o trecho de texto “Área do conteúdo” sem modificá-lo.
   * Linha 83 do trecho: Encerra o elemento text.
   * Linha 85 do trecho: Insere o elemento text com o texto “<text”.
   * Linha 86 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 87 do trecho: Compõe o trecho de texto “y="325"” sem modificá-lo.
   * Linha 88 do trecho: Compõe o trecho de texto “font-family="Inter, Arial, sans-serif"” sem modificá-lo.
   * Linha 89 do trecho: Compõe o trecho de texto “font-size="27"” sem modificá-lo.
   * Linha 90 do trecho: Compõe o trecho de texto “font-weight="500"” sem modificá-lo.
   * Linha 91 do trecho: Compõe o trecho de texto “fill="#aeb9b1"” sem modificá-lo.
   * Linha 92 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 93 do trecho: Insere no texto o valor calculado por ${escapeHtml(message)}.
   * Linha 94 do trecho: Encerra o elemento text.
   * Linha 96 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 97 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 98 do trecho: Compõe o trecho de texto “y="410"” sem modificá-lo.
   * Linha 99 do trecho: Compõe o trecho de texto “width="650"” sem modificá-lo.
   * Linha 100 do trecho: Compõe o trecho de texto “height="32"” sem modificá-lo.
   * Linha 101 do trecho: Compõe o trecho de texto “rx="16"” sem modificá-lo.
   * Linha 102 do trecho: Compõe o trecho de texto “fill="#17301f"” sem modificá-lo.
   * Linha 103 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 105 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 106 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 107 do trecho: Compõe o trecho de texto “y="475"” sem modificá-lo.
   * Linha 108 do trecho: Compõe o trecho de texto “width="790"” sem modificá-lo.
   * Linha 109 do trecho: Compõe o trecho de texto “height="32"” sem modificá-lo.
   * Linha 110 do trecho: Compõe o trecho de texto “rx="16"” sem modificá-lo.
   * Linha 111 do trecho: Compõe o trecho de texto “fill="#17301f"” sem modificá-lo.
   * Linha 112 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 114 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 115 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 116 do trecho: Compõe o trecho de texto “y="540"” sem modificá-lo.
   * Linha 117 do trecho: Compõe o trecho de texto “width="565"” sem modificá-lo.
   * Linha 118 do trecho: Compõe o trecho de texto “height="32"” sem modificá-lo.
   * Linha 119 do trecho: Compõe o trecho de texto “rx="16"” sem modificá-lo.
   * Linha 120 do trecho: Compõe o trecho de texto “fill="#17301f"” sem modificá-lo.
   * Linha 121 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 123 do trecho: Insere um retângulo vetorial com o texto “<rect”.
   * Linha 124 do trecho: Compõe o trecho de texto “x="1050"” sem modificá-lo.
   * Linha 125 do trecho: Compõe o trecho de texto “y="355"” sem modificá-lo.
   * Linha 126 do trecho: Compõe o trecho de texto “width="360"” sem modificá-lo.
   * Linha 127 do trecho: Compõe o trecho de texto “height="300"” sem modificá-lo.
   * Linha 128 do trecho: Compõe o trecho de texto “rx="26"” sem modificá-lo.
   * Linha 129 do trecho: Compõe o trecho de texto “fill="#0f2517"” sem modificá-lo.
   * Linha 130 do trecho: Compõe o trecho de texto “stroke="#245132"” sem modificá-lo.
   * Linha 131 do trecho: Compõe o trecho de texto “stroke-width="3"” sem modificá-lo.
   * Linha 132 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 134 do trecho: Insere um traçado vetorial com o texto “<path”.
   * Linha 135 do trecho: Compõe o trecho de texto “d="M1165 575V435h175"” sem modificá-lo.
   * Linha 136 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 137 do trecho: Compõe o trecho de texto “stroke="#dfff00"” sem modificá-lo.
   * Linha 138 do trecho: Compõe o trecho de texto “stroke-width="18"” sem modificá-lo.
   * Linha 139 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 140 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 141 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 143 do trecho: Insere um traçado vetorial com o texto “<path”.
   * Linha 144 do trecho: Compõe o trecho de texto “d="M1188 540l55-63 48 38 72-92"” sem modificá-lo.
   * Linha 145 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 146 do trecho: Compõe o trecho de texto “stroke="#ffffff"” sem modificá-lo.
   * Linha 147 do trecho: Compõe o trecho de texto “stroke-width="12"” sem modificá-lo.
   * Linha 148 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 149 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 150 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
   * Linha 152 do trecho: Insere o elemento text com o texto “<text”.
   * Linha 153 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 154 do trecho: Compõe o trecho de texto “y="790"” sem modificá-lo.
   * Linha 155 do trecho: Compõe o trecho de texto “font-family="Inter, Arial, sans-serif"” sem modificá-lo.
   * Linha 156 do trecho: Compõe o trecho de texto “font-size="24"” sem modificá-lo.
   * Linha 157 do trecho: Compõe o trecho de texto “font-weight="700"” sem modificá-lo.
   * Linha 158 do trecho: Compõe o trecho de texto “fill="#dfff00"” sem modificá-lo.
   * Linha 159 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 160 do trecho: Compõe o trecho de texto “Proporção 16:9 • 1600 × 900” sem modificá-lo.
   * Linha 161 do trecho: Encerra o elemento text.
   * Linha 163 do trecho: Insere o elemento text com o texto “<text”.
   * Linha 164 do trecho: Compõe o trecho de texto “x="110"” sem modificá-lo.
   * Linha 165 do trecho: Compõe o trecho de texto “y="830"” sem modificá-lo.
   * Linha 166 do trecho: Compõe o trecho de texto “font-family="Inter, Arial, sans-serif"” sem modificá-lo.
   * Linha 167 do trecho: Compõe o trecho de texto “font-size="20"” sem modificá-lo.
   * Linha 168 do trecho: Compõe o trecho de texto “font-weight="500"” sem modificá-lo.
   * Linha 169 do trecho: Compõe o trecho de texto “fill="#7f8f84"” sem modificá-lo.
   * Linha 170 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 171 do trecho: Compõe o trecho de texto “Conteúdo carregado pelo Supabase Storage” sem modificá-lo.
   * Linha 172 do trecho: Encerra o elemento text.
   * Linha 174 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 176 do trecho: Encerra um contêiner de layout.
   * Linha 178 do trecho: Encerra um contêiner de layout.
   * Linha 179 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  return `
    <div
      id="slide-stage"
      class="slide-stage"
    >

      <div
        class="slide-placeholder"
        aria-label="Área reservada para os slides do curso"
      >

        <svg
          class="slide-placeholder-svg"
          viewBox="0 0 1600 900"
          role="img"
          aria-label="Área demonstrativa do slide"
        >

          <rect
            width="1600"
            height="900"
            rx="34"
            fill="#07110b"
          />

          <rect
            x="2"
            y="2"
            width="1596"
            height="896"
            rx="32"
            fill="none"
            stroke="#193522"
            stroke-width="4"
          />

          <circle
            cx="1350"
            cy="170"
            r="270"
            fill="#0e2918"
            opacity=".72"
          />

          <circle
            cx="1415"
            cy="705"
            r="230"
            fill="#102118"
            opacity=".58"
          />

          <rect
            x="110"
            y="110"
            width="170"
            height="38"
            rx="19"
            fill="#dfff00"
          />

          <text
            x="195"
            y="136"
            text-anchor="middle"
            font-family="Inter, Arial, sans-serif"
            font-size="18"
            font-weight="800"
            fill="#071008"
          >
            SLIDE
          </text>

          <text
            x="110"
            y="255"
            font-family="Inter, Arial, sans-serif"
            font-size="72"
            font-weight="800"
            fill="#ffffff"
          >
            Área do conteúdo
          </text>

          <text
            x="110"
            y="325"
            font-family="Inter, Arial, sans-serif"
            font-size="27"
            font-weight="500"
            fill="#aeb9b1"
          >
            ${escapeHtml(message)}
          </text>

          <rect
            x="110"
            y="410"
            width="650"
            height="32"
            rx="16"
            fill="#17301f"
          />

          <rect
            x="110"
            y="475"
            width="790"
            height="32"
            rx="16"
            fill="#17301f"
          />

          <rect
            x="110"
            y="540"
            width="565"
            height="32"
            rx="16"
            fill="#17301f"
          />

          <rect
            x="1050"
            y="355"
            width="360"
            height="300"
            rx="26"
            fill="#0f2517"
            stroke="#245132"
            stroke-width="3"
          />

          <path
            d="M1165 575V435h175"
            fill="none"
            stroke="#dfff00"
            stroke-width="18"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <path
            d="M1188 540l55-63 48 38 72-92"
            fill="none"
            stroke="#ffffff"
            stroke-width="12"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <text
            x="110"
            y="790"
            font-family="Inter, Arial, sans-serif"
            font-size="24"
            font-weight="700"
            fill="#dfff00"
          >
            Proporção 16:9 • 1600 × 900
          </text>

          <text
            x="110"
            y="830"
            font-family="Inter, Arial, sans-serif"
            font-size="20"
            font-weight="500"
            fill="#7f8f84"
          >
            Conteúdo carregado pelo Supabase Storage
          </text>

        </svg>

      </div>

    </div>
  `;
} // Encerra o bloco da função getSlidePlaceholder.


/* =========================================================
   SEM AULAS
========================================================= */

function renderNoLessons() { // Declara a função renderNoLessons com nenhum parâmetro.
  const container = // Define container como o resultado de $ com o texto “lessons-container”.
    $("lessons-container"); // Executa a chamada que produz o resultado de $ com o texto “lessons-container”.


  if (container) { // Verifica container para decidir se executa este bloco.

    /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
     * Linha 1 do trecho: Atualiza container.innerHTML com um texto montado com 0 valores dinâmicos.
     * Linha 2 do trecho: Insere um contêiner de layout com as classes “module-block”.
     * Linha 4 do trecho: Insere um contêiner de layout com as classes “module-label”.
     * Linha 5 do trecho: Inclui o campo “CURSO” no texto da consulta.
     * Linha 6 do trecho: Encerra um contêiner de layout.
     * Linha 8 do trecho: Insere um contêiner de layout com as classes “module-title”.
     * Linha 9 do trecho: Compõe o trecho de texto “Conteúdo ainda não publicado” sem modificá-lo.
     * Linha 10 do trecho: Encerra um contêiner de layout.
     * Linha 12 do trecho: Insere um contêiner de layout com as classes “empty-side”.
     * Linha 13 do trecho: Compõe o trecho de texto “Nenhuma aula publicada foi encontrada.” sem modificá-lo.
     * Linha 14 do trecho: Encerra um contêiner de layout.
     * Linha 16 do trecho: Encerra um contêiner de layout.
     * Linha 17 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
     */
    container.innerHTML = `
      <div class="module-block">

        <div class="module-label">
          CURSO
        </div>

        <div class="module-title">
          Conteúdo ainda não publicado
        </div>

        <div class="empty-side">
          Nenhuma aula publicada foi encontrada.
        </div>

      </div>
    `;
  } // Encerra o bloco da condição.


  const title = // Define title como o resultado de $ com o texto “lesson-title”.
    $("lesson-title"); // Executa a chamada que produz o resultado de $ com o texto “lesson-title”.


  const description = // Define description como o resultado de $ com o texto “lesson-description”.
    $("lesson-description"); // Executa a chamada que produz o resultado de $ com o texto “lesson-description”.


  if (title) { // Verifica title para decidir se executa este bloco.

    title.textContent = // Atualiza title.textContent com o texto “Conteúdo em preparação”.
      "Conteúdo em preparação"; // Fornece o texto “Conteúdo em preparação” à expressão atual.
  } // Encerra o bloco da condição.


  if (description) { // Verifica description para decidir se executa este bloco.

    description.textContent = // Atualiza description.textContent com o texto “As aulas e slides deste curso serão exibidos aqui.”.
      "As aulas e slides deste curso serão exibidos aqui."; // Fornece o texto “As aulas e slides deste curso serão exibidos aqui.” à expressão atual.
  } // Encerra o bloco da condição.


  const currentLesson = // Define currentLesson como o resultado de $ com o texto “current-lesson”.
    $("current-lesson"); // Executa a chamada que produz o resultado de $ com o texto “current-lesson”.


  if (currentLesson) { // Verifica currentLesson para decidir se executa este bloco.

    currentLesson.innerHTML = // Atualiza currentLesson.innerHTML com o resultado de getSlidePlaceholder.
      getSlidePlaceholder(); // Executa a chamada que produz o resultado de getSlidePlaceholder.
  } // Encerra o bloco da condição.


  const previous = // Define previous como o resultado de $ com o texto “prev-lesson”.
    $("prev-lesson"); // Executa a chamada que produz o resultado de $ com o texto “prev-lesson”.


  const next = // Define next como o resultado de $ com o texto “next-lesson”.
    $("next-lesson"); // Executa a chamada que produz o resultado de $ com o texto “next-lesson”.


  if (previous) { // Verifica previous para decidir se executa este bloco.

    previous.disabled = // Atualiza previous.disabled com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.
  } // Encerra o bloco da condição.


  if (next) { // Verifica next para decidir se executa este bloco.

    next.disabled = // Atualiza next.disabled com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função renderNoLessons.


/* =========================================================
   CONCLUIR AULA
========================================================= */

async function markLessonCompleted( // Declara a função assíncrona markLessonCompleted com lesson.
  lesson // Utiliza o valor de lesson.
) { // Declara a função assíncrona markLessonCompleted com lesson.
  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  if (!currentUser) { // Verifica a negação de currentUser para decidir se executa este bloco.

    console.warn( // Executa a chamada que produz o registro de o texto “Usuário não autenticado. Não foi possível registrar o progresso.” no console.
      "Usuário não autenticado. Não foi possível registrar o progresso." // Fornece o texto “Usuário não autenticado. Não foi possível registrar o progresso.” à expressão atual.
    ); // Encerra a chamada de console.warn.

    return false; // Retorna false (falso).
  } // Encerra o bloco da condição.


  const lessonId = // Define lessonId como a conversão de lesson.id em número.
    Number( // Executa a chamada que produz a conversão de lesson.id em número.
      lesson.id // Acessa lesson.id.
    ); // Encerra a chamada de Number.


  const existing = // Define existing como o valor associado à chave lessonId em progressByLesson.
    progressByLesson.get( // Executa a chamada que produz o valor associado à chave lessonId em progressByLesson.
      lessonId // Utiliza o valor de lessonId.
    ); // Encerra a chamada de progressByLesson.get.


  if ( // Verifica existing.concluida com acesso opcional para decidir se executa este bloco.
    existing?.concluida // Acessa existing.concluida.
  ) { // Verifica existing.concluida com acesso opcional para decidir se executa este bloco.

    return true; // Retorna true (verdadeiro).
  } // Encerra o bloco da condição.


  const completedAt = // Define completedAt como o resultado de new Date(…).toISOString.
    new Date() // Executa a chamada que produz o resultado de new Date(…).toISOString.
      .toISOString(); // Executa a chamada que produz o resultado de new Date(…).toISOString.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    let savedRow = // Define savedRow como null (ausência de valor).
      null; // Fornece null (ausência de valor) à expressão atual.


    if ( // Verifica existing.id com acesso opcional para decidir se executa este bloco.
      existing?.id // Acessa existing.id.
    ) { // Verifica existing.id com acesso opcional para decidir se executa este bloco.

      const { // Define data, error como o resultado aguardado de um registro ou null, sem exigir um resultado.
        data, // Inclui a propriedade data com o valor da variável de mesmo nome.
        error // Inclui a propriedade error com o valor da variável de mesmo nome.
      } = // Compõe data, error na operação atual.
        await supabase // Aguarda um registro ou null, sem exigir um resultado antes de continuar.
          .from( // Executa a chamada que produz a referência à tabela ou ao bucket o texto “progresso_aulas”.
            "progresso_aulas" // Fornece o texto “progresso_aulas” à expressão atual.
          ) // Encerra a chamada de supabase.from.
          .update({ // Executa a chamada que produz a atualização dos dados um objeto com concluida, concluida_em na tabela selecionada.
            concluida: // Define a propriedade concluida como true (verdadeiro).
              true, // Fornece true (verdadeiro) à expressão atual.

            concluida_em: // Define a propriedade concluida_em como completedAt.
              completedAt // Utiliza o valor de completedAt.
          }) // Encerra o objeto.
          .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).update(…), filtrada por o texto “id” igual a existing.id.
            "id", // Fornece o texto “id” à expressão atual.
            existing.id // Acessa existing.id.
          ) // Encerra a chamada de supabase.from(…).update(…).eq.
          .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).update(…).eq(…), filtrada por o texto “user_id” igual a currentUser.id.
            "user_id", // Fornece o texto “user_id” à expressão atual.
            currentUser.id // Acessa currentUser.id.
          ) // Encerra a chamada de supabase.from(…).update(…).eq(…).eq.
          /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
           * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
           * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
           * Linha 3 do trecho: Inclui o campo “user_id” no texto da consulta.
           * Linha 4 do trecho: Inclui o campo “aula_id” no texto da consulta.
           * Linha 5 do trecho: Inclui o campo “concluida” no texto da consulta.
           * Linha 6 do trecho: Inclui o campo “concluida_em” no texto da consulta.
           * Linha 7 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           */
          .select(`
            id,
            user_id,
            aula_id,
            concluida,
            concluida_em
          `)
          .maybeSingle(); // Executa a chamada que produz um registro ou null, sem exigir um resultado.


      if (error) { // Verifica error para decidir se executa este bloco.
        throw error; // Lança error para interromper o fluxo e informar a falha.
      } // Encerra o bloco da condição.


      savedRow = // Atualiza savedRow com data.
        data; // Utiliza o valor de data.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      const { // Define data, error como o resultado aguardado de um registro ou null, sem exigir um resultado.
        data, // Inclui a propriedade data com o valor da variável de mesmo nome.
        error // Inclui a propriedade error com o valor da variável de mesmo nome.
      } = // Compõe data, error na operação atual.
        await supabase // Aguarda um registro ou null, sem exigir um resultado antes de continuar.
          .from( // Executa a chamada que produz a referência à tabela ou ao bucket o texto “progresso_aulas”.
            "progresso_aulas" // Fornece o texto “progresso_aulas” à expressão atual.
          ) // Encerra a chamada de supabase.from.
          .insert({ // Executa a chamada que produz a inserção dos dados um objeto com user_id, aula_id, concluida, concluida_em na tabela selecionada.
            user_id: // Define a propriedade user_id como currentUser.id.
              currentUser.id, // Acessa currentUser.id.

            aula_id: // Define a propriedade aula_id como lesson.id.
              lesson.id, // Acessa lesson.id.

            concluida: // Define a propriedade concluida como true (verdadeiro).
              true, // Fornece true (verdadeiro) à expressão atual.

            concluida_em: // Define a propriedade concluida_em como completedAt.
              completedAt // Utiliza o valor de completedAt.
          }) // Encerra o objeto.
          /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
           * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
           * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
           * Linha 3 do trecho: Inclui o campo “user_id” no texto da consulta.
           * Linha 4 do trecho: Inclui o campo “aula_id” no texto da consulta.
           * Linha 5 do trecho: Inclui o campo “concluida” no texto da consulta.
           * Linha 6 do trecho: Inclui o campo “concluida_em” no texto da consulta.
           * Linha 7 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           */
          .select(`
            id,
            user_id,
            aula_id,
            concluida,
            concluida_em
          `)
          .maybeSingle(); // Executa a chamada que produz um registro ou null, sem exigir um resultado.


      if (error) { // Verifica error para decidir se executa este bloco.
        throw error; // Lança error para interromper o fluxo e informar a falha.
      } // Encerra o bloco da condição.


      savedRow = // Atualiza savedRow com data.
        data; // Utiliza o valor de data.
    } // Encerra o bloco da condição.


    if (!savedRow) { // Verifica a negação de savedRow para decidir se executa este bloco.

      console.error( // Executa a chamada que produz o registro de o texto “O Supabase não retornou o progresso salvo.” no console.
        "O Supabase não retornou o progresso salvo." // Fornece o texto “O Supabase não retornou o progresso salvo.” à expressão atual.
      ); // Encerra a chamada de console.error.

      return false; // Retorna false (falso).
    } // Encerra o bloco da condição.


    progressByLesson.set( // Executa a chamada que produz a associação de lessonId ao valor savedRow em progressByLesson.
      lessonId, // Utiliza o valor de lessonId.
      savedRow // Utiliza o valor de savedRow.
    ); // Encerra a chamada de progressByLesson.set.


    renderLessons(); // Executa a chamada que produz o resultado de renderLessons.

    updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.

    updateProgress(); // Executa a chamada que produz o resultado de updateProgress.

    renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.


    return true; // Retorna true (verdadeiro).

  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao salvar progresso:” no console.
      "Erro ao salvar progresso:", // Fornece o texto “Erro ao salvar progresso:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    return false; // Retorna false (falso).
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função markLessonCompleted.


/* =========================================================
   ESTADO DA NAVEGAÇÃO
========================================================= */

function getNavigationState() { // Declara a função getNavigationState com nenhum parâmetro.
  if (!lessons.length) { // Verifica a negação de lessons.length para decidir se executa este bloco.

    return { // Retorna um objeto com canPrevious, canNext, finalLesson, completed.
      canPrevious: // Define a propriedade canPrevious como false (falso).
        false, // Fornece false (falso) à expressão atual.

      canNext: // Define a propriedade canNext como false (falso).
        false, // Fornece false (falso) à expressão atual.

      finalLesson: // Define a propriedade finalLesson como false (falso).
        false, // Fornece false (falso) à expressão atual.

      completed: // Define a propriedade completed como false (falso).
        false // Fornece false (falso) à expressão atual.
    }; // Encerra o objeto.
  } // Encerra o bloco da condição.


  const lesson = // Define lesson como lessons[currentLessonIndex].
    lessons[ // Acessa lessons[currentLessonIndex].
      currentLessonIndex // Utiliza o valor de currentLessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonSlides.


  const firstPosition = // Define firstPosition como currentLessonIndex igual, inclusive no tipo, a 0 e currentSlideIndex igual, inclusive no tipo, a 0.
    currentLessonIndex === 0 && // Calcula currentLessonIndex igual, inclusive no tipo, a 0.
    currentSlideIndex === 0; // Calcula currentSlideIndex igual, inclusive no tipo, a 0.


  const isLastLesson = // Define isLastLesson como currentLessonIndex igual, inclusive no tipo, a lessons.length menos 1.
    currentLessonIndex === // Calcula currentLessonIndex igual, inclusive no tipo, a lessons.length menos 1.
    lessons.length - 1; // Acessa lessons.length.


  const isLastSlide = // Define isLastSlide como a negação de lessonSlides.length ou, se indisponível, currentSlideIndex igual, inclusive no tipo, a lessonSlides.length menos 1.
    !lessonSlides.length || // Calcula a negação de lessonSlides.length ou, se indisponível, currentSlideIndex igual, inclusive no tipo, a lessonSlides.length menos 1.
    currentSlideIndex === // Calcula currentSlideIndex igual, inclusive no tipo, a lessonSlides.length menos 1.
      lessonSlides.length - 1; // Acessa lessonSlides.length.


  const finalLesson = // Define finalLesson como isLastLesson e isLastSlide.
    isLastLesson && // Calcula isLastLesson e isLastSlide.
    isLastSlide; // Utiliza o valor de isLastSlide.


  return { // Retorna um objeto com canPrevious, canNext, finalLesson, completed.
    canPrevious: // Define a propriedade canPrevious como a negação de firstPosition e a negação de isSlideTransitioning.
      !firstPosition && // Calcula a negação de firstPosition e a negação de isSlideTransitioning.
      !isSlideTransitioning, // Compõe a negação de isSlideTransitioning na operação atual.

    canNext: // Define a propriedade canNext como a negação de isSlideTransitioning e a negação de finalLesson ou, se indisponível, a negação de o resultado de isLessonCompleted com lesson.
      !isSlideTransitioning && // Calcula a negação de isSlideTransitioning e a negação de finalLesson ou, se indisponível, a negação de o resultado de isLessonCompleted com lesson.
      ( // Calcula a negação de isSlideTransitioning e a negação de finalLesson ou, se indisponível, a negação de o resultado de isLessonCompleted com lesson.
        !finalLesson || // Calcula a negação de finalLesson ou, se indisponível, a negação de o resultado de isLessonCompleted com lesson.
        !isLessonCompleted( // Compõe a negação de o resultado de isLessonCompleted com lesson na operação atual.
          lesson // Utiliza o valor de lesson.
        ) // Encerra a chamada de isLessonCompleted.
      ), // Encerra a expressão ou função iniciada acima.

    finalLesson, // Inclui a propriedade finalLesson com o valor da variável de mesmo nome.

    completed: // Define a propriedade completed como o resultado de isLessonCompleted com lesson.
      isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
        lesson // Utiliza o valor de lesson.
      ) // Encerra a chamada de isLessonCompleted.
  }; // Encerra o objeto.
} // Encerra o bloco da função getNavigationState.


/* =========================================================
   NAVEGAÇÃO DA APRESENTAÇÃO
========================================================= */

function updatePresentationNavigation() { // Declara a função updatePresentationNavigation com nenhum parâmetro.
  const stage = // Define stage como o resultado de getPresentationStage.
    getPresentationStage(); // Executa a chamada que produz o resultado de getPresentationStage.


  if (!stage) { // Verifica a negação de stage para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const previous = // Define previous como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-previous]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-previous]”.
      "[data-presentation-previous]" // Fornece o texto “[data-presentation-previous]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  const next = // Define next como o primeiro elemento que corresponde ao seletor o texto “[data-presentation-next]”.
    stage.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-presentation-next]”.
      "[data-presentation-next]" // Fornece o texto “[data-presentation-next]” à expressão atual.
    ); // Encerra a chamada de stage.querySelector.


  const state = // Define state como o resultado de getNavigationState.
    getNavigationState(); // Executa a chamada que produz o resultado de getNavigationState.


  if (previous) { // Verifica previous para decidir se executa este bloco.

    previous.disabled = // Atualiza previous.disabled com a negação de state.canPrevious.
      !state.canPrevious; // Compõe a negação de state.canPrevious na operação atual.
  } // Encerra o bloco da condição.


  if (next) { // Verifica next para decidir se executa este bloco.

    next.disabled = // Atualiza next.disabled com a negação de state.canNext.
      !state.canNext; // Compõe a negação de state.canNext na operação atual.


    const text = // Define text como o primeiro elemento que corresponde ao seletor o texto “.presentation-nav-text”.
      next.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.presentation-nav-text”.
        ".presentation-nav-text" // Fornece o texto “.presentation-nav-text” à expressão atual.
      ); // Encerra a chamada de next.querySelector.


    if (text) { // Verifica text para decidir se executa este bloco.

      if ( // Verifica state.finalLesson para decidir se executa este bloco.
        state.finalLesson // Acessa state.finalLesson.
      ) { // Verifica state.finalLesson para decidir se executa este bloco.

        text.textContent = // Atualiza text.textContent com o texto “Concluída” se state.completed; caso contrário, o texto “Concluir”.
          state.completed // Acessa state.completed.
            ? "Concluída" // Fornece o texto “Concluída” à expressão atual.
            : "Concluir"; // Fornece o texto “Concluir” à expressão atual.

      } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

        text.textContent = // Atualiza text.textContent com o texto “Próxima”.
          "Próxima"; // Fornece o texto “Próxima” à expressão atual.
      } // Encerra o bloco da condição.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função updatePresentationNavigation.


/* =========================================================
   BOTÕES NORMAIS
========================================================= */

function updateNavigation() { // Declara a função updateNavigation com nenhum parâmetro.
  const previous = // Define previous como o resultado de $ com o texto “prev-lesson”.
    $("prev-lesson"); // Executa a chamada que produz o resultado de $ com o texto “prev-lesson”.


  const next = // Define next como o resultado de $ com o texto “next-lesson”.
    $("next-lesson"); // Executa a chamada que produz o resultado de $ com o texto “next-lesson”.


  const state = // Define state como o resultado de getNavigationState.
    getNavigationState(); // Executa a chamada que produz o resultado de getNavigationState.


  if (previous) { // Verifica previous para decidir se executa este bloco.

    previous.disabled = // Atualiza previous.disabled com a negação de state.canPrevious.
      !state.canPrevious; // Compõe a negação de state.canPrevious na operação atual.
  } // Encerra o bloco da condição.


  if (next) { // Verifica next para decidir se executa este bloco.

    next.disabled = // Atualiza next.disabled com a negação de state.canNext.
      !state.canNext; // Compõe a negação de state.canNext na operação atual.


    if ( // Verifica state.finalLesson para decidir se executa este bloco.
      state.finalLesson // Acessa state.finalLesson.
    ) { // Verifica state.finalLesson para decidir se executa este bloco.

      next.textContent = // Atualiza next.textContent com o texto “Concluída ✓” se state.completed; caso contrário, o texto “Concluir aula ✓”.
        state.completed // Acessa state.completed.
          ? "Concluída ✓" // Fornece o texto “Concluída ✓” à expressão atual.
          : "Concluir aula ✓"; // Fornece o texto “Concluir aula ✓” à expressão atual.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      next.textContent = // Atualiza next.textContent com o texto “Próxima →”.
        "Próxima →"; // Fornece o texto “Próxima →” à expressão atual.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.


  updatePresentationNavigation(); // Executa a chamada que produz o resultado de updatePresentationNavigation.
} // Encerra o bloco da função updateNavigation.


/* =========================================================
   ATUALIZAR ESTADO DA AULA NO HISTÓRICO
========================================================= */

function syncCurrentLessonHistory() { // Declara a função syncCurrentLessonHistory com nenhum parâmetro.
  if ( // Verifica currentCourseView diferente, inclusive no tipo, de o texto “lesson” para decidir se executa este bloco.
    currentCourseView !== // Calcula currentCourseView diferente, inclusive no tipo, de o texto “lesson”.
    "lesson" // Fornece o texto “lesson” à expressão atual.
  ) { // Verifica currentCourseView diferente, inclusive no tipo, de o texto “lesson” para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com o resultado de createLessonHistoryState com currentLessonIndex e currentSlideIndex.
    createLessonHistoryState( // Executa a chamada que produz o resultado de createLessonHistoryState com currentLessonIndex e currentSlideIndex.
      currentLessonIndex, // Utiliza o valor de currentLessonIndex.
      currentSlideIndex // Utiliza o valor de currentSlideIndex.
    ) // Encerra a chamada de createLessonHistoryState.
  ); // Encerra a chamada de replaceCourseHistoryState.
} // Encerra o bloco da função syncCurrentLessonHistory.


/* =========================================================
   ANTERIOR
========================================================= */

async function goPrevious() { // Declara a função assíncrona goPrevious com nenhum parâmetro.
  if ( // Verifica a negação de lessons.length ou, se indisponível, isSlideTransitioning para decidir se executa este bloco.
    !lessons.length || // Calcula a negação de lessons.length ou, se indisponível, isSlideTransitioning.
    isSlideTransitioning // Utiliza o valor de isSlideTransitioning.
  ) { // Verifica a negação de lessons.length ou, se indisponível, isSlideTransitioning para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica currentSlideIndex maior que 0 para decidir se executa este bloco.
    currentSlideIndex > 0 // Calcula currentSlideIndex maior que 0.
  ) { // Verifica currentSlideIndex maior que 0 para decidir se executa este bloco.

    const oldIndex = // Define oldIndex como currentSlideIndex.
      currentSlideIndex; // Utiliza o valor de currentSlideIndex.


    currentSlideIndex -= // Atualiza currentSlideIndex -= usando 1.
      1; // Fornece 1 à expressão atual.


    const success = // Define success como o resultado aguardado de o resultado de renderCurrentLesson.
      await renderCurrentLesson(); // Aguarda o resultado de renderCurrentLesson antes de continuar.


    if (!success) { // Verifica a negação de success para decidir se executa este bloco.

      currentSlideIndex = // Atualiza currentSlideIndex com oldIndex.
        oldIndex; // Utiliza o valor de oldIndex.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      syncCurrentLessonHistory(); // Executa a chamada que produz o resultado de syncCurrentLessonHistory.
    } // Encerra o bloco da condição.


    updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica currentLessonIndex menor ou igual a 0 para decidir se executa este bloco.
    currentLessonIndex <= 0 // Calcula currentLessonIndex menor ou igual a 0.
  ) { // Verifica currentLessonIndex menor ou igual a 0 para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const previousLessonIndex = // Define previousLessonIndex como currentLessonIndex menos 1.
    currentLessonIndex - 1; // Calcula currentLessonIndex menos 1.


  if ( // Verifica a negação de o resultado de isLessonUnlocked com previousLessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com previousLessonIndex na operação atual.
      previousLessonIndex // Utiliza o valor de previousLessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com previousLessonIndex para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const oldLessonIndex = // Define oldLessonIndex como currentLessonIndex.
    currentLessonIndex; // Utiliza o valor de currentLessonIndex.


  const oldSlideIndex = // Define oldSlideIndex como currentSlideIndex.
    currentSlideIndex; // Utiliza o valor de currentSlideIndex.


  const previousLesson = // Define previousLesson como lessons[previousLessonIndex].
    lessons[ // Acessa lessons[previousLessonIndex].
      previousLessonIndex // Utiliza o valor de previousLessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  const previousSlides = // Define previousSlides como o resultado de getLessonSlides com previousLesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com previousLesson.
      previousLesson // Utiliza o valor de previousLesson.
    ); // Encerra a chamada de getLessonSlides.


  const lastSlideIndex = // Define lastSlideIndex como previousSlides.length menos 1 se previousSlides.length; caso contrário, 0.
    previousSlides.length // Acessa previousSlides.length.
      ? previousSlides.length - 1 // Acessa previousSlides.length.
      : 0; // Fornece 0 à expressão atual.


  currentLessonIndex = // Atualiza currentLessonIndex com previousLessonIndex.
    previousLessonIndex; // Utiliza o valor de previousLessonIndex.


  currentSlideIndex = // Atualiza currentSlideIndex com lastSlideIndex.
    lastSlideIndex; // Utiliza o valor de lastSlideIndex.


  visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.


  const success = // Define success como o resultado aguardado de o resultado de renderCurrentLesson.
    await renderCurrentLesson(); // Aguarda o resultado de renderCurrentLesson antes de continuar.


  if (!success) { // Verifica a negação de success para decidir se executa este bloco.

    currentLessonIndex = // Atualiza currentLessonIndex com oldLessonIndex.
      oldLessonIndex; // Utiliza o valor de oldLessonIndex.


    currentSlideIndex = // Atualiza currentSlideIndex com oldSlideIndex.
      oldSlideIndex; // Utiliza o valor de oldSlideIndex.


    updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.

  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    syncCurrentLessonHistory(); // Executa a chamada que produz o resultado de syncCurrentLessonHistory.
  } // Encerra o bloco da condição.


  updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

  updateProgress(); // Executa a chamada que produz o resultado de updateProgress.
} // Encerra o bloco da função goPrevious.


/* =========================================================
   PRÓXIMO
========================================================= */

async function goNext() { // Declara a função assíncrona goNext com nenhum parâmetro.
  if ( // Verifica a negação de lessons.length ou, se indisponível, isSlideTransitioning para decidir se executa este bloco.
    !lessons.length || // Calcula a negação de lessons.length ou, se indisponível, isSlideTransitioning.
    isSlideTransitioning // Utiliza o valor de isSlideTransitioning.
  ) { // Verifica a negação de lessons.length ou, se indisponível, isSlideTransitioning para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lesson = // Define lesson como lessons[currentLessonIndex].
    lessons[ // Acessa lessons[currentLessonIndex].
      currentLessonIndex // Utiliza o valor de currentLessonIndex.
    ]; // Encerra a expressão ou função iniciada acima.


  if (!lesson) { // Verifica a negação de lesson para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const lessonSlides = // Define lessonSlides como o resultado de getLessonSlides com lesson.
    getLessonSlides( // Executa a chamada que produz o resultado de getLessonSlides com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de getLessonSlides.


  if ( // Verifica lessonSlides.length e currentSlideIndex menor que lessonSlides.length menos 1 para decidir se executa este bloco.
    lessonSlides.length && // Acessa lessonSlides.length.
    currentSlideIndex < // Calcula currentSlideIndex menor que lessonSlides.length menos 1.
      lessonSlides.length - 1 // Acessa lessonSlides.length.
  ) { // Verifica lessonSlides.length e currentSlideIndex menor que lessonSlides.length menos 1 para decidir se executa este bloco.

    const oldIndex = // Define oldIndex como currentSlideIndex.
      currentSlideIndex; // Utiliza o valor de currentSlideIndex.


    currentSlideIndex += // Atualiza currentSlideIndex += usando 1.
      1; // Fornece 1 à expressão atual.


    const success = // Define success como o resultado aguardado de o resultado de renderCurrentLesson.
      await renderCurrentLesson(); // Aguarda o resultado de renderCurrentLesson antes de continuar.


    if (!success) { // Verifica a negação de success para decidir se executa este bloco.

      currentSlideIndex = // Atualiza currentSlideIndex com oldIndex.
        oldIndex; // Utiliza o valor de oldIndex.

    } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

      syncCurrentLessonHistory(); // Executa a chamada que produz o resultado de syncCurrentLessonHistory.
    } // Encerra o bloco da condição.


    updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  let completedSuccessfully = // Define completedSuccessfully como o resultado de isLessonCompleted com lesson.
    isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
      lesson // Utiliza o valor de lesson.
    ); // Encerra a chamada de isLessonCompleted.


  if ( // Verifica a negação de completedSuccessfully para decidir se executa este bloco.
    !completedSuccessfully // Compõe a negação de completedSuccessfully na operação atual.
  ) { // Verifica a negação de completedSuccessfully para decidir se executa este bloco.

    if ( // Verifica lessonSlides.length para decidir se executa este bloco.
      lessonSlides.length // Acessa lessonSlides.length.
    ) { // Verifica lessonSlides.length para decidir se executa este bloco.

      completedSuccessfully = // Atualiza completedSuccessfully com o resultado aguardado de o resultado de markLessonCompleted com lesson.
        await markLessonCompleted( // Aguarda o resultado de markLessonCompleted com lesson antes de continuar.
          lesson // Utiliza o valor de lesson.
        ); // Encerra a chamada de markLessonCompleted.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da condição.


  if ( // Verifica a negação de completedSuccessfully para decidir se executa este bloco.
    !completedSuccessfully // Compõe a negação de completedSuccessfully na operação atual.
  ) { // Verifica a negação de completedSuccessfully para decidir se executa este bloco.

    console.warn( // Executa a chamada que produz o registro de o texto “Conclua a aula atual antes de continuar.” no console.
      "Conclua a aula atual antes de continuar." // Fornece o texto “Conclua a aula atual antes de continuar.” à expressão atual.
    ); // Encerra a chamada de console.warn.


    updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica currentLessonIndex maior ou igual a lessons.length menos 1 para decidir se executa este bloco.
    currentLessonIndex >= // Calcula currentLessonIndex maior ou igual a lessons.length menos 1.
    lessons.length - 1 // Acessa lessons.length.
  ) { // Verifica currentLessonIndex maior ou igual a lessons.length menos 1 para decidir se executa este bloco.

    updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

    syncCurrentLessonHistory(); // Executa a chamada que produz o resultado de syncCurrentLessonHistory.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const nextLessonIndex = // Define nextLessonIndex como currentLessonIndex mais 1.
    currentLessonIndex + 1; // Calcula currentLessonIndex mais 1.


  if ( // Verifica a negação de o resultado de isLessonUnlocked com nextLessonIndex para decidir se executa este bloco.
    !isLessonUnlocked( // Compõe a negação de o resultado de isLessonUnlocked com nextLessonIndex na operação atual.
      nextLessonIndex // Utiliza o valor de nextLessonIndex.
    ) // Encerra a chamada de isLessonUnlocked.
  ) { // Verifica a negação de o resultado de isLessonUnlocked com nextLessonIndex para decidir se executa este bloco.

    console.warn( // Executa a chamada que produz o registro de o texto “A próxima aula ainda está bloqueada.” no console.
      "A próxima aula ainda está bloqueada." // Fornece o texto “A próxima aula ainda está bloqueada.” à expressão atual.
    ); // Encerra a chamada de console.warn.


    updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const oldLessonIndex = // Define oldLessonIndex como currentLessonIndex.
    currentLessonIndex; // Utiliza o valor de currentLessonIndex.


  const oldSlideIndex = // Define oldSlideIndex como currentSlideIndex.
    currentSlideIndex; // Utiliza o valor de currentSlideIndex.


  currentLessonIndex = // Atualiza currentLessonIndex com nextLessonIndex.
    nextLessonIndex; // Utiliza o valor de nextLessonIndex.


  currentSlideIndex = // Atualiza currentSlideIndex com 0.
    0; // Fornece 0 à expressão atual.


  visibleSlideKey = // Atualiza visibleSlideKey com o texto “”.
    ""; // Fornece o texto “” à expressão atual.


  updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.


  const success = // Define success como o resultado aguardado de o resultado de renderCurrentLesson.
    await renderCurrentLesson(); // Aguarda o resultado de renderCurrentLesson antes de continuar.


  if (!success) { // Verifica a negação de success para decidir se executa este bloco.

    currentLessonIndex = // Atualiza currentLessonIndex com oldLessonIndex.
      oldLessonIndex; // Utiliza o valor de oldLessonIndex.


    currentSlideIndex = // Atualiza currentSlideIndex com oldSlideIndex.
      oldSlideIndex; // Utiliza o valor de oldSlideIndex.


    updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.

  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

    /*
      Avançar para outra aula não cria
      nova entrada no histórico.

      Continuamos tendo apenas:

      Aula -> Home -> Catálogo.
    */

    syncCurrentLessonHistory(); // Executa a chamada que produz o resultado de syncCurrentLessonHistory.
  } // Encerra o bloco da condição.


  updateNavigation(); // Executa a chamada que produz o resultado de updateNavigation.

  updateProgress(); // Executa a chamada que produz o resultado de updateProgress.
} // Encerra o bloco da função goNext.


/* =========================================================
   BOTÕES DE NAVEGAÇÃO DAS AULAS
========================================================= */

$("prev-lesson") // Executa a chamada que produz o registro do evento o texto “click” em $(…).
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em $(…).
    "click", // Fornece o texto “click” à expressão atual.
    goPrevious // Utiliza o valor de goPrevious.
  ); // Encerra a chamada de $(…).addEventListener.


$("next-lesson") // Executa a chamada que produz o registro do evento o texto “click” em $(…).
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em $(…).
    "click", // Fornece o texto “click” à expressão atual.
    goNext // Utiliza o valor de goNext.
  ); // Encerra a chamada de $(…).addEventListener.


/* =========================================================
   BOTÃO SVG — VOLTAR
========================================================= */

$("history-back") // Executa a chamada que produz o registro do evento o texto “click” em $(…).
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em $(…).
    "click", // Fornece o texto “click” à expressão atual.
    goBackInHistory // Utiliza o valor de goBackInHistory.
  ); // Encerra a chamada de $(…).addEventListener.


/* =========================================================
   VOLTAR / AVANÇAR DO NAVEGADOR
========================================================= */

window.addEventListener( // Executa a chamada que produz o registro do evento o texto “popstate” em window.
  "popstate", // Fornece o texto “popstate” à expressão atual.
  async (event) => { // Define a função assíncrona que recebe event.

    const state = // Define state como event.state[COURSE_HISTORY_KEY] com acesso opcional.
      event.state?.[ // Acessa event.state[COURSE_HISTORY_KEY].
        COURSE_HISTORY_KEY // Utiliza o valor de COURSE_HISTORY_KEY.
      ]; // Encerra a expressão ou função iniciada acima.


    /*
      Se voltamos para a entrada
      HOME desta própria página,
      mostramos os módulos.
    */

    if ( // Verifica o resultado de isCourseHistoryState com state e state.view igual, inclusive no tipo, a o texto “home” para decidir se executa este bloco.
      isCourseHistoryState( // Executa a chamada que produz o resultado de isCourseHistoryState com state.
        state // Utiliza o valor de state.
      ) && // Executa a chamada que produz o resultado de isCourseHistoryState com state.
      state.view === // Acessa state.view.
        "home" // Fornece o texto “home” à expressão atual.
    ) { // Verifica o resultado de isCourseHistoryState com state e state.view igual, inclusive no tipo, a o texto “home” para decidir se executa este bloco.

      await showCourseHome(); // Aguarda o resultado de showCourseHome antes de continuar.

      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    /*
      Se usamos Avançar do navegador
      para retornar a uma aula,
      restauramos a aula correta.
    */

    if ( // Verifica o resultado de isCourseHistoryState com state e state.view igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.
      isCourseHistoryState( // Executa a chamada que produz o resultado de isCourseHistoryState com state.
        state // Utiliza o valor de state.
      ) && // Executa a chamada que produz o resultado de isCourseHistoryState com state.
      state.view === // Acessa state.view.
        "lesson" // Fornece o texto “lesson” à expressão atual.
    ) { // Verifica o resultado de isCourseHistoryState com state e state.view igual, inclusive no tipo, a o texto “lesson” para decidir se executa este bloco.

      const lessonIndex = // Define lessonIndex como o resultado de normalizeNumber com state.lessonIndex e 0.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com state.lessonIndex e 0.
          state.lessonIndex, // Acessa state.lessonIndex.
          0 // Fornece 0 à expressão atual.
        ); // Encerra a chamada de normalizeNumber.


      const slideIndex = // Define slideIndex como o resultado de normalizeNumber com state.slideIndex e 0.
        normalizeNumber( // Executa a chamada que produz o resultado de normalizeNumber com state.slideIndex e 0.
          state.slideIndex, // Acessa state.slideIndex.
          0 // Fornece 0 à expressão atual.
        ); // Encerra a chamada de normalizeNumber.


      if ( // Verifica o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.
        isLessonUnlocked( // Executa a chamada que produz o resultado de isLessonUnlocked com lessonIndex.
          lessonIndex // Utiliza o valor de lessonIndex.
        ) // Encerra a chamada de isLessonUnlocked.
      ) { // Verifica o resultado de isLessonUnlocked com lessonIndex para decidir se executa este bloco.

        await selectLesson( // Aguarda o resultado de selectLesson com lessonIndex e slideIndex antes de continuar.
          lessonIndex, // Utiliza o valor de lessonIndex.
          slideIndex // Utiliza o valor de slideIndex.
        ); // Encerra a chamada de selectLesson.

      } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.

        replaceCourseHistoryState( // Executa a chamada que produz o resultado de replaceCourseHistoryState com o resultado de createHomeHistoryState.
          createHomeHistoryState() // Executa a chamada que produz o resultado de createHomeHistoryState.
        ); // Encerra a chamada de replaceCourseHistoryState.


        await showCourseHome(); // Aguarda o resultado de showCourseHome antes de continuar.
      } // Encerra o bloco da condição.
    } // Encerra o bloco da condição.
  } // Encerra o bloco atual.
); // Encerra a chamada de window.addEventListener.


/* =========================================================
   PROGRESSO
========================================================= */

function updateProgress() { // Declara a função updateProgress com nenhum parâmetro.
  const total = // Define total como lessons.length.
    lessons.length; // Acessa lessons.length.


  const completed = // Define completed como lessons.filter(…).length.
    lessons.filter( // Executa a chamada que produz os itens de lessons que passam na condição.
      (lesson) => // Define a função que recebe lesson.
        isLessonCompleted( // Executa a chamada que produz o resultado de isLessonCompleted com lesson.
          lesson // Utiliza o valor de lesson.
        ) // Encerra a chamada de isLessonCompleted.
    ).length; // Utiliza o valor de length.


  const percentage = // Define percentage como o arredondamento de expressão vezes 100 para o inteiro mais próximo se total; caso contrário, 0.
    total // Utiliza o valor de total.

      ? Math.round( // Executa a chamada que produz o arredondamento de completed dividido por total vezes 100 para o inteiro mais próximo.
          ( // Calcula completed dividido por total vezes 100.
            completed / // Calcula completed dividido por total.
            total // Utiliza o valor de total.
          ) * // Calcula completed dividido por total vezes 100.
          100 // Fornece 100 à expressão atual.
        ) // Encerra a chamada de Math.round.

      : 0; // Fornece 0 à expressão atual.


  const percentageElement = // Define percentageElement como o resultado de $ com o texto “progress-pct”.
    $("progress-pct"); // Executa a chamada que produz o resultado de $ com o texto “progress-pct”.


  const countElement = // Define countElement como o resultado de $ com o texto “progress-count”.
    $("progress-count"); // Executa a chamada que produz o resultado de $ com o texto “progress-count”.


  const labelElement = // Define labelElement como o resultado de $ com o texto “progress-label”.
    $("progress-label"); // Executa a chamada que produz o resultado de $ com o texto “progress-label”.


  const fill = // Define fill como o resultado de $ com o texto “progress-bar-fill”.
    $("progress-bar-fill"); // Executa a chamada que produz o resultado de $ com o texto “progress-bar-fill”.


  if (percentageElement) { // Verifica percentageElement para decidir se executa este bloco.

    percentageElement.textContent = // Atualiza percentageElement.textContent com um texto montado com 1 valor dinâmico.
      `${percentage}%`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
  } // Encerra o bloco da condição.


  if (countElement) { // Verifica countElement para decidir se executa este bloco.

    countElement.textContent = // Atualiza countElement.textContent com um texto montado com 2 valores dinâmicos.
      `${completed} de ${total} aulas concluídas`; // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
  } // Encerra o bloco da condição.


  if (labelElement) { // Verifica labelElement para decidir se executa este bloco.

    labelElement.textContent = // Atualiza labelElement.textContent com um texto montado com 1 valor dinâmico.
      `${percentage}% concluído`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
  } // Encerra o bloco da condição.


  if (fill) { // Verifica fill para decidir se executa este bloco.

    fill.style.width = // Atualiza fill.style.width com um texto montado com 1 valor dinâmico.
      `${percentage}%`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.
  } // Encerra o bloco da condição.


  const circle = // Define circle como o resultado de $ com o texto “progress-circle”.
    $("progress-circle"); // Executa a chamada que produz o resultado de $ com o texto “progress-circle”.


  if (circle) { // Verifica circle para decidir se executa este bloco.

    const radius = // Define radius como circle.r.baseVal.value.
      circle.r.baseVal.value; // Acessa circle.r.baseVal.value.


    const circumference = // Define circumference como 2 vezes Math.PI vezes radius.
      2 * // Calcula 2 vezes Math.PI vezes radius.
      Math.PI * // Acessa Math.PI.
      radius; // Utiliza o valor de radius.


    circle.style.strokeDasharray = // Atualiza circle.style.strokeDasharray com um texto montado com 1 valor dinâmico.
      `${circumference}`; // Fornece um texto montado com 1 valor dinâmico à expressão atual.


    circle.style.strokeDashoffset = // Atualiza circle.style.strokeDashoffset com um texto montado com 1 valor dinâmico.
      /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
       * Linha 1 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
       * Linha 2 do trecho: Compõe o trecho de texto “circumference -” sem modificá-lo.
       * Linha 3 do trecho: Compõe o trecho de texto “(” sem modificá-lo.
       * Linha 4 do trecho: Compõe o trecho de texto “percentage /” sem modificá-lo.
       * Linha 5 do trecho: Inclui o campo “100” no texto da consulta.
       * Linha 6 do trecho: Compõe o trecho de texto “) *” sem modificá-lo.
       * Linha 7 do trecho: Inclui o campo “circumference” no texto da consulta.
       * Linha 8 do trecho: Compõe expressão na operação atual.
       */
      `${
        circumference -
        (
          percentage /
          100
        ) *
        circumference
      }`;
  } // Encerra o bloco da condição.


  updateCourseHomeProgress(); // Executa a chamada que produz o resultado de updateCourseHomeProgress.
} // Encerra o bloco da função updateProgress.


/* =========================================================
   DOWNLOADS
========================================================= */

async function renderDownloads() { // Declara a função assíncrona renderDownloads com nenhum parâmetro.
  const list = // Define list como o resultado de $ com o texto “downloads-list”.
    $("downloads-list"); // Executa a chamada que produz o resultado de $ com o texto “downloads-list”.


  if (!list) { // Verifica a negação de list para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if (!materials.length) { // Verifica a negação de materials.length para decidir se executa este bloco.

    /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
     * Linha 1 do trecho: Atualiza list.innerHTML com um texto montado com 0 valores dinâmicos.
     * Linha 2 do trecho: Insere um item da lista com as classes “empty-side”.
     * Linha 3 do trecho: Compõe o trecho de texto “Nenhum material complementar” sem modificá-lo.
     * Linha 4 do trecho: Compõe o trecho de texto “foi cadastrado ainda.” sem modificá-lo.
     * Linha 5 do trecho: Encerra um item da lista.
     * Linha 6 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
     */
    list.innerHTML = `
      <li class="empty-side">
        Nenhum material complementar
        foi cadastrado ainda.
      </li>
    `;


    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza list.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um item da lista com as classes “empty-side”.
   * Linha 3 do trecho: Compõe o trecho de texto “Carregando materiais...” sem modificá-lo.
   * Linha 4 do trecho: Encerra um item da lista.
   * Linha 5 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  list.innerHTML = `
    <li class="empty-side">
      Carregando materiais...
    </li>
  `;


  const renderedMaterials = // Define renderedMaterials como o resultado aguardado de o resultado de Promise.all com uma lista transformada a partir de materials.
    await Promise.all( // Aguarda o resultado de Promise.all com uma lista transformada a partir de materials antes de continuar.
      materials.map( // Executa a chamada que produz uma lista transformada a partir de materials.
        async (material) => { // Define a função assíncrona que recebe material.

          const url = // Define url como o resultado aguardado de o resultado de getStorageUrl com MATERIALS_BUCKET e material.arquivo_path.
            await getStorageUrl( // Aguarda o resultado de getStorageUrl com MATERIALS_BUCKET e material.arquivo_path antes de continuar.
              MATERIALS_BUCKET, // Utiliza o valor de MATERIALS_BUCKET.
              material.arquivo_path // Acessa material.arquivo_path.
            ); // Encerra a chamada de getStorageUrl.


          const lesson = // Define lesson como o primeiro item de lessons que passa na condição.
            lessons.find( // Executa a chamada que produz o primeiro item de lessons que passa na condição.
              (item) => // Define a função que recebe item.
                Number( // Executa a chamada que produz a conversão de item.id em número.
                  item.id // Acessa item.id.
                ) === // Executa a chamada que produz a conversão de item.id em número.
                Number( // Executa a chamada que produz a conversão de material.aula_id em número.
                  material.aula_id // Acessa material.aula_id.
                ) // Encerra a chamada de Number.
            ); // Encerra a chamada de lessons.find.


          return { // Retorna um objeto com material, url, lesson.
            ...material, // Expande material dentro da lista ou do objeto.
            url, // Inclui a propriedade url com o valor da variável de mesmo nome.
            lesson // Inclui a propriedade lesson com o valor da variável de mesmo nome.
          }; // Encerra o objeto.
        } // Encerra o bloco atual.
      ) // Encerra a chamada de materials.map.
    ); // Encerra a chamada de Promise.all.


  list.innerHTML = // Atualiza list.innerHTML com os itens de renderedMaterials.map(…) unidos por o texto “”.
    renderedMaterials // Executa a chamada que produz os itens de renderedMaterials.map(…) unidos por o texto “”.
      .map( // Executa a chamada que produz uma lista transformada a partir de renderedMaterials.
        (material) => { // Define a função que recebe material.

          const name = // Define name como o resultado de escapeHtml com material.nome ou, se indisponível, o texto “Material complementar”.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com material.nome ou, se indisponível, o texto “Material complementar”.
              material.nome || // Acessa material.nome.
              "Material complementar" // Fornece o texto “Material complementar” à expressão atual.
            ); // Encerra a chamada de escapeHtml.


          const type = // Define type como o resultado de escapeHtml com material.tipo ou, se indisponível, o texto “Arquivo”.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com material.tipo ou, se indisponível, o texto “Arquivo”.
              material.tipo || // Acessa material.tipo.
              "Arquivo" // Fornece o texto “Arquivo” à expressão atual.
            ); // Encerra a chamada de escapeHtml.


          const lessonName = // Define lessonName como o resultado de escapeHtml com material.lesson.nome se material.lesson; caso contrário, o texto “”.
            material.lesson // Acessa material.lesson.

              ? escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com material.lesson.nome.
                  material.lesson.nome // Acessa material.lesson.nome.
                ) // Encerra a chamada de escapeHtml.

              : ""; // Fornece o texto “” à expressão atual.


          const meta = // Define meta como um texto montado com 2 valores dinâmicos se lessonName; caso contrário, type.
            lessonName // Utiliza o valor de lessonName.
              ? `${type} • ${lessonName}` // Fornece um texto montado com 2 valores dinâmicos à expressão atual.
              : type; // Utiliza o valor de type.


          const action = // Define action como um texto montado com 2 valores dinâmicos se material.url; caso contrário, um texto montado com 0 valores dinâmicos.
            material.url // Acessa material.url.

              /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
               * Linha 1 do trecho: Fornece um texto montado com 2 valores dinâmicos à expressão atual.
               * Linha 2 do trecho: Insere um link com o texto “<a”.
               * Linha 3 do trecho: Compõe o trecho de texto “class="download-action"” sem modificá-lo.
               * Linha 4 do trecho: Compõe o trecho de texto “href="${escapeHtml(” sem modificá-lo.
               * Linha 5 do trecho: Compõe o trecho de texto “material.url” sem modificá-lo.
               * Linha 6 do trecho: Compõe o trecho de texto “)}"” sem modificá-lo.
               * Linha 7 do trecho: Compõe o trecho de texto “target="_blank"” sem modificá-lo.
               * Linha 8 do trecho: Compõe o trecho de texto “rel="noopener noreferrer"” sem modificá-lo.
               * Linha 9 do trecho: Compõe o trecho de texto “aria-label="Abrir ${name}"” sem modificá-lo.
               * Linha 10 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
               * Linha 11 do trecho: Compõe o trecho de texto “↗” sem modificá-lo.
               * Linha 12 do trecho: Encerra um link.
               * Linha 13 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
               */
              ? `
                <a
                  class="download-action"
                  href="${escapeHtml(
                    material.url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir ${name}"
                >
                  ↗
                </a>
              `

              /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
               * Linha 1 do trecho: Fornece um texto montado com 0 valores dinâmicos à expressão atual.
               * Linha 2 do trecho: Insere um trecho de texto em linha com o texto “<span”.
               * Linha 3 do trecho: Compõe o trecho de texto “class="download-action"” sem modificá-lo.
               * Linha 4 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
               * Linha 5 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
               * Linha 6 do trecho: Compõe o trecho de texto “—” sem modificá-lo.
               * Linha 7 do trecho: Encerra um trecho de texto em linha.
               * Linha 8 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
               */
              : `
                <span
                  class="download-action"
                  aria-hidden="true"
                >
                  —
                </span>
              `;


          /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
           * Linha 1 do trecho: Retorna um texto montado com 3 valores dinâmicos.
           * Linha 2 do trecho: Insere um item da lista com as classes “download-item”.
           * Linha 4 do trecho: Insere um contêiner de layout com as classes “file-icon”.
           * Linha 5 do trecho: Compõe o trecho de texto “↓” sem modificá-lo.
           * Linha 6 do trecho: Encerra um contêiner de layout.
           * Linha 8 do trecho: Insere um contêiner de layout.
           * Linha 10 do trecho: Insere um contêiner de layout com as classes “file-name”.
           * Linha 11 do trecho: Insere no texto o valor calculado por ${name}.
           * Linha 12 do trecho: Encerra um contêiner de layout.
           * Linha 14 do trecho: Insere um contêiner de layout com as classes “file-meta”.
           * Linha 15 do trecho: Insere no texto o valor calculado por ${meta}.
           * Linha 16 do trecho: Encerra um contêiner de layout.
           * Linha 18 do trecho: Encerra um contêiner de layout.
           * Linha 20 do trecho: Insere no texto o valor calculado por ${action}.
           * Linha 22 do trecho: Encerra um item da lista.
           * Linha 23 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           */
          return `
            <li class="download-item">

              <div class="file-icon">
                ↓
              </div>

              <div>

                <div class="file-name">
                  ${name}
                </div>

                <div class="file-meta">
                  ${meta}
                </div>

              </div>

              ${action}

            </li>
          `;
        } // Encerra o bloco atual.
      ) // Encerra a chamada de renderedMaterials.map.
      .join(""); // Executa a chamada que produz os itens de renderedMaterials.map(…) unidos por o texto “”.
} // Encerra o bloco da função renderDownloads.


/* =========================================================
   SIDEBARS
========================================================= */

const lessonsSidebar = // Define lessonsSidebar como o resultado de $ com o texto “lessons-sidebar”.
  $("lessons-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “lessons-sidebar”.


const materialsSidebar = // Define materialsSidebar como o resultado de $ com o texto “materials-sidebar”.
  $("materials-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “materials-sidebar”.


const sidebarOverlay = // Define sidebarOverlay como o resultado de $ com o texto “sidebar-overlay”.
  $("sidebar-overlay"); // Executa a chamada que produz o resultado de $ com o texto “sidebar-overlay”.


const openLessonsButton = // Define openLessonsButton como o resultado de $ com o texto “open-lessons-sidebar”.
  $("open-lessons-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “open-lessons-sidebar”.


const closeLessonsButton = // Define closeLessonsButton como o resultado de $ com o texto “close-lessons-sidebar”.
  $("close-lessons-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “close-lessons-sidebar”.


const openMaterialsButton = // Define openMaterialsButton como o resultado de $ com o texto “open-materials-sidebar”.
  $("open-materials-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “open-materials-sidebar”.


const closeMaterialsButton = // Define closeMaterialsButton como o resultado de $ com o texto “close-materials-sidebar”.
  $("close-materials-sidebar"); // Executa a chamada que produz o resultado de $ com o texto “close-materials-sidebar”.


/* =========================================================
   FECHAR SIDEBARS
========================================================= */

function closeAllSidebars() { // Declara a função closeAllSidebars com nenhum parâmetro.
  lessonsSidebar // Executa a chamada que produz a remoção da classe o texto “is-open” de lessonsSidebar.classList.
    ?.classList // Acessa lessonsSidebar.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “is-open” de lessonsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.classList.remove.


  materialsSidebar // Executa a chamada que produz a remoção da classe o texto “is-open” de materialsSidebar.classList.
    ?.classList // Acessa materialsSidebar.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “is-open” de materialsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.classList.remove.


  sidebarOverlay // Executa a chamada que produz a remoção da classe o texto “is-visible” de sidebarOverlay.classList.
    ?.classList // Acessa sidebarOverlay.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “is-visible” de sidebarOverlay.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.classList.remove.


  document.body // Executa a chamada que produz a remoção da classe o texto “sidebar-open” de document.body.classList.
    .classList // Acessa document.body.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “sidebar-open” de document.body.classList.
      "sidebar-open" // Fornece o texto “sidebar-open” à expressão atual.
    ); // Encerra a chamada de document.body.classList.remove.


  lessonsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.setAttribute.


  materialsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.setAttribute.


  sidebarOverlay // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.setAttribute.


  openLessonsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de openLessonsButton.setAttribute.


  openMaterialsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de openMaterialsButton.setAttribute.
} // Encerra o bloco da função closeAllSidebars.


/* =========================================================
   ABRIR AULAS
========================================================= */

function openLessonsSidebar() { // Declara a função openLessonsSidebar com nenhum parâmetro.
  materialsSidebar // Executa a chamada que produz a remoção da classe o texto “is-open” de materialsSidebar.classList.
    ?.classList // Acessa materialsSidebar.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “is-open” de materialsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.classList.remove.


  materialsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.setAttribute.


  lessonsSidebar // Executa a chamada que produz a inclusão da classe o texto “is-open” em lessonsSidebar.classList.
    ?.classList // Acessa lessonsSidebar.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “is-open” em lessonsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.classList.add.


  sidebarOverlay // Executa a chamada que produz a inclusão da classe o texto “is-visible” em sidebarOverlay.classList.
    ?.classList // Acessa sidebarOverlay.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “is-visible” em sidebarOverlay.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.classList.add.


  document.body // Executa a chamada que produz a inclusão da classe o texto “sidebar-open” em document.body.classList.
    .classList // Acessa document.body.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “sidebar-open” em document.body.classList.
      "sidebar-open" // Fornece o texto “sidebar-open” à expressão atual.
    ); // Encerra a chamada de document.body.classList.add.


  lessonsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.setAttribute.


  sidebarOverlay // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.setAttribute.


  openLessonsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de openLessonsButton.setAttribute.


  openMaterialsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de openMaterialsButton.setAttribute.
} // Encerra o bloco da função openLessonsSidebar.


/* =========================================================
   ABRIR MATERIAIS
========================================================= */

function openMaterialsSidebar() { // Declara a função openMaterialsSidebar com nenhum parâmetro.
  lessonsSidebar // Executa a chamada que produz a remoção da classe o texto “is-open” de lessonsSidebar.classList.
    ?.classList // Acessa lessonsSidebar.classList.
    .remove( // Executa a chamada que produz a remoção da classe o texto “is-open” de lessonsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.classList.remove.


  lessonsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em lessonsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de lessonsSidebar.setAttribute.


  materialsSidebar // Executa a chamada que produz a inclusão da classe o texto “is-open” em materialsSidebar.classList.
    ?.classList // Acessa materialsSidebar.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “is-open” em materialsSidebar.classList.
      "is-open" // Fornece o texto “is-open” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.classList.add.


  sidebarOverlay // Executa a chamada que produz a inclusão da classe o texto “is-visible” em sidebarOverlay.classList.
    ?.classList // Acessa sidebarOverlay.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “is-visible” em sidebarOverlay.classList.
      "is-visible" // Fornece o texto “is-visible” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.classList.add.


  document.body // Executa a chamada que produz a inclusão da classe o texto “sidebar-open” em document.body.classList.
    .classList // Acessa document.body.classList.
    .add( // Executa a chamada que produz a inclusão da classe o texto “sidebar-open” em document.body.classList.
      "sidebar-open" // Fornece o texto “sidebar-open” à expressão atual.
    ); // Encerra a chamada de document.body.classList.add.


  materialsSidebar // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em materialsSidebar.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de materialsSidebar.setAttribute.


  sidebarOverlay // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-hidden” em sidebarOverlay.
      "aria-hidden", // Fornece o texto “aria-hidden” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de sidebarOverlay.setAttribute.


  openLessonsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openLessonsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de openLessonsButton.setAttribute.


  openMaterialsButton // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
    ?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-expanded” em openMaterialsButton.
      "aria-expanded", // Fornece o texto “aria-expanded” à expressão atual.
      "true" // Fornece o texto “true” à expressão atual.
    ); // Encerra a chamada de openMaterialsButton.setAttribute.
} // Encerra o bloco da função openMaterialsSidebar.


/* =========================================================
   EVENTOS DAS SIDEBARS
========================================================= */

openLessonsButton // Executa a chamada que produz o registro do evento o texto “click” em openLessonsButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em openLessonsButton.
    "click", // Fornece o texto “click” à expressão atual.
    openLessonsSidebar // Utiliza o valor de openLessonsSidebar.
  ); // Encerra a chamada de openLessonsButton.addEventListener.


closeLessonsButton // Executa a chamada que produz o registro do evento o texto “click” em closeLessonsButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em closeLessonsButton.
    "click", // Fornece o texto “click” à expressão atual.
    closeAllSidebars // Utiliza o valor de closeAllSidebars.
  ); // Encerra a chamada de closeLessonsButton.addEventListener.


openMaterialsButton // Executa a chamada que produz o registro do evento o texto “click” em openMaterialsButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em openMaterialsButton.
    "click", // Fornece o texto “click” à expressão atual.
    openMaterialsSidebar // Utiliza o valor de openMaterialsSidebar.
  ); // Encerra a chamada de openMaterialsButton.addEventListener.


closeMaterialsButton // Executa a chamada que produz o registro do evento o texto “click” em closeMaterialsButton.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em closeMaterialsButton.
    "click", // Fornece o texto “click” à expressão atual.
    closeAllSidebars // Utiliza o valor de closeAllSidebars.
  ); // Encerra a chamada de closeMaterialsButton.addEventListener.


sidebarOverlay // Executa a chamada que produz o registro do evento o texto “click” em sidebarOverlay.
  ?.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em sidebarOverlay.
    "click", // Fornece o texto “click” à expressão atual.
    closeAllSidebars // Utiliza o valor de closeAllSidebars.
  ); // Encerra a chamada de sidebarOverlay.addEventListener.


/* =========================================================
   FULLSCREEN
========================================================= */

document.addEventListener( // Executa a chamada que produz o registro do evento o texto “fullscreenchange” em document.
  "fullscreenchange", // Fornece o texto “fullscreenchange” à expressão atual.
  () => { // Define a função que recebe nenhum argumento.

    if ( // Verifica a negação de document.fullscreenElement e a negação de usingFullscreenFallback para decidir se executa este bloco.
      !document.fullscreenElement && // Calcula a negação de document.fullscreenElement e a negação de usingFullscreenFallback.
      !usingFullscreenFallback // Compõe a negação de usingFullscreenFallback na operação atual.
    ) { // Verifica a negação de document.fullscreenElement e a negação de usingFullscreenFallback para decidir se executa este bloco.

      document.body.classList.remove( // Executa a chamada que produz a remoção da classe o texto “presentation-mode-active” de document.body.classList.
        "presentation-mode-active" // Fornece o texto “presentation-mode-active” à expressão atual.
      ); // Encerra a chamada de document.body.classList.remove.
    } // Encerra o bloco da condição.


    syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
  } // Encerra o bloco atual.
); // Encerra a chamada de document.addEventListener.


document.addEventListener( // Executa a chamada que produz o registro do evento o texto “webkitfullscreenchange” em document.
  "webkitfullscreenchange", // Fornece o texto “webkitfullscreenchange” à expressão atual.
  () => { // Define a função que recebe nenhum argumento.

    if ( // Verifica a negação de document.webkitFullscreenElement e a negação de usingFullscreenFallback para decidir se executa este bloco.
      !document.webkitFullscreenElement && // Calcula a negação de document.webkitFullscreenElement e a negação de usingFullscreenFallback.
      !usingFullscreenFallback // Compõe a negação de usingFullscreenFallback na operação atual.
    ) { // Verifica a negação de document.webkitFullscreenElement e a negação de usingFullscreenFallback para decidir se executa este bloco.

      document.body.classList.remove( // Executa a chamada que produz a remoção da classe o texto “presentation-mode-active” de document.body.classList.
        "presentation-mode-active" // Fornece o texto “presentation-mode-active” à expressão atual.
      ); // Encerra a chamada de document.body.classList.remove.
    } // Encerra o bloco da condição.


    syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
  } // Encerra o bloco atual.
); // Encerra a chamada de document.addEventListener.


/* =========================================================
   TECLADO
========================================================= */

document.addEventListener( // Executa a chamada que produz o registro do evento o texto “keydown” em document.
  "keydown", // Fornece o texto “keydown” à expressão atual.
  async (event) => { // Define a função assíncrona que recebe event.

    const activeElement = // Define activeElement como document.activeElement.
      document.activeElement; // Acessa document.activeElement.


    const typing = // Define typing como activeElement e activeElement.tagName igual, inclusive no tipo, a INPUT ou, se indisponível, activeElement.tagName igual, inclusive no tipo, a TEXTAREA ou, se indisponível, activeElement.isContentEditable.
      activeElement && // Calcula activeElement e activeElement.tagName igual, inclusive no tipo, a INPUT ou, se indisponível, activeElement.tagName igual, inclusive no tipo, a TEXTAREA ou, se indisponível, activeElement.isContentEditable.
      ( // Calcula activeElement e activeElement.tagName igual, inclusive no tipo, a INPUT ou, se indisponível, activeElement.tagName igual, inclusive no tipo, a TEXTAREA ou, se indisponível, activeElement.isContentEditable.
        activeElement.tagName === // Acessa activeElement.tagName.
          "INPUT" || // Fornece o texto “INPUT” à expressão atual.

        activeElement.tagName === // Acessa activeElement.tagName.
          "TEXTAREA" || // Fornece o texto “TEXTAREA” à expressão atual.

        activeElement.isContentEditable // Acessa activeElement.isContentEditable.
      ); // Encerra a expressão ou função iniciada acima.


    if (typing) { // Verifica typing para decidir se executa este bloco.
      return; // Encerra a função sem retornar um valor.
    } // Encerra o bloco da condição.


    if ( // Verifica o resultado de isPresentationActive para decidir se executa este bloco.
      isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
    ) { // Verifica o resultado de isPresentationActive para decidir se executa este bloco.

      if ( // Verifica event.key igual, inclusive no tipo, a o texto “ArrowRight” para decidir se executa este bloco.
        event.key === // Acessa event.key.
        "ArrowRight" // Fornece o texto “ArrowRight” à expressão atual.
      ) { // Verifica event.key igual, inclusive no tipo, a o texto “ArrowRight” para decidir se executa este bloco.

        event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.

        await goNext(); // Aguarda o resultado de goNext antes de continuar.

        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.


      if ( // Verifica event.key igual, inclusive no tipo, a o texto “ArrowLeft” para decidir se executa este bloco.
        event.key === // Acessa event.key.
        "ArrowLeft" // Fornece o texto “ArrowLeft” à expressão atual.
      ) { // Verifica event.key igual, inclusive no tipo, a o texto “ArrowLeft” para decidir se executa este bloco.

        event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.

        await goPrevious(); // Aguarda o resultado de goPrevious antes de continuar.

        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.


      if ( // Verifica event.key igual, inclusive no tipo, a o texto “Escape” e usingFullscreenFallback para decidir se executa este bloco.
        event.key === // Acessa event.key.
          "Escape" && // Fornece o texto “Escape” à expressão atual.
        usingFullscreenFallback // Utiliza o valor de usingFullscreenFallback.
      ) { // Verifica event.key igual, inclusive no tipo, a o texto “Escape” e usingFullscreenFallback para decidir se executa este bloco.

        event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.

        await exitPresentationMode(); // Aguarda o resultado de exitPresentationMode antes de continuar.

        return; // Encerra a função sem retornar um valor.
      } // Encerra o bloco da condição.
    } // Encerra o bloco da condição.


    if ( // Verifica event.key igual, inclusive no tipo, a o texto “Escape” para decidir se executa este bloco.
      event.key === // Acessa event.key.
      "Escape" // Fornece o texto “Escape” à expressão atual.
    ) { // Verifica event.key igual, inclusive no tipo, a o texto “Escape” para decidir se executa este bloco.

      closeAllSidebars(); // Executa a chamada que produz o resultado de closeAllSidebars.
    } // Encerra o bloco da condição.
  } // Encerra o bloco atual.
); // Encerra a chamada de document.addEventListener.


/* =========================================================
   REDIMENSIONAMENTO
========================================================= */

window.addEventListener( // Executa a chamada que produz o registro do evento o texto “resize” em window.
  "resize", // Fornece o texto “resize” à expressão atual.
  () => { // Define a função que recebe nenhum argumento.

    if ( // Verifica o resultado de isPresentationActive para decidir se executa este bloco.
      isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
    ) { // Verifica o resultado de isPresentationActive para decidir se executa este bloco.

      syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
    } // Encerra o bloco da condição.
  }, // Encerra o bloco atual.
  { // Inicia um objeto com passive.
    passive: true // Define a propriedade passive como true (verdadeiro).
  } // Encerra o objeto.
); // Encerra a chamada de window.addEventListener.


window.addEventListener( // Executa a chamada que produz o registro do evento o texto “orientationchange” em window.
  "orientationchange", // Fornece o texto “orientationchange” à expressão atual.
  () => { // Define a função que recebe nenhum argumento.

    window.setTimeout( // Executa a chamada que produz o agendamento de uma função após 120.
      () => { // Define a função que recebe nenhum argumento.

        if ( // Verifica o resultado de isPresentationActive para decidir se executa este bloco.
          isPresentationActive() // Executa a chamada que produz o resultado de isPresentationActive.
        ) { // Verifica o resultado de isPresentationActive para decidir se executa este bloco.

          syncPresentationUI(); // Executa a chamada que produz o resultado de syncPresentationUI.
        } // Encerra o bloco da condição.
      }, // Encerra o bloco atual.
      120 // Fornece 120 à expressão atual.
    ); // Encerra a chamada de window.setTimeout.
  } // Encerra o bloco atual.
); // Encerra a chamada de window.addEventListener.


/* =========================================================
   ALTERAÇÃO DE AUTENTICAÇÃO
========================================================= */

supabase.auth.onAuthStateChange((event, session) => { // Executa a chamada que produz o acompanhamento das mudanças de autenticação.
  currentUser = session?.user || null; // Atualiza currentUser com session.user com acesso opcional ou, se indisponível, null (ausência de valor).
  if (event === 'SIGNED_OUT') { // Verifica event igual, inclusive no tipo, a o texto “SIGNED_OUT” para decidir se executa este bloco.
    progressByLesson.clear(); // Executa a chamada que produz a limpeza dos itens de progressByLesson.
    updateProgress(); // Executa a chamada que produz o resultado de updateProgress.
    renderLessons(); // Executa a chamada que produz o resultado de renderLessons.
    updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.
    renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.
  if (event === 'SIGNED_IN' && currentUser && lessons.length) { // Verifica event igual, inclusive no tipo, a o texto “SIGNED_IN” e currentUser e lessons.length para decidir se executa este bloco.
    // Carrega o progresso fora do callback de autenticação do Supabase.
    window.setTimeout(async () => { // Executa a chamada que produz o agendamento de uma função após 0.
      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
        await loadProgress(); // Aguarda o resultado de loadProgress antes de continuar.
        updateProgress(); // Executa a chamada que produz o resultado de updateProgress.
        renderLessons(); // Executa a chamada que produz o resultado de renderLessons.
        updateLessonSelection(); // Executa a chamada que produz o resultado de updateLessonSelection.
        renderCourseHome(); // Executa a chamada que produz o resultado de renderCourseHome.
      } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.
        console.error('Erro ao atualizar progresso após login:', error); // Executa a chamada que produz o registro de o texto “Erro ao atualizar progresso após login:” no console.
      } // Encerra o bloco de tratamento do erro.
    }, 0); // Fornece 0 à expressão atual.
  } // Encerra o bloco da condição.
}); // Encerra o bloco atual.

async function init() { // cria a função assíncrona responsável por iniciar toda a página de curso
  try { // inicia o bloco protegido da inicialização para permitir o tratamento de erros

    if (!COURSE_ID) { // verifica se a URL não possui um parâmetro id válido para identificar o curso
      window.location.replace( // substitui a página atual pelo catálogo quando não existe um curso válido
        "index.html" // define a página inicial como destino seguro do redirecionamento
      ); // encerra a chamada responsável pelo redirecionamento

      return; // interrompe a inicialização para impedir consultas ao Supabase sem um ID válido
    } // encerra a validação do identificador recebido pela URL

    const lessonView = // Define lessonView como o resultado de getLessonView.
      getLessonView(); // Executa a chamada que produz o resultado de getLessonView.


    if (lessonView) { // Verifica lessonView para decidir se executa este bloco.

      lessonView.hidden = // Atualiza lessonView.hidden com true (verdadeiro).
        true; // Fornece true (verdadeiro) à expressão atual.
    } // Encerra o bloco da condição.


    ensureCourseHome(); // Executa a chamada que produz o resultado de ensureCourseHome.


    /*
      O estado da entrada atual
      é preparado antes do conteúdo.
    */

    initializeCourseHistory(); // Executa a chamada que produz o resultado de initializeCourseHistory.


    await loadUserSession(); // Aguarda o resultado de loadUserSession antes de continuar.


    await loadSelectedCourse(); // Aguarda o resultado de loadSelectedCourse antes de continuar.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro fatal ao inicializar o curso:” no console.
      "Erro fatal ao inicializar o curso:", // Fornece o texto “Erro fatal ao inicializar o curso:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.
  } // Encerra o bloco de tratamento do erro.
} // Encerra o bloco da função init.


/* =========================================================
   START
========================================================= */

init(); // Executa a chamada que produz o resultado de init.
