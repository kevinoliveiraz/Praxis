import { // Importa supabase, escapeHtml do módulo ./supabaseClient.js.
  supabase, // Utiliza o valor de supabase.
  escapeHtml // Utiliza o valor de escapeHtml.
} from "./supabaseClient.js"; // Fornece o texto “./supabaseClient.js” à expressão atual.


/* =========================================================
   ELEMENTOS
========================================================= */

const grid = // Define grid como o elemento cujo ID é o texto “catalog-grid”.
  document.getElementById("catalog-grid"); // Executa a chamada que produz o elemento cujo ID é o texto “catalog-grid”.

const searchInput = // Define searchInput como o elemento cujo ID é o texto “search-input”.
  document.getElementById("search-input"); // Executa a chamada que produz o elemento cujo ID é o texto “search-input”.

const searchForm = // Define searchForm como o elemento cujo ID é o texto “header-search”.
  document.getElementById("header-search"); // Executa a chamada que produz o elemento cujo ID é o texto “header-search”.

const searchStatus = // Define searchStatus como o elemento cujo ID é o texto “catalog-search-status”.
  document.getElementById("catalog-search-status"); // Executa a chamada que produz o elemento cujo ID é o texto “catalog-search-status”.

if (searchInput) { // Verifica searchInput para decidir se executa este bloco.
  searchInput.value = new URLSearchParams(window.location.search).get("q") || ""; // Atualiza searchInput.value com o valor associado à chave o texto “q” em new URLSearchParams(…) ou, se indisponível, o texto “”.
} // Encerra o bloco da condição.


let allCourses = []; // Define allCourses como uma lista vazia.
let catalogLoaded = false; // Define catalogLoaded como false (falso).


/* =========================================================
   ETAPA 2
   ESTADO DO CARROSSEL
========================================================= */

let catalogPreviousButton = null; // Define catalogPreviousButton como null (ausência de valor).

let catalogNextButton = null; // Define catalogNextButton como null (ausência de valor).

let catalogCarousel = null; // Define catalogCarousel como null (ausência de valor).


/* =========================================================
   ETAPA 2
   CRIAR CARROSSEL DO CATÁLOGO
========================================================= */

