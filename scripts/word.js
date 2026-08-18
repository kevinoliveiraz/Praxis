import {
  supabase,
  escapeHtml
} from "./supabaseClient.js";


/* =========================================================
   CONFIGURAÇÃO DO CURSO
========================================================= */

const WORD_COURSE_ID = 2;


/*
  IMPORTANTE:

  Estes são os nomes dos buckets que serão usados
  quando você colocar slides e materiais no Storage.

  Se você criar os buckets com outros nomes,
  basta alterar SOMENTE essas duas constantes.
*/

const SLIDES_BUCKET = "slides";
const MATERIALS_BUCKET = "materiais";


/*
  Tempo de validade das URLs assinadas do Storage.

  3600 segundos = 1 hora.
*/

const SIGNED_URL_EXPIRES_IN = 60 * 60;


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   ESTADO DA PÁGINA
========================================================= */

let currentUser = null;

let course = null;

let modules = [];

let lessons = [];

let slides = [];

let materials = [];

let progressRows = [];


/*
  Mapas para facilitar o acesso aos dados.

  Exemplo:

  slidesByLesson.get(5)

  retorna todos os slides da aula de ID 5.
*/

const slidesByLesson = new Map();

const materialsByLesson = new Map();

const progressByLesson = new Map();


let currentLessonIndex = 0;

let currentSlideIndex = 0;


/*
  Evita que uma imagem antiga apareça
  caso o usuário troque rapidamente de aula.
*/

let slideRenderVersion = 0;


/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value) {
  return String(value ?? "").trim();
}


function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}


function isHttpUrl(value) {
  const text = normalizeText(value);

  return (
    text.startsWith("https://") ||
    text.startsWith("http://")
  );
}


/* =========================================================
   CURSO PADRÃO
========================================================= */

function getDefaultCourse() {
  return {
    id: WORD_COURSE_ID,

    nome:
      "Word na Prática",

    descricao:
      "Aprenda Word na prática com aulas, exercícios e atividades aplicadas ao dia a dia.",

    categoria:
      "Word"
  };
}


/* =========================================================
   URL DO STORAGE
========================================================= */

async function getStorageUrl(
  bucket,
  path
) {
  const filePath = normalizeText(path);

  if (!filePath) {
    return "";
  }


  /*
    Se imagem_path / arquivo_path já tiver
    uma URL completa, usamos diretamente.
  */

  if (isHttpUrl(filePath)) {
    return filePath;
  }


  try {

    /*
      Criamos URL assinada.

      Isso permite que futuramente você deixe
      os buckets privados, o que é melhor para
      uma plataforma paga.
    */

    const {
      data,
      error
    } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(
        filePath,
        SIGNED_URL_EXPIRES_IN
      );


    if (error) {
      throw error;
    }


    return data?.signedUrl || "";

  } catch (error) {

    console.error(
      `Erro ao gerar URL do Storage (${bucket}/${filePath}):`,
      error
    );

    return "";
  }
}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function loadUserSession() {
  const userArea = $("user-area");

  try {

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();


    if (error) {
      throw error;
    }


    currentUser =
      session?.user || null;


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
      renderGuest(userArea);
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
   USUÁRIO LOGADO
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
      user.email || ""
    );


  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    "";


  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
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
          src="${escapeHtml(avatarUrl)}"
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
      button.disabled = true;
      button.textContent =
        "Saindo...";
    }


    const { error } =
      await supabase.auth.signOut();


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
      button.disabled = false;
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
}


/* =========================================================
   CARREGAR CURSO
========================================================= */

async function loadCourse() {
  const {
    data,
    error
  } = await supabase
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
      WORD_COURSE_ID
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
  } = await supabase
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
      WORD_COURSE_ID
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
  } = await supabase
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


  /*
    Adicionamos a informação do módulo
    dentro de cada aula para simplificar
    a renderização.
  */

  lessons =
    rawLessons
      .map((lesson) => {

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
            module || null
        };
      })
      .sort((a, b) => {

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
          return moduleA - moduleB;
        }


        return (
          normalizeNumber(a.ordem) -
          normalizeNumber(b.ordem)
        );
      });
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
  } = await supabase
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


  /*
    Garantimos novamente a ordem.
  */

  slidesByLesson.forEach(
    (lessonSlides) => {

      lessonSlides.sort(
        (a, b) =>
          normalizeNumber(a.ordem) -
          normalizeNumber(b.ordem)
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
  } = await supabase
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
  } = await supabase
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
        Number(row.aula_id),
        row
      );
    }
  );
}


