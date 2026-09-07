import {
  supabase,
  escapeHtml
} from "./supabaseClient.js";


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const EXCEL_COURSE_ID = 1;

const SLIDES_BUCKET = "slides";
const MATERIALS_BUCKET = "materiais";

const SIGNED_URL_EXPIRES_IN = 60 * 60;
const SLIDE_TRANSITION_MS = 280;

const COURSE_HISTORY_KEY =
  "praxisCourseView";


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   ESTADO
========================================================= */

let currentUser = null;

let course = null;

let modules = [];
let lessons = [];
let slides = [];
let materials = [];
let progressRows = [];


/* =========================================================
   MAPAS
========================================================= */

const slidesByLesson = new Map();
const materialsByLesson = new Map();
const progressByLesson = new Map();


/* =========================================================
   NAVEGAÇÃO
========================================================= */

let currentLessonIndex = 0;
let currentSlideIndex = 0;

let slideRenderVersion = 0;

let currentCourseView =
  "home";

let courseHistoryReady =
  false;


/* =========================================================
   TRANSIÇÃO DOS SLIDES
========================================================= */

let isSlideTransitioning = false;

let activeSlideLayer = 0;
let visibleSlideKey = "";


/* =========================================================
   TELA CHEIA
========================================================= */

let usingFullscreenFallback = false;


/* =========================================================
   CACHE
========================================================= */

const slideUrlCache = new Map();

const preloadedSlideUrls =
  new Set();


/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value) {
  return String(value ?? "").trim();
}


function normalizeNumber(
  value,
  fallback = 0
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}


function isHttpUrl(value) {
  const text =
    normalizeText(value);

  return (
    text.startsWith("https://") ||
    text.startsWith("http://")
  );
}


function wait(ms) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        ms
      );
    }
  );
}


/* =========================================================
   HISTÓRICO INTERNO DO CURSO
========================================================= */

function getCourseHistoryState() {
  return (
    window.history.state?.[
      COURSE_HISTORY_KEY
    ] ||
    null
  );
}


function isExcelHistoryState(
  state
) {
  return (
    state &&
    Number(state.courseId) ===
      EXCEL_COURSE_ID
  );
}


/* =========================================================
   ESTADO HOME
========================================================= */

function createHomeHistoryState() {
  return {
    courseId:
      EXCEL_COURSE_ID,

    view:
      "home"
  };
}


/* =========================================================
   ESTADO AULA
========================================================= */

function createLessonHistoryState(
  lessonIndex,
  slideIndex = 0
) {
  return {
    courseId:
      EXCEL_COURSE_ID,

    view:
      "lesson",

    lessonIndex:
      normalizeNumber(
        lessonIndex,
        0
      ),

    slideIndex:
      normalizeNumber(
        slideIndex,
        0
      )
  };
}


/* =========================================================
   SUBSTITUIR ESTADO
========================================================= */

function replaceCourseHistoryState(
  courseState
) {
  window.history.replaceState(
    {
      ...(window.history.state || {}),

      [COURSE_HISTORY_KEY]:
        courseState
    },
    "",
    window.location.href
  );
}


/* =========================================================
   ADICIONAR ESTADO
========================================================= */

function pushCourseHistoryState(
  courseState
) {
  window.history.pushState(
    {
      ...(window.history.state || {}),

      [COURSE_HISTORY_KEY]:
        courseState
    },
    "",
    window.location.href
  );
}


/* =========================================================
   INICIALIZAR HISTÓRICO
========================================================= */

function initializeCourseHistory() {
  if (
    courseHistoryReady
  ) {
    return;
  }


  const existingState =
    getCourseHistoryState();


  /*
    Se já existe um estado válido
    desta página, preservamos.

    Isso é importante quando o
    navegador usa voltar/avançar.
  */

  if (
    !isExcelHistoryState(
      existingState
    )
  ) {

    replaceCourseHistoryState(
      createHomeHistoryState()
    );
  }


  courseHistoryReady =
    true;
}


/* =========================================================
   ABRIR AULA CRIANDO ETAPA
========================================================= */

async function openLessonFromUser(
  lessonIndex,
  slideIndex = 0
) {
  if (
    lessonIndex < 0 ||
    lessonIndex >= lessons.length
  ) {
    return;
  }


  if (
    !isLessonUnlocked(
      lessonIndex
    )
  ) {
    return;
  }


  const state =
    createLessonHistoryState(
      lessonIndex,
      slideIndex
    );


  /*
    HOME -> AULA

    Criamos uma nova entrada.
    Assim o voltar retorna à home.
  */

  if (
    currentCourseView ===
    "home"
  ) {

    pushCourseHistoryState(
      state
    );

  } else {

    /*
      AULA -> OUTRA AULA

      Não criamos várias entradas
      consecutivas de aula.

      Apenas atualizamos a etapa
      atual para continuar tendo:

      Aula -> Home -> Catálogo.
    */

    replaceCourseHistoryState(
      state
    );
  }


  await selectLesson(
    lessonIndex,
    slideIndex
  );
}


/* =========================================================
   VOLTAR PELO HISTÓRICO
========================================================= */

function goBackInHistory() {
  /*
    Dentro de uma aula existe
    obrigatoriamente a entrada
    anterior da home do curso.
  */

  if (
    currentCourseView ===
    "lesson"
  ) {

    window.history.back();

    return;
  }


  /*
    Na home, se chegamos aqui através
    de outra página do próprio site,
    continuamos o histórico normalmente.
  */

  let hasUsefulReferrer =
    false;


  try {

    if (document.referrer) {

      const referrerUrl =
        new URL(
          document.referrer
        );


      hasUsefulReferrer =
        referrerUrl.origin ===
        window.location.origin;
    }

  } catch (error) {

    console.debug(
      "Não foi possível analisar o referrer:",
      error
    );
  }


  if (
    hasUsefulReferrer &&
    window.history.length > 1
  ) {

    window.history.back();

    return;
  }


  /*
    Página aberta diretamente:
    fallback para o catálogo.
  */

  window.location.href =
    "index.html";
}


/* =========================================================
   CURSO PADRÃO
========================================================= */

function getDefaultCourse() {
  return {
    id: EXCEL_COURSE_ID,

    nome:
      "Excel Prático — Básico ao Avançado",

    descricao:
      "Aprenda Excel do básico ao avançado com aulas práticas, exercícios e projetos aplicados ao dia a dia.",

    categoria:
      "Excel"
  };
}


/* =========================================================
   STORAGE
========================================================= */

async function getStorageUrl(
  bucket,
  path
) {
  const filePath =
    normalizeText(path);


  if (!filePath) {
    return "";
  }


  if (isHttpUrl(filePath)) {
    return filePath;
  }


  try {

    const {
      data,
      error
    } =
      await supabase
        .storage
        .from(bucket)
        .createSignedUrl(
          filePath,
          SIGNED_URL_EXPIRES_IN
        );


    if (error) {
      throw error;
    }


    return (
      data?.signedUrl ||
      ""
    );

  } catch (error) {

    console.error(
      `Erro ao gerar URL do Storage (${bucket}/${filePath}):`,
      error
    );


    return "";
  }
}


/* =========================================================
   URL DO SLIDE
========================================================= */

async function getSlideUrl(slide) {
  if (!slide) {
    return "";
  }


  const path =
    normalizeText(
      slide.imagem_path
    );


  if (!path) {
    return "";
  }


  if (
    slideUrlCache.has(path)
  ) {

    return slideUrlCache.get(
      path
    );
  }


  const url =
    await getStorageUrl(
      SLIDES_BUCKET,
      path
    );


  if (url) {

    slideUrlCache.set(
      path,
      url
    );
  }


  return url;
}


/* =========================================================
   PRÉ-CARREGAR IMAGEM
========================================================= */

function preloadImage(url) {
  if (!url) {

    return Promise.reject(
      new Error(
        "URL do slide vazia."
      )
    );
  }


  if (
    preloadedSlideUrls.has(url)
  ) {

    return Promise.resolve();
  }


  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();


      image.decoding =
        "async";


      image.onload = () => {

        preloadedSlideUrls.add(
          url
        );


        resolve();
      };


      image.onerror = () => {

        reject(
          new Error(
            `Não foi possível carregar ${url}`
          )
        );
      };


      image.src =
        url;
    }
  );
}


/* =========================================================
   VIEW DA AULA
========================================================= */

function getLessonView() {
  return (
    $("lesson-view") ||
    document.querySelector(
      ".lesson-main"
    )
  );
}


/* =========================================================
   CRIAR HOME DO CURSO
========================================================= */