function setupCatalogCarousel() { // Declara a função setupCatalogCarousel com nenhum parâmetro.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  if ( // Verifica a verificação de o texto “catalog-carousel” dentro de grid.parentElement.classList com acesso opcional para decidir se executa este bloco.
    grid.parentElement // Executa a chamada que produz a verificação de o texto “catalog-carousel” dentro de grid.parentElement.classList.
      ?.classList // Acessa grid.parentElement.classList.
      .contains( // Executa a chamada que produz a verificação de o texto “catalog-carousel” dentro de grid.parentElement.classList.
        "catalog-carousel" // Fornece o texto “catalog-carousel” à expressão atual.
      ) // Encerra a chamada de grid.parentElement.classList.contains.
  ) { // Verifica a verificação de o texto “catalog-carousel” dentro de grid.parentElement.classList com acesso opcional para decidir se executa este bloco.

    catalogCarousel = // Atualiza catalogCarousel com grid.parentElement.
      grid.parentElement; // Acessa grid.parentElement.


    catalogPreviousButton = // Atualiza catalogPreviousButton com o primeiro elemento que corresponde ao seletor o texto “[data-carousel-direction="previous"]”.
      catalogCarousel.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-carousel-direction="previous"]”.
        '[data-carousel-direction="previous"]' // Fornece o texto “[data-carousel-direction="previous"]” à expressão atual.
      ); // Encerra a chamada de catalogCarousel.querySelector.


    catalogNextButton = // Atualiza catalogNextButton com o primeiro elemento que corresponde ao seletor o texto “[data-carousel-direction="next"]”.
      catalogCarousel.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “[data-carousel-direction="next"]”.
        '[data-carousel-direction="next"]' // Fornece o texto “[data-carousel-direction="next"]” à expressão atual.
      ); // Encerra a chamada de catalogCarousel.querySelector.


    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  catalogCarousel = // Atualiza catalogCarousel com um novo elemento HTML o texto “div”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “div”.
      "div" // Fornece o texto “div” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  catalogCarousel.className = // Atualiza catalogCarousel.className com o texto “catalog-carousel”.
    "catalog-carousel"; // Fornece o texto “catalog-carousel” à expressão atual.


  const controls = // Define controls como um novo elemento HTML o texto “div”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “div”.
      "div" // Fornece o texto “div” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  controls.className = // Atualiza controls.className com o texto “catalog-carousel-controls”.
    "catalog-carousel-controls"; // Fornece o texto “catalog-carousel-controls” à expressão atual.


  catalogPreviousButton = // Atualiza catalogPreviousButton com um novo elemento HTML o texto “button”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “button”.
      "button" // Fornece o texto “button” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  catalogPreviousButton.type = // Atualiza catalogPreviousButton.type com o texto “button”.
    "button"; // Fornece o texto “button” à expressão atual.


  catalogPreviousButton.className = // Atualiza catalogPreviousButton.className com o texto “catalog-carousel-btn”.
    "catalog-carousel-btn"; // Fornece o texto “catalog-carousel-btn” à expressão atual.


  catalogPreviousButton.dataset // Atualiza catalogPreviousButton.dataset.carouselDirection com o texto “previous”.
    .carouselDirection = // Acessa catalogPreviousButton.dataset.carouselDirection.
    "previous"; // Fornece o texto “previous” à expressão atual.


  catalogPreviousButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-label” em catalogPreviousButton.
    "aria-label", // Fornece o texto “aria-label” à expressão atual.
    "Ver cursos anteriores" // Fornece o texto “Ver cursos anteriores” à expressão atual.
  ); // Encerra a chamada de catalogPreviousButton.setAttribute.


  catalogPreviousButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “title” em catalogPreviousButton.
    "title", // Fornece o texto “title” à expressão atual.
    "Cursos anteriores" // Fornece o texto “Cursos anteriores” à expressão atual.
  ); // Encerra a chamada de catalogPreviousButton.setAttribute.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza catalogPreviousButton.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 3 do trecho: Compõe o trecho de texto “width="18"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “height="18"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 7 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 8 do trecho: Compõe o trecho de texto “stroke-width="2.4"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 13 do trecho: Insere um traçado vetorial.
   * Linha 14 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 15 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
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


  catalogNextButton = // Atualiza catalogNextButton com um novo elemento HTML o texto “button”.
    document.createElement( // Executa a chamada que produz um novo elemento HTML o texto “button”.
      "button" // Fornece o texto “button” à expressão atual.
    ); // Encerra a chamada de document.createElement.


  catalogNextButton.type = // Atualiza catalogNextButton.type com o texto “button”.
    "button"; // Fornece o texto “button” à expressão atual.


  catalogNextButton.className = // Atualiza catalogNextButton.className com o texto “catalog-carousel-btn”.
    "catalog-carousel-btn"; // Fornece o texto “catalog-carousel-btn” à expressão atual.


  catalogNextButton.dataset // Atualiza catalogNextButton.dataset.carouselDirection com o texto “next”.
    .carouselDirection = // Acessa catalogNextButton.dataset.carouselDirection.
    "next"; // Fornece o texto “next” à expressão atual.


  catalogNextButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-label” em catalogNextButton.
    "aria-label", // Fornece o texto “aria-label” à expressão atual.
    "Ver próximos cursos" // Fornece o texto “Ver próximos cursos” à expressão atual.
  ); // Encerra a chamada de catalogNextButton.setAttribute.


  catalogNextButton.setAttribute( // Executa a chamada que produz a definição do atributo o texto “title” em catalogNextButton.
    "title", // Fornece o texto “title” à expressão atual.
    "Próximos cursos" // Fornece o texto “Próximos cursos” à expressão atual.
  ); // Encerra a chamada de catalogNextButton.setAttribute.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza catalogNextButton.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
   * Linha 3 do trecho: Compõe o trecho de texto “width="18"” sem modificá-lo.
   * Linha 4 do trecho: Compõe o trecho de texto “height="18"” sem modificá-lo.
   * Linha 5 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
   * Linha 6 do trecho: Compõe o trecho de texto “fill="none"” sem modificá-lo.
   * Linha 7 do trecho: Compõe o trecho de texto “stroke="currentColor"” sem modificá-lo.
   * Linha 8 do trecho: Compõe o trecho de texto “stroke-width="2.4"” sem modificá-lo.
   * Linha 9 do trecho: Compõe o trecho de texto “stroke-linecap="round"” sem modificá-lo.
   * Linha 10 do trecho: Compõe o trecho de texto “stroke-linejoin="round"” sem modificá-lo.
   * Linha 11 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
   * Linha 12 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
   * Linha 13 do trecho: Insere um traçado vetorial.
   * Linha 14 do trecho: Encerra um ícone ou desenho vetorial.
   * Linha 15 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
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


  controls.append( // Executa a chamada que produz o resultado de controls.append com catalogPreviousButton e catalogNextButton.
    catalogPreviousButton, // Utiliza o valor de catalogPreviousButton.
    catalogNextButton // Utiliza o valor de catalogNextButton.
  ); // Encerra a chamada de controls.append.


  const originalParent = // Define originalParent como grid.parentNode.
    grid.parentNode; // Acessa grid.parentNode.


  originalParent.insertBefore( // Executa a chamada que produz a inserção de catalogCarousel antes do nó de referência.
    catalogCarousel, // Utiliza o valor de catalogCarousel.
    grid // Utiliza o valor de grid.
  ); // Encerra a chamada de originalParent.insertBefore.


  catalogCarousel.appendChild( // Executa a chamada que produz a inserção de controls como filho de catalogCarousel.
    controls // Utiliza o valor de controls.
  ); // Encerra a chamada de catalogCarousel.appendChild.


  catalogCarousel.appendChild( // Executa a chamada que produz a inserção de grid como filho de catalogCarousel.
    grid // Utiliza o valor de grid.
  ); // Encerra a chamada de catalogCarousel.appendChild.


  catalogPreviousButton // Executa a chamada que produz o registro do evento o texto “click” em catalogPreviousButton.
    .addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em catalogPreviousButton.
      "click", // Fornece o texto “click” à expressão atual.
      () => { // Define a função que recebe nenhum argumento.

        scrollCatalog( // Executa a chamada que produz o resultado de scrollCatalog com o negativo de 1.
          -1 // Compõe o negativo de 1 na operação atual.
        ); // Encerra a chamada de scrollCatalog.
      } // Encerra o bloco atual.
    ); // Encerra a chamada de catalogPreviousButton.addEventListener.


  catalogNextButton // Executa a chamada que produz o registro do evento o texto “click” em catalogNextButton.
    .addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em catalogNextButton.
      "click", // Fornece o texto “click” à expressão atual.
      () => { // Define a função que recebe nenhum argumento.

        scrollCatalog( // Executa a chamada que produz o resultado de scrollCatalog com 1.
          1 // Fornece 1 à expressão atual.
        ); // Encerra a chamada de scrollCatalog.
      } // Encerra o bloco atual.
    ); // Encerra a chamada de catalogNextButton.addEventListener.


  grid.addEventListener( // Executa a chamada que produz o registro do evento o texto “scroll” em grid.
    "scroll", // Fornece o texto “scroll” à expressão atual.
    updateCatalogControls, // Utiliza o valor de updateCatalogControls.
    { // Inicia um objeto com passive.
      passive: true // Define a propriedade passive como true (verdadeiro).
    } // Encerra o objeto.
  ); // Encerra a chamada de grid.addEventListener.


  window.addEventListener( // Executa a chamada que produz o registro do evento o texto “resize” em window.
    "resize", // Fornece o texto “resize” à expressão atual.
    () => { // Define a função que recebe nenhum argumento.

      window.requestAnimationFrame( // Executa a chamada que produz o agendamento de uma atualização para o próximo quadro.
        updateCatalogControls // Utiliza o valor de updateCatalogControls.
      ); // Encerra a chamada de window.requestAnimationFrame.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de window.addEventListener.


  updateCatalogControls(); // Executa a chamada que produz o resultado de updateCatalogControls.
} // Encerra o bloco da função setupCatalogCarousel.


/* =========================================================
   ETAPA 2
   LARGURA DE UM PASSO DO CARROSSEL
========================================================= */

function getCatalogScrollAmount() { // Declara a função getCatalogScrollAmount com nenhum parâmetro.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return 0; // Retorna 0.
  } // Encerra o bloco da condição.


  const firstCard = // Define firstCard como o primeiro elemento que corresponde ao seletor o texto “.course-card”.
    grid.querySelector( // Executa a chamada que produz o primeiro elemento que corresponde ao seletor o texto “.course-card”.
      ".course-card" // Fornece o texto “.course-card” à expressão atual.
    ); // Encerra a chamada de grid.querySelector.


  if (!firstCard) { // Verifica a negação de firstCard para decidir se executa este bloco.
    return grid.clientWidth; // Retorna grid.clientWidth.
  } // Encerra o bloco da condição.


  const gridStyles = // Define gridStyles como o resultado de window.getComputedStyle com grid.
    window.getComputedStyle( // Executa a chamada que produz o resultado de window.getComputedStyle com grid.
      grid // Utiliza o valor de grid.
    ); // Encerra a chamada de window.getComputedStyle.


  const gapValue = // Define gapValue como gridStyles.columnGap ou, se indisponível, gridStyles.gap ou, se indisponível, o texto “0”.
    gridStyles.columnGap || // Acessa gridStyles.columnGap.
    gridStyles.gap || // Acessa gridStyles.gap.
    "0"; // Fornece o texto “0” à expressão atual.


  const gap = // Define gap como o resultado de Number.parseFloat com gapValue ou, se indisponível, 0.
    Number.parseFloat( // Executa a chamada que produz o resultado de Number.parseFloat com gapValue.
      gapValue // Utiliza o valor de gapValue.
    ) || 0; // Fornece 0 à expressão atual.


  const cardWidth = // Define cardWidth como firstCard.getBoundingClientRect(…).width.
    firstCard // Executa a chamada que produz as dimensões e a posição de firstCard.
      .getBoundingClientRect() // Executa a chamada que produz as dimensões e a posição de firstCard.
      .width; // Acessa firstCard.getBoundingClientRect(…).width.


  return ( // Retorna cardWidth mais gap.
    cardWidth + // Calcula cardWidth mais gap.
    gap // Utiliza o valor de gap.
  ); // Encerra a expressão ou função iniciada acima.
} // Encerra o bloco da função getCatalogScrollAmount.