/* =========================================================
   CARREGAR TODA A ESTRUTURA DO WORD
========================================================= */

async function loadWordCourse() {
  try {

    clearDataMaps();


    await loadCourse();

    await loadModules();

    await loadLessons();


    /*
      Slides, materiais e progresso podem
      ser carregados ao mesmo tempo depois
      que as aulas já estiverem disponíveis.
    */

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
      "Erro ao carregar o curso de Word:",
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
   CABEÇALHO DO CURSO
========================================================= */

function renderCourseHeader() {
  const courseName =
    course?.nome ||
    "Word na Prática";


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
   NUMERAÇÃO DA AULA
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
   SLIDES DE UMA AULA
========================================================= */

function getLessonSlides(
  lesson
) {
  if (!lesson) {
    return [];
  }


  return (
    slidesByLesson.get(
      Number(lesson.id)
    ) || []
  );
}


/* =========================================================
   MATERIAIS DE UMA AULA
========================================================= */

function getLessonMaterials(
  lesson
) {
  if (!lesson) {
    return [];
  }


  return (
    materialsByLesson.get(
      Number(lesson.id)
    ) || []
  );
}


/* =========================================================
   VERIFICAR SE AULA FOI CONCLUÍDA
========================================================= */

function isLessonCompleted(
  lesson
) {
  if (!lesson) {
    return false;
  }


  return Boolean(
    progressByLesson.get(
      Number(lesson.id)
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


  container.innerHTML = "";


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


      /*
        Se o módulo estiver publicado
        mas ainda não tiver aula publicada,
        ainda mostramos o módulo.
      */

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

        <ul class="lesson-list"></ul>
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
                Number(lesson.id)
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
            String(globalIndex);


          li.dataset.lessonId =
            String(lesson.id);


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
            <div class="lesson-status">
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


  if (
    !lessonSlides.length
  ) {

    currentSlideIndex = 0;

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
   ESTADO VISUAL DA LISTA
========================================================= */

function updateLessonSelection() {
  const items =
    document.querySelectorAll(
      ".lesson"
    );


  items.forEach(
    (item) => {

      const index =
        Number(
          item.dataset.lessonIndex
        );


      const lesson =
        lessons[index];


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
   RENDERIZAR AULA / SLIDE
========================================================= */

async function renderCurrentLesson() {
  const lesson =
    lessons[
      currentLessonIndex
    ];


  if (!lesson) {
    return;
  }


  const title =
    $("lesson-title");

  const description =
    $("lesson-description");

  const currentLesson =
    $("current-lesson");


  if (!currentLesson) {
    return;
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
      "Conteúdo prático do curso de Word.";
  }


  const lessonSlides =
    getLessonSlides(
      lesson
    );


  /*
    Ainda não há slides cadastrados.
  */

  if (!lessonSlides.length) {

    currentLesson.innerHTML =
      getSlidePlaceholder();

    renderSlideCounter(
      0,
      0
    );

    return;
  }


  const slide =
    lessonSlides[
      currentSlideIndex
    ];


  if (!slide) {

    currentLesson.innerHTML =
      getSlidePlaceholder();

    return;
  }


  /*
    Enquanto buscamos a URL assinada,
    mostramos um estado de carregamento.
  */

  const renderVersion =
    ++slideRenderVersion;


  currentLesson.innerHTML = `
    <div
      id="slide-stage"
      class="slide-stage"
    >
      <div class="slide-loading">
        Carregando slide...
      </div>
    </div>
  `;


  const slideUrl =
    await getStorageUrl(
      SLIDES_BUCKET,
      slide.imagem_path
    );


  /*
    Se o usuário já mudou de slide/aula,
    ignoramos o resultado antigo.
  */

  if (
    renderVersion !==
    slideRenderVersion
  ) {
    return;
  }


  if (!slideUrl) {

    currentLesson.innerHTML =
      getSlidePlaceholder(
        "Não foi possível carregar este slide."
      );

    renderSlideCounter(
      currentSlideIndex + 1,
      lessonSlides.length
    );

    return;
  }


  const slideTitle =
    normalizeText(
      slide.titulo
    );


  currentLesson.innerHTML = `
    <div
      id="slide-stage"
      class="slide-stage"
    >

      <div class="slide-viewer">

        <img
          src="${escapeHtml(slideUrl)}"
          alt="${
            escapeHtml(
              slideTitle ||
              `Slide ${
                currentSlideIndex + 1
              } da aula ${lessonName}`
            )
          }"
          loading="eager"
          decoding="async"
        >

      </div>

    </div>
  `;


  renderSlideCounter(
    currentSlideIndex + 1,
    lessonSlides.length
  );
}


/* =========================================================
   CONTADOR DE SLIDES
========================================================= */

function renderSlideCounter(
  current,
  total
) {
  const counter =
    $("slide-counter");


  /*
    O HTML atual pode ainda não ter esse elemento.
    Por isso ele é opcional.
  */

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
          aria-label="Área demonstrativa do slide em proporção 16 por 9"
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
   QUANDO NÃO HÁ AULAS
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
    previous.disabled = true;
  }


  if (next) {
    next.disabled = true;
  }
}


/* =========================================================
   MARCAR AULA COMO CONCLUÍDA
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


  /*
    Já está concluída.
  */

  if (
    existing?.concluida
  ) {
    return;
  }


  const completedAt =
    new Date()
      .toISOString();


  try {

    /*
      Se já existe uma linha de progresso,
      atualizamos.
    */

    if (existing?.id) {

      const {
        data,
        error
      } = await supabase
        .from(
          "progresso_aulas"
        )
        .update({
          concluida: true,
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

      /*
        Ainda não existe registro.
        Criamos um novo.
      */

      const {
        data,
        error
      } = await supabase
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
      "Erro ao salvar progresso da aula:",
      error
    );
  }
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function updateNavigation() {
  const previous =
    $("prev-lesson");

  const next =
    $("next-lesson");


  if (
    !lessons.length
  ) {

    if (previous) {
      previous.disabled = true;
    }

    if (next) {
      next.disabled = true;
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
   BOTÃO ANTERIOR
========================================================= */

$("prev-lesson")
  ?.addEventListener(
    "click",
    async () => {

      if (!lessons.length) {
        return;
      }


      /*
        Ainda existem slides anteriores
        dentro da aula atual.
      */

      if (
        currentSlideIndex > 0
      ) {

        currentSlideIndex -= 1;

        await renderCurrentLesson();

        updateNavigation();

        return;
      }


      /*
        Estamos no primeiro slide.
        Voltamos para a aula anterior.
      */

      if (
        currentLessonIndex <= 0
      ) {
        return;
      }


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


      await selectLesson(
        previousLessonIndex,
        lastSlideIndex
      );
    }
  );


/* =========================================================
   BOTÃO PRÓXIMA
========================================================= */

$("next-lesson")
  ?.addEventListener(
    "click",
    async () => {

      if (!lessons.length) {
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
        Existem mais slides dentro
        da mesma aula.
      */

      if (
        lessonSlides.length &&
        currentSlideIndex <
          lessonSlides.length - 1
      ) {

        currentSlideIndex += 1;

        await renderCurrentLesson();

        updateNavigation();

        return;
      }


      /*
        Chegamos ao último slide.

        Se existem slides de verdade,
        registramos a aula como concluída.
      */

      if (
        lessonSlides.length
      ) {

        await markLessonCompleted(
          lesson
        );
      }


      /*
        Existe uma próxima aula.
      */

      if (
        currentLessonIndex <
        lessons.length - 1
      ) {

        await selectLesson(
          currentLessonIndex + 1,
          0
        );

        return;
      }


      /*
        Última aula do curso.
      */

      updateNavigation();
    }
  );


/* =========================================================
   PROGRESSO REAL
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
          ) * 100
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
   DOWNLOADS / MATERIAIS
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
        async (
          material
        ) => {

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
   SIDEBARS OFF-CANVAS
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
   FECHAR TODAS AS SIDEBARS
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
   ABRIR SIDEBAR DE AULAS
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


  openMaterialsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
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
}


/* =========================================================
   ABRIR SIDEBAR DE MATERIAIS
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


  openLessonsButton
    ?.setAttribute(
      "aria-expanded",
      "false"
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
   ALTERAÇÕES DE AUTENTICAÇÃO
========================================================= */

supabase.auth.onAuthStateChange(
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


    /*
      O logout manual já redireciona.

      Evitamos fazer reload desnecessário
      durante INITIAL_SESSION.
    */

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
  /*
    Primeiro descobrimos quem está logado.

    Isso é importante porque agora:
    - catalogo
    - modulos
    - aulas
    - slides
    - materiais

    estão liberados para a role authenticated.
  */

  await loadUserSession();


  /*
    Mesmo se não houver sessão, deixamos a página
    carregar o estado visual.

    Quando o usuário estiver autenticado,
    as queries autorizadas pelo RLS retornarão
    normalmente.
  */

  await loadWordCourse();
}


/* =========================================================
   START
========================================================= */

init();