function ensureCourseHome() {
  let home =
    $("course-home");


  if (home) {
    return home;
  }


  const lessonView =
    getLessonView();


  if (!lessonView) {

    console.error(
      "Não foi possível encontrar .lesson-main."
    );

    return null;
  }


  lessonView.id =
    "lesson-view";


  home =
    document.createElement(
      "section"
    );


  home.id =
    "course-home";


  home.className =
    "course-home";


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
          Excel
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


  lessonView.parentNode
    ?.insertBefore(
      home,
      lessonView
    );


  ensureBackToCourseHomeButton();


  return home;
}


/* =========================================================
   VOLTAR À HOME
========================================================= */

function ensureBackToCourseHomeButton() {
  const lessonView =
    getLessonView();


  if (!lessonView) {
    return;
  }


  if (
    lessonView.querySelector(
      "[data-back-course-home]"
    )
  ) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "back-to-course-home";


  button.setAttribute(
    "data-back-course-home",
    ""
  );


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

  button.addEventListener(
    "click",
    goBackInHistory
  );


  lessonView.insertBefore(
    button,
    lessonView.firstChild
  );
}


/* =========================================================
   MOSTRAR HOME
========================================================= */

async function showCourseHome() {
  if (
    isPresentationActive()
  ) {

    await exitPresentationMode();
  }


  closeAllSidebars();


  const home =
    ensureCourseHome();


  const lessonView =
    getLessonView();


  if (!home) {
    return;
  }


  currentCourseView =
    "home";


  home.hidden =
    false;


  home.classList.add(
    "is-visible"
  );


  if (lessonView) {

    lessonView.hidden =
      true;


    lessonView.classList.remove(
      "is-visible"
    );
  }


  renderCourseHome();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MOSTRAR AULA
========================================================= */

function showLessonView() {
  const home =
    ensureCourseHome();


  const lessonView =
    getLessonView();


  currentCourseView =
    "lesson";


  if (home) {

    home.hidden =
      true;


    home.classList.remove(
      "is-visible"
    );
  }


  if (lessonView) {

    lessonView.hidden =
      false;


    lessonView.classList.add(
      "is-visible"
    );
  }
}


/* =========================================================
   CONCLUSÃO
========================================================= */

function isLessonCompleted(
  lesson
) {
  if (!lesson) {
    return false;
  }


  return Boolean(
    progressByLesson.get(
      Number(
        lesson.id
      )
    )?.concluida
  );
}


/* =========================================================
   REGRA 1 — BLOQUEIO SEQUENCIAL
========================================================= */

function isLessonUnlocked(
  lessonIndex
) {
  if (
    lessonIndex < 0 ||
    lessonIndex >= lessons.length
  ) {
    return false;
  }


  if (
    lessonIndex === 0
  ) {
    return true;
  }


  for (
    let index = 0;
    index < lessonIndex;
    index += 1
  ) {

    const previousLesson =
      lessons[index];


    if (
      !isLessonCompleted(
        previousLesson
      )
    ) {

      return false;
    }
  }


  return true;
}


/* =========================================================
   STATUS DO CARD
========================================================= */

function getCourseHomeLessonStatus(
  lesson,
  lessonIndex
) {
  const unlocked =
    isLessonUnlocked(
      lessonIndex
    );


  if (!unlocked) {

    return {
      className:
        "is-locked",

      label:
        "Bloqueado",

      locked:
        true
    };
  }


  if (
    isLessonCompleted(
      lesson
    )
  ) {

    return {
      className:
        "is-completed",

      label:
        "Concluído",

      locked:
        false
    };
  }


  return {
    className:
      "is-available",

    label:
      "Disponível",

    locked:
      false
  };
}


/* =========================================================
   ÍCONE DO CARD
========================================================= */

function getCourseHomeLessonIcon() {
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
}


/* =========================================================
   ÍCONE DE CADEADO
========================================================= */

function getLockIcon(
  size = 18
) {
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
}


/* =========================================================
   ÍCONE CONCLUÍDO
========================================================= */

function getCompletedIcon(
  size = 15
) {
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
}


/* =========================================================
   ÍCONE DISPONÍVEL
========================================================= */

function getAvailableIcon() {
  return `
    <span
      aria-hidden="true"
    >
      •
    </span>
  `;
}


/* =========================================================
   ÍCONE DO STATUS
========================================================= */

function getStatusIcon(
  status
) {
  if (
    status.locked
  ) {

    return getLockIcon(
      15
    );
  }


  if (
    status.className ===
    "is-completed"
  ) {

    return getCompletedIcon(
      15
    );
  }


  return getAvailableIcon();
}


/* =========================================================
   HOME DO CURSO
========================================================= */

function renderCourseHome() {
  const home =
    ensureCourseHome();


  if (!home) {
    return;
  }


  const title =
    $("course-home-title");


  const description =
    $("course-home-description");


  const modulesContainer =
    $("course-home-modules");


  if (title) {

    title.textContent =
      course?.nome ||
      "Excel Prático — Básico ao Avançado";
  }


  if (description) {

    description.textContent =
      course?.descricao ||
      "Escolha uma aula para começar.";
  }


  if (!modulesContainer) {
    return;
  }


  if (!modules.length) {

    modulesContainer.innerHTML = `
      <div
        class="course-home-empty"
      >
        Nenhum módulo publicado
        foi encontrado.
      </div>
    `;


    updateCourseHomeProgress();

    return;
  }


  modulesContainer.innerHTML =
    "";


  modules.forEach(
    (
      module,
      moduleIndex
    ) => {

      const moduleLessons =
        lessons.filter(
          (lesson) =>
            Number(
              lesson.modulo_id
            ) ===
            Number(
              module.id
            )
        );


      const moduleNumber =
        normalizeNumber(
          module.ordem,
          moduleIndex + 1
        );


      const moduleSection =
        document.createElement(
          "section"
        );


      moduleSection.className =
        "course-home-module";


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


      const cardsContainer =
        moduleSection.querySelector(
          ".course-home-lessons"
        );


      if (!cardsContainer) {
        return;
      }


      if (!moduleLessons.length) {

        cardsContainer.innerHTML = `
          <div
            class="course-home-empty"
          >
            Nenhuma aula publicada
            neste módulo.
          </div>
        `;

      } else {

        moduleLessons.forEach(
          (lesson) => {

            const globalIndex =
              lessons.findIndex(
                (item) =>
                  Number(
                    item.id
                  ) ===
                  Number(
                    lesson.id
                  )
              );


            if (
              globalIndex < 0
            ) {
              return;
            }


            const lessonNumber =
              getLessonNumber(
                lesson
              );


            const lessonName =
              lesson.nome ||
              `Aula ${lessonNumber}`;


            const lessonSlides =
              getLessonSlides(
                lesson
              );


            const status =
              getCourseHomeLessonStatus(
                lesson,
                globalIndex
              );


            const card =
              document.createElement(
                "button"
              );


            card.type =
              "button";


            card.className =
              `course-home-lesson-card ${status.className}`;


            card.dataset.lessonIndex =
              String(
                globalIndex
              );


            card.dataset.lessonId =
              String(
                lesson.id
              );


            if (
              status.locked
            ) {

              card.disabled =
                true;


              card.setAttribute(
                "aria-disabled",
                "true"
              );


              card.setAttribute(
                "aria-label",
                `Aula ${lessonNumber} ${lessonName} bloqueada. Conclua as aulas anteriores primeiro.`
              );

            } else {

              card.disabled =
                false;


              card.removeAttribute(
                "aria-disabled"
              );


              card.setAttribute(
                "aria-label",
                `Abrir aula ${lessonNumber} ${lessonName}`
              );
            }


            let slidesText =
              "Sem slides";


            if (
              lessonSlides.length === 1
            ) {

              slidesText =
                "1 slide";

            } else if (
              lessonSlides.length > 1
            ) {

              slidesText =
                `${lessonSlides.length} slides`;
            }


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


            if (
              !status.locked
            ) {

              card.addEventListener(
                "click",
                async () => {

                  if (
                    isSlideTransitioning
                  ) {
                    return;
                  }


                  await openLessonFromUser(
                    globalIndex,
                    0
                  );
                }
              );
            }


            cardsContainer.appendChild(
              card
            );
          }
        );
      }


      modulesContainer.appendChild(
        moduleSection
      );
    }
  );


  updateCourseHomeProgress();
}


/* =========================================================
   PROGRESSO DA HOME
========================================================= */

function updateCourseHomeProgress() {
  const total =
    lessons.length;


  const completed =
    lessons.filter(
      (lesson) =>
        isLessonCompleted(
          lesson
        )
    ).length;


  const percentage =
    total

      ? Math.round(
          (
            completed /
            total
          ) *
          100
        )

      : 0;


  const text =
    $("course-home-progress-text");


  const fill =
    $("course-home-progress-fill");


  if (text) {

    text.textContent =
      `${percentage}%`;
  }


  if (fill) {

    fill.style.width =
      `${percentage}%`;
  }
}


/* =========================================================
   FULLSCREEN — HELPERS
========================================================= */

function getPresentationStage() {
  return $("slide-stage");
}


function getNativeFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    null
  );
}