/* =========================================================
   ETAPA 2
   MOVIMENTAR CARROSSEL
========================================================= */

function scrollCatalog( // Declara a função scrollCatalog com direction.
  direction // Utiliza o valor de direction.
) { // Declara a função scrollCatalog com direction.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const amount = // Define amount como o resultado de getCatalogScrollAmount.
    getCatalogScrollAmount(); // Executa a chamada que produz o resultado de getCatalogScrollAmount.


  if (!amount) { // Verifica a negação de amount para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  grid.scrollBy({ // Executa a chamada que produz o resultado de grid.scrollBy com um objeto com left, behavior.
    left: // Define a propriedade left como amount vezes direction.
      amount * // Calcula amount vezes direction.
      direction, // Utiliza o valor de direction.

    behavior: // Define a propriedade behavior como o texto “smooth”.
      "smooth" // Fornece o texto “smooth” à expressão atual.
  }); // Encerra o objeto.
} // Encerra o bloco da função scrollCatalog.


/* =========================================================
   ETAPA 2
   ATUALIZAR SETAS DO CARROSSEL
========================================================= */

function updateCatalogControls() { // Declara a função updateCatalogControls com nenhum parâmetro.
  if ( // Verifica a negação de grid ou, se indisponível, a negação de catalogPreviousButton ou, se indisponível, a negação de catalogNextButton para decidir se executa este bloco.
    !grid || // Calcula a negação de grid ou, se indisponível, a negação de catalogPreviousButton ou, se indisponível, a negação de catalogNextButton.
    !catalogPreviousButton || // Compõe a negação de catalogPreviousButton na operação atual.
    !catalogNextButton // Compõe a negação de catalogNextButton na operação atual.
  ) { // Verifica a negação de grid ou, se indisponível, a negação de catalogPreviousButton ou, se indisponível, a negação de catalogNextButton para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const tolerance = 5; // Define tolerance como 5.


  const canScroll = // Define canScroll como grid.scrollWidth maior que grid.clientWidth mais tolerance.
    grid.scrollWidth > // Acessa grid.scrollWidth.
    grid.clientWidth + // Acessa grid.clientWidth.
      tolerance; // Utiliza o valor de tolerance.


  if (!canScroll) { // Verifica a negação de canScroll para decidir se executa este bloco.

    catalogPreviousButton.disabled = // Atualiza catalogPreviousButton.disabled com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.


    catalogNextButton.disabled = // Atualiza catalogNextButton.disabled com true (verdadeiro).
      true; // Fornece true (verdadeiro) à expressão atual.


    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const atStart = // Define atStart como grid.scrollLeft menor ou igual a tolerance.
    grid.scrollLeft <= // Acessa grid.scrollLeft.
    tolerance; // Utiliza o valor de tolerance.


  const atEnd = // Define atEnd como grid.scrollLeft mais grid.clientWidth maior ou igual a grid.scrollWidth menos tolerance.
    grid.scrollLeft + // Acessa grid.scrollLeft.
      grid.clientWidth >= // Acessa grid.clientWidth.
    grid.scrollWidth - // Acessa grid.scrollWidth.
      tolerance; // Utiliza o valor de tolerance.


  catalogPreviousButton.disabled = // Atualiza catalogPreviousButton.disabled com atStart.
    atStart; // Utiliza o valor de atStart.


  catalogNextButton.disabled = // Atualiza catalogNextButton.disabled com atEnd.
    atEnd; // Utiliza o valor de atEnd.
} // Encerra o bloco da função updateCatalogControls.


/* =========================================================
   ETAPA 2
   VOLTAR CARROSSEL PARA O INÍCIO
========================================================= */

function resetCatalogPosition() { // Declara a função resetCatalogPosition com nenhum parâmetro.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  grid.scrollTo({ // Executa a chamada que produz o resultado de grid.scrollTo com um objeto com left, behavior.
    left: 0, // Define a propriedade left como 0.
    behavior: "auto" // Define a propriedade behavior como o texto “auto”.
  }); // Encerra o objeto.


  window.requestAnimationFrame( // Executa a chamada que produz o agendamento de uma atualização para o próximo quadro.
    updateCatalogControls // Utiliza o valor de updateCatalogControls.
  ); // Encerra a chamada de window.requestAnimationFrame.
} // Encerra o bloco da função resetCatalogPosition.


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

