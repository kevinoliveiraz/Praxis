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

const searchForm =
  document.getElementById("header-search");

const searchStatus =
  document.getElementById("catalog-search-status");

if (searchInput) {
  searchInput.value = new URLSearchParams(window.location.search).get("q") || "";
}


let allCourses = [];
let catalogLoaded = false;


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


  catalogCarousel =
    document.createElement(
      "div"
    );


  catalogCarousel.className =
    "catalog-carousel";


  const controls =
    document.createElement(
      "div"
    );


  controls.className =
    "catalog-carousel-controls";


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


  catalogPreviousButton
    .addEventListener(
      "click",
      () => {

        scrollCatalog(
          -1
        );
      }
    );


  catalogNextButton
    .addEventListener(
      "click",
      () => {

        scrollCatalog(
          1
        );
      }
    );


  grid.addEventListener(
    "scroll",
    updateCatalogControls,
    {
      passive: true
    }
  );


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


  const tolerance = 5;


  const canScroll =
    grid.scrollWidth >
    grid.clientWidth +
      tolerance;


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
   PÁGINA ÚNICA DOS CURSOS
========================================================= */

function getCoursePage(course) { // cria a função que monta o endereço da página única de cursos
  if (!course) { // verifica se nenhum curso foi recebido pela função
    return null; // encerra a função sem criar um endereço quando não existe curso
  } // encerra a validação da existência do curso

  const courseId = // cria uma constante para armazenar o ID numérico do curso
    Number(course.id); // converte o ID recebido do catálogo para o tipo Number

  if ( // inicia a validação do identificador do curso
    !Number.isInteger(courseId) || // verifica se o ID não é um número inteiro
    courseId <= 0 // verifica se o ID é zero ou negativo
  ) { // inicia o bloco executado quando o identificador é inválido
    console.warn( // registra no console que o curso não possui um ID utilizável
      "Curso sem ID válido:", // adiciona uma descrição antes dos dados do curso
      course // exibe no console o objeto recebido para facilitar a identificação do problema
    ); // encerra o aviso no console

    return null; // impede a criação de uma URL inválida
  } // encerra a validação do identificador

  return `curso.html?id=${courseId}`; // direciona qualquer curso para curso.html e informa seu ID pela URL
} // encerra a função responsável por montar a página do curso


/* =========================================================
   LOGOUT
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

    catalogLoaded = true;
    searchCourses();


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


      card.addEventListener(
        "click",
        openCourse
      );


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
  if (!searchInput || !catalogLoaded) return;

  const normalize = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  const term = searchInput.value.trim();
  const query = normalize(term);
  const courses = query ? allCourses.filter(course =>
    [course.nome, course.descricao, course.categoria]
      .some(value => normalize(value).includes(query))
  ) : allCourses;

  renderCourses(courses);
  if (searchStatus) {
    searchStatus.hidden = !term;
    searchStatus.textContent = term
      ? `${courses.length} ${courses.length === 1 ? "curso encontrado" : "cursos encontrados"} para “${term}”.`
      : "";
  }
}


/* =========================================================
   BOTÃO DE PESQUISA
========================================================= */

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchCourses();
    const url = new URL(window.location.href);
    const query = searchInput?.value.trim() || "";
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    url.hash = "catalog-title";
    window.history.replaceState(null, "", url);
    document.getElementById("catalog-title")?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  });
}


/* =========================================================
   INPUT DE PESQUISA
========================================================= */

if (searchInput) {
  searchInput.addEventListener("input", searchCourses);
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
   INICIALIZAÇÃO
========================================================= */

setupCatalogCarousel();


loadCatalog();