function isPresentationActive() {
  const stage =
    getPresentationStage();


  if (!stage) {
    return false;
  }


  const fullscreenElement =
    getNativeFullscreenElement();


  return (
    fullscreenElement === stage ||
    usingFullscreenFallback ||
    stage.classList.contains(
      "is-presentation-fallback"
    )
  );
}


/* =========================================================
   FULLSCREEN NATIVO
========================================================= */

async function requestNativeFullscreen(
  element
) {
  if (!element) {
    return false;
  }


  try {

    if (
      typeof element.requestFullscreen ===
      "function"
    ) {

      await element.requestFullscreen();

      return true;
    }


    if (
      typeof element.webkitRequestFullscreen ===
      "function"
    ) {

      element.webkitRequestFullscreen();

      return true;
    }

  } catch (error) {

    console.warn(
      "Fullscreen nativo não disponível. Usando fallback.",
      error
    );
  }


  return false;
}


/* =========================================================
   SAIR DO FULLSCREEN
========================================================= */

async function exitNativeFullscreen() {
  try {

    if (
      typeof document.exitFullscreen ===
      "function"
    ) {

      await document.exitFullscreen();

      return;
    }


    if (
      typeof document.webkitExitFullscreen ===
      "function"
    ) {

      document.webkitExitFullscreen();
    }

  } catch (error) {

    console.warn(
      "Não foi possível sair do fullscreen nativo:",
      error
    );
  }
}


/* =========================================================
   FALLBACK FULLSCREEN
========================================================= */

function activateFullscreenFallback() {
  const stage =
    getPresentationStage();


  if (!stage) {
    return;
  }


  usingFullscreenFallback =
    true;


  stage.classList.add(
    "is-presentation-fallback"
  );


  document.body.classList.add(
    "presentation-mode-active"
  );


  syncPresentationUI();
}


function deactivateFullscreenFallback() {
  const stage =
    getPresentationStage();


  usingFullscreenFallback =
    false;


  stage?.classList.remove(
    "is-presentation-fallback"
  );


  document.body.classList.remove(
    "presentation-mode-active"
  );


  syncPresentationUI();
}


/* =========================================================
   ENTRAR NA APRESENTAÇÃO
========================================================= */

async function enterPresentationMode() {
  const stage =
    getPresentationStage();


  if (
    !stage ||
    isPresentationActive()
  ) {
    return;
  }


  closeAllSidebars();


  stage.classList.add(
    "presentation-entering"
  );


  const nativeWorked =
    await requestNativeFullscreen(
      stage
    );


  if (!nativeWorked) {

    activateFullscreenFallback();
  }


  stage.classList.remove(
    "presentation-entering"
  );


  syncPresentationUI();
}


/* =========================================================
   SAIR DA APRESENTAÇÃO
========================================================= */

async function exitPresentationMode() {
  if (
    usingFullscreenFallback
  ) {

    deactivateFullscreenFallback();

    return;
  }


  if (
    getNativeFullscreenElement()
  ) {

    await exitNativeFullscreen();
  }


  syncPresentationUI();
}


/* =========================================================
   ALTERNAR APRESENTAÇÃO
========================================================= */

async function togglePresentationMode() {
  if (
    isPresentationActive()
  ) {

    await exitPresentationMode();

  } else {

    await enterPresentationMode();
  }
}


/* =========================================================
   UI DA APRESENTAÇÃO
========================================================= */

function syncPresentationUI() {
  const stage =
    getPresentationStage();


  if (!stage) {
    return;
  }


  const active =
    isPresentationActive();


  stage.classList.toggle(
    "is-presentation",
    active
  );


  const toggleButton =
    stage.querySelector(
      "[data-presentation-toggle]"
    );


  if (toggleButton) {

    toggleButton.setAttribute(
      "aria-label",
      active
        ? "Sair da tela cheia"
        : "Abrir em tela cheia"
    );


    toggleButton.setAttribute(
      "title",
      active
        ? "Sair da tela cheia"
        : "Tela cheia"
    );


    const label =
      toggleButton.querySelector(
        ".presentation-toggle-label"
      );


    if (label) {

      label.textContent =
        active
          ? "Sair"
          : "Tela cheia";
    }
  }


  const controls =
    stage.querySelector(
      ".presentation-controls"
    );


  if (controls) {

    controls.classList.toggle(
      "is-visible",
      active
    );
  }


  updatePresentationNavigation();
}


/* =========================================================
   CONTROLES DA APRESENTAÇÃO
========================================================= */

function bindPresentationControls(
  stage
) {
  if (!stage) {
    return;
  }


  const toggle =
    stage.querySelector(
      "[data-presentation-toggle]"
    );


  const previous =
    stage.querySelector(
      "[data-presentation-previous]"
    );


  const next =
    stage.querySelector(
      "[data-presentation-next]"
    );


  toggle?.addEventListener(
    "click",
    async (event) => {

      event.stopPropagation();

      await togglePresentationMode();
    }
  );


  previous?.addEventListener(
    "click",
    async (event) => {

      event.stopPropagation();

      await goPrevious();
    }
  );


  next?.addEventListener(
    "click",
    async (event) => {

      event.stopPropagation();

      await goNext();
    }
  );


  syncPresentationUI();
}


/* =========================================================
   VIEWER
========================================================= */