async function loadCatalog() { // Declara a função assíncrona loadCatalog com nenhum parâmetro.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  grid.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-busy” em grid.
    "aria-busy", // Fornece o texto “aria-busy” à expressão atual.
    "true" // Fornece o texto “true” à expressão atual.
  ); // Encerra a chamada de grid.setAttribute.


  /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
   * Linha 1 do trecho: Atualiza grid.innerHTML com um texto montado com 0 valores dinâmicos.
   * Linha 2 do trecho: Insere um contêiner de layout com as classes “state”.
   * Linha 3 do trecho: Compõe o trecho de texto “Carregando cursos...” sem modificá-lo.
   * Linha 4 do trecho: Encerra um contêiner de layout.
   * Linha 5 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
   */
  grid.innerHTML = `
    <div class="state">
      Carregando cursos...
    </div>
  `;


  updateCatalogControls(); // Executa a chamada que produz o resultado de updateCatalogControls.


  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.

    const { // Define data, error como o resultado aguardado de a ordenação por o texto “ordem_exibicao”.
      data, // Inclui a propriedade data com o valor da variável de mesmo nome.
      error // Inclui a propriedade error com o valor da variável de mesmo nome.
    } = // Compõe data, error na operação atual.
      await supabase // Aguarda a ordenação por o texto “ordem_exibicao” antes de continuar.
        .from( // Executa a chamada que produz a referência à tabela ou ao bucket o texto “catalogo”.
          "catalogo" // Fornece o texto “catalogo” à expressão atual.
        ) // Encerra a chamada de supabase.from.
        /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
         * Linha 1 do trecho: Executa a chamada que produz a seleção das colunas um texto montado com 0 valores dinâmicos.
         * Linha 2 do trecho: Inclui o campo “id” no texto da consulta.
         * Linha 3 do trecho: Inclui o campo “nome” no texto da consulta.
         * Linha 4 do trecho: Inclui o campo “descricao” no texto da consulta.
         * Linha 5 do trecho: Inclui o campo “categoria” no texto da consulta.
         * Linha 6 do trecho: Inclui o campo “imagem_capa_url” no texto da consulta.
         * Linha 7 do trecho: Inclui o campo “ordem_exibicao” no texto da consulta.
         * Linha 8 do trecho: Inclui o campo “status” no texto da consulta.
         * Linha 9 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
         */
        .select(`
          id,
          nome,
          descricao,
          categoria,
          imagem_capa_url,
          ordem_exibicao,
          status
        `)
        .eq( // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “status” igual a o texto “publicado”.
          "status", // Fornece o texto “status” à expressão atual.
          "publicado" // Fornece o texto “publicado” à expressão atual.
        ) // Encerra a chamada de supabase.from(…).select(…).eq.
        .order( // Executa a chamada que produz a ordenação por o texto “ordem_exibicao”.
          "ordem_exibicao", // Fornece o texto “ordem_exibicao” à expressão atual.
          { // Inicia um objeto com ascending, nullsFirst.
            ascending: true, // Define a propriedade ascending como true (verdadeiro).
            nullsFirst: false // Define a propriedade nullsFirst como false (falso).
          } // Encerra o objeto.
        ); // Encerra a chamada de supabase.from(…).select(…).eq(…).order.


    if (error) { // Verifica error para decidir se executa este bloco.
      throw error; // Lança error para interromper o fluxo e informar a falha.
    } // Encerra o bloco da condição.


    allCourses = // Atualiza allCourses com data se o resultado de Array.isArray com data; caso contrário, uma lista vazia.
      Array.isArray(data) // Executa a chamada que produz o resultado de Array.isArray com data.
        ? data // Utiliza o valor de data.
        : []; // Inicia uma lista vazia.

    catalogLoaded = true; // Atualiza catalogLoaded com true (verdadeiro).
    searchCourses(); // Executa a chamada que produz o resultado de searchCourses.


  } catch (error) { // Encerra a tentativa e inicia o tratamento de uma falha.

    console.error( // Executa a chamada que produz o registro de o texto “Erro ao carregar catálogo:” no console.
      "Erro ao carregar catálogo:", // Fornece o texto “Erro ao carregar catálogo:” à expressão atual.
      error // Utiliza o valor de error.
    ); // Encerra a chamada de console.error.


    /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
     * Linha 1 do trecho: Atualiza grid.innerHTML com um texto montado com 0 valores dinâmicos.
     * Linha 2 do trecho: Insere um contêiner de layout com as classes “state”.
     * Linha 4 do trecho: Insere um texto com destaque semântico.
     * Linha 5 do trecho: Compõe o trecho de texto “Não foi possível carregar os cursos.” sem modificá-lo.
     * Linha 6 do trecho: Encerra um texto com destaque semântico.
     * Linha 8 do trecho: Insere uma quebra de linha.
     * Linha 10 do trecho: Compõe o trecho de texto “Verifique a conexão com o Supabase” sem modificá-lo.
     * Linha 11 do trecho: Compõe o trecho de texto “e tente novamente.” sem modificá-lo.
     * Linha 13 do trecho: Encerra um contêiner de layout.
     * Linha 14 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
     */
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


    resetCatalogPosition(); // Executa a chamada que produz o resultado de resetCatalogPosition.


  } finally { // Encerra o tratamento anterior e inicia a etapa que sempre será executada.

    grid.setAttribute( // Executa a chamada que produz a definição do atributo o texto “aria-busy” em grid.
      "aria-busy", // Fornece o texto “aria-busy” à expressão atual.
      "false" // Fornece o texto “false” à expressão atual.
    ); // Encerra a chamada de grid.setAttribute.


    window.requestAnimationFrame( // Executa a chamada que produz o agendamento de uma atualização para o próximo quadro.
      updateCatalogControls // Utiliza o valor de updateCatalogControls.
    ); // Encerra a chamada de window.requestAnimationFrame.
  } // Encerra o bloco atual.
} // Encerra o bloco da função loadCatalog.


