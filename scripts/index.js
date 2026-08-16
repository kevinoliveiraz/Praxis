import {
  supabase,
  escapeHtml
} from "./supabaseClient.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const grid =
  document.getElementById("catalog-grid");

const searchInput =
  document.getElementById("search-input");

const searchBtn =
  document.getElementById("search-btn");


let allCourses = [];


/* =========================================================
   PÁGINAS ESPECÍFICAS DOS CURSOS
========================================================= */

const COURSE_PAGES = {
  1: "excel.html",
  2: "word.html",
  3: "powerpoint.html",
  4: "powerbi.html"
};


/* =========================================================
   DESCOBRE QUAL PÁGINA DEVE ABRIR
========================================================= */

function getCoursePage(course) {
  if (!course) {
    return null;
  }


  const courseId =
    Number(course.id);


  /*
    Primeiro verifica o ID cadastrado
    na tabela catalogo do Supabase.
  */

  if (COURSE_PAGES[courseId]) {
    return COURSE_PAGES[courseId];
  }


  /*
    Proteção extra pelo nome/categoria.

    Caso algum ID seja alterado no futuro,
    ainda conseguimos localizar a página
    correta pelo nome ou categoria.
  */

  const name =
    String(
      course.nome || ""
    )
      .trim()
      .toLocaleLowerCase("pt-BR");


  const category =
    String(
      course.categoria || ""
    )
      .trim()
      .toLocaleLowerCase("pt-BR");


  /* EXCEL */

  if (
    name.includes("excel") ||
    category.includes("excel")
  ) {
    return "excel.html";
  }


  /* WORD */

  if (
    name.includes("word") ||
    category.includes("word")
  ) {
    return "word.html";
  }


  /* POWERPOINT */

  if (
    name.includes("power point") ||
    name.includes("powerpoint") ||
    category.includes("power point") ||
    category.includes("powerpoint")
  ) {
    return "powerpoint.html";
  }


  /* POWER BI */

  if (
    name.includes("power bi") ||
    name.includes("power-bi") ||
    name.includes("powerbi") ||
    category.includes("power bi") ||
    category.includes("power-bi") ||
    category.includes("powerbi")
  ) {
    return "powerbi.html";
  }


  /*
    Se ainda não existir página individual
    para este curso, não tenta mais abrir
    curso.html?id=...
  */

  console.warn(
    "Curso sem página configurada:",
    course
  );


  return null;
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  const logoutButton =
    document.getElementById(
      "logout-btn"
    );


  try {

    if (logoutButton) {

      logoutButton.disabled =
        true;

      logoutButton.textContent =
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


    if (logoutButton) {

      logoutButton.disabled =
        false;

      logoutButton.textContent =
        "Sair";
    }


    alert(
      "Não foi possível sair da conta. Tente novamente."
    );
  }
}


/* =========================================================
   ÁREA DE VISITANTE
========================================================= */

function renderGuestArea(
  userArea
) {
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

      <span>
        Entrar
      </span>

    </a>
  `;
}


/* =========================================================
   ÁREA DO USUÁRIO LOGADO
========================================================= */

function renderAuthenticatedArea(
  userArea,
  user
) {
  if (!userArea || !user) {
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


  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";


  const initial =
    String(
      fullName ||
      email ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();


  const avatarHtml =
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
          aria-label="Avatar do usuário"
        >
          ${escapeHtml(initial)}
        </div>
      `;


  userArea.innerHTML = `
    <div class="user-info">

      ${avatarHtml}

      <span
        class="user-email"
        title="${email}"
      >
        ${email}
      </span>

      <button
        type="button"
        id="logout-btn"
        class="btn btn-ghost logout-btn"
        aria-label="Sair da conta"
      >
        Sair
      </button>

    </div>
  `;


  const logoutButton =
    document.getElementById(
      "logout-btn"
    );


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logout
    );
  }
}


/* =========================================================
   CARREGAR SESSÃO
========================================================= */

async function loadUserSession() {
  const userArea =
    document.getElementById(
      "user-area"
    );


  if (!userArea) {
    return;
  }


  try {

    const {
      data: { session },
      error
    } =
      await supabase.auth.getSession();


    if (error) {
      throw error;
    }


    if (session?.user) {

      renderAuthenticatedArea(
        userArea,
        session.user
      );

      return;
    }


    renderGuestArea(
      userArea
    );


  } catch (error) {

    console.error(
      "Erro ao verificar a sessão:",
      error
    );


    renderGuestArea(
      userArea
    );
  }
}


/* =========================================================
   CARREGAR CATÁLOGO
========================================================= */