function ensureSlideViewer() {
  const currentLesson =
    $("current-lesson");


  if (!currentLesson) {
    return null;
  }


  let viewer =
    currentLesson.querySelector(
      ".slide-viewer"
    );


  if (
    viewer &&
    viewer.querySelector(
      ".slide-layer-a"
    ) &&
    viewer.querySelector(
      ".slide-layer-b"
    )
  ) {

    syncPresentationUI();

    return viewer;
  }


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


  viewer =
    currentLesson.querySelector(
      ".slide-viewer"
    );


  const stage =
    getPresentationStage();


  if (
    !viewer ||
    !stage
  ) {
    return null;
  }


  viewer.style.position =
    "relative";


  viewer.style.overflow =
    "hidden";


  const images =
    viewer.querySelectorAll(
      ".slide-layer"
    );


  images.forEach(
    (
      image,
      index
    ) => {

      image.style.position =
        "absolute";


      image.style.inset =
        "0";


      image.style.width =
        "100%";


      image.style.height =
        "100%";


      image.style.objectFit =
        "contain";


      image.style.objectPosition =
        "center";


      image.style.background =
        "transparent";


      image.style.transition =
        `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


      image.style.animation =
        "none";


      image.style.willChange =
        "opacity, transform";


      image.style.opacity =
        index === 0
          ? "1"
          : "0";


      image.style.transform =
        "scale(1)";
    }
  );


  activeSlideLayer =
    0;


  visibleSlideKey =
    "";


  bindPresentationControls(
    stage
  );


  return viewer;
}


/* =========================================================
   CAMADAS
========================================================= */

function getSlideLayers(viewer) {
  if (!viewer) {
    return null;
  }


  const layerA =
    viewer.querySelector(
      ".slide-layer-a"
    );


  const layerB =
    viewer.querySelector(
      ".slide-layer-b"
    );


  if (
    !layerA ||
    !layerB
  ) {
    return null;
  }


  return {
    layerA,
    layerB
  };
}


/* =========================================================
   PRIMEIRO SLIDE
========================================================= */

function showInitialSlide(
  viewer,
  url,
  alt
) {
  const layers =
    getSlideLayers(viewer);


  if (!layers) {
    return;
  }


  const {
    layerA,
    layerB
  } = layers;


  layerA.style.transition =
    "none";


  layerB.style.transition =
    "none";


  layerA.src =
    url;


  layerA.alt =
    alt;


  layerA.style.opacity =
    "1";


  layerA.style.transform =
    "scale(1)";


  layerB.style.opacity =
    "0";


  layerB.removeAttribute(
    "src"
  );


  void layerA.offsetWidth;


  layerA.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


  layerB.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


  activeSlideLayer =
    0;
}


/* =========================================================
   CROSSFADE
========================================================= */

async function crossfadeSlide(
  viewer,
  url,
  alt
) {
  const layers =
    getSlideLayers(viewer);


  if (!layers) {
    return;
  }


  const {
    layerA,
    layerB
  } = layers;


  const currentImage =
    activeSlideLayer === 0
      ? layerA
      : layerB;


  const incomingImage =
    activeSlideLayer === 0
      ? layerB
      : layerA;


  incomingImage.style.transition =
    "none";


  incomingImage.style.opacity =
    "0";


  incomingImage.style.transform =
    "scale(1.008)";


  incomingImage.src =
    url;


  incomingImage.alt =
    alt;


  void incomingImage.offsetWidth;


  incomingImage.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


  currentImage.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


  incomingImage.style.opacity =
    "1";


  incomingImage.style.transform =
    "scale(1)";


  currentImage.style.opacity =
    "0";


  currentImage.style.transform =
    "scale(0.992)";


  await wait(
    SLIDE_TRANSITION_MS + 30
  );


  currentImage.style.transform =
    "scale(1)";


  activeSlideLayer =
    activeSlideLayer === 0
      ? 1
      : 0;
}


/* =========================================================
   PRÉ-CARREGAR SLIDE
========================================================= */

async function preloadSlideAt(
  lessonIndex,
  slideIndex
) {
  if (
    !isLessonUnlocked(
      lessonIndex
    )
  ) {
    return;
  }


  const lesson =
    lessons[
      lessonIndex
    ];


  if (!lesson) {
    return;
  }


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  const slide =
    lessonSlides[
      slideIndex
    ];


  if (!slide) {
    return;
  }


  try {

    const url =
      await getSlideUrl(
        slide
      );


    if (url) {

      await preloadImage(
        url
      );
    }

  } catch (error) {

    console.debug(
      "Pré-carregamento ignorado:",
      error
    );
  }
}


function preloadNearbySlides() {
  preloadSlideAt(
    currentLessonIndex,
    currentSlideIndex + 1
  );


  preloadSlideAt(
    currentLessonIndex,
    currentSlideIndex - 1
  );


  const nextLessonIndex =
    currentLessonIndex + 1;


  if (
    nextLessonIndex <
      lessons.length &&
    isLessonUnlocked(
      nextLessonIndex
    )
  ) {

    preloadSlideAt(
      nextLessonIndex,
      0
    );
  }
}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function loadUserSession() {
  const userArea =
    $("user-area");


  try {

    const {
      data: {
        session
      },
      error
    } =
      await supabase
        .auth
        .getSession();


    if (error) {
      throw error;
    }


    currentUser =
      session?.user ||
      null;


    console.log(
      "Sessão atual:",
      session
    );


    if (userArea) {

      if (currentUser) {

        renderUser(
          userArea,
          currentUser
        );

      } else {

        renderGuest(
          userArea
        );
      }
    }


    return currentUser;

  } catch (error) {

    console.error(
      "Erro ao carregar sessão:",
      error
    );


    currentUser =
      null;


    if (userArea) {

      renderGuest(
        userArea
      );
    }


    return null;
  }
}


/* =========================================================
   VISITANTE
========================================================= */

function renderGuest(userArea) {
  if (!userArea) {
    return;
  }


  userArea.innerHTML = `
    <a
      href="login.html"
      class="btn btn-ghost"
    >

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        />

        <circle
          cx="12"
          cy="7"
          r="4"
        />
      </svg>

      Entrar

    </a>
  `;
}


/* =========================================================
   USUÁRIO
========================================================= */

function renderUser(
  userArea,
  user
) {
  if (
    !userArea ||
    !user
  ) {
    return;
  }


  const email =
    escapeHtml(
      user.email ||
      ""
    );


  const avatarUrl =
    user.user_metadata
      ?.avatar_url ||
    user.user_metadata
      ?.picture ||
    "";


  const name =
    user.user_metadata
      ?.full_name ||
    user.user_metadata
      ?.name ||
    user.email ||
    "U";


  const initial =
    escapeHtml(
      String(name)
        .trim()
        .charAt(0)
        .toUpperCase()
    );


  const avatar =
    avatarUrl

      ? `
        <img
          src="${escapeHtml(
            avatarUrl
          )}"
          alt="Foto do usuário"
          class="user-avatar"
          referrerpolicy="no-referrer"
        >
      `

      : `
        <div
          class="user-avatar-placeholder"
          aria-hidden="true"
        >
          ${initial}
        </div>
      `;


  userArea.innerHTML = `
    <div class="user-info">

      ${avatar}

      <span
        class="user-email"
        title="${email}"
      >
        ${email}
      </span>

      <button
        type="button"
        id="logout-btn"
        class="btn btn-ghost"
      >
        Sair
      </button>

    </div>
  `;


  $("logout-btn")
    ?.addEventListener(
      "click",
      logout
    );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  const button =
    $("logout-btn");


  try {

    if (button) {

      button.disabled =
        true;


      button.textContent =
        "Saindo...";
    }


    const {
      error
    } =
      await supabase
        .auth
        .signOut();


    if (error) {
      throw error;
    }


    window.location.href =
      "login.html";

  } catch (error) {

    console.error(
      "Erro ao sair:",
      error
    );


    if (button) {

      button.disabled =
        false;


      button.textContent =
        "Sair";
    }


    alert(
      "Não foi possível sair da conta."
    );
  }
}


/* =========================================================
   LIMPAR MAPAS
========================================================= */

function clearDataMaps() {
  slidesByLesson.clear();

  materialsByLesson.clear();

  progressByLesson.clear();

  slideUrlCache.clear();

  preloadedSlideUrls.clear();

  visibleSlideKey =
    "";

  activeSlideLayer =
    0;
}


/* =========================================================
   CARREGAR CURSO
========================================================= */

async function loadCourse() {
  const {
    data,
    error
  } =
    await supabase
      .from("catalogo")
      .select(`
        id,
        nome,
        descricao,
        categoria,
        imagem_capa_url,
        status
      `)
      .eq(
        "id",
        EXCEL_COURSE_ID
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  course =
    data ||
    getDefaultCourse();
}


/* =========================================================
   CARREGAR MÓDULOS
========================================================= */

async function loadModules() {
  const {
    data,
    error
  } =
    await supabase
      .from("modulos")
      .select(`
        id,
        curso_id,
        nome,
        descricao,
        ordem,
        status
      `)
      .eq(
        "curso_id",
        EXCEL_COURSE_ID
      )
      .eq(
        "status",
        "publicado"
      )
      .order(
        "ordem",
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  modules =
    Array.isArray(data)
      ? data
      : [];
}


/* =========================================================
   CARREGAR AULAS
========================================================= */

async function loadLessons() {
  if (!modules.length) {

    lessons = [];

    return;
  }


  const moduleIds =
    modules.map(
      (module) =>
        module.id
    );


  const {
    data,
    error
  } =
    await supabase
      .from("aulas")
      .select(`
        id,
        modulo_id,
        nome,
        descricao,
        ordem,
        status
      `)
      .in(
        "modulo_id",
        moduleIds
      )
      .eq(
        "status",
        "publicado"
      )
      .order(
        "ordem",
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  const rawLessons =
    Array.isArray(data)
      ? data
      : [];


  lessons =
    rawLessons
      .map(
        (lesson) => {

          const module =
            modules.find(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  lesson.modulo_id
                )
            );


          return {
            ...lesson,

            module:
              module ||
              null
          };
        }
      )
      .sort(
        (
          a,
          b
        ) => {

          const moduleA =
            normalizeNumber(
              a.module?.ordem
            );


          const moduleB =
            normalizeNumber(
              b.module?.ordem
            );


          if (
            moduleA !==
            moduleB
          ) {

            return (
              moduleA -
              moduleB
            );
          }


          return (
            normalizeNumber(
              a.ordem
            ) -
            normalizeNumber(
              b.ordem
            )
          );
        }
      );
}


/* =========================================================
   CARREGAR SLIDES
========================================================= */

async function loadSlides() {
  slidesByLesson.clear();


  if (!lessons.length) {

    slides = [];

    return;
  }


  const lessonIds =
    lessons.map(
      (lesson) =>
        lesson.id
    );


  const {
    data,
    error
  } =
    await supabase
      .from("slides")
      .select(`
        id,
        aula_id,
        titulo,
        imagem_path,
        ordem,
        status
      `)
      .in(
        "aula_id",
        lessonIds
      )
      .eq(
        "status",
        "publicado"
      )
      .order(
        "ordem",
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  slides =
    Array.isArray(data)
      ? data
      : [];


  slides.forEach(
    (slide) => {

      const lessonId =
        Number(
          slide.aula_id
        );


      if (
        !slidesByLesson.has(
          lessonId
        )
      ) {

        slidesByLesson.set(
          lessonId,
          []
        );
      }


      slidesByLesson
        .get(lessonId)
        .push(
          slide
        );
    }
  );


  slidesByLesson.forEach(
    (lessonSlides) => {

      lessonSlides.sort(
        (
          a,
          b
        ) =>
          normalizeNumber(
            a.ordem
          ) -
          normalizeNumber(
            b.ordem
          )
      );
    }
  );
}


/* =========================================================
   CARREGAR MATERIAIS
========================================================= */

async function loadMaterials() {
  materialsByLesson.clear();


  if (!lessons.length) {

    materials = [];

    return;
  }


  const lessonIds =
    lessons.map(
      (lesson) =>
        lesson.id
    );


  const {
    data,
    error
  } =
    await supabase
      .from("materiais")
      .select(`
        id,
        aula_id,
        nome,
        arquivo_path,
        tipo,
        ordem,
        status
      `)
      .in(
        "aula_id",
        lessonIds
      )
      .eq(
        "status",
        "publicado"
      )
      .order(
        "ordem",
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  materials =
    Array.isArray(data)
      ? data
      : [];


  materials.forEach(
    (material) => {

      const lessonId =
        Number(
          material.aula_id
        );


      if (
        !materialsByLesson.has(
          lessonId
        )
      ) {

        materialsByLesson.set(
          lessonId,
          []
        );
      }


      materialsByLesson
        .get(lessonId)
        .push(
          material
        );
    }
  );
}


/* =========================================================
   CARREGAR PROGRESSO
========================================================= */

async function loadProgress() {
  progressByLesson.clear();

  progressRows = [];


  if (
    !currentUser ||
    !lessons.length
  ) {
    return;
  }


  const lessonIds =
    lessons.map(
      (lesson) =>
        lesson.id
    );


  const {
    data,
    error
  } =
    await supabase
      .from(
        "progresso_aulas"
      )
      .select(`
        id,
        user_id,
        aula_id,
        concluida,
        concluida_em
      `)
      .eq(
        "user_id",
        currentUser.id
      )
      .in(
        "aula_id",
        lessonIds
      );


  if (error) {
    throw error;
  }


  progressRows =
    Array.isArray(data)
      ? data
      : [];


  progressRows.forEach(
    (row) => {

      progressByLesson.set(
        Number(
          row.aula_id
        ),
        row
      );
    }
  );
}


/* =========================================================
   CARREGAR EXCEL
========================================================= */

async function loadExcelCourse() {
  try {

    clearDataMaps();


    await loadCourse();

    await loadModules();

    await loadLessons();


    await Promise.all([
      loadSlides(),
      loadMaterials(),
      loadProgress()
    ]);


    renderCourseHeader();

    renderLessons();

    await renderDownloads();


    ensureCourseHome();

    renderCourseHome();

    updateProgress();


    initializeCourseHistory();


    const historyState =
      getCourseHistoryState();


    /*
      Se a página foi restaurada pelo
      navegador em estado de aula,
      reabrimos essa aula.
    */

    if (
      isExcelHistoryState(
        historyState
      ) &&
      historyState.view ===
        "lesson"
    ) {

      const lessonIndex =
        normalizeNumber(
          historyState.lessonIndex,
          0
        );


      const slideIndex =
        normalizeNumber(
          historyState.slideIndex,
          0
        );


      if (
        isLessonUnlocked(
          lessonIndex
        )
      ) {

        await selectLesson(
          lessonIndex,
          slideIndex
        );

        return;
      }
    }


    /*
      Estado padrão:
      home dos módulos.
    */

    replaceCourseHistoryState(
      createHomeHistoryState()
    );


    await showCourseHome();


  } catch (error) {

    console.error(
      "Erro ao carregar curso:",
      error
    );


    course =
      course ||
      getDefaultCourse();


    modules = [];
    lessons = [];
    slides = [];
    materials = [];
    progressRows = [];


    clearDataMaps();


    renderCourseHeader();

    renderNoLessons();

    await renderDownloads();

    updateProgress();

    ensureCourseHome();

    renderCourseHome();


    initializeCourseHistory();


    replaceCourseHistoryState(
      createHomeHistoryState()
    );


    await showCourseHome();
  }
}


/* =========================================================
   CABEÇALHO
========================================================= */

function renderCourseHeader() {
  const courseName =
    course?.nome ||
    "Excel Prático — Básico ao Avançado";


  const breadcrumb =
    $("breadcrumb-course");


  if (breadcrumb) {

    breadcrumb.textContent =
      courseName;
  }


  document.title =
    `${courseName} — Praxis`;
}


/* =========================================================
   NUMERAÇÃO
========================================================= */

function getLessonNumber(
  lesson
) {
  const moduleOrder =
    normalizeNumber(
      lesson?.module?.ordem,
      1
    );


  const lessonOrder =
    normalizeNumber(
      lesson?.ordem,
      1
    );


  return (
    `${moduleOrder}.${lessonOrder}`
  );
}


/* =========================================================
   SLIDES DA AULA
========================================================= */

function getLessonSlides(
  lesson
) {
  if (!lesson) {
    return [];
  }


  return (
    slidesByLesson.get(
      Number(
        lesson.id
      )
    ) ||
    []
  );
}


/* =========================================================
   MATERIAIS DA AULA
========================================================= */

function getLessonMaterials(
  lesson
) {
  if (!lesson) {
    return [];
  }


  return (
    materialsByLesson.get(
      Number(
        lesson.id
      )
    ) ||
    []
  );
}


/* =========================================================
   SIDEBAR DE AULAS
========================================================= */

function renderLessons() {
  const container =
    $("lessons-container");


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (!modules.length) {

    renderNoLessons();

    return;
  }


  modules.forEach(
    (
      module,
      moduleIndex
    ) => {

      const moduleLessons =
        lessons.filter(
          (lesson) =>
            Number(
              lesson.modulo_id
            ) ===
            Number(
              module.id
            )
        );


      const moduleBlock =
        document.createElement(
          "div"
        );


      moduleBlock.className =
        "module-block";


      const moduleNumber =
        normalizeNumber(
          module.ordem,
          moduleIndex + 1
        );


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


      const list =
        moduleBlock.querySelector(
          ".lesson-list"
        );


      moduleLessons.forEach(
        (lesson) => {

          const globalIndex =
            lessons.findIndex(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  lesson.id
                )
            );


          if (
            globalIndex < 0
          ) {
            return;
          }


          const lessonSlides =
            getLessonSlides(
              lesson
            );


          const completed =
            isLessonCompleted(
              lesson
            );


          const unlocked =
            isLessonUnlocked(
              globalIndex
            );


          const li =
            document.createElement(
              "li"
            );


          li.className =
            "lesson";


          li.dataset.lessonIndex =
            String(
              globalIndex
            );


          li.dataset.lessonId =
            String(
              lesson.id
            );


          li.classList.toggle(
            "is-locked",
            !unlocked
          );


          li.setAttribute(
            "aria-disabled",
            unlocked
              ? "false"
              : "true"
          );


          const lessonNumber =
            getLessonNumber(
              lesson
            );


          const rawLessonName =
            lesson.nome ||
            `Aula ${lessonNumber}`;


          const lessonName =
            escapeHtml(
              rawLessonName
            );


          const slidesLabel =
            lessonSlides.length

              ? (
                lessonSlides.length === 1
                  ? "1 slide"
                  : `${lessonSlides.length} slides`
              )

              : "—";


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


          if (
            unlocked
          ) {

            li.addEventListener(
              "click",
              async () => {

                if (
                  isSlideTransitioning
                ) {
                  return;
                }


                await openLessonFromUser(
                  globalIndex,
                  0
                );


                closeAllSidebars();
              }
            );
          }


          list?.appendChild(
            li
          );
        }
      );


      container.appendChild(
        moduleBlock
      );
    }
  );


  updateLessonSelection();
}


/* =========================================================
   SELECIONAR AULA
========================================================= */

async function selectLesson(
  lessonIndex,
  slideIndex = 0
) {
  if (
    lessonIndex < 0 ||
    lessonIndex >=
      lessons.length
  ) {
    return;
  }


  if (
    !isLessonUnlocked(
      lessonIndex
    )
  ) {

    console.warn(
      "Aula bloqueada. Conclua as aulas anteriores primeiro."
    );

    return;
  }


  if (
    isSlideTransitioning
  ) {
    return;
  }


  showLessonView();


  currentLessonIndex =
    lessonIndex;


  const lesson =
    lessons[
      currentLessonIndex
    ];


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  if (!lessonSlides.length) {

    currentSlideIndex =
      0;

  } else {

    currentSlideIndex =
      Math.max(
        0,
        Math.min(
          slideIndex,
          lessonSlides.length - 1
        )
      );
  }


  visibleSlideKey =
    "";


  updateLessonSelection();


  await renderCurrentLesson();


  updateNavigation();

  updateProgress();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SELEÇÃO VISUAL
========================================================= */

function updateLessonSelection() {
  document
    .querySelectorAll(
      ".lesson"
    )
    .forEach(
      (item) => {

        const index =
          Number(
            item.dataset
              .lessonIndex
          );


        const lesson =
          lessons[
            index
          ];


        if (!lesson) {
          return;
        }


        const unlocked =
          isLessonUnlocked(
            index
          );


        const isCurrent =
          unlocked &&
          index ===
            currentLessonIndex;


        const isDone =
          isLessonCompleted(
            lesson
          );


        item.classList.toggle(
          "active",
          isCurrent
        );


        item.classList.toggle(
          "done",
          isDone
        );


        item.classList.toggle(
          "is-locked",
          !unlocked
        );


        item.setAttribute(
          "aria-disabled",
          unlocked
            ? "false"
            : "true"
        );


        const status =
          item.querySelector(
            ".lesson-status"
          );


        const playButton =
          item.querySelector(
            ".lesson-play"
          );


        const duration =
          item.querySelector(
            ".lesson-duration"
          );


        if (status) {

          if (!unlocked) {

            status.innerHTML =
              getLockIcon(
                12
              );

          } else if (isDone) {

            status.innerHTML =
              getCompletedIcon(
                10
              );

          } else {

            status.innerHTML =
              "";
          }
        }


        if (playButton) {

          playButton.disabled =
            !unlocked;


          if (!unlocked) {

            playButton.innerHTML =
              getLockIcon(
                11
              );

          } else {

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
          }
        }


        if (duration) {

          const lessonSlides =
            getLessonSlides(
              lesson
            );


          if (!unlocked) {

            duration.textContent =
              "Bloqueado";

          } else if (
            lessonSlides.length === 1
          ) {

            duration.textContent =
              "1 slide";

          } else if (
            lessonSlides.length > 1
          ) {

            duration.textContent =
              `${lessonSlides.length} slides`;

          } else {

            duration.textContent =
              "—";
          }
        }
      }
    );
}


/* =========================================================
   RENDERIZAR AULA
========================================================= */

async function renderCurrentLesson() {
  const lesson =
    lessons[
      currentLessonIndex
    ];


  if (!lesson) {
    return false;
  }


  if (
    !isLessonUnlocked(
      currentLessonIndex
    )
  ) {

    return false;
  }


  const title =
    $("lesson-title");


  const description =
    $("lesson-description");


  const currentLesson =
    $("current-lesson");


  if (!currentLesson) {
    return false;
  }


  const lessonNumber =
    getLessonNumber(
      lesson
    );


  const lessonName =
    lesson.nome ||
    `Aula ${lessonNumber}`;


  if (title) {

    title.textContent =
      `${lessonNumber} ${lessonName}`;
  }


  if (description) {

    description.textContent =
      lesson.descricao ||
      lesson.module?.descricao ||
      course?.descricao ||
      "Conteúdo prático do curso de Excel.";
  }


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  if (!lessonSlides.length) {

    visibleSlideKey =
      "";


    currentLesson.innerHTML =
      getSlidePlaceholder();


    renderSlideCounter(
      0,
      0
    );


    return true;
  }


  const slide =
    lessonSlides[
      currentSlideIndex
    ];


  if (!slide) {
    return false;
  }


  const slideKey =
    `${lesson.id}:${slide.id}`;


  if (
    visibleSlideKey ===
    slideKey
  ) {

    renderSlideCounter(
      currentSlideIndex + 1,
      lessonSlides.length
    );


    syncPresentationUI();


    return true;
  }


  const renderVersion =
    ++slideRenderVersion;


  isSlideTransitioning =
    true;


  updateNavigation();


  try {

    const slideUrl =
      await getSlideUrl(
        slide
      );


    if (
      renderVersion !==
      slideRenderVersion
    ) {
      return false;
    }


    if (!slideUrl) {

      throw new Error(
        "URL do slide não encontrada."
      );
    }


    await preloadImage(
      slideUrl
    );


    if (
      renderVersion !==
      slideRenderVersion
    ) {
      return false;
    }


    const slideTitle =
      normalizeText(
        slide.titulo
      );


    const alt =
      slideTitle ||
      `Slide ${
        currentSlideIndex + 1
      } da aula ${lessonName}`;


    const viewer =
      ensureSlideViewer();


    if (!viewer) {

      throw new Error(
        "Viewer não encontrado."
      );
    }


    if (!visibleSlideKey) {

      showInitialSlide(
        viewer,
        slideUrl,
        alt
      );

    } else {

      await crossfadeSlide(
        viewer,
        slideUrl,
        alt
      );
    }


    visibleSlideKey =
      slideKey;


    renderSlideCounter(
      currentSlideIndex + 1,
      lessonSlides.length
    );


    preloadNearbySlides();


    syncPresentationUI();


    return true;

  } catch (error) {

    console.error(
      "Erro ao carregar slide:",
      error
    );


    if (!visibleSlideKey) {

      currentLesson.innerHTML =
        getSlidePlaceholder(
          "Não foi possível carregar este slide."
        );
    }


    return false;

  } finally {

    if (
      renderVersion ===
      slideRenderVersion
    ) {

      isSlideTransitioning =
        false;


      updateNavigation();
    }
  }
}


/* =========================================================
   CONTADOR
========================================================= */

function renderSlideCounter(
  current,
  total
) {
  const counter =
    $("slide-counter");


  if (counter) {

    if (!total) {

      counter.textContent =
        "Nenhum slide";

    } else {

      counter.textContent =
        `${current} de ${total}`;
    }
  }


  const presentationCounter =
    document.querySelector(
      "[data-presentation-counter]"
    );


  if (presentationCounter) {

    presentationCounter.textContent =
      total
        ? `${current} / ${total}`
        : "0 / 0";
  }
}


/* =========================================================
   PLACEHOLDER
========================================================= */

function getSlidePlaceholder(
  message =
    "Os slides do Supabase serão exibidos exatamente neste espaço."
) {
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
}


/* =========================================================
   SEM AULAS
========================================================= */

function renderNoLessons() {
  const container =
    $("lessons-container");


  if (container) {

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
  }


  const title =
    $("lesson-title");


  const description =
    $("lesson-description");


  if (title) {

    title.textContent =
      "Conteúdo em preparação";
  }


  if (description) {

    description.textContent =
      "As aulas e slides deste curso serão exibidos aqui.";
  }


  const currentLesson =
    $("current-lesson");


  if (currentLesson) {

    currentLesson.innerHTML =
      getSlidePlaceholder();
  }


  const previous =
    $("prev-lesson");


  const next =
    $("next-lesson");


  if (previous) {

    previous.disabled =
      true;
  }


  if (next) {

    next.disabled =
      true;
  }
}


/* =========================================================
   CONCLUIR AULA
========================================================= */

async function markLessonCompleted(
  lesson
) {
  if (!lesson) {
    return false;
  }


  if (!currentUser) {

    console.warn(
      "Usuário não autenticado. Não foi possível registrar o progresso."
    );

    return false;
  }


  const lessonId =
    Number(
      lesson.id
    );


  const existing =
    progressByLesson.get(
      lessonId
    );


  if (
    existing?.concluida
  ) {

    return true;
  }


  const completedAt =
    new Date()
      .toISOString();


  try {

    let savedRow =
      null;


    if (
      existing?.id
    ) {

      const {
        data,
        error
      } =
        await supabase
          .from(
            "progresso_aulas"
          )
          .update({
            concluida:
              true,

            concluida_em:
              completedAt
          })
          .eq(
            "id",
            existing.id
          )
          .eq(
            "user_id",
            currentUser.id
          )
          .select(`
            id,
            user_id,
            aula_id,
            concluida,
            concluida_em
          `)
          .maybeSingle();


      if (error) {
        throw error;
      }


      savedRow =
        data;

    } else {

      const {
        data,
        error
      } =
        await supabase
          .from(
            "progresso_aulas"
          )
          .insert({
            user_id:
              currentUser.id,

            aula_id:
              lesson.id,

            concluida:
              true,

            concluida_em:
              completedAt
          })
          .select(`
            id,
            user_id,
            aula_id,
            concluida,
            concluida_em
          `)
          .maybeSingle();


      if (error) {
        throw error;
      }


      savedRow =
        data;
    }


    if (!savedRow) {

      console.error(
        "O Supabase não retornou o progresso salvo."
      );

      return false;
    }


    progressByLesson.set(
      lessonId,
      savedRow
    );


    renderLessons();

    updateLessonSelection();

    updateProgress();

    renderCourseHome();


    return true;

  } catch (error) {

    console.error(
      "Erro ao salvar progresso:",
      error
    );


    return false;
  }
}


/* =========================================================
   ESTADO DA NAVEGAÇÃO
========================================================= */

function getNavigationState() {
  if (!lessons.length) {

    return {
      canPrevious:
        false,

      canNext:
        false,

      finalLesson:
        false,

      completed:
        false
    };
  }


  const lesson =
    lessons[
      currentLessonIndex
    ];


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  const firstPosition =
    currentLessonIndex === 0 &&
    currentSlideIndex === 0;


  const isLastLesson =
    currentLessonIndex ===
    lessons.length - 1;


  const isLastSlide =
    !lessonSlides.length ||
    currentSlideIndex ===
      lessonSlides.length - 1;


  const finalLesson =
    isLastLesson &&
    isLastSlide;


  return {
    canPrevious:
      !firstPosition &&
      !isSlideTransitioning,

    canNext:
      !isSlideTransitioning &&
      (
        !finalLesson ||
        !isLessonCompleted(
          lesson
        )
      ),

    finalLesson,

    completed:
      isLessonCompleted(
        lesson
      )
  };
}


/* =========================================================
   NAVEGAÇÃO DA APRESENTAÇÃO
========================================================= */

function updatePresentationNavigation() {
  const stage =
    getPresentationStage();


  if (!stage) {
    return;
  }


  const previous =
    stage.querySelector(
      "[data-presentation-previous]"
    );


  const next =
    stage.querySelector(
      "[data-presentation-next]"
    );


  const state =
    getNavigationState();


  if (previous) {

    previous.disabled =
      !state.canPrevious;
  }


  if (next) {

    next.disabled =
      !state.canNext;


    const text =
      next.querySelector(
        ".presentation-nav-text"
      );


    if (text) {

      if (
        state.finalLesson
      ) {

        text.textContent =
          state.completed
            ? "Concluída"
            : "Concluir";

      } else {

        text.textContent =
          "Próxima";
      }
    }
  }
}


/* =========================================================
   BOTÕES NORMAIS
========================================================= */

function updateNavigation() {
  const previous =
    $("prev-lesson");


  const next =
    $("next-lesson");


  const state =
    getNavigationState();


  if (previous) {

    previous.disabled =
      !state.canPrevious;
  }


  if (next) {

    next.disabled =
      !state.canNext;


    if (
      state.finalLesson
    ) {

      next.textContent =
        state.completed
          ? "Concluída ✓"
          : "Concluir aula ✓";

    } else {

      next.textContent =
        "Próxima →";
    }
  }


  updatePresentationNavigation();
}


/* =========================================================
   ATUALIZAR ESTADO DA AULA NO HISTÓRICO
========================================================= */

function syncCurrentLessonHistory() {
  if (
    currentCourseView !==
    "lesson"
  ) {
    return;
  }


  replaceCourseHistoryState(
    createLessonHistoryState(
      currentLessonIndex,
      currentSlideIndex
    )
  );
}


/* =========================================================
   ANTERIOR
========================================================= */

async function goPrevious() {
  if (
    !lessons.length ||
    isSlideTransitioning
  ) {
    return;
  }


  if (
    currentSlideIndex > 0
  ) {

    const oldIndex =
      currentSlideIndex;


    currentSlideIndex -=
      1;


    const success =
      await renderCurrentLesson();


    if (!success) {

      currentSlideIndex =
        oldIndex;

    } else {

      syncCurrentLessonHistory();
    }


    updateNavigation();

    return;
  }


  if (
    currentLessonIndex <= 0
  ) {
    return;
  }


  const previousLessonIndex =
    currentLessonIndex - 1;


  if (
    !isLessonUnlocked(
      previousLessonIndex
    )
  ) {
    return;
  }


  const oldLessonIndex =
    currentLessonIndex;


  const oldSlideIndex =
    currentSlideIndex;


  const previousLesson =
    lessons[
      previousLessonIndex
    ];


  const previousSlides =
    getLessonSlides(
      previousLesson
    );


  const lastSlideIndex =
    previousSlides.length
      ? previousSlides.length - 1
      : 0;


  currentLessonIndex =
    previousLessonIndex;


  currentSlideIndex =
    lastSlideIndex;


  visibleSlideKey =
    "";


  updateLessonSelection();


  const success =
    await renderCurrentLesson();


  if (!success) {

    currentLessonIndex =
      oldLessonIndex;


    currentSlideIndex =
      oldSlideIndex;


    updateLessonSelection();

  } else {

    syncCurrentLessonHistory();
  }


  updateNavigation();

  updateProgress();
}


/* =========================================================
   PRÓXIMO
========================================================= */

async function goNext() {
  if (
    !lessons.length ||
    isSlideTransitioning
  ) {
    return;
  }


  const lesson =
    lessons[
      currentLessonIndex
    ];


  if (!lesson) {
    return;
  }


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  if (
    lessonSlides.length &&
    currentSlideIndex <
      lessonSlides.length - 1
  ) {

    const oldIndex =
      currentSlideIndex;


    currentSlideIndex +=
      1;


    const success =
      await renderCurrentLesson();


    if (!success) {

      currentSlideIndex =
        oldIndex;

    } else {

      syncCurrentLessonHistory();
    }


    updateNavigation();

    return;
  }


  let completedSuccessfully =
    isLessonCompleted(
      lesson
    );


  if (
    !completedSuccessfully
  ) {

    if (
      lessonSlides.length
    ) {

      completedSuccessfully =
        await markLessonCompleted(
          lesson
        );
    }
  }


  if (
    !completedSuccessfully
  ) {

    console.warn(
      "Conclua a aula atual antes de continuar."
    );


    updateNavigation();

    return;
  }


  if (
    currentLessonIndex >=
    lessons.length - 1
  ) {

    updateNavigation();

    syncCurrentLessonHistory();

    return;
  }


  const nextLessonIndex =
    currentLessonIndex + 1;


  if (
    !isLessonUnlocked(
      nextLessonIndex
    )
  ) {

    console.warn(
      "A próxima aula ainda está bloqueada."
    );


    updateNavigation();

    return;
  }


  const oldLessonIndex =
    currentLessonIndex;


  const oldSlideIndex =
    currentSlideIndex;


  currentLessonIndex =
    nextLessonIndex;


  currentSlideIndex =
    0;


  visibleSlideKey =
    "";


  updateLessonSelection();


  const success =
    await renderCurrentLesson();


  if (!success) {

    currentLessonIndex =
      oldLessonIndex;


    currentSlideIndex =
      oldSlideIndex;


    updateLessonSelection();

  } else {

    /*
      Avançar para outra aula não cria
      nova entrada no histórico.

      Continuamos tendo apenas:

      Aula -> Home -> Catálogo.
    */

    syncCurrentLessonHistory();
  }


  updateNavigation();

  updateProgress();
}


/* =========================================================
   BOTÕES DE NAVEGAÇÃO DAS AULAS
========================================================= */

$("prev-lesson")
  ?.addEventListener(
    "click",
    goPrevious
  );


$("next-lesson")
  ?.addEventListener(
    "click",
    goNext
  );


/* =========================================================
   BOTÃO SVG — VOLTAR
========================================================= */

$("history-back")
  ?.addEventListener(
    "click",
    goBackInHistory
  );


/* =========================================================
   VOLTAR / AVANÇAR DO NAVEGADOR
========================================================= */

window.addEventListener(
  "popstate",
  async (event) => {

    const state =
      event.state?.[
        COURSE_HISTORY_KEY
      ];


    /*
      Se voltamos para a entrada
      HOME desta própria página,
      mostramos os módulos.
    */

    if (
      isExcelHistoryState(
        state
      ) &&
      state.view ===
        "home"
    ) {

      await showCourseHome();

      return;
    }


    /*
      Se usamos Avançar do navegador
      para retornar a uma aula,
      restauramos a aula correta.
    */

    if (
      isExcelHistoryState(
        state
      ) &&
      state.view ===
        "lesson"
    ) {

      const lessonIndex =
        normalizeNumber(
          state.lessonIndex,
          0
        );


      const slideIndex =
        normalizeNumber(
          state.slideIndex,
          0
        );


      if (
        isLessonUnlocked(
          lessonIndex
        )
      ) {

        await selectLesson(
          lessonIndex,
          slideIndex
        );

      } else {

        replaceCourseHistoryState(
          createHomeHistoryState()
        );


        await showCourseHome();
      }
    }
  }
);


/* =========================================================
   PROGRESSO
========================================================= */

function updateProgress() {
  const total =
    lessons.length;


  const completed =
    lessons.filter(
      (lesson) =>
        isLessonCompleted(
          lesson
        )
    ).length;


  const percentage =
    total

      ? Math.round(
          (
            completed /
            total
          ) *
          100
        )

      : 0;


  const percentageElement =
    $("progress-pct");


  const countElement =
    $("progress-count");


  const labelElement =
    $("progress-label");


  const fill =
    $("progress-bar-fill");


  if (percentageElement) {

    percentageElement.textContent =
      `${percentage}%`;
  }


  if (countElement) {

    countElement.textContent =
      `${completed} de ${total} aulas concluídas`;
  }


  if (labelElement) {

    labelElement.textContent =
      `${percentage}% concluído`;
  }


  if (fill) {

    fill.style.width =
      `${percentage}%`;
  }


  const circle =
    $("progress-circle");


  if (circle) {

    const radius =
      circle.r.baseVal.value;


    const circumference =
      2 *
      Math.PI *
      radius;


    circle.style.strokeDasharray =
      `${circumference}`;


    circle.style.strokeDashoffset =
      `${
        circumference -
        (
          percentage /
          100
        ) *
        circumference
      }`;
  }


  updateCourseHomeProgress();
}


/* =========================================================
   DOWNLOADS
========================================================= */

async function renderDownloads() {
  const list =
    $("downloads-list");


  if (!list) {
    return;
  }


  if (!materials.length) {

    list.innerHTML = `
      <li class="empty-side">
        Nenhum material complementar
        foi cadastrado ainda.
      </li>
    `;


    return;
  }


  list.innerHTML = `
    <li class="empty-side">
      Carregando materiais...
    </li>
  `;


  const renderedMaterials =
    await Promise.all(
      materials.map(
        async (material) => {

          const url =
            await getStorageUrl(
              MATERIALS_BUCKET,
              material.arquivo_path
            );


          const lesson =
            lessons.find(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  material.aula_id
                )
            );


          return {
            ...material,
            url,
            lesson
          };
        }
      )
    );


  list.innerHTML =
    renderedMaterials
      .map(
        (material) => {

          const name =
            escapeHtml(
              material.nome ||
              "Material complementar"
            );


          const type =
            escapeHtml(
              material.tipo ||
              "Arquivo"
            );


          const lessonName =
            material.lesson

              ? escapeHtml(
                  material.lesson.nome
                )

              : "";


          const meta =
            lessonName
              ? `${type} • ${lessonName}`
              : type;


          const action =
            material.url

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

              : `
                <span
                  class="download-action"
                  aria-hidden="true"
                >
                  —
                </span>
              `;


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
        }
      )
      .join("");
}


/* =========================================================
   SIDEBARS
========================================================= */

const lessonsSidebar =
  $("lessons-sidebar");


const materialsSidebar =
  $("materials-sidebar");


const sidebarOverlay =
  $("sidebar-overlay");


const openLessonsButton =
  $("open-lessons-sidebar");


const closeLessonsButton =
  $("close-lessons-sidebar");


const openMaterialsButton =
  $("open-materials-sidebar");


const closeMaterialsButton =
  $("close-materials-sidebar");


/* =========================================================
   FECHAR SIDEBARS
========================================================= */

function closeAllSidebars() {
  lessonsSidebar
    ?.classList
    .remove(
      "is-open"
    );


  materialsSidebar
    ?.classList
    .remove(
      "is-open"
    );


  sidebarOverlay
    ?.classList
    .remove(
      "is-visible"
    );


  document.body
    .classList
    .remove(
      "sidebar-open"
    );


  lessonsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  materialsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  sidebarOverlay
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  openLessonsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );


  openMaterialsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}


/* =========================================================
   ABRIR AULAS
========================================================= */

function openLessonsSidebar() {
  materialsSidebar
    ?.classList
    .remove(
      "is-open"
    );


  materialsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  lessonsSidebar
    ?.classList
    .add(
      "is-open"
    );


  sidebarOverlay
    ?.classList
    .add(
      "is-visible"
    );


  document.body
    .classList
    .add(
      "sidebar-open"
    );


  lessonsSidebar
    ?.setAttribute(
      "aria-hidden",
      "false"
    );


  sidebarOverlay
    ?.setAttribute(
      "aria-hidden",
      "false"
    );


  openLessonsButton
    ?.setAttribute(
      "aria-expanded",
      "true"
    );


  openMaterialsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}


/* =========================================================
   ABRIR MATERIAIS
========================================================= */

function openMaterialsSidebar() {
  lessonsSidebar
    ?.classList
    .remove(
      "is-open"
    );


  lessonsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  materialsSidebar
    ?.classList
    .add(
      "is-open"
    );


  sidebarOverlay
    ?.classList
    .add(
      "is-visible"
    );


  document.body
    .classList
    .add(
      "sidebar-open"
    );


  materialsSidebar
    ?.setAttribute(
      "aria-hidden",
      "false"
    );


  sidebarOverlay
    ?.setAttribute(
      "aria-hidden",
      "false"
    );


  openLessonsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );


  openMaterialsButton
    ?.setAttribute(
      "aria-expanded",
      "true"
    );
}


/* =========================================================
   EVENTOS DAS SIDEBARS
========================================================= */

openLessonsButton
  ?.addEventListener(
    "click",
    openLessonsSidebar
  );


closeLessonsButton
  ?.addEventListener(
    "click",
    closeAllSidebars
  );


openMaterialsButton
  ?.addEventListener(
    "click",
    openMaterialsSidebar
  );


closeMaterialsButton
  ?.addEventListener(
    "click",
    closeAllSidebars
  );


sidebarOverlay
  ?.addEventListener(
    "click",
    closeAllSidebars
  );


/* =========================================================
   FULLSCREEN
========================================================= */

document.addEventListener(
  "fullscreenchange",
  () => {

    if (
      !document.fullscreenElement &&
      !usingFullscreenFallback
    ) {

      document.body.classList.remove(
        "presentation-mode-active"
      );
    }


    syncPresentationUI();
  }
);


document.addEventListener(
  "webkitfullscreenchange",
  () => {

    if (
      !document.webkitFullscreenElement &&
      !usingFullscreenFallback
    ) {

      document.body.classList.remove(
        "presentation-mode-active"
      );
    }


    syncPresentationUI();
  }
);


/* =========================================================
   TECLADO
========================================================= */

document.addEventListener(
  "keydown",
  async (event) => {

    const activeElement =
      document.activeElement;


    const typing =
      activeElement &&
      (
        activeElement.tagName ===
          "INPUT" ||

        activeElement.tagName ===
          "TEXTAREA" ||

        activeElement.isContentEditable
      );


    if (typing) {
      return;
    }


    if (
      isPresentationActive()
    ) {

      if (
        event.key ===
        "ArrowRight"
      ) {

        event.preventDefault();

        await goNext();

        return;
      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        event.preventDefault();

        await goPrevious();

        return;
      }


      if (
        event.key ===
          "Escape" &&
        usingFullscreenFallback
      ) {

        event.preventDefault();

        await exitPresentationMode();

        return;
      }
    }


    if (
      event.key ===
      "Escape"
    ) {

      closeAllSidebars();
    }
  }
);


/* =========================================================
   REDIMENSIONAMENTO
========================================================= */

window.addEventListener(
  "resize",
  () => {

    if (
      isPresentationActive()
    ) {

      syncPresentationUI();
    }
  },
  {
    passive: true
  }
);


window.addEventListener(
  "orientationchange",
  () => {

    window.setTimeout(
      () => {

        if (
          isPresentationActive()
        ) {

          syncPresentationUI();
        }
      },
      120
    );
  }
);


/* =========================================================
   ALTERAÇÃO DE AUTENTICAÇÃO
========================================================= */

supabase
  .auth
  .onAuthStateChange(
    async (
      event,
      session
    ) => {

      currentUser =
        session?.user ||
        null;


      console.log(
        "Evento Auth:",
        event
      );


      console.log(
        "Sessão Auth:",
        session
      );


      const userArea =
        $("user-area");


      if (userArea) {

        if (currentUser) {

          renderUser(
            userArea,
            currentUser
          );

        } else {

          renderGuest(
            userArea
          );
        }
      }


      if (
        event ===
        "SIGNED_OUT"
      ) {

        progressByLesson.clear();


        updateProgress();


        renderLessons();

        updateLessonSelection();

        renderCourseHome();

        return;
      }


      if (
        event ===
          "SIGNED_IN" &&
        currentUser &&
        lessons.length
      ) {

        try {

          await loadProgress();

          updateProgress();


          renderLessons();

          updateLessonSelection();

          renderCourseHome();

        } catch (error) {

          console.error(
            "Erro ao atualizar progresso após login:",
            error
          );
        }
      }
    }
  );


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {
  try {

    const lessonView =
      getLessonView();


    if (lessonView) {

      lessonView.hidden =
        true;
    }


    ensureCourseHome();


    /*
      O estado da entrada atual
      é preparado antes do conteúdo.
    */

    initializeCourseHistory();


    await loadUserSession();


    await loadExcelCourse();


  } catch (error) {

    console.error(
      "Erro fatal ao inicializar Excel:",
      error
    );
  }
}


/* =========================================================
   START
========================================================= */

init();