/* =========================================================
   RENDERIZAR CARDS
========================================================= */

function renderCourses( // Declara a função renderCourses com courses.
  courses // Utiliza o valor de courses.
) { // Declara a função renderCourses com courses.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  resetCatalogPosition(); // Executa a chamada que produz o resultado de resetCatalogPosition.


  if (!courses.length) { // Verifica a negação de courses.length para decidir se executa este bloco.

    /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
     * Linha 1 do trecho: Atualiza grid.innerHTML com um texto montado com 0 valores dinâmicos.
     * Linha 2 do trecho: Insere um contêiner de layout com as classes “state”.
     * Linha 3 do trecho: Compõe o trecho de texto “Nenhum curso encontrado.” sem modificá-lo.
     * Linha 4 do trecho: Encerra um contêiner de layout.
     * Linha 5 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
     */
    grid.innerHTML = `
      <div class="state">
        Nenhum curso encontrado.
      </div>
    `;


    window.requestAnimationFrame( // Executa a chamada que produz o agendamento de uma atualização para o próximo quadro.
      updateCatalogControls // Utiliza o valor de updateCatalogControls.
    ); // Encerra a chamada de window.requestAnimationFrame.


    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  grid.innerHTML = // Atualiza grid.innerHTML com os itens de courses.map(…) unidos por o texto “”.
    courses // Executa a chamada que produz os itens de courses.map(…) unidos por o texto “”.
      .map( // Executa a chamada que produz uma lista transformada a partir de courses.
        (course) => { // Define a função que recebe course.

          const id = // Define id como o resultado de escapeHtml com a conversão de expressão em texto.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com a conversão de course.id ou, quando nulo, o resultado da expressão em texto.
              String( // Executa a chamada que produz a conversão de course.id ou, quando nulo, o texto “” em texto.
                course.id ?? "" // Acessa course.id.
              ) // Encerra a chamada de String.
            ); // Encerra a chamada de escapeHtml.


          const name = // Define name como o resultado de escapeHtml com o texto de String(…) sem espaços nas extremidades.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com o texto de String(…) sem espaços nas extremidades.
              String( // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
                course.nome || // Acessa course.nome.
                "Curso sem nome" // Fornece o texto “Curso sem nome” à expressão atual.
              ) // Encerra a chamada de String.
                .trim() // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
            ); // Encerra a chamada de escapeHtml.


          const category = // Define category como o resultado de escapeHtml com o texto de String(…) sem espaços nas extremidades.
            escapeHtml( // Executa a chamada que produz o resultado de escapeHtml com o texto de String(…) sem espaços nas extremidades.
              String( // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
                course.categoria || // Acessa course.categoria.
                "Curso" // Fornece o texto “Curso” à expressão atual.
              ) // Encerra a chamada de String.
                .trim() // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
            ); // Encerra a chamada de escapeHtml.


          const coverUrl = // Define coverUrl como o texto de String(…) sem espaços nas extremidades.
            String( // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
              course.imagem_capa_url || // Acessa course.imagem_capa_url.
              "" // Fornece o texto “” à expressão atual.
            ) // Encerra a chamada de String.
              .trim(); // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.


          const coursePage = // Define coursePage como o resultado de getCoursePage com course.
            getCoursePage( // Executa a chamada que produz o resultado de getCoursePage com course.
              course // Utiliza o valor de course.
            ); // Encerra a chamada de getCoursePage.


          /* Explicações do texto multilinha abaixo; os comentários ficam fora do valor.
           * Linha 1 do trecho: Retorna um texto montado com 5 valores dinâmicos.
           * Linha 2 do trecho: Insere um bloco de conteúdo independente com o texto “<article”.
           * Linha 3 do trecho: Compõe o trecho de texto “class="course-card"” sem modificá-lo.
           * Linha 4 do trecho: Compõe o trecho de texto “data-course-id="${id}"” sem modificá-lo.
           * Linha 5 do trecho: Compõe o trecho de texto “data-course-page="${” sem modificá-lo.
           * Linha 6 do trecho: Inclui o campo “coursePage” no texto da consulta.
           * Linha 7 do trecho: Compõe o trecho de texto “? escapeHtml(” sem modificá-lo.
           * Linha 8 do trecho: Inclui o campo “coursePage” no texto da consulta.
           * Linha 9 do trecho: Compõe o trecho de texto “)” sem modificá-lo.
           * Linha 10 do trecho: Compõe o trecho de texto “: ""” sem modificá-lo.
           * Linha 11 do trecho: Compõe o trecho de texto “}"” sem modificá-lo.
           * Linha 12 do trecho: Compõe o trecho de texto “tabindex="0"” sem modificá-lo.
           * Linha 13 do trecho: Compõe o trecho de texto “role="link"” sem modificá-lo.
           * Linha 14 do trecho: Compõe o trecho de texto “aria-label="Abrir o curso ${name}"” sem modificá-lo.
           * Linha 15 do trecho: Compõe o trecho de texto “title="${name}"” sem modificá-lo.
           * Linha 16 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 18 do trecho: Insere um contêiner de layout com as classes “cover”.
           * Linha 20 do trecho: Insere no texto o valor calculado por ${.
           * Linha 21 do trecho: Inclui o campo “coverUrl” no texto da consulta.
           * Linha 23 do trecho: Fornece um texto montado com 2 valores dinâmicos à expressão atual.
           * Linha 24 do trecho: Insere uma imagem com o texto “<img”.
           * Linha 25 do trecho: Compõe o trecho de texto “src="${escapeHtml(” sem modificá-lo.
           * Linha 26 do trecho: Inclui o campo “coverUrl” no texto da consulta.
           * Linha 27 do trecho: Compõe o trecho de texto “)}"” sem modificá-lo.
           * Linha 28 do trecho: Compõe o trecho de texto “alt="Capa do curso ${name}"” sem modificá-lo.
           * Linha 29 do trecho: Compõe o trecho de texto “loading="lazy"” sem modificá-lo.
           * Linha 30 do trecho: Compõe o trecho de texto “decoding="async"” sem modificá-lo.
           * Linha 31 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 32 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           * Linha 34 do trecho: Fornece um texto montado com 1 valor dinâmico à expressão atual.
           * Linha 35 do trecho: Insere um contêiner de layout com o texto “<div”.
           * Linha 36 do trecho: Compõe o trecho de texto “class="course-cover-placeholder"” sem modificá-lo.
           * Linha 37 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 38 do trecho: Insere um trecho de texto em linha.
           * Linha 39 do trecho: Insere no texto o valor calculado por ${category}.
           * Linha 40 do trecho: Encerra um trecho de texto em linha.
           * Linha 41 do trecho: Encerra um contêiner de layout.
           * Linha 42 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           * Linha 43 do trecho: Compõe o trecho de texto “}” sem modificá-lo.
           * Linha 45 do trecho: Encerra um contêiner de layout.
           * Linha 48 do trecho: Insere um contêiner de layout com o texto “<div”.
           * Linha 49 do trecho: Compõe o trecho de texto “class="body"” sem modificá-lo.
           * Linha 50 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
           * Linha 51 do trecho: Conclui a declaração da tag e de seus atributos.
           * Linha 54 do trecho: Insere um trecho de texto em linha com o texto “<span”.
           * Linha 55 do trecho: Compõe o trecho de texto “class="play-btn"” sem modificá-lo.
           * Linha 56 do trecho: Compõe o trecho de texto “aria-hidden="true"” sem modificá-lo.
           * Linha 57 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 59 do trecho: Insere um ícone ou desenho vetorial com o texto “<svg”.
           * Linha 60 do trecho: Compõe o trecho de texto “width="18"” sem modificá-lo.
           * Linha 61 do trecho: Compõe o trecho de texto “height="18"” sem modificá-lo.
           * Linha 62 do trecho: Compõe o trecho de texto “viewBox="0 0 24 24"” sem modificá-lo.
           * Linha 63 do trecho: Compõe o trecho de texto “fill="currentColor"” sem modificá-lo.
           * Linha 64 do trecho: Compõe o trecho de texto “>” sem modificá-lo.
           * Linha 65 do trecho: Insere um traçado vetorial com o texto “<path”.
           * Linha 66 do trecho: Compõe o trecho de texto “d="M8 5v14l11-7z"” sem modificá-lo.
           * Linha 67 do trecho: Compõe o trecho de texto “/>” sem modificá-lo.
           * Linha 68 do trecho: Encerra um ícone ou desenho vetorial.
           * Linha 70 do trecho: Encerra um trecho de texto em linha.
           * Linha 72 do trecho: Encerra um bloco de conteúdo independente.
           * Linha 73 do trecho: Fecha o texto multilinha e conclui ou continua a expressão que utiliza esse valor.
           */
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
        } // Encerra o bloco atual.
      ) // Encerra a chamada de courses.map.
      .join(""); // Executa a chamada que produz os itens de courses.map(…) unidos por o texto “”.


  addCourseEvents(); // Executa a chamada que produz o resultado de addCourseEvents.


  window.requestAnimationFrame( // Executa a chamada que produz o agendamento de uma atualização para o próximo quadro.
    () => { // Define a função que recebe nenhum argumento.

      resetCatalogPosition(); // Executa a chamada que produz o resultado de resetCatalogPosition.

      updateCatalogControls(); // Executa a chamada que produz o resultado de updateCatalogControls.
    } // Encerra o bloco atual.
  ); // Encerra a chamada de window.requestAnimationFrame.
} // Encerra o bloco da função renderCourses.