async function loadCatalog() {
  if (!grid) {
    return;
  }


  grid.setAttribute(
    "aria-busy",
    "true"
  );


  grid.innerHTML = `
    <div class="state">
      Carregando cursos...
    </div>
  `;


  try {

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
          ordem_exibicao,
          status
        `)
        .eq(
          "status",
          "publicado"
        )
        .order(
          "ordem_exibicao",
          {
            ascending: true,
            nullsFirst: false
          }
        );


    if (error) {
      throw error;
    }


    allCourses =
      Array.isArray(data)
        ? data
        : [];


    renderCourses(
      allCourses
    );


  } catch (error) {

    console.error(
      "Erro ao carregar catálogo:",
      error
    );


    grid.innerHTML = `
      <div class="state">

        <strong>
          Não foi possível carregar os cursos.
        </strong>

        <br>

        Verifique a conexão com o Supabase
        e tente novamente.

      </div>
    `;


  } finally {

    grid.setAttribute(
      "aria-busy",
      "false"
    );
  }
}


/* =========================================================
   RENDERIZAR CARDS
========================================================= */

function renderCourses(
  courses
) {
  if (!grid) {
    return;
  }


  if (!courses.length) {

    grid.innerHTML = `
      <div class="state">
        Nenhum curso encontrado.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    courses
      .map((course) => {

        const id =
          escapeHtml(
            String(
              course.id ?? ""
            )
          );


        const name =
          escapeHtml(
            String(
              course.nome ||
              "Curso sem nome"
            ).trim()
          );


        const category =
          escapeHtml(
            String(
              course.categoria ||
              "Curso"
            ).trim()
          );


        const coverUrl =
          String(
            course.imagem_capa_url ||
            ""
          ).trim();


        /*
          Define agora qual página
          este card deverá abrir.
        */

        const coursePage =
          getCoursePage(
            course
          );


        return `
          <article
            class="course-card"
            data-course-id="${id}"
            data-course-page="${
              coursePage
                ? escapeHtml(coursePage)
                : ""
            }"
            tabindex="0"
            role="link"
            aria-label="Abrir o curso ${name}"
            title="${name}"
          >

            <div class="cover">

              ${
                coverUrl

                  ? `
                    <img
                      src="${escapeHtml(
                        coverUrl
                      )}"
                      alt="Capa do curso ${name}"
                      loading="lazy"
                      decoding="async"
                    >
                  `

                  : `
                    <div
                      class="course-cover-placeholder"
                    >
                      <span>
                        ${category}
                      </span>
                    </div>
                  `
              }

            </div>


            <!--
              Mantém somente o gradiente.

              Os textos já fazem parte
              da própria arte da capa.
            -->

            <div
              class="body"
              aria-hidden="true"
            ></div>


            <span
              class="play-btn"
              aria-hidden="true"
            >

              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M8 5v14l11-7z"
                />
              </svg>

            </span>

          </article>
        `;
      })
      .join("");


  addCourseEvents();
}


/* =========================================================
   CLIQUE NOS CARDS
========================================================= */

function addCourseEvents() {
  if (!grid) {
    return;
  }


  const cards =
    grid.querySelectorAll(
      ".course-card"
    );


  cards.forEach(
    (card) => {

      const openCourse = () => {

        /*
          A página já foi calculada
          no renderCourses().
        */

        const coursePage =
          String(
            card.dataset.coursePage ||
            ""
          ).trim();


        if (!coursePage) {

          console.warn(
            "O curso não possui uma página configurada:",
            card.dataset.courseId
          );

          return;
        }


        /*
          Páginas individuais:

          Excel:
          excel.html

          Word:
          word.html

          PowerPoint:
          powerpoint.html

          Power BI:
          powerbi.html
        */

        window.location.href =
          coursePage;
      };


      card.addEventListener(
        "click",
        openCourse
      );


      card.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            openCourse();
          }

        }
      );

    }
  );
}


/* =========================================================
   PESQUISA
========================================================= */

function searchCourses() {
  if (!searchInput) {
    return;
  }


  const query =
    searchInput.value
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );


  if (!query) {

    renderCourses(
      allCourses
    );

    return;
  }


  const filteredCourses =
    allCourses.filter(
      (course) => {

        const name =
          String(
            course.nome ||
            ""
          )
            .toLocaleLowerCase(
              "pt-BR"
            );


        const description =
          String(
            course.descricao ||
            ""
          )
            .toLocaleLowerCase(
              "pt-BR"
            );


        const category =
          String(
            course.categoria ||
            ""
          )
            .toLocaleLowerCase(
              "pt-BR"
            );


        return (
          name.includes(query) ||
          description.includes(query) ||
          category.includes(query)
        );
      }
    );


  renderCourses(
    filteredCourses
  );
}


/* =========================================================
   BOTÃO DE PESQUISA
========================================================= */

if (searchBtn) {

  searchBtn.addEventListener(
    "click",
    searchCourses
  );
}


/* =========================================================
   INPUT DE PESQUISA
========================================================= */

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      if (
        !searchInput.value.trim()
      ) {

        renderCourses(
          allCourses
        );
      }

    }
  );


  searchInput.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        searchCourses();
      }

    }
  );
}


/* =========================================================
   BUSCAS POPULARES
========================================================= */

document
  .querySelectorAll(".tag")
  .forEach((tag) => {

    tag.addEventListener(
      "click",
      () => {

        if (!searchInput) {
          return;
        }


        searchInput.value =
          tag.textContent.trim();


        searchCourses();
      }
    );

  });


/* =========================================================
   ALTERAÇÃO DA AUTENTICAÇÃO
========================================================= */

supabase.auth.onAuthStateChange(
  (_event, session) => {

    const userArea =
      document.getElementById(
        "user-area"
      );


    if (!userArea) {
      return;
    }


    if (session?.user) {

      renderAuthenticatedArea(
        userArea,
        session.user
      );

    } else {

      renderGuestArea(
        userArea
      );

    }

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

loadUserSession();

loadCatalog();
