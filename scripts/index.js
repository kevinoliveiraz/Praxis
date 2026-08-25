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
   ETAPA 2
   ESTADO DO CARROSSEL
========================================================= */

let catalogPreviousButton = null;

let catalogNextButton = null;

let catalogCarousel = null;


/* =========================================================
   ETAPA 2
   CRIAR CARROSSEL DO CATÁLOGO
========================================================= */

function setupCatalogCarousel() {
  if (!grid) {
    return;
  }


  /*
    Impede que o carrossel seja criado
    mais de uma vez.
  */

  if (
    grid.parentElement
      ?.classList
      .contains(
        "catalog-carousel"
      )
  ) {

    catalogCarousel =
      grid.parentElement;


    catalogPreviousButton =
      catalogCarousel.querySelector(
        '[data-carousel-direction="previous"]'
      );


    catalogNextButton =
      catalogCarousel.querySelector(
        '[data-carousel-direction="next"]'
      );


    return;
  }


  /* CONTAINER PRINCIPAL */

  catalogCarousel =
    document.createElement(
      "div"
    );


  catalogCarousel.className =
    "catalog-carousel";


  /* CONTROLES */

  const controls =
    document.createElement(
      "div"
    );


  controls.className =
    "catalog-carousel-controls";


  /* BOTÃO ANTERIOR */

  catalogPreviousButton =
    document.createElement(
      "button"
    );


  catalogPreviousButton.type =
    "button";


  catalogPreviousButton.className =
    "catalog-carousel-btn";


  catalogPreviousButton.dataset
    .carouselDirection =
    "previous";


  catalogPreviousButton.setAttribute(
    "aria-label",
    "Ver cursos anteriores"
  );


  catalogPreviousButton.setAttribute(
    "title",
    "Cursos anteriores"
  );


  catalogPreviousButton.innerHTML = `
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  `;


  /* BOTÃO PRÓXIMO */

  catalogNextButton =
    document.createElement(
      "button"
    );


  catalogNextButton.type =
    "button";


  catalogNextButton.className =
    "catalog-carousel-btn";


  catalogNextButton.dataset
    .carouselDirection =
    "next";


  catalogNextButton.setAttribute(
    "aria-label",
    "Ver próximos cursos"
  );


  catalogNextButton.setAttribute(
    "title",
    "Próximos cursos"
  );


  catalogNextButton.innerHTML = `
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6"/>
    </svg>
  `;


  controls.append(
    catalogPreviousButton,
    catalogNextButton
  );


  /*
    Colocamos o novo carrossel exatamente
    onde o #catalog-grid já estava.
  */

  const originalParent =
    grid.parentNode;


  originalParent.insertBefore(
    catalogCarousel,
    grid
  );


  catalogCarousel.appendChild(
    controls
  );


  catalogCarousel.appendChild(
    grid
  );


  /* EVENTO ANTERIOR */

  catalogPreviousButton
    .addEventListener(
      "click",
      () => {

        scrollCatalog(
          -1
        );
      }
    );


  /* EVENTO PRÓXIMO */

  catalogNextButton
    .addEventListener(
      "click",
      () => {

        scrollCatalog(
          1
        );
      }
    );


  /*
    Conforme o usuário arrasta com o dedo
    ou usa o trackpad, atualizamos as setas.
  */

  grid.addEventListener(
    "scroll",
    updateCatalogControls,
    {
      passive: true
    }
  );


  /*
    Ao mudar a largura da tela,
    recalculamos se existe conteúdo
    suficiente para mostrar as setas.
  */

  window.addEventListener(
    "resize",
    () => {

      window.requestAnimationFrame(
        updateCatalogControls
      );
    }
  );


  updateCatalogControls();
}


/* =========================================================
   ETAPA 2
   LARGURA DE UM PASSO DO CARROSSEL
========================================================= */

function getCatalogScrollAmount() {
  if (!grid) {
    return 0;
  }


  const firstCard =
    grid.querySelector(
      ".course-card"
    );


  /*
    Enquanto o catálogo ainda estiver
    carregando, usamos a largura do grid.
  */

  if (!firstCard) {
    return grid.clientWidth;
  }


  const gridStyles =
    window.getComputedStyle(
      grid
    );


  const gapValue =
    gridStyles.columnGap ||
    gridStyles.gap ||
    "0";


  const gap =
    Number.parseFloat(
      gapValue
    ) || 0;


  const cardWidth =
    firstCard
      .getBoundingClientRect()
      .width;


  /*
    Um clique = avança exatamente
    um card.

    Isso deixa a movimentação
    previsível no desktop e celular.
  */

  return (
    cardWidth +
    gap
  );
}


/* =========================================================
   ETAPA 2
   MOVIMENTAR CARROSSEL
========================================================= */

function scrollCatalog(
  direction
) {
  if (!grid) {
    return;
  }


  const amount =
    getCatalogScrollAmount();


  if (!amount) {
    return;
  }


  grid.scrollBy({
    left:
      amount *
      direction,

    behavior:
      "smooth"
  });
}