/* =========================================================
   CLIQUE NOS CARDS
========================================================= */

function addCourseEvents() { // Declara a função addCourseEvents com nenhum parâmetro.
  if (!grid) { // Verifica a negação de grid para decidir se executa este bloco.
    return; // Encerra a função sem retornar um valor.
  } // Encerra o bloco da condição.


  const cards = // Define cards como todos os elementos que correspondem ao seletor o texto “.course-card”.
    grid.querySelectorAll( // Executa a chamada que produz todos os elementos que correspondem ao seletor o texto “.course-card”.
      ".course-card" // Fornece o texto “.course-card” à expressão atual.
    ); // Encerra a chamada de grid.querySelectorAll.


  cards.forEach( // Executa a chamada que produz a execução da função para cada item de cards.
    (card) => { // Define a função que recebe card.

      const openCourse = () => { // Define openCourse como uma função que recebe nenhum argumento.

        const coursePage = // Define coursePage como o texto de String(…) sem espaços nas extremidades.
          String( // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.
            card.dataset // Acessa card.dataset.coursePage.
              .coursePage || // Acessa card.dataset.coursePage.
            "" // Fornece o texto “” à expressão atual.
          ) // Encerra a chamada de String.
            .trim(); // Executa a chamada que produz o texto de String(…) sem espaços nas extremidades.


        if (!coursePage) { // Verifica a negação de coursePage para decidir se executa este bloco.

          console.warn( // Executa a chamada que produz o registro de o texto “O curso não possui uma página configurada:” no console.
            "O curso não possui uma página configurada:", // Fornece o texto “O curso não possui uma página configurada:” à expressão atual.
            card.dataset // Acessa card.dataset.courseId.
              .courseId // Acessa card.dataset.courseId.
          ); // Encerra a chamada de console.warn.


          return; // Encerra a função sem retornar um valor.
        } // Encerra o bloco da condição.


        window.location.href = // Atualiza window.location.href com coursePage.
          coursePage; // Utiliza o valor de coursePage.
      }; // Encerra o bloco atual.


      card.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em card.
        "click", // Fornece o texto “click” à expressão atual.
        openCourse // Utiliza o valor de openCourse.
      ); // Encerra a chamada de card.addEventListener.


      card.addEventListener( // Executa a chamada que produz o registro do evento o texto “keydown” em card.
        "keydown", // Fornece o texto “keydown” à expressão atual.
        (event) => { // Define a função que recebe event.

          if ( // Verifica event.key igual, inclusive no tipo, a o texto “Enter” ou, se indisponível, event.key igual, inclusive no tipo, a o texto “” para decidir se executa este bloco.
            event.key === // Acessa event.key.
              "Enter" || // Fornece o texto “Enter” à expressão atual.

            event.key === // Acessa event.key.
              " " // Fornece o texto “” à expressão atual.
          ) { // Verifica event.key igual, inclusive no tipo, a o texto “Enter” ou, se indisponível, event.key igual, inclusive no tipo, a o texto “” para decidir se executa este bloco.

            event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.

            openCourse(); // Executa a chamada que produz o resultado de openCourse.
          } // Encerra o bloco da condição.

        } // Encerra o bloco atual.
      ); // Encerra a chamada de card.addEventListener.

    } // Encerra o bloco atual.
  ); // Encerra a chamada de cards.forEach.
} // Encerra o bloco da função addCourseEvents.


