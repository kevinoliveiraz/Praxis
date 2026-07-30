import { supabase, escapeHtml } from './supabaseClient.js';

const grid = document.getElementById('catalog-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

let allCourses = [];

async function loadCatalog() {
  grid.innerHTML = `<div class="state">Carregando cursos...</div>`;
  const { data, error } = await supabase
    .from('catalogo')
    .select('*')
    .eq('status', 'publicado')
    .order('ordem_exibicao', { ascending: true });

  if (error) {
    grid.innerHTML = `<div class="state">Erro ao carregar cursos: ${escapeHtml(error.message)}</div>`;
    return;
  }
  allCourses = data || [];
  render(allCourses);
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = `<div class="state">Nenhum curso encontrado.</div>`;
    return;
  }
  grid.innerHTML = list.map(course => `
    <article class="course-card" data-id="${course.id}">
      <div class="cover">
        ${course.imagem_capa_url ? `<img src="${escapeHtml(course.imagem_capa_url)}" alt="${escapeHtml(course.nome)}" loading="lazy">` : ''}
      </div>
      <div class="body">
        <span class="category-chip">${escapeHtml(course.categoria || 'CURSO')}</span>
        <h3>${escapeHtml(course.nome || '')}</h3>
        <p>${escapeHtml(course.descricao || '')}</p>
        <div class="card-footer">
          <span>Acessar curso</span>
          <span>Publicado</span>
        </div>
      </div>
      <button class="play-btn" aria-label="Abrir curso">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
    </article>
  `).join('');

  grid.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      window.location.href = `curso.html?id=${id}`;
    });
  });
}

function doSearch() {
  const q = (searchInput.value || '').trim().toLowerCase();
  if (!q) return render(allCourses);
  const filtered = allCourses.filter(c =>
    (c.nome || '').toLowerCase().includes(q) ||
    (c.descricao || '').toLowerCase().includes(q) ||
    (c.categoria || '').toLowerCase().includes(q)
  );
  render(filtered);
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => {
    searchInput.value = tag.textContent.trim();
    doSearch();
  });
});

loadCatalog();
