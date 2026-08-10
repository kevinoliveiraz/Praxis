import {
  supabase,
  escapeHtml
} from "./supabaseClient.js";


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const EXCEL_COURSE_ID = 1;


/* =========================================================
   ELEMENTOS / ESTADO
========================================================= */

const $ = (id) => document.getElementById(id);

let course = null;
let lessons = [];
let currentLessonIndex = 0;


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function loadUserSession() {
  const userArea = $("user-area");

  if (!userArea) {
    return;
  }

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (session?.user) {
      renderUser(userArea, session.user);
    } else {
      renderGuest(userArea);
    }

  } catch (error) {
    console.error(
      "Erro ao carregar sessão:",
      error
    );

    renderGuest(userArea);
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

function renderUser(userArea, user) {
  if (!userArea || !user) {
    return;
  }

  const email = escapeHtml(
    user.email || ""
  );

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    "";

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email ||
    "U";

  const initial = escapeHtml(
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase()
  );

  const avatar = avatarUrl
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

  $("logout-btn")?.addEventListener(
    "click",
    logout
  );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  const button = $("logout-btn");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Saindo...";
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
      button.textContent = "Sair";
    }

    alert(
      "Não foi possível sair da conta."
    );
  }
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
   CARREGAR CURSO + AULAS
========================================================= */

async function loadExcelCourse() {
  try {
    const [
      courseResponse,
      lessonsResponse
    ] = await Promise.all([

      supabase
        .from("catalogo")
        .select(`
          id,
          nome,
          descricao,
          categoria,
          imagem_capa_url,
          status
        `)
        .eq("id", EXCEL_COURSE_ID)
        .maybeSingle(),

      supabase
        .from("curso")
        .select("*")
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
        )

    ]);


    /* =========================
       CURSO
    ========================= */

    if (courseResponse.error) {
      console.warn(
        "Erro ao carregar dados do curso:",
        courseResponse.error
      );
    }

    course =
      courseResponse.data ||
      getDefaultCourse();


    /* =========================
       AULAS
    ========================= */

    if (lessonsResponse.error) {
      console.warn(
        "Aulas ainda não disponíveis:",
        lessonsResponse.error
      );

      lessons = [];

    } else {
      lessons =
        Array.isArray(
          lessonsResponse.data
        )
          ? lessonsResponse.data
          : [];
    }


    renderCourseHeader();

    renderDownloads();


    if (lessons.length) {
      renderLessons();
      selectLesson(0);
    } else {
      renderNoLessons();
    }

    updateProgress();

  } catch (error) {
    console.error(
      "Erro ao carregar Excel:",
      error
    );

    course =
      getDefaultCourse();

    lessons = [];

    renderCourseHeader();

    renderNoLessons();

    renderDownloads();

    updateProgress();
  }
}


/* =========================================================
   CABEÇALHO DO CURSO
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
   LISTA DE AULAS
========================================================= */