/* =========================================================
   PESQUISA
========================================================= */

function searchCourses() { // Declara a função searchCourses com nenhum parâmetro.
  if (!searchInput || !catalogLoaded) return; // Verifica a negação de searchInput ou, se indisponível, a negação de catalogLoaded; se verdadeiro, encerra a função sem retornar um valor.

  const normalize = value => String(value || "") // Define normalize como uma função que recebe value.
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Executa a chamada que produz o resultado de String(…).normalize com o texto “NFD”.
    .toLocaleLowerCase("pt-BR"); // Executa a chamada que produz o resultado de String(…).normalize(…).replace(…).toLocaleLowerCase com o texto “pt-BR”.
  const term = searchInput.value.trim(); // Define term como o texto de searchInput.value sem espaços nas extremidades.
  const query = normalize(term); // Define query como o resultado de normalize com term.
  const courses = query ? allCourses.filter(course => // Define courses como os itens de allCourses que passam na condição se query; caso contrário, allCourses.
    [course.nome, course.descricao, course.categoria] // Executa a chamada que produz a verificação de pelo menos um item de expressão que atende à condição.
      .some(value => normalize(value).includes(query)) // Executa a chamada que produz a verificação de pelo menos um item de expressão que atende à condição.
  ) : allCourses; // Utiliza o valor de allCourses.

  renderCourses(courses); // Executa a chamada que produz o resultado de renderCourses com courses.
  if (searchStatus) { // Verifica searchStatus para decidir se executa este bloco.
    searchStatus.hidden = !term; // Atualiza searchStatus.hidden com a negação de term.
    searchStatus.textContent = term // Atualiza searchStatus.textContent com um texto montado com 3 valores dinâmicos se term; caso contrário, o texto “”.
      ? `${courses.length} ${courses.length === 1 ? "curso encontrado" : "cursos encontrados"} para “${term}”.` // Fornece um texto montado com 3 valores dinâmicos à expressão atual.
      : ""; // Fornece o texto “” à expressão atual.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função searchCourses.


/* =========================================================
   BOTÃO DE PESQUISA
========================================================= */

if (searchForm) { // Verifica searchForm para decidir se executa este bloco.
  searchForm.addEventListener("submit", event => { // Executa a chamada que produz o registro do evento o texto “submit” em searchForm.
    event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.
    searchCourses(); // Executa a chamada que produz o resultado de searchCourses.
    const url = new URL(window.location.href); // Define url como uma instância de URL com window.location.href.
    const query = searchInput?.value.trim() || ""; // Define query como o texto de searchInput.value sem espaços nas extremidades com acesso opcional ou, se indisponível, o texto “”.
    if (query) url.searchParams.set("q", query); // Verifica query; se verdadeiro, executa a associação de o texto “q” ao valor query em url.searchParams.
    else url.searchParams.delete("q"); // Executa a chamada que produz a remoção da chave o texto “q” de url.searchParams.
    url.hash = "catalog-title"; // Atualiza url.hash com o texto “catalog-title”.
    window.history.replaceState(null, "", url); // Executa a chamada que produz o resultado de window.history.replaceState com null (ausência de valor) e o texto “”.
    document.getElementById("catalog-title")?.scrollIntoView({ // Executa a chamada que produz o resultado de document.getElementById(…).scrollIntoView com um objeto com block, behavior.
      block: "start", // Define a propriedade block como o texto “start”.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" // Define a propriedade behavior como o texto “auto” se window.matchMedia(…).matches; caso contrário, o texto “smooth”.
    }); // Encerra o objeto.
  }); // Encerra o bloco atual.
} // Encerra o bloco da condição.


/* =========================================================
   INPUT DE PESQUISA
========================================================= */

if (searchInput) { // Verifica searchInput para decidir se executa este bloco.
  searchInput.addEventListener("input", searchCourses); // Executa a chamada que produz o registro do evento o texto “input” em searchInput.
} // Encerra o bloco da condição.


/* =========================================================
   BUSCAS POPULARES
========================================================= */

document // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  .querySelectorAll( // Executa a chamada que produz todos os elementos que correspondem ao seletor o texto “.tag”.
    ".tag" // Fornece o texto “.tag” à expressão atual.
  ) // Encerra a chamada de document.querySelectorAll.
  .forEach( // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
    (tag) => { // Define a função que recebe tag.

      tag.addEventListener( // Executa a chamada que produz o registro do evento o texto “click” em tag.
        "click", // Fornece o texto “click” à expressão atual.
        () => { // Define a função que recebe nenhum argumento.

          if (!searchInput) { // Verifica a negação de searchInput para decidir se executa este bloco.
            return; // Encerra a função sem retornar um valor.
          } // Encerra o bloco da condição.


          searchInput.value = // Atualiza searchInput.value com o texto de tag.textContent sem espaços nas extremidades.
            tag.textContent // Executa a chamada que produz o texto de tag.textContent sem espaços nas extremidades.
              .trim(); // Executa a chamada que produz o texto de tag.textContent sem espaços nas extremidades.


          searchCourses(); // Executa a chamada que produz o resultado de searchCourses.
        } // Encerra o bloco atual.
      ); // Encerra a chamada de tag.addEventListener.

    } // Encerra o bloco atual.
  ); // Encerra a chamada de document.querySelectorAll(…).forEach.


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

setupCatalogCarousel(); // Executa a chamada que produz o resultado de setupCatalogCarousel.


loadCatalog(); // Executa a chamada que produz o resultado de loadCatalog.