/* =========================================================
   ETAPA 2
   ATUALIZAR SETAS DO CARROSSEL
========================================================= */

function updateCatalogControls() {
  if (
    !grid ||
    !catalogPreviousButton ||
    !catalogNextButton
  ) {
    return;
  }


  /*
    Pequena tolerância para evitar
    erros de arredondamento.
  */

  const tolerance = 5;


  const canScroll =
    grid.scrollWidth >
    grid.clientWidth +
      tolerance;


  /*
    Se todos os cursos couberem
    na tela, desabilitamos as duas.
  */

  if (!canScroll) {

    catalogPreviousButton.disabled =
      true;


    catalogNextButton.disabled =
      true;


    return;
  }


  const atStart =
    grid.scrollLeft <=
    tolerance;


  const atEnd =
    grid.scrollLeft +
      grid.clientWidth >=
    grid.scrollWidth -
      tolerance;


  catalogPreviousButton.disabled =
    atStart;


  catalogNextButton.disabled =
    atEnd;
}


/* =========================================================
   ETAPA 2
   VOLTAR CARROSSEL PARA O INÍCIO
========================================================= */

function resetCatalogPosition() {
  if (!grid) {
    return;
  }


  grid.scrollTo({
    left: 0,
    behavior: "auto"
  });


  window.requestAnimationFrame(
    updateCatalogControls
  );
}


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
      .toLocaleLowerCase(
        "pt-BR"
      );


  const category =
    String(
      course.categoria || ""
    )
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );


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
    Curso ainda sem página própria.

    Outlook, ChatGPT e Teams,
    por exemplo, poderão aparecer
    no catálogo antes das páginas
    serem construídas.

    Nesse caso não abrimos uma
    página inexistente.
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
    user.user_metadata
      ?.avatar_url ||

    user.user_metadata
      ?.picture ||

    "";


  const fullName =
    user.user_metadata
      ?.full_name ||

    user.user_metadata
      ?.name ||

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


  updateCatalogControls();


  try {

    const {
      data,
      error
    } =
      await supabase
        .from(
          "catalogo"
        )
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


    resetCatalogPosition();


  } finally {

    grid.setAttribute(
      "aria-busy",
      "false"
    );


    window.requestAnimationFrame(
      updateCatalogControls
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


  /*
    Sempre que o catálogo for renderizado
    novamente, voltamos ao início.

    Isso é importante principalmente
    durante pesquisas.
  */

  resetCatalogPosition();


  if (!courses.length) {

    grid.innerHTML = `
      <div class="state">
        Nenhum curso encontrado.
      </div>
    `;


    window.requestAnimationFrame(
      updateCatalogControls
    );


    return;
  }


  grid.innerHTML =
    courses
      .map(
        (course) => {

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
              )
                .trim()
            );


          const category =
            escapeHtml(
              String(
                course.categoria ||
                "Curso"
              )
                .trim()
            );


          const coverUrl =
            String(
              course.imagem_capa_url ||
              ""
            )
              .trim();


          /*
            Define qual página
            este curso abrirá.
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
                  ? escapeHtml(
                      coursePage
                    )
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
                A capa já possui os textos.

                Mantemos somente o gradiente
                visual no final do card.
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
        }
      )
      .join("");


  addCourseEvents();


  /*
    O navegador precisa primeiro calcular
    a largura dos novos cards.

    Depois disso atualizamos as setas.
  */

  window.requestAnimationFrame(
    () => {

      resetCatalogPosition();

      updateCatalogControls();
    }
  );
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

        const coursePage =
          String(
            card.dataset
              .coursePage ||
            ""
          )
            .trim();


        if (!coursePage) {

          console.warn(
            "O curso não possui uma página configurada:",
            card.dataset
              .courseId
          );


          return;
        }


        window.location.href =
          coursePage;
      };


      /* CLIQUE */

      card.addEventListener(
        "click",
        openCourse
      );


      /* TECLADO */

      card.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key ===
              "Enter" ||

            event.key ===
              " "
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
    searchInput
      .value
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );


  /*
    Campo vazio:
    mostra todos novamente.
  */

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
          name.includes(
            query
          ) ||

          description.includes(
            query
          ) ||

          category.includes(
            query
          )
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
        !searchInput
          .value
          .trim()
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
        event.key ===
          "Enter"
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
  .querySelectorAll(
    ".tag"
  )
  .forEach(
    (tag) => {

      tag.addEventListener(
        "click",
        () => {

          if (!searchInput) {
            return;
          }


          searchInput.value =
            tag.textContent
              .trim();


          searchCourses();
        }
      );

    }
  );


/* =========================================================
   ALTERAÇÃO DA AUTENTICAÇÃO
========================================================= */

supabase
  .auth
  .onAuthStateChange(
    (
      _event,
      session
    ) => {

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

/*
  Primeiro montamos a estrutura visual
  do carrossel.

  Depois carregamos usuário e catálogo.
*/

setupCatalogCarousel();


loadUserSession();


loadCatalog();
