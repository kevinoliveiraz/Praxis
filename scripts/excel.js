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


/* =========================================================
   ETAPA 3 — SISTEMA DE TRANSIÇÃO
========================================================= */

/*
  Impede duas transições simultâneas.
*/
let isSlideTransitioning = false;


/*
  0 = primeira camada visível
  1 = segunda camada visível
*/
let activeSlideLayer = 0;


/*
  Guarda qual imagem está realmente
  aparecendo no viewer.
*/
let visibleSlideKey = "";


/* =========================================================
   CACHE
========================================================= */

const slideUrlCache =
  new Map();

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
    (resolve) =>
      window.setTimeout(
        resolve,
        ms
      )
  );
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
    (resolve, reject) => {
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
   CRIAR VIEWER PERMANENTE
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

  /*
    Já existe.
  */
  if (
    viewer &&
    viewer.querySelector(
      ".slide-layer-a"
    ) &&
    viewer.querySelector(
      ".slide-layer-b"
    )
  ) {
    return viewer;
  }

  /*
    Cria o viewer uma única vez.

    A partir daqui NÃO destruímos
    mais o viewer entre slides.
  */
  currentLesson.innerHTML = `
    <div
      id="slide-stage"
      class="slide-stage"
    >
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
    </div>
  `;

  viewer =
    currentLesson.querySelector(
      ".slide-viewer"
    );

  if (!viewer) {
    return null;
  }


  /* =======================================================
     ESTILO DO VIEWER

     Fazemos aqui para a Etapa 3 funcionar
     imediatamente mesmo antes do ajuste
     final no curso.css.
  ======================================================= */

  viewer.style.position =
    "relative";

  viewer.style.overflow =
    "hidden";


  const images =
    viewer.querySelectorAll(
      ".slide-layer"
    );


  images.forEach(
    (image, index) => {
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


  activeSlideLayer = 0;

  visibleSlideKey = "";

  return viewer;
}


/* =========================================================
   OBTER AS DUAS CAMADAS
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
   MOSTRAR PRIMEIRO SLIDE
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


  /*
    Primeira imagem já entra pronta.
    Não fazemos fade a partir do preto.
  */

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


  /*
    Colocamos o próximo slide ATRÁS
    do atual, ainda invisível.
  */

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


  /*
    Como preloadImage já terminou,
    a imagem deverá aparecer de imediato.
  */

  void incomingImage.offsetWidth;


  incomingImage.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;

  currentImage.style.transition =
    `opacity ${SLIDE_TRANSITION_MS}ms ease, transform ${SLIDE_TRANSITION_MS}ms ease`;


  /*
    As duas ficam sobrepostas durante
    toda a animação.

    Portanto não existe momento
    em que o fundo preto fica sozinho.
  */

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


  /*
    A camada antiga permanece escondida
    e será reaproveitada na próxima troca.
  */

  currentImage.style.transform =
    "scale(1)";


  activeSlideLayer =
    activeSlideLayer === 0
      ? 1
      : 0;
}


/* =========================================================
   PRÉ-CARREGAR VIZINHOS
========================================================= */

async function preloadSlideAt(
  lessonIndex,
  slideIndex
) {
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


  /*
    Também prepara o primeiro slide
    da próxima aula.
  */
  if (
    currentLessonIndex <
    lessons.length - 1
  ) {
    preloadSlideAt(
      currentLessonIndex + 1,
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

    currentUser = null;

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

  visibleSlideKey = "";
  activeSlideLayer = 0;
}


/* =========================================================
   CURSO
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
   MÓDULOS
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
   AULAS
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
                Number(item.id) ===
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
        (a, b) => {
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
   SLIDES
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
        .push(slide);
    }
  );

  slidesByLesson.forEach(
    (lessonSlides) => {
      lessonSlides.sort(
        (a, b) =>
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
   MATERIAIS
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
        .push(material);
    }
  );
}


/* =========================================================
   PROGRESSO
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
      .from("progresso_aulas")
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
   CARREGAR TUDO
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

    if (lessons.length) {
      await selectLesson(
        0,
        0
      );
    } else {
      renderNoLessons();
      updateProgress();
    }

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
    `${courseName} — SkillUp`;
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
   LISTA DE AULAS
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
                Number(item.id) ===
                Number(
                  lesson.id
                )
            );

          const lessonSlides =
            getLessonSlides(
              lesson
            );

          const completed =
            isLessonCompleted(
              lesson
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

          const lessonNumber =
            getLessonNumber(
              lesson
            );

          const lessonName =
            escapeHtml(
              lesson.nome ||
              `Aula ${lessonNumber}`
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
                completed
                  ? `
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      aria-hidden="true"
                    >
                      <polyline
                        points="20 6 9 17 4 12"
                      />
                    </svg>
                  `
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
              ${escapeHtml(
                slidesLabel
              )}
            </div>

            <button
              type="button"
              class="lesson-play"
              aria-label="Abrir ${lessonName}"
            >
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
            </button>
          `;

          li.addEventListener(
            "click",
            async () => {
              /*
                Não deixa uma aula diferente
                interromper uma animação.
              */
              if (
                isSlideTransitioning
              ) {
                return;
              }

              await selectLesson(
                globalIndex,
                0
              );

              closeAllSidebars();
            }
          );

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
    isSlideTransitioning
  ) {
    return;
  }

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

  updateLessonSelection();

  await renderCurrentLesson();

  updateNavigation();
  updateProgress();
}


