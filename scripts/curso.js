import { supabase, escapeHtml, formatDuration } from './supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const courseId = params.get('id');

const $ = (id) => document.getElementById(id);

async function load() {
  if (!courseId) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#fff">Curso não especificado.</div>';
    return;
  }

  const [{ data: course, error: e1 }, { data: lessons, error: e2 }] = await Promise.all([
    supabase.from('catalogo').select('*').eq('id', courseId).maybeSingle(),
    supabase.from('curso').select('*').eq('curso_id', courseId).eq('status', 'publicado').order('ordem', { ascending: true }),
  ]);

  if (e1 || !course) {
    document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#fff">Curso não encontrado.</div>`;
    return;
  }
  if (e2) console.error(e2);

  renderCourse(course, lessons || []);
}

function renderCourse(course, lessons) {
  $('bc-current').textContent = course.nome || '';
  $('course-title').textContent = course.nome || '';
  $('course-desc').textContent = course.descricao || '';
  $('course-category').textContent = (course.categoria || 'CURSO').toUpperCase();
  if (course.imagem_capa_url) {
    $('course-cover-img').src = course.imagem_capa_url;
    $('course-cover-img').alt = course.nome;
  }

  // Progress (demo: mark first ~35% lessons as done for visual demo)
  const total = lessons.length;
  const done = Math.min(Math.floor(total * 0.35), total);
  const pct = total ? Math.round((done / total) * 100) : 0;

  $('progress-pct').textContent = pct + '%';
  $('progress-count').textContent = `${done} de ${total}`;
  $('progress-bar-fill').style.width = pct + '%';
  const circle = $('progress-circle');
  const r = circle.r.baseVal.value;
  const c = 2 * Math.PI * r;
  circle.style.strokeDasharray = c;
  circle.style.strokeDashoffset = c - (pct / 100) * c;

  // Lessons list — group by hint: use module = first digit of ordem/10, or single module fallback
  const container = $('lessons-container');
  container.innerHTML = '';
  if (!lessons.length) {
    container.innerHTML = '<div class="module-block"><p style="color:#6a6f7d">Nenhuma aula publicada ainda.</p></div>';
    return;
  }

  const moduleBlock = document.createElement('div');
  moduleBlock.className = 'module-block';
  moduleBlock.innerHTML = `
    <div class="module-title">MÓDULO 1</div>
    <h3>Conteúdo do curso</h3>
    <ul class="lesson-list"></ul>
  `;
  const ul = moduleBlock.querySelector('.lesson-list');

  lessons.forEach((lesson, idx) => {
    const isDone = idx < done;
    const isActive = idx === done;
    const li = document.createElement('li');
    li.className = 'lesson' + (isDone ? ' done' : '') + (isActive ? ' active' : '');
    li.innerHTML = `
      <div class="lesson-status">
        ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </div>
      <div class="lesson-num">${String(idx + 1).padStart(2, '.').replace('.', '1.')}</div>
      <div class="lesson-name">${escapeHtml(lesson.nome || '')}</div>
      <div class="lesson-duration">${formatDuration(lesson.video_duracao_segundos)}</div>
      <button class="lesson-play" aria-label="Assistir">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
    `;
    li.addEventListener('click', () => showLesson(lesson));
    ul.appendChild(li);
  });
  container.appendChild(moduleBlock);

  // Show first (or current) lesson
  showLesson(lessons[done] || lessons[0]);
}

function showLesson(lesson) {
  const box = $('current-lesson');
  if (!lesson) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="video-block">
      ${lesson.video_url
        ? `<video src="${escapeHtml(lesson.video_url)}" controls ${lesson.video_thumbnail_url ? `poster="${escapeHtml(lesson.video_thumbnail_url)}"` : ''}></video>`
        : `<div style="color:#666;display:grid;place-items:center;height:100%">Vídeo não disponível</div>`
      }
    </div>
    <div class="lesson-content">
      <h2>${escapeHtml(lesson.nome || '')}</h2>
      <p>${escapeHtml(lesson.conteudo_texto || 'Sem conteúdo textual complementar.')}</p>
      ${lesson.material_complementar_url ? `
        <a class="material-link" href="${escapeHtml(lesson.material_complementar_url)}" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${escapeHtml(lesson.material_complementar_nome || 'Baixar material')}
        </a>` : ''}
    </div>
  `;
}

load();