function renderLessons() {
  const container =
    $("lessons-container");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  const moduleBlock =
    document.createElement(
      "div"
    );

  moduleBlock.className =
    "module-block";


  moduleBlock.innerHTML = `
    <div class="module-label">
      MÓDULO 1
    </div>

    <div class="module-title">
      Excel Prático
    </div>

    <ul class="lesson-list"></ul>
  `;


  const list =
    moduleBlock.querySelector(
      ".lesson-list"
    );


  lessons.forEach(
    (lesson, index) => {

      const li =
        document.createElement(
          "li"
        );

      li.className =
        "lesson";

      li.dataset.lessonIndex =
        String(index);


      const lessonNumber =
        `1.${index + 1}`;


      const lessonName =
        escapeHtml(
          lesson.nome ||
          `Aula ${index + 1}`
        );


      li.innerHTML = `
        <div class="lesson-status"></div>

        <div class="lesson-num">
          ${lessonNumber}
        </div>

        <div class="lesson-name">
          ${lessonName}
        </div>

        <div class="lesson-duration">
          —
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
        () => {
          selectLesson(index);

          /*
            Ao escolher uma aula,
            fecha a sidebar automaticamente.
          */

          closeAllSidebars();
        }
      );


      list.appendChild(li);
    }
  );


  container.appendChild(
    moduleBlock
  );
}


/* =========================================================
   SELECIONAR AULA
========================================================= */

function selectLesson(index) {
  if (
    index < 0 ||
    index >= lessons.length
  ) {
    return;
  }


  currentLessonIndex = index;


  const lesson =
    lessons[index];


  updateLessonSelection();

  renderCurrentLesson(
    lesson,
    index
  );

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
    (item, index) => {

      const isCurrent =
        index ===
        currentLessonIndex;


      const isDone =
        index <
        currentLessonIndex;


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


      if (isDone) {
        status.innerHTML = `
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
        `;
      } else {
        status.innerHTML = "";
      }

    }
  );
}


/* =========================================================
   RENDERIZAR AULA
========================================================= */

function renderCurrentLesson(
  lesson,
  index
) {
  const title =
    $("lesson-title");

  const description =
    $("lesson-description");

  const currentLesson =
    $("current-lesson");


  if (!currentLesson) {
    return;
  }


  const lessonName =
    lesson.nome ||
    `Aula ${index + 1}`;


  if (title) {
    title.textContent =
      `1.${index + 1} ${lessonName}`;
  }


  if (description) {
    description.textContent =
      lesson.conteudo_texto ||
      lesson.descricao ||
      course?.descricao ||
      "Conteúdo prático do curso de Excel.";
  }


  /*
    SUPABASE STORAGE

    Quando o banco estiver pronto,
    o slide pode vir de uma coluna como:

    slide_url
    imagem_slide_url
    slide_imagem_url

    Depois definimos apenas um nome definitivo.
  */

  const slideUrl =
    String(
      lesson.slide_url ||
      lesson.imagem_slide_url ||
      lesson.slide_imagem_url ||
      ""
    ).trim();


  if (slideUrl) {

    currentLesson.innerHTML = `
      <div
        id="slide-stage"
        class="slide-stage"
      >

        <div class="slide-viewer">

          <img
            src="${escapeHtml(slideUrl)}"
            alt="Slide da aula ${escapeHtml(lessonName)}"
            loading="eager"
          >

        </div>

      </div>
    `;

  } else {

    currentLesson.innerHTML =
      getSlidePlaceholder();

  }
}


/* =========================================================
   PLACEHOLDER DO SLIDE
========================================================= */

function getSlidePlaceholder() {
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
            SLIDE 01
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
            font-size="30"
            font-weight="500"
            fill="#aeb9b1"
          >
            Os slides do Supabase serão exibidos exatamente neste espaço.
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
            Placeholder visual — será substituído pelo arquivo real do Storage
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
          MÓDULO 1
        </div>

        <div class="module-title">
          Primeiros passos no Excel
        </div>

        <ul class="lesson-list">

          <li class="lesson active">

            <div class="lesson-status"></div>

            <div class="lesson-num">
              1.1
            </div>

            <div class="lesson-name">
              Interface do Excel
            </div>

            <div class="lesson-duration">
              —
            </div>

            <button
              type="button"
              class="lesson-play"
              tabindex="-1"
              aria-label="Aula demonstrativa"
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

          </li>


          <li class="lesson">

            <div class="lesson-status"></div>

            <div class="lesson-num">
              1.2
            </div>

            <div class="lesson-name">
              Criando sua primeira planilha
            </div>

            <div class="lesson-duration">
              —
            </div>

            <button
              type="button"
              class="lesson-play"
              tabindex="-1"
              aria-label="Aula demonstrativa"
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

          </li>


          <li class="lesson">

            <div class="lesson-status"></div>

            <div class="lesson-num">
              1.3
            </div>

            <div class="lesson-name">
              Navegação e seleção
            </div>

            <div class="lesson-duration">
              —
            </div>

            <button
              type="button"
              class="lesson-play"
              tabindex="-1"
              aria-label="Aula demonstrativa"
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

          </li>

        </ul>

      </div>
    `;
  }


  const title =
    $("lesson-title");

  const description =
    $("lesson-description");


  if (title) {
    title.textContent =
      "1.1 Interface do Excel";
  }


  if (description) {
    description.textContent =
      "Área preparada para receber os slides desta aula.";
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
   NAVEGAÇÃO
========================================================= */

function updateNavigation() {
  const previous =
    $("prev-lesson");

  const next =
    $("next-lesson");


  if (previous) {
    previous.disabled =
      currentLessonIndex <= 0;
  }


  if (next) {
    next.disabled =
      currentLessonIndex >=
      lessons.length - 1;
  }
}


/* =========================================================
   BOTÃO ANTERIOR
========================================================= */

$("prev-lesson")?.addEventListener(
  "click",
  () => {

    if (
      currentLessonIndex <= 0
    ) {
      return;
    }

    selectLesson(
      currentLessonIndex - 1
    );
  }
);


/* =========================================================
   BOTÃO PRÓXIMA
========================================================= */

$("next-lesson")?.addEventListener(
  "click",
  () => {

    if (
      currentLessonIndex >=
      lessons.length - 1
    ) {
      return;
    }

    selectLesson(
      currentLessonIndex + 1
    );
  }
);


/* =========================================================
   PROGRESSO
========================================================= */

function updateProgress() {
  /*
    O progresso real ainda será ligado
    à conta do usuário no Supabase.

    Por enquanto permanece em 0%.
  */

  const total =
    lessons.length;

  const completed = 0;

  const percentage = 0;


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
      2 * Math.PI * radius;

    circle.style.strokeDasharray =
      `${circumference}`;

    circle.style.strokeDashoffset =
      `${circumference}`;
  }
}


/* =========================================================
   DOWNLOADS
========================================================= */

function renderDownloads() {
  const list =
    $("downloads-list");


  if (!list) {
    return;
  }


  const materials =
    lessons.filter(
      (lesson) =>
        String(
          lesson.material_complementar_url ||
          ""
        ).trim()
    );


  if (!materials.length) {

    list.innerHTML = `
      <li class="empty-side">
        Nenhum material complementar
        foi cadastrado ainda.
      </li>
    `;

    return;
  }


  list.innerHTML =
    materials
      .map((lesson) => {

        const url =
          escapeHtml(
            lesson.material_complementar_url
          );


        const name =
          escapeHtml(
            lesson.material_complementar_nome ||
            `Material — ${
              lesson.nome || "Excel"
            }`
          );


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
                Material complementar
              </div>

            </div>

            <a
              class="download-action"
              href="${url}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir ${name}"
            >
              ↗
            </a>

          </li>
        `;

      })
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

  lessonsSidebar?.classList.remove(
    "is-open"
  );

  materialsSidebar?.classList.remove(
    "is-open"
  );

  sidebarOverlay?.classList.remove(
    "is-visible"
  );

  document.body.classList.remove(
    "sidebar-open"
  );


  lessonsSidebar?.setAttribute(
    "aria-hidden",
    "true"
  );

  materialsSidebar?.setAttribute(
    "aria-hidden",
    "true"
  );

  sidebarOverlay?.setAttribute(
    "aria-hidden",
    "true"
  );


  openLessonsButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  openMaterialsButton?.setAttribute(
    "aria-expanded",
    "false"
  );
}


/* =========================================================
   ABRIR SIDEBAR DE AULAS
========================================================= */

function openLessonsSidebar() {

  /*
    Fecha materiais caso esteja aberta.
  */

  materialsSidebar?.classList.remove(
    "is-open"
  );

  materialsSidebar?.setAttribute(
    "aria-hidden",
    "true"
  );

  openMaterialsButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  /*
    Abre aulas.
  */

  lessonsSidebar?.classList.add(
    "is-open"
  );

  sidebarOverlay?.classList.add(
    "is-visible"
  );

  document.body.classList.add(
    "sidebar-open"
  );


  lessonsSidebar?.setAttribute(
    "aria-hidden",
    "false"
  );

  sidebarOverlay?.setAttribute(
    "aria-hidden",
    "false"
  );

  openLessonsButton?.setAttribute(
    "aria-expanded",
    "true"
  );
}


/* =========================================================
   ABRIR SIDEBAR DE MATERIAIS
========================================================= */

function openMaterialsSidebar() {

  /*
    Fecha aulas caso esteja aberta.
  */

  lessonsSidebar?.classList.remove(
    "is-open"
  );

  lessonsSidebar?.setAttribute(
    "aria-hidden",
    "true"
  );

  openLessonsButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  /*
    Abre materiais.
  */

  materialsSidebar?.classList.add(
    "is-open"
  );

  sidebarOverlay?.classList.add(
    "is-visible"
  );

  document.body.classList.add(
    "sidebar-open"
  );


  materialsSidebar?.setAttribute(
    "aria-hidden",
    "false"
  );

  sidebarOverlay?.setAttribute(
    "aria-hidden",
    "false"
  );

  openMaterialsButton?.setAttribute(
    "aria-expanded",
    "true"
  );
}


/* =========================================================
   EVENTOS DAS SIDEBARS
========================================================= */

openLessonsButton?.addEventListener(
  "click",
  openLessonsSidebar
);


closeLessonsButton?.addEventListener(
  "click",
  closeAllSidebars
);


openMaterialsButton?.addEventListener(
  "click",
  openMaterialsSidebar
);


closeMaterialsButton?.addEventListener(
  "click",
  closeAllSidebars
);


/*
  Clicar no fundo fecha.
*/

sidebarOverlay?.addEventListener(
  "click",
  closeAllSidebars
);


/*
  ESC fecha qualquer sidebar aberta.
*/

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape"
    ) {
      closeAllSidebars();
    }

  }
);


/* =========================================================
   ALTERAÇÕES DE AUTENTICAÇÃO
========================================================= */

supabase.auth.onAuthStateChange(
  (_event, session) => {

    const userArea =
      $("user-area");


    if (!userArea) {
      return;
    }


    if (session?.user) {

      renderUser(
        userArea,
        session.user
      );

    } else {

      renderGuest(
        userArea
      );

    }

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

  /*
    Carrega autenticação e dados do curso
    ao mesmo tempo.
  */

  await Promise.all([
    loadUserSession(),
    loadExcelCourse()
  ]);
}


init();