/* =========================================================
   LISTA VISUAL
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

        const isCurrent =
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

        const status =
          item.querySelector(
            ".lesson-status"
          );

        if (!status) {
          return;
        }

        status.innerHTML =
          isDone
            ? `
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                aria-hidden="true"
              >
                <polyline
                  points="20 6 9 17 4 12"
                />
              </svg>
            `
            : "";
      }
    );
}


/* =========================================================
   ETAPA 3
   RENDERIZAR SLIDE
========================================================= */

async function renderCurrentLesson() {
  const lesson =
    lessons[
      currentLessonIndex
    ];

  if (!lesson) {
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


  /* =======================================================
     SEM SLIDES
  ======================================================= */

  if (!lessonSlides.length) {
    visibleSlideKey = "";

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


  /*
    Já está exatamente neste slide.
  */
  if (
    visibleSlideKey ===
    slideKey
  ) {
    renderSlideCounter(
      currentSlideIndex + 1,
      lessonSlides.length
    );

    return true;
  }


  const renderVersion =
    ++slideRenderVersion;


  /*
    A partir daqui nenhuma outra
    navegação poderá começar.
  */

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


    /*
      PRIMEIRO CARREGA.

      O slide atual continua visível
      durante todo este processo.
    */

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


    /*
      PRIMEIRO SLIDE DA PÁGINA.

      Ele aparece direto.
    */

    if (!visibleSlideKey) {
      showInitialSlide(
        viewer,
        slideUrl,
        alt
      );

    } else {
      /*
        Próximas trocas usam duas
        imagens simultaneamente.
      */

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


    /*
      Libera logo após a transição.
    */

    preloadNearbySlides();


    return true;

  } catch (error) {
    console.error(
      "Erro ao carregar slide:",
      error
    );


    /*
      Se já existia um slide na tela,
      NÃO destruímos ele para mostrar
      tela preta ou placeholder.

      Mantemos o slide anterior.
    */

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

  if (!counter) {
    return;
  }

  if (!total) {
    counter.textContent =
      "Nenhum slide";

    return;
  }

  counter.textContent =
    `${current} de ${total}`;
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
  if (
    !lesson ||
    !currentUser
  ) {
    return;
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
    return;
  }

  const completedAt =
    new Date()
      .toISOString();

  try {
    if (existing?.id) {
      const {
        data,
        error
      } =
        await supabase
          .from("progresso_aulas")
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

      if (data) {
        progressByLesson.set(
          lessonId,
          data
        );
      }

    } else {
      const {
        data,
        error
      } =
        await supabase
          .from("progresso_aulas")
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

      if (data) {
        progressByLesson.set(
          lessonId,
          data
        );
      }
    }

    updateLessonSelection();
    updateProgress();

  } catch (error) {
    console.error(
      "Erro ao salvar progresso:",
      error
    );
  }
}


/* =========================================================
   BOTÕES DE NAVEGAÇÃO
========================================================= */

function updateNavigation() {
  const previous =
    $("prev-lesson");

  const next =
    $("next-lesson");


  if (!lessons.length) {
    if (previous) {
      previous.disabled =
        true;
    }

    if (next) {
      next.disabled =
        true;
    }

    return;
  }


  /*
    Durante o crossfade os dois botões
    ficam temporariamente bloqueados.
  */

  if (isSlideTransitioning) {
    if (previous) {
      previous.disabled =
        true;
    }

    if (next) {
      next.disabled =
        true;
    }

    return;
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


  if (previous) {
    previous.disabled =
      firstPosition;
  }


  if (!next) {
    return;
  }


  const isLastLesson =
    currentLessonIndex ===
    lessons.length - 1;


  const isLastSlide =
    !lessonSlides.length ||
    currentSlideIndex ===
      lessonSlides.length - 1;


  if (
    isLastLesson &&
    isLastSlide
  ) {
    next.textContent =
      isLessonCompleted(
        lesson
      )
        ? "Concluída ✓"
        : "Concluir aula ✓";

    next.disabled =
      isLessonCompleted(
        lesson
      );

  } else {
    next.textContent =
      "Próxima →";

    next.disabled =
      false;
  }
}


/* =========================================================
   ANTERIOR
========================================================= */

$("prev-lesson")
  ?.addEventListener(
    "click",
    async () => {
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
        }

        updateNavigation();

        return;
      }


      if (
        currentLessonIndex <= 0
      ) {
        return;
      }


      const oldLessonIndex =
        currentLessonIndex;

      const oldSlideIndex =
        currentSlideIndex;


      const previousLessonIndex =
        currentLessonIndex - 1;


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


      updateLessonSelection();


      const success =
        await renderCurrentLesson();


      if (!success) {
        currentLessonIndex =
          oldLessonIndex;

        currentSlideIndex =
          oldSlideIndex;

        updateLessonSelection();
      }


      updateNavigation();
      updateProgress();
    }
  );


/* =========================================================
   PRÓXIMA
========================================================= */

$("next-lesson")
  ?.addEventListener(
    "click",
    async () => {
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


      const lessonSlides =
        getLessonSlides(
          lesson
        );


      /*
        PRÓXIMO SLIDE DA MESMA AULA
      */

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
        }


        updateNavigation();

        return;
      }


      /*
        TERMINOU A AULA
      */

      if (
        lessonSlides.length
      ) {
        await markLessonCompleted(
          lesson
        );
      }


      /*
        PRÓXIMA AULA
      */

      if (
        currentLessonIndex <
        lessons.length - 1
      ) {
        const oldLessonIndex =
          currentLessonIndex;

        const oldSlideIndex =
          currentSlideIndex;


        currentLessonIndex +=
          1;

        currentSlideIndex =
          0;


        updateLessonSelection();


        const success =
          await renderCurrentLesson();


        if (!success) {
          currentLessonIndex =
            oldLessonIndex;

          currentSlideIndex =
            oldSlideIndex;

          updateLessonSelection();
        }


        updateNavigation();
        updateProgress();

        return;
      }


      updateNavigation();
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
                Number(item.id) ===
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
            <li
              class="download-item"
            >
              <div
                class="file-icon"
              >
                ↓
              </div>

              <div>
                <div
                  class="file-name"
                >
                  ${name}
                </div>

                <div
                  class="file-meta"
                >
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


function closeAllSidebars() {
  lessonsSidebar
    ?.classList
    .remove("is-open");

  materialsSidebar
    ?.classList
    .remove("is-open");

  sidebarOverlay
    ?.classList
    .remove("is-visible");

  document.body
    .classList
    .remove("sidebar-open");

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


function openLessonsSidebar() {
  materialsSidebar
    ?.classList
    .remove("is-open");

  materialsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

  lessonsSidebar
    ?.classList
    .add("is-open");

  sidebarOverlay
    ?.classList
    .add("is-visible");

  document.body
    .classList
    .add("sidebar-open");

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


function openMaterialsSidebar() {
  lessonsSidebar
    ?.classList
    .remove("is-open");

  lessonsSidebar
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

  materialsSidebar
    ?.classList
    .add("is-open");

  sidebarOverlay
    ?.classList
    .add("is-visible");

  document.body
    .classList
    .add("sidebar-open");

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

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key ===
      "Escape"
    ) {
      closeAllSidebars();
    }
  }
);


/* =========================================================
   AUTH CHANGE
========================================================= */

supabase
  .auth
  .onAuthStateChange(
    (
      event,
      session
    ) => {
      currentUser =
        session?.user ||
        null;

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
        updateLessonSelection();
      }
    }
  );


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {
  await loadUserSession();
  await loadExcelCourse();
}


/* =========================================================
   START
========================================================= */

init